import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ddb, TABLES } from './dynamo.ts';
import { s3, S3_BUCKET, s3PublicUrl } from './s3.ts';

// Backend 100% DynamoDB agora — auth, usuários e projetos migrados. O antigo
// schema Drizzle/SQLite (src/db/) não é mais usado por este arquivo.

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_mvp_key';

// -- MIDDLEWARE --
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Igual à authenticate, mas não bloqueia requisições sem token — usada em rotas
// públicas que precisam saber *quem está vendo* (curtiu? já segue?) sem exigir login.
const optionalAuthenticate = (req: any, _res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // Token inválido/expirado — segue como visitante anônimo.
    }
  }
  next();
};

// Multer guarda o arquivo em memória (buffer) — vai direto pro S3, nunca toca o disco.
const upload = multer({ storage: multer.memoryStorage() });

// -- HELPERS COMPARTILHADOS (DynamoDB) --

async function findUserByUsername(username: string) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.users,
    IndexName: 'username-index',
    KeyConditionExpression: 'username = :v',
    ExpressionAttributeValues: { ':v': username },
    Limit: 1,
  }));
  return result.Items?.[0] as Record<string, any> | undefined;
}

async function findUserByEmail(email: string) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.users,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :v',
    ExpressionAttributeValues: { ':v': email },
    Limit: 1,
  }));
  return result.Items?.[0] as Record<string, any> | undefined;
}

/** Inclui o e-mail de cadastro — só para respostas privadas (o próprio usuário vendo seus dados). */
function toPrivateUser(user: Record<string, any>) {
  const { id, username, email, fullName, avatarUrl } = user;
  return { id, username, email, fullName, avatarUrl };
}

/** Sem o e-mail de cadastro — para respostas públicas (perfil visitado, autor de projeto). */
function toPublicAuthor(user: Record<string, any>) {
  const { id, username, fullName, avatarUrl } = user;
  return { id, username, fullName, avatarUrl };
}

/** Card de criador (busca / listagem) — sem e-mail, sem projetos (mais barato que toProfile). */
function toCreatorSummary(user: Record<string, any>) {
  const { id, username, fullName, avatarUrl, coverUrl, bio, followers, skills } = user;
  return {
    id, username, fullName,
    avatarUrl: avatarUrl ?? '', coverUrl: coverUrl ?? '', bio: bio ?? '',
    followers: followers ?? 0, skills: skills ?? [],
  };
}

function toProfile(user: Record<string, any>) {
  const {
    id, username, fullName, bio, category, location,
    avatarUrl, coverUrl, portfolioLink, contactEmail, followers, skills,
  } = user;
  return {
    id, username, fullName,
    bio: bio ?? '', category: category ?? '', location: location ?? '',
    avatarUrl: avatarUrl ?? '', coverUrl: coverUrl ?? '',
    portfolioLink: portfolioLink ?? '', contactEmail: contactEmail ?? '',
    followers: followers ?? 0, skills: skills ?? [],
  };
}

async function getUserBadges(userId: string) {
  const links = await ddb.send(new QueryCommand({
    TableName: TABLES.userBadges,
    KeyConditionExpression: 'userId = :v',
    ExpressionAttributeValues: { ':v': userId },
  }));
  const badgeIds: string[] = (links.Items ?? []).map((item: any) => item.badgeId);
  if (badgeIds.length === 0) return [];

  const badges = await Promise.all(
    badgeIds.map((badgeId) => ddb.send(new GetCommand({ TableName: TABLES.badges, Key: { id: badgeId } })))
  );
  return badges.map((b) => b.Item).filter(Boolean);
}

// Faixa Unicode das marcas diacríticas combinantes (U+0300-U+036F), construída por
// code point (não como caractere literal) pra não depender do encoding do arquivo-fonte.
const DIACRITICS_REGEX = new RegExp(
  '[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']',
  'g'
);

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getProjectsByOwnerId(ownerId: string) {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.projects,
    IndexName: 'ownerId-slug-index',
    KeyConditionExpression: 'ownerId = :v',
    ExpressionAttributeValues: { ':v': ownerId },
  }));
  return (result.Items ?? []) as Record<string, any>[];
}

async function generateUniqueProjectSlug(ownerId: string, seed: string, excludeProjectId?: string) {
  const base = slugify(seed) || 'projeto';
  const existing = await getProjectsByOwnerId(ownerId);
  let slug = base;
  let suffix = 2;
  while (existing.some((p) => p.slug === slug && p.id !== excludeProjectId)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

/** Remove o feedKey interno (detalhe de implementação do índice esparso) da resposta. */
function toProjectResponse(project: Record<string, any>, owner?: Record<string, any>, likedByMe = false) {
  const { feedKey, ...rest } = project;
  const base = owner ? { ...rest, user: toPublicAuthor(owner) } : rest;
  return { ...base, likedByMe };
}

/** IDs de projetos curtidos pelo usuário — uma query só, reaproveitada pra marcar uma lista inteira. */
async function getLikedProjectIds(userId?: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.likes,
    KeyConditionExpression: 'userId = :v',
    ExpressionAttributeValues: { ':v': userId },
  }));
  return new Set((result.Items ?? []).map((item: any) => item.projectId));
}

/** Curtida de um único projeto — mais barato que getLikedProjectIds quando só há um item pra checar. */
async function hasLiked(userId: string | undefined, projectId: string): Promise<boolean> {
  if (!userId) return false;
  const result = await ddb.send(new GetCommand({ TableName: TABLES.likes, Key: { userId, projectId } }));
  return Boolean(result.Item);
}

async function isFollowingUser(followerId: string | undefined, followingId: string): Promise<boolean> {
  if (!followerId || followerId === followingId) return false;
  const result = await ddb.send(new GetCommand({
    TableName: TABLES.follows,
    Key: { followerId, followingId },
  }));
  return Boolean(result.Item);
}

// -- AUTH --

router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body ?? {};
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ error: 'Preencha nome, usuário, e-mail e senha.' });
    }

    const [byUsername, byEmail] = await Promise.all([
      findUserByUsername(username),
      findUserByEmail(email),
    ]);
    if (byUsername) return res.status(400).json({ error: 'Esse nome de usuário já está em uso.' });
    if (byEmail) return res.status(400).json({ error: 'Esse e-mail já está cadastrado.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const user = {
      id, username, email, passwordHash, fullName,
      followers: 0, skills: [], createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({
      TableName: TABLES.users,
      Item: user,
      ConditionExpression: 'attribute_not_exists(id)',
    }));

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toPrivateUser(user) });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body ?? {};
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Informe usuário/e-mail e senha.' });
    }

    const user = (await findUserByUsername(emailOrUsername)) ?? (await findUserByEmail(emailOrUsername));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toPrivateUser(user) });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/auth/me', authenticate, async (req: any, res) => {
  try {
    const result = await ddb.send(new GetCommand({
      TableName: TABLES.users,
      Key: { id: req.user.id },
    }));
    if (!result.Item) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(toPrivateUser(result.Item));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- USERS / PERFIL --

// Listagem/busca de criadores (página Criadores e busca do Descobrir).
// ?search= filtra por username ou nome (case-insensitive); sem ele, lista todo mundo.
// Usa Scan porque não há um GSI de "todos os usuários" — aceitável na escala atual
// (uma tabela de usuários de um MVP), mas não escala indefinidamente; se a base de
// usuários crescer muito, vale revisitar com um índice dedicado ou um serviço de busca.
router.get('/users', async (req, res) => {
  try {
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const result = await ddb.send(new ScanCommand({ TableName: TABLES.users }));
    const items = (result.Items ?? []) as Record<string, any>[];

    const matches = search
      ? items.filter((u) => u.username?.toLowerCase().includes(search) || u.fullName?.toLowerCase().includes(search))
      : items;

    res.json(matches.map(toCreatorSummary));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:username', optionalAuthenticate, async (req: any, res) => {
  try {
    const user = await findUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const [badges, projects, likedIds, isFollowingByMe] = await Promise.all([
      getUserBadges(user.id),
      getProjectsByOwnerId(user.id),
      getLikedProjectIds(req.user?.id),
      isFollowingUser(req.user?.id, user.id),
    ]);

    const sortedProjects = projects
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => toProjectResponse(p, user, likedIds.has(p.id)));

    res.json({ ...toProfile(user), badges, projects: sortedProjects, isFollowingByMe });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/me', authenticate, async (req: any, res) => {
  try {
    const { fullName, username, bio, avatarUrl, coverUrl, portfolioLink, contactEmail } = req.body ?? {};
    if (!fullName?.trim() || !username?.trim()) {
      return res.status(400).json({ error: 'Nome e usuário são obrigatórios.' });
    }

    if (username !== req.user.username) {
      const existing = await findUserByUsername(username);
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ error: 'Esse nome de usuário já está em uso.' });
      }
    }

    const current = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } }));
    if (!current.Item) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const updated: Record<string, any> = {
      ...current.Item,
      fullName, username,
      bio: bio ?? '',
      avatarUrl: avatarUrl ?? '',
      coverUrl: coverUrl ?? '',
      portfolioLink: portfolioLink ?? '',
      contactEmail: contactEmail ?? '',
    };

    await ddb.send(new PutCommand({ TableName: TABLES.users, Item: updated }));

    // Reemite o token porque o username (parte do payload do JWT) pode ter mudado.
    const token = jwt.sign({ id: updated.id, username: updated.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toPrivateUser(updated) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Exclusão de conta — irreversível. Limpa tudo que referencia o usuário antes de
// apagar o registro em si, pra não deixar sobras órfãs em outras tabelas
// (curtidas, follows nos dois sentidos, badges, projetos e as curtidas neles).
router.delete('/users/me', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [badgeLinks, following, followers, likesMade, projects] = await Promise.all([
      ddb.send(new QueryCommand({
        TableName: TABLES.userBadges,
        KeyConditionExpression: 'userId = :v',
        ExpressionAttributeValues: { ':v': userId },
      })),
      ddb.send(new QueryCommand({
        TableName: TABLES.follows,
        KeyConditionExpression: 'followerId = :v',
        ExpressionAttributeValues: { ':v': userId },
      })),
      ddb.send(new QueryCommand({
        TableName: TABLES.follows,
        IndexName: 'followingId-index',
        KeyConditionExpression: 'followingId = :v',
        ExpressionAttributeValues: { ':v': userId },
      })),
      ddb.send(new QueryCommand({
        TableName: TABLES.likes,
        KeyConditionExpression: 'userId = :v',
        ExpressionAttributeValues: { ':v': userId },
      })),
      getProjectsByOwnerId(userId),
    ]);

    // Curtidas em projetos de outras pessoas: dá pra decrementar o likeCount.
    // Curtidas nos próprios projetos não — esses projetos já vão ser apagados
    // por inteiro, e decrementar em paralelo a isso recriaria o item (o Update
    // do DynamoDB faz upsert, então "reviveria" um projeto que a mesma leva de
    // operações está deletando ao mesmo tempo).
    const ownProjectIds = new Set(projects.map((p) => p.id));
    const likesToDecrement = (likesMade.Items ?? []).filter((l: any) => !ownProjectIds.has(l.projectId));
    const followingIds = (following.Items ?? []).map((f: any) => f.followingId);

    await Promise.all([
      ...(badgeLinks.Items ?? []).map((b: any) =>
        ddb.send(new DeleteCommand({ TableName: TABLES.userBadges, Key: { userId: b.userId, badgeId: b.badgeId } }))
      ),
      ...(following.Items ?? []).map((f: any) =>
        ddb.send(new DeleteCommand({ TableName: TABLES.follows, Key: { followerId: f.followerId, followingId: f.followingId } }))
      ),
      ...followingIds.map((followingId: string) =>
        ddb.send(new UpdateCommand({
          TableName: TABLES.users,
          Key: { id: followingId },
          UpdateExpression: 'ADD followers :dec',
          ExpressionAttributeValues: { ':dec': -1 },
        }))
      ),
      ...(followers.Items ?? []).map((f: any) =>
        ddb.send(new DeleteCommand({ TableName: TABLES.follows, Key: { followerId: f.followerId, followingId: f.followingId } }))
      ),
      ...(likesMade.Items ?? []).map((l: any) =>
        ddb.send(new DeleteCommand({ TableName: TABLES.likes, Key: { userId: l.userId, projectId: l.projectId } }))
      ),
      ...likesToDecrement.map((l: any) =>
        ddb.send(new UpdateCommand({
          TableName: TABLES.projects,
          Key: { id: l.projectId },
          UpdateExpression: 'ADD likeCount :dec',
          ExpressionAttributeValues: { ':dec': -1 },
        }))
      ),
      ...projects.map(async (p) => {
        const projectLikes = await ddb.send(new QueryCommand({
          TableName: TABLES.likes,
          IndexName: 'projectId-index',
          KeyConditionExpression: 'projectId = :v',
          ExpressionAttributeValues: { ':v': p.id },
        }));
        await Promise.all((projectLikes.Items ?? []).map((l: any) =>
          ddb.send(new DeleteCommand({ TableName: TABLES.likes, Key: { userId: l.userId, projectId: l.projectId } }))
        ));
        await ddb.send(new DeleteCommand({ TableName: TABLES.projects, Key: { id: p.id } }));
      }),
    ]);

    await ddb.send(new DeleteCommand({ TableName: TABLES.users, Key: { id: userId } }));
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- SEGUIR --

router.post('/users/:username/follow', authenticate, async (req: any, res) => {
  try {
    const target = await findUserByUsername(req.params.username);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (target.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode seguir a si mesmo.' });
    }

    try {
      await ddb.send(new PutCommand({
        TableName: TABLES.follows,
        Item: { followerId: req.user.id, followingId: target.id, createdAt: new Date().toISOString() },
        ConditionExpression: 'attribute_not_exists(followerId)',
      }));
    } catch (err: any) {
      // Já seguia — idempotente, não incrementa de novo.
      if (err.name !== 'ConditionalCheckFailedException') throw err;
      const current = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: target.id } }));
      return res.json({ following: true, followers: current.Item?.followers ?? 0 });
    }

    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLES.users,
      Key: { id: target.id },
      UpdateExpression: 'ADD followers :inc',
      ExpressionAttributeValues: { ':inc': 1 },
      ReturnValues: 'UPDATED_NEW',
    }));
    res.json({ following: true, followers: updated.Attributes?.followers ?? 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:username/follow', authenticate, async (req: any, res) => {
  try {
    const target = await findUserByUsername(req.params.username);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });

    try {
      await ddb.send(new DeleteCommand({
        TableName: TABLES.follows,
        Key: { followerId: req.user.id, followingId: target.id },
        ConditionExpression: 'attribute_exists(followerId)',
      }));
    } catch (err: any) {
      // Já não seguia — idempotente, não decrementa de novo.
      if (err.name !== 'ConditionalCheckFailedException') throw err;
      const current = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: target.id } }));
      return res.json({ following: false, followers: current.Item?.followers ?? 0 });
    }

    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLES.users,
      Key: { id: target.id },
      UpdateExpression: 'ADD followers :dec',
      ExpressionAttributeValues: { ':dec': -1 },
      ReturnValues: 'UPDATED_NEW',
    }));
    res.json({ following: false, followers: Math.max(0, updated.Attributes?.followers ?? 0) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:username/follow-status', authenticate, async (req: any, res) => {
  try {
    const target = await findUserByUsername(req.params.username);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (target.id === req.user.id) return res.json({ following: false });

    const result = await ddb.send(new GetCommand({
      TableName: TABLES.follows,
      Key: { followerId: req.user.id, followingId: target.id },
    }));
    res.json({ following: Boolean(result.Item) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- FEED PERSONALIZADO --

// Feed da Home pra quem está logado: projetos públicos de quem o usuário segue,
// mais recentes primeiro. Consulta FolioFollows (partição followerId — sem
// precisar de GSI) pra achar quem é seguido, depois faz uma query por dono via
// ownerId-slug-index (já existente) e junta tudo em memória. Preferi essa
// abordagem a escanear o feed-index inteiro e filtrar depois: o custo aqui
// escala com quem o usuário segue, não com o total de projetos da plataforma.
router.get('/feed/following', authenticate, async (req: any, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 50);

    const followsResult = await ddb.send(new QueryCommand({
      TableName: TABLES.follows,
      KeyConditionExpression: 'followerId = :v',
      ExpressionAttributeValues: { ':v': req.user.id },
    }));
    const followingIds: string[] = (followsResult.Items ?? []).map((item: any) => item.followingId);

    if (followingIds.length === 0) {
      return res.json({ projects: [], followingCount: 0 });
    }

    const projectsByOwner = await Promise.all(followingIds.map((ownerId) => getProjectsByOwnerId(ownerId)));
    const publicProjects = projectsByOwner
      .flat()
      .filter((p) => p.isPublic)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const [owners, likedIds] = await Promise.all([
      Promise.all(publicProjects.map((p) => ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: p.ownerId } })))),
      getLikedProjectIds(req.user.id),
    ]);

    res.json({
      projects: publicProjects.map((p, i) => toProjectResponse(p, owners[i].Item, likedIds.has(p.id))),
      followingCount: followingIds.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- PROJECTS --

// Feed público (Home/Descobrir): só projetos com isPublic=true, mais recentes primeiro.
// Usa o GSI esparso feed-index — feedKey só existe no item quando o projeto está publicado.
router.get('/projects', optionalAuthenticate, async (req: any, res) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.projects,
      IndexName: 'feed-index',
      KeyConditionExpression: 'feedKey = :v',
      ExpressionAttributeValues: { ':v': 'PUBLIC' },
      ScanIndexForward: false,
    }));
    const items = (result.Items ?? []) as Record<string, any>[];

    const [owners, likedIds] = await Promise.all([
      Promise.all(items.map((p) => ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: p.ownerId } })))),
      getLikedProjectIds(req.user?.id),
    ]);
    res.json(items.map((p, i) => toProjectResponse(p, owners[i].Item, likedIds.has(p.id))));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Página pública do projeto (/@usuário/slug) e formulário de edição.
router.get('/projects/:username/:slug', optionalAuthenticate, async (req: any, res) => {
  try {
    const owner = await findUserByUsername(req.params.username);
    if (!owner) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.projects,
      IndexName: 'ownerId-slug-index',
      KeyConditionExpression: 'ownerId = :o AND slug = :s',
      ExpressionAttributeValues: { ':o': owner.id, ':s': req.params.slug },
      Limit: 1,
    }));
    const project = result.Items?.[0];
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const liked = await hasLiked(req.user?.id, project.id);
    res.json(toProjectResponse(project, owner, liked));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Incremento simples de visualização (sem sistema de analytics) — soma atômica no DynamoDB.
router.post('/projects/:id/view', async (req, res) => {
  try {
    await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: 'ADD viewCount :inc',
      ExpressionAttributeValues: { ':inc': 1 },
    }));
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects', authenticate, async (req: any, res) => {
  try {
    const { title, slug, description, tags, coverImageUrl, gallery, isPublic } = req.body ?? {};
    if (!title?.trim()) return res.status(400).json({ error: 'Dê um título ao projeto.' });
    if (!coverImageUrl) return res.status(400).json({ error: 'Adicione uma imagem de capa.' });

    const id = uuidv4();
    const finalSlug = await generateUniqueProjectSlug(req.user.id, slug?.trim() || title);
    const now = new Date().toISOString();

    const project: Record<string, any> = {
      id,
      ownerId: req.user.id,
      title,
      slug: finalSlug,
      description: description ?? '',
      coverImageUrl,
      tags: tags ?? [],
      gallery: gallery ?? [],
      isPublic: Boolean(isPublic),
      feedKey: isPublic ? 'PUBLIC' : undefined,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({
      TableName: TABLES.projects,
      Item: project,
      ConditionExpression: 'attribute_not_exists(id)',
    }));
    res.json(toProjectResponse(project));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/projects/:id', authenticate, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!current.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (current.Item.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem permissão para editar esse projeto.' });
    }

    const { title, slug, description, tags, coverImageUrl, gallery, isPublic } = req.body ?? {};
    if (!title?.trim()) return res.status(400).json({ error: 'Dê um título ao projeto.' });
    if (!coverImageUrl) return res.status(400).json({ error: 'Adicione uma imagem de capa.' });

    const requestedSlug = slugify(slug?.trim() || title) || 'projeto';
    const finalSlug = requestedSlug === current.Item.slug
      ? current.Item.slug
      : await generateUniqueProjectSlug(req.user.id, requestedSlug, req.params.id);

    const updated: Record<string, any> = {
      ...current.Item,
      title,
      slug: finalSlug,
      description: description ?? '',
      coverImageUrl,
      tags: tags ?? [],
      gallery: gallery ?? [],
      isPublic: Boolean(isPublic),
      feedKey: isPublic ? 'PUBLIC' : undefined,
      updatedAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLES.projects, Item: updated }));
    res.json(toProjectResponse(updated));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- CURTIDAS --

router.post('/projects/:id/like', authenticate, async (req: any, res) => {
  try {
    const project = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!project.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });

    try {
      await ddb.send(new PutCommand({
        TableName: TABLES.likes,
        Item: { userId: req.user.id, projectId: req.params.id, createdAt: new Date().toISOString() },
        ConditionExpression: 'attribute_not_exists(userId)',
      }));
    } catch (err: any) {
      // Já tinha curtido — idempotente, não incrementa de novo.
      if (err.name !== 'ConditionalCheckFailedException') throw err;
      return res.json({ liked: true, likeCount: project.Item.likeCount ?? 0 });
    }

    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: 'ADD likeCount :inc',
      ExpressionAttributeValues: { ':inc': 1 },
      ReturnValues: 'UPDATED_NEW',
    }));
    res.json({ liked: true, likeCount: updated.Attributes?.likeCount ?? 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/projects/:id/like', authenticate, async (req: any, res) => {
  try {
    try {
      await ddb.send(new DeleteCommand({
        TableName: TABLES.likes,
        Key: { userId: req.user.id, projectId: req.params.id },
        ConditionExpression: 'attribute_exists(userId)',
      }));
    } catch (err: any) {
      // Já não tinha curtido — idempotente, não decrementa de novo.
      if (err.name !== 'ConditionalCheckFailedException') throw err;
      const current = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
      return res.json({ liked: false, likeCount: current.Item?.likeCount ?? 0 });
    }

    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: 'ADD likeCount :dec',
      ExpressionAttributeValues: { ':dec': -1 },
      ReturnValues: 'UPDATED_NEW',
    }));
    res.json({ liked: false, likeCount: Math.max(0, updated.Attributes?.likeCount ?? 0) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- UPLOAD --

// Nome do objeto: uuid + extensão original — evita colisão e não expõe o nome
// de arquivo que o usuário mandou. `folder` vem do form-data do cliente, mas
// é validado contra uma lista fixa antes de virar parte da key do S3.
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const folder = req.body.folder === 'avatars' ? 'avatars' : 'projects';
    const ext = path.extname(req.file.originalname);
    const key = `${folder}/${uuidv4()}${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    res.json({ url: s3PublicUrl(key) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as apiRouter };
