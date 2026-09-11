import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ddb, TABLES } from './dynamo.ts';
import { s3, S3_BUCKET, s3PublicUrl } from './s3.ts';
import { DEFAULT_PROJECT_STYLES, type ProjectStyles } from '../types/project.ts';
import {
  formatUploadLimitError,
  resolveUploadKind,
  UPLOAD_LIMITS_BYTES,
  UPLOAD_SAFETY_CEILING_BYTES,
} from '../config/uploadLimits.ts';

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
// O fileSize aqui é só um teto de proteção de memória (maior que qualquer
// limite por tipo); a validação que realmente importa — por tipo de upload,
// com mensagem específica — acontece depois de já sabermos o "folder"/"purpose".
const ACCEPTED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_SAFETY_CEILING_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ACCEPTED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Formato inválido. Use JPG, PNG ou WEBP.'));
      return;
    }
    cb(null, true);
  },
});

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
  const { id, username, email, fullName, avatarUrl, bio, coverUrl, whatsapp, instagram, facebook } = user;
  return {
    id,
    username,
    email,
    fullName,
    bio: bio ?? '',
    avatarUrl,
    coverUrl: coverUrl ?? '',
    whatsapp: whatsapp ?? '',
    instagram: instagram ?? '',
    facebook: facebook ?? '',
    onboardingCompleted: user.onboarding_completed ?? true,
    onboardingStep: user.onboarding_step ?? 1,
  };
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
    id, username, fullName, bio, category, location, createdAt,
    avatarUrl, coverUrl, portfolioLink, contactEmail, whatsapp, instagram, facebook, followers, skills,
  } = user;
  return {
    id, username, fullName,
    bio: bio ?? '', category: category ?? '', location: location ?? '',
    avatarUrl: avatarUrl ?? '', coverUrl: coverUrl ?? '',
    portfolioLink: portfolioLink ?? '', contactEmail: contactEmail ?? '', whatsapp: whatsapp ?? '',
    instagram: instagram ?? '', facebook: facebook ?? '',
    followers: followers ?? 0, skills: skills ?? [], createdAt: createdAt ?? '',
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

function normalizeWhatsapp(value: unknown) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 15);
}

function isValidWhatsapp(value: string) {
  return !value || (value.length >= 10 && value.length <= 15);
}

function normalizeSocial(value: unknown) {
  return String(value ?? '').trim().replace(/^@+/, '').slice(0, 80);
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

// Projetos onde algum dos userIds dados é colaborador ACEITO (não dono). Não há
// GSI pra "colaboradores" — a lista fica dentro do próprio item do projeto, então
// isso exige um Scan da tabela inteira. Aceitável na escala atual (MVP), igual ao
// scan de usuários em GET /users; se a base de projetos crescer muito, vale
// revisitar com uma tabela dedicada de colaborações com GSI por userId.
async function getProjectsByAcceptedCollaboratorIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  const idSet = new Set(userIds);
  const result = await ddb.send(new ScanCommand({ TableName: TABLES.projects }));
  return ((result.Items ?? []) as Record<string, any>[]).filter((p) =>
    ((p.collaborators ?? []) as Array<{ userId: string; status: string }>).some(
      (c) => c.status === 'accepted' && idSet.has(c.userId)
    )
  );
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

/** Busca vários usuários de uma vez e devolve um Map id -> registro completo —
    reaproveitado pra montar owner + colaboradores de uma lista de projetos sem
    repetir GetCommand pro mesmo usuário. */
async function getUsersById(userIds: string[]): Promise<Map<string, Record<string, any>>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();
  const results = await Promise.all(
    uniqueIds.map((id) => ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id } })))
  );
  const map = new Map<string, Record<string, any>>();
  results.forEach((r, i) => {
    if (r.Item) map.set(uniqueIds[i], r.Item);
  });
  return map;
}

/** Colaboradores ACEITOS de um projeto, resolvidos pra autor público — convites
    pendentes ou recusados nunca aparecem aqui (não ficam vinculados publicamente). */
function resolveCollaboratorAuthors(project: Record<string, any>, usersById: Map<string, Record<string, any>>) {
  return ((project.collaborators ?? []) as Array<{ userId: string; status: string }>)
    .filter((c) => c.status === 'accepted')
    .map((c) => usersById.get(c.userId))
    .filter((u): u is Record<string, any> => Boolean(u))
    .map(toPublicAuthor);
}

/** Remove o feedKey interno (detalhe de implementação do índice esparso), a lista
    crua de colaboradores (com userId/status) e o espaço interno de colaboração
    (notas) da resposta — nunca vazam pra visualização pública. Colaboradores
    voltam como lista já resolvida, filtrada só pelos aceitos. */
function toProjectResponse(
  project: Record<string, any>,
  owner?: Record<string, any>,
  likedByMe = false,
  usersById: Map<string, Record<string, any>> = new Map()
) {
  const { feedKey, collaborators: _rawCollaborators, notes: _notes, notesUpdatedBy: _notesUpdatedBy, notesUpdatedAt: _notesUpdatedAt, ...rest } = project;
  const base = owner ? { ...rest, user: toPublicAuthor(owner) } : rest;
  return { ...base, likedByMe, collaborators: resolveCollaboratorAuthors(project, usersById) };
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

type NotificationType =
  | 'like'
  | 'follow'
  | 'comment'
  | 'mention'
  | 'collaboration_invite'
  | 'collaboration_accepted'
  | 'project_activity';

async function createNotification(input: {
  userId: string;
  type: NotificationType;
  actor: Record<string, any>;
  targetType: 'project' | 'profile';
  targetId: string;
  targetTitle?: string;
  targetUrl?: string;
  // Só usado com type 'project_activity' — distingue menção em mensagem de
  // atribuição de tarefa sem precisar de um NotificationType por ação.
  activityKind?: 'mention' | 'task_assigned';
}) {
  if (!input.userId || input.userId === input.actor.id) return;

  try {
    await ddb.send(new PutCommand({
      TableName: TABLES.notifications,
      Item: {
        notificationId: uuidv4(),
        userId: input.userId,
        type: input.type,
        actorId: input.actor.id,
        actorName: input.actor.fullName ?? input.actor.username ?? 'Alguém',
        actorAvatar: input.actor.avatarUrl ?? '',
        targetType: input.targetType,
        targetId: input.targetId,
        targetTitle: input.targetTitle ?? '',
        targetUrl: input.targetUrl ?? '',
        activityKind: input.activityKind,
        read: false,
        createdAt: new Date().toISOString(),
      },
    }));
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
}

// -- AUTH --

router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body ?? {};
    const finalUsername = normalizeUsername(username ?? '');
    if (!finalUsername || !email || !password || !fullName) {
      return res.status(400).json({ error: 'Preencha nome, usuário, e-mail e senha.' });
    }
    if (!isValidUsername(finalUsername)) {
      return res.status(400).json({ error: 'Use um nome de usuário com 3 a 24 letras, números ou underline.' });
    }

    const [byUsername, byEmail] = await Promise.all([
      findUserByUsername(finalUsername),
      findUserByEmail(email),
    ]);
    if (byUsername) return res.status(400).json({ error: 'Esse nome de usuário já está em uso.' });
    if (byEmail) return res.status(400).json({ error: 'Esse e-mail já está cadastrado.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const user = {
      id,
      username: finalUsername,
      email,
      passwordHash,
      fullName,
      whatsapp: '',
      instagram: '',
      facebook: '',
      followers: 0,
      skills: [],
      onboarding_completed: false,
      onboarding_step: 1,
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({
      TableName: TABLES.users,
      Item: user,
      ConditionExpression: 'attribute_not_exists(id)',
    }));

    const token = jwt.sign({ id, username: finalUsername }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toPrivateUser(user) });
  } catch (error: any) {
    console.error('Erro ao cadastrar usuário:', error);
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

// -- ONBOARDING --

router.get('/users/check-username', authenticate, async (req: any, res) => {
  try {
    const username = normalizeUsername((req.query.username as string) ?? '');
    if (!isValidUsername(username)) {
      return res.json({ available: false, reason: 'Use 3 a 24 letras, números ou underline.' });
    }

    const existing = await findUserByUsername(username);
    res.json({ available: !existing || existing.id === req.user.id });
  } catch (error: any) {
    res.status(500).json({ error: 'Não foi possível verificar o nome de usuário.' });
  }
});

router.put('/onboarding', authenticate, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } }));
    if (!current.Item) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const {
      fullName,
      username,
      bio,
      avatarUrl,
      coverUrl,
      onboardingStep,
      onboardingCompleted,
    } = req.body ?? {};

    const updated: Record<string, any> = { ...current.Item };

    if (fullName !== undefined) {
      if (!String(fullName).trim()) return res.status(400).json({ error: 'Informe seu nome completo.' });
      updated.fullName = String(fullName).trim();
    }

    if (username !== undefined) {
      const finalUsername = normalizeUsername(username);
      if (!isValidUsername(finalUsername)) {
        return res.status(400).json({ error: 'Use um nome de usuário com 3 a 24 letras, números ou underline.' });
      }
      if (finalUsername !== current.Item.username) {
        const existing = await findUserByUsername(finalUsername);
        if (existing && existing.id !== req.user.id) {
          return res.status(400).json({ error: 'Esse nome de usuário já está em uso.' });
        }
      }
      updated.username = finalUsername;
    }

    if (bio !== undefined) updated.bio = String(bio ?? '').slice(0, 180);
    if (avatarUrl !== undefined) updated.avatarUrl = String(avatarUrl ?? '');
    if (coverUrl !== undefined) updated.coverUrl = String(coverUrl ?? '');
    if (onboardingStep !== undefined) {
      updated.onboarding_step = Math.min(Math.max(Number(onboardingStep) || 1, 1), 4);
    }
    if (onboardingCompleted !== undefined) {
      if (onboardingCompleted && (!updated.fullName || !updated.username || !updated.avatarUrl || !updated.coverUrl)) {
        return res.status(400).json({ error: 'Complete perfil, avatar e capa antes de finalizar.' });
      }
      updated.onboarding_completed = Boolean(onboardingCompleted);
      if (updated.onboarding_completed) updated.onboarding_step = 4;
    }

    await ddb.send(new PutCommand({ TableName: TABLES.users, Item: updated }));
    const token = jwt.sign({ id: updated.id, username: updated.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: toPrivateUser(updated) });
  } catch (error: any) {
    console.error('Erro ao salvar onboarding:', error);
    return res.status(500).json({ error: 'Não foi possível salvar seu progresso agora. Verifique sua conexão e tente novamente.' });
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

    const [badges, ownedProjects, collaboratingProjects, likedIds, ownerLikedIds, isFollowingByMe, following] = await Promise.all([
      getUserBadges(user.id),
      getProjectsByOwnerId(user.id),
      getProjectsByAcceptedCollaboratorIds([user.id]),
      getLikedProjectIds(req.user?.id),
      getLikedProjectIds(user.id),
      isFollowingUser(req.user?.id, user.id),
      ddb.send(new QueryCommand({
        TableName: TABLES.follows,
        KeyConditionExpression: 'followerId = :v',
        ExpressionAttributeValues: { ':v': user.id },
      })),
    ]);

    // Projetos onde o usuário é dono OU colaborador aceito — a mesma aba
    // "Projetos" mostra os dois casos.
    const projectsById = new Map<string, Record<string, any>>();
    [...ownedProjects, ...collaboratingProjects].forEach((p) => projectsById.set(p.id, p));
    const allProjects = [...projectsById.values()];

    // Projetos curtidos pelo usuário do perfil (aba "Curtidos") — só os públicos,
    // já que um projeto privado de outra pessoa nunca chega a ser curtível por ele.
    const likedProjectItems = (
      await Promise.all(
        [...ownerLikedIds].map((projectId) => ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: projectId } })))
      )
    )
      .map((r) => r.Item)
      .filter((p): p is Record<string, any> => Boolean(p) && p!.isPublic);

    const usersById = await getUsersById([
      user.id,
      ...allProjects.map((p) => p.ownerId),
      ...allProjects.flatMap((p) =>
        ((p.collaborators ?? []) as Array<{ userId: string; status: string }>)
          .filter((c) => c.status === 'accepted')
          .map((c) => c.userId)
      ),
      ...likedProjectItems.map((p) => p.ownerId),
    ]);

    const sortedProjects = allProjects
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => toProjectResponse(p, usersById.get(p.ownerId) ?? user, likedIds.has(p.id), usersById));

    const likedProjects = likedProjectItems
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => toProjectResponse(p, usersById.get(p.ownerId), likedIds.has(p.id), usersById));

    res.json({
      ...toProfile(user),
      badges,
      projects: sortedProjects,
      likedProjects,
      followingCount: following.Items?.length ?? 0,
      isFollowingByMe,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/me', authenticate, async (req: any, res) => {
  try {
    const { fullName, username, bio, avatarUrl, coverUrl, portfolioLink, contactEmail, whatsapp, instagram, facebook, location, category } = req.body ?? {};
    if (!fullName?.trim() || !username?.trim()) {
      return res.status(400).json({ error: 'Nome e usuário são obrigatórios.' });
    }

    const normalizedWhatsapp = normalizeWhatsapp(whatsapp);
    if (!isValidWhatsapp(normalizedWhatsapp)) {
      return res.status(400).json({ error: 'Informe o WhatsApp no formato internacional, apenas números.' });
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
      whatsapp: normalizedWhatsapp,
      instagram: normalizeSocial(instagram),
      facebook: normalizeSocial(facebook),
      location: location ?? '',
      category: category ?? '',
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
        const [projectLikes, projectMessages, projectTasks] = await Promise.all([
          ddb.send(new QueryCommand({
            TableName: TABLES.likes,
            IndexName: 'projectId-index',
            KeyConditionExpression: 'projectId = :v',
            ExpressionAttributeValues: { ':v': p.id },
          })),
          ddb.send(new QueryCommand({
            TableName: TABLES.projectMessages,
            IndexName: 'projectId-createdAt-index',
            KeyConditionExpression: 'projectId = :v',
            ExpressionAttributeValues: { ':v': p.id },
          })),
          ddb.send(new QueryCommand({
            TableName: TABLES.projectTasks,
            IndexName: 'projectId-createdAt-index',
            KeyConditionExpression: 'projectId = :v',
            ExpressionAttributeValues: { ':v': p.id },
          })),
        ]);
        await Promise.all([
          ...(projectLikes.Items ?? []).map((l: any) =>
            ddb.send(new DeleteCommand({ TableName: TABLES.likes, Key: { userId: l.userId, projectId: l.projectId } }))
          ),
          ...(projectMessages.Items ?? []).map((m: any) =>
            ddb.send(new DeleteCommand({ TableName: TABLES.projectMessages, Key: { messageId: m.messageId } }))
          ),
          ...(projectTasks.Items ?? []).map((t: any) =>
            ddb.send(new DeleteCommand({ TableName: TABLES.projectTasks, Key: { taskId: t.taskId } }))
          ),
        ]);
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
    const actor = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } }));
    if (actor.Item) {
      await createNotification({
        userId: target.id,
        type: 'follow',
        actor: actor.Item,
        targetType: 'profile',
        targetId: actor.Item.username,
      });
    }
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

// Lista de quem SEGUE esse usuário — via GSI followingId-index (sem custo de Scan).
router.get('/users/:username/followers', optionalAuthenticate, async (req: any, res) => {
  try {
    const target = await findUserByUsername(req.params.username);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.follows,
      IndexName: 'followingId-index',
      KeyConditionExpression: 'followingId = :v',
      ExpressionAttributeValues: { ':v': target.id },
    }));
    const followerIds: string[] = (result.Items ?? []).map((item: any) => item.followerId);
    const usersById = await getUsersById(followerIds);
    const users = followerIds.map((id) => usersById.get(id)).filter(Boolean) as Record<string, any>[];

    res.json({
      users: users.map((u) => ({ ...toCreatorSummary(u), isFollowingByMe: false })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Lista de quem esse usuário SEGUE — partição followerId, sem precisar de GSI.
router.get('/users/:username/following', optionalAuthenticate, async (req: any, res) => {
  try {
    const target = await findUserByUsername(req.params.username);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.follows,
      KeyConditionExpression: 'followerId = :v',
      ExpressionAttributeValues: { ':v': target.id },
    }));
    const followingIds: string[] = (result.Items ?? []).map((item: any) => item.followingId);
    const usersById = await getUsersById(followingIds);
    const users = followingIds.map((id) => usersById.get(id)).filter(Boolean) as Record<string, any>[];

    res.json({
      users: users.map((u) => ({ ...toCreatorSummary(u) })),
    });
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
// Também entram projetos onde um dos seguidos é colaborador aceito (não só
// dono) — daí o getProjectsByAcceptedCollaboratorIds em paralelo.
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

    const [projectsByOwner, projectsByCollaborator] = await Promise.all([
      Promise.all(followingIds.map((ownerId) => getProjectsByOwnerId(ownerId))),
      getProjectsByAcceptedCollaboratorIds(followingIds),
    ]);

    const projectsById = new Map<string, Record<string, any>>();
    [...projectsByOwner.flat(), ...projectsByCollaborator].forEach((p) => {
      if (p.isPublic) projectsById.set(p.id, p);
    });

    const publicProjects = [...projectsById.values()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const [usersById, likedIds] = await Promise.all([
      getUsersById([
        ...publicProjects.map((p) => p.ownerId),
        ...publicProjects.flatMap((p) =>
          ((p.collaborators ?? []) as Array<{ userId: string; status: string }>)
            .filter((c) => c.status === 'accepted')
            .map((c) => c.userId)
        ),
      ]),
      getLikedProjectIds(req.user.id),
    ]);

    res.json({
      projects: publicProjects.map((p) => toProjectResponse(p, usersById.get(p.ownerId), likedIds.has(p.id), usersById)),
      followingCount: followingIds.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- NOTIFICAÇÕES --

router.get('/notifications', authenticate, async (req: any, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 50);
    const cursor = req.query.cursor ? JSON.parse(Buffer.from(String(req.query.cursor), 'base64url').toString('utf8')) : undefined;

    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.notifications,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :v',
      ExpressionAttributeValues: { ':v': req.user.id },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: cursor,
    }));

    res.json({
      notifications: result.Items ?? [],
      nextCursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url')
        : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Não foi possível carregar suas notificações.' });
  }
});

router.get('/notifications/unread-count', authenticate, async (req: any, res) => {
  try {
    let cursor: Record<string, any> | undefined;
    let count = 0;
    do {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLES.notifications,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :v',
        ExpressionAttributeValues: { ':v': req.user.id },
        ExclusiveStartKey: cursor,
      }));
      count += (result.Items ?? []).filter((item: any) => item.read !== true).length;
      cursor = result.LastEvaluatedKey;
    } while (cursor);

    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: 'Não foi possível contar suas notificações.' });
  }
});

router.patch('/notifications/:id/read', authenticate, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.notifications, Key: { notificationId: req.params.id } }));
    if (!current.Item || current.Item.userId !== req.user.id) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    await ddb.send(new UpdateCommand({
      TableName: TABLES.notifications,
      Key: { notificationId: req.params.id },
      UpdateExpression: 'SET #read = :true',
      ExpressionAttributeNames: { '#read': 'read' },
      ExpressionAttributeValues: { ':true': true },
    }));
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Não foi possível marcar a notificação como lida.' });
  }
});

router.patch('/notifications/read-all', authenticate, async (req: any, res) => {
  try {
    let cursor: Record<string, any> | undefined;
    do {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLES.notifications,
        IndexName: 'userId-createdAt-index',
        KeyConditionExpression: 'userId = :v',
        ExpressionAttributeValues: { ':v': req.user.id },
        ExclusiveStartKey: cursor,
      }));

      await Promise.all((result.Items ?? [])
        .filter((item: any) => item.read !== true)
        .map((item: any) => ddb.send(new UpdateCommand({
          TableName: TABLES.notifications,
          Key: { notificationId: item.notificationId },
          UpdateExpression: 'SET #read = :true',
          ExpressionAttributeNames: { '#read': 'read' },
          ExpressionAttributeValues: { ':true': true },
        }))));

      cursor = result.LastEvaluatedKey;
    } while (cursor);

    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Não foi possível marcar notificações como lidas.' });
  }
});

// -- MENSAGENS DIRETAS --

// Id determinístico da conversa entre dois usuários — sempre os dois ids
// ordenados, então A->B e B->A caem na mesma partição de FolioDirectMessages.
function conversationIdFor(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort().join('_');
}

// Lista de conversas do usuário logado, mais recente primeiro — cada linha em
// FolioConversations já é a "cópia" dessa conversa do ponto de vista dele
// (unreadCount próprio, sem precisar olhar a cópia do outro participante).
router.get('/messages', authenticate, async (req: any, res) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.conversations,
      KeyConditionExpression: 'userId = :v',
      ExpressionAttributeValues: { ':v': req.user.id },
    }));
    const rows = (result.Items ?? []) as Record<string, any>[];
    const usersById = await getUsersById(rows.map((r) => r.otherUserId));

    const conversations = rows
      .map((r) => ({
        otherUser: usersById.has(r.otherUserId) ? toCreatorSummary(usersById.get(r.otherUserId)!) : null,
        lastMessage: r.lastMessage ?? '',
        lastMessageAt: r.lastMessageAt ?? null,
        lastSenderId: r.lastSenderId ?? null,
        unreadCount: r.unreadCount ?? 0,
      }))
      .filter((c) => c.otherUser)
      .sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime());

    res.json({ conversations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/messages/unread-count', authenticate, async (req: any, res) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.conversations,
      KeyConditionExpression: 'userId = :v',
      ExpressionAttributeValues: { ':v': req.user.id },
    }));
    const count = (result.Items ?? []).reduce((sum: number, r: any) => sum + (r.unreadCount ?? 0), 0);
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Histórico de mensagens com um usuário específico — abrir a conversa marca
// as mensagens dele como lidas (zera o unreadCount da nossa cópia).
router.get('/messages/:username', authenticate, async (req: any, res) => {
  try {
    const other = await findUserByUsername(req.params.username);
    if (!other) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (other.id === req.user.id) return res.status(400).json({ error: 'Você não pode enviar mensagens para si mesmo.' });

    const conversationId = conversationIdFor(req.user.id, other.id);
    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.directMessages,
      KeyConditionExpression: 'conversationId = :v',
      ExpressionAttributeValues: { ':v': conversationId },
    }));

    await ddb.send(new UpdateCommand({
      TableName: TABLES.conversations,
      Key: { userId: req.user.id, otherUserId: other.id },
      UpdateExpression: 'SET unreadCount = :zero',
      ExpressionAttributeValues: { ':zero': 0 },
    })).catch(() => undefined);

    res.json({
      otherUser: toCreatorSummary(other),
      messages: (result.Items ?? []).map((m: any) => ({
        messageId: m.messageId,
        senderId: m.senderId,
        text: m.text,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/messages/:username', authenticate, async (req: any, res) => {
  try {
    const other = await findUserByUsername(req.params.username);
    if (!other) return res.status(404).json({ error: 'Usuário não encontrado.' });
    if (other.id === req.user.id) return res.status(400).json({ error: 'Você não pode enviar mensagens para si mesmo.' });

    const text = String(req.body?.text ?? '').trim().slice(0, 4000);
    if (!text) return res.status(400).json({ error: 'Escreva uma mensagem.' });

    const conversationId = conversationIdFor(req.user.id, other.id);
    const now = new Date().toISOString();
    const messageId = uuidv4();

    await ddb.send(new PutCommand({
      TableName: TABLES.directMessages,
      Item: { conversationId, sortKey: `${now}#${messageId}`, messageId, senderId: req.user.id, recipientId: other.id, text, createdAt: now },
    }));

    await Promise.all([
      ddb.send(new UpdateCommand({
        TableName: TABLES.conversations,
        Key: { userId: req.user.id, otherUserId: other.id },
        UpdateExpression: 'SET lastMessage = :msg, lastMessageAt = :at, lastSenderId = :sender, unreadCount = :zero',
        ExpressionAttributeValues: { ':msg': text, ':at': now, ':sender': req.user.id, ':zero': 0 },
      })),
      ddb.send(new UpdateCommand({
        TableName: TABLES.conversations,
        Key: { userId: other.id, otherUserId: req.user.id },
        UpdateExpression: 'SET lastMessage = :msg, lastMessageAt = :at, lastSenderId = :sender ADD unreadCount :one',
        ExpressionAttributeValues: { ':msg': text, ':at': now, ':sender': req.user.id, ':one': 1 },
      })),
    ]);

    res.json({ messageId, senderId: req.user.id, text, createdAt: now });
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

    const [usersById, likedIds] = await Promise.all([
      getUsersById([
        ...items.map((p) => p.ownerId),
        ...items.flatMap((p) =>
          ((p.collaborators ?? []) as Array<{ userId: string; status: string }>)
            .filter((c) => c.status === 'accepted')
            .map((c) => c.userId)
        ),
      ]),
      getLikedProjectIds(req.user?.id),
    ]);
    res.json(items.map((p) => toProjectResponse(p, usersById.get(p.ownerId), likedIds.has(p.id), usersById)));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- COLABORADORES --
// Registradas antes de /projects/:username/:slug de propósito: esse padrão
// mais genérico casaria com /projects/<id>/collaborators (username=<id>,
// slug="collaborators") e roubaria a rota se viesse primeiro.

type CollaboratorEntry = { userId: string; status: 'pending' | 'accepted' | 'declined'; invitedAt: string };

/** Dono + colaboradores aceitos — quem tem acesso ao espaço interno do projeto. */
function getProjectMemberIds(project: Record<string, any>): string[] {
  const collaboratorIds = ((project.collaborators ?? []) as CollaboratorEntry[])
    .filter((c) => c.status === 'accepted')
    .map((c) => c.userId);
  return [project.ownerId, ...collaboratorIds];
}

// Autorização do "Espaço do projeto" (mensagens, tarefas, notas): só dono ou
// colaborador aceito. Roda depois de authenticate; anexa o projeto carregado em
// req.project pra as rotas não repetirem o GetCommand.
const requireProjectMember = async (req: any, res: any, next: any) => {
  try {
    const project = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!project.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });

    if (!getProjectMemberIds(project.Item).includes(req.user.id)) {
      return res.status(403).json({ error: 'Você não tem acesso ao espaço deste projeto.' });
    }

    req.project = project.Item;
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Lista completa (pendentes, aceitos e recusados) — só o dono do projeto vê isso;
// é o que alimenta o painel "Colaboradores" no editor. A resposta pública do
// projeto (toProjectResponse) só expõe os aceitos.
router.get('/projects/:id/collaborators', authenticate, async (req: any, res) => {
  try {
    const project = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!project.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (project.Item.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem permissão para ver os colaboradores desse projeto.' });
    }

    const entries: CollaboratorEntry[] = project.Item.collaborators ?? [];
    const usersById = await getUsersById(entries.map((c) => c.userId));

    res.json({
      collaborators: entries
        .map((c) => {
          const user = usersById.get(c.userId);
          if (!user) return null;
          return { ...toPublicAuthor(user), status: c.status, invitedAt: c.invitedAt };
        })
        .filter(Boolean),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects/:id/collaborators', authenticate, async (req: any, res) => {
  try {
    const project = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!project.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (project.Item.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem permissão para convidar colaboradores para esse projeto.' });
    }

    const username = normalizeUsername(String(req.body?.username ?? ''));
    if (!username) return res.status(400).json({ error: 'Informe o @usuário do colaborador.' });

    const target = await findUserByUsername(username);
    if (!target) return res.status(404).json({ error: 'Não encontramos esse usuário.' });
    if (target.id === project.Item.ownerId) {
      return res.status(400).json({ error: 'Você já é o dono deste projeto.' });
    }

    const entries: CollaboratorEntry[] = project.Item.collaborators ?? [];
    const existing = entries.find((c) => c.userId === target.id);
    if (existing && existing.status !== 'declined') {
      return res.status(400).json({
        error: existing.status === 'pending' ? 'Esse criador já foi convidado.' : 'Esse criador já é colaborador.',
      });
    }

    const now = new Date().toISOString();
    const nextEntries = existing
      ? entries.map((c) => (c.userId === target.id ? { ...c, status: 'pending' as const, invitedAt: now } : c))
      : [...entries, { userId: target.id, status: 'pending' as const, invitedAt: now }];

    await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: 'SET collaborators = :collaborators, updatedAt = :updatedAt',
      ExpressionAttributeValues: { ':collaborators': nextEntries, ':updatedAt': now },
    }));

    const actor = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } }));
    if (actor.Item) {
      await createNotification({
        userId: target.id,
        type: 'collaboration_invite',
        actor: actor.Item,
        targetType: 'project',
        targetId: project.Item.id,
        targetTitle: project.Item.title,
        targetUrl: `/${req.user.username}/${project.Item.slug}`,
      });
    }

    res.json({ ...toPublicAuthor(target), status: 'pending', invitedAt: now });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Só o próprio convidado pode aceitar/recusar o convite dele.
router.patch('/projects/:id/collaborators/:userId', authenticate, async (req: any, res) => {
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ error: 'Você só pode responder ao seu próprio convite.' });
    }

    const status = req.body?.status;
    if (status !== 'accepted' && status !== 'declined') {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const project = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!project.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });

    const entries: CollaboratorEntry[] = project.Item.collaborators ?? [];
    const invite = entries.find((c) => c.userId === req.user.id);
    if (!invite || invite.status !== 'pending') {
      return res.status(404).json({ error: 'Não encontramos um convite pendente para você nesse projeto.' });
    }

    const nextEntries = entries.map((c) => (c.userId === req.user.id ? { ...c, status } : c));

    await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: 'SET collaborators = :collaborators, updatedAt = :updatedAt',
      ExpressionAttributeValues: { ':collaborators': nextEntries, ':updatedAt': new Date().toISOString() },
    }));

    if (status === 'accepted') {
      const [actor, owner] = await Promise.all([
        ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } })),
        ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: project.Item.ownerId } })),
      ]);
      if (actor.Item) {
        await createNotification({
          userId: project.Item.ownerId,
          type: 'collaboration_accepted',
          actor: actor.Item,
          targetType: 'project',
          targetId: project.Item.id,
          targetTitle: project.Item.title,
          targetUrl: owner.Item?.username ? `/${owner.Item.username}/${project.Item.slug}` : '',
        });
      }
    }

    res.json({ status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -- ESPAÇO DO PROJETO --
// Mensagens, tarefas e notas internas — só dono e colaboradores aceitos têm
// acesso (via requireProjectMember). Nunca aparece na visualização pública do
// projeto: toProjectResponse já filtra "notes" fora, e essas rotas não passam
// por toProjectResponse. Registradas antes de /projects/:username/:slug pelo
// mesmo motivo do bloco de colaboradores acima.

type TaskStatus = 'todo' | 'doing' | 'done';
const MENTION_REGEX = /@([a-z0-9_]{3,24})/gi;

function extractMentionedUserIds(content: string, usersById: Map<string, Record<string, any>>): string[] {
  const usernameToId = new Map<string, string>();
  usersById.forEach((u, id) => {
    if (u.username) usernameToId.set(String(u.username).toLowerCase(), id);
  });

  const found = new Set<string>();
  for (const match of content.matchAll(MENTION_REGEX)) {
    const id = usernameToId.get(match[1].toLowerCase());
    if (id) found.add(id);
  }
  return [...found];
}

/** Link pro espaço do projeto (não a página pública) — usado nas notificações
    de menção/atribuição, que só fazem sentido pra quem já tem acesso. */
function getProjectSpaceUrl(project: Record<string, any>, usersById: Map<string, Record<string, any>>) {
  const owner = usersById.get(project.ownerId);
  return owner?.username ? `/${owner.username}/${project.slug}/espaco` : '';
}

// Membros com acesso ao espaço (dono + aceitos) — alimenta o seletor de
// responsável nas tarefas. Diferente de GET /projects/:id/collaborators (que é
// só do dono e inclui convites pendentes/recusados).
router.get('/projects/:id/members', authenticate, requireProjectMember, async (req: any, res) => {
  try {
    const memberIds = getProjectMemberIds(req.project);
    const usersById = await getUsersById(memberIds);
    res.json({
      members: memberIds.map((id) => usersById.get(id)).filter(Boolean).map(toPublicAuthor),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/:id/messages', authenticate, requireProjectMember, async (req: any, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 30, 1), 50);
    const cursor = req.query.cursor
      ? JSON.parse(Buffer.from(String(req.query.cursor), 'base64url').toString('utf8'))
      : undefined;

    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.projectMessages,
      IndexName: 'projectId-createdAt-index',
      KeyConditionExpression: 'projectId = :v',
      ExpressionAttributeValues: { ':v': req.params.id },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: cursor,
    }));

    res.json({
      messages: result.Items ?? [],
      nextCursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url')
        : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects/:id/messages', authenticate, requireProjectMember, async (req: any, res) => {
  try {
    const content = String(req.body?.content ?? '').trim().slice(0, 2000);
    if (!content) return res.status(400).json({ error: 'Escreva algo antes de enviar.' });

    const author = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } }));
    if (!author.Item) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const message = {
      messageId: uuidv4(),
      projectId: req.params.id,
      authorId: req.user.id,
      authorName: author.Item.fullName ?? author.Item.username,
      authorAvatar: author.Item.avatarUrl ?? '',
      content,
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLES.projectMessages, Item: message }));

    // Notifica só quem foi @mencionado — não a cada mensagem, pra não virar spam.
    const usersById = await getUsersById(getProjectMemberIds(req.project));
    const mentionedIds = extractMentionedUserIds(content, usersById).filter((id) => id !== req.user.id);
    if (mentionedIds.length > 0) {
      const targetUrl = getProjectSpaceUrl(req.project, usersById);
      await Promise.all(mentionedIds.map((userId) =>
        createNotification({
          userId,
          type: 'project_activity',
          activityKind: 'mention',
          actor: author.Item!,
          targetType: 'project',
          targetId: req.params.id,
          targetTitle: req.project.title,
          targetUrl,
        })
      ));
    }

    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/:id/tasks', authenticate, requireProjectMember, async (req: any, res) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.projectTasks,
      IndexName: 'projectId-createdAt-index',
      KeyConditionExpression: 'projectId = :v',
      ExpressionAttributeValues: { ':v': req.params.id },
    }));
    res.json({ tasks: result.Items ?? [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects/:id/tasks', authenticate, requireProjectMember, async (req: any, res) => {
  try {
    const title = String(req.body?.title ?? '').trim().slice(0, 200);
    if (!title) return res.status(400).json({ error: 'Dê um título à tarefa.' });

    const memberIds = getProjectMemberIds(req.project);
    const assigneeId = req.body?.assigneeId ? String(req.body.assigneeId) : undefined;
    if (assigneeId && !memberIds.includes(assigneeId)) {
      return res.status(400).json({ error: 'Só é possível atribuir a alguém do projeto.' });
    }

    const task = {
      taskId: uuidv4(),
      projectId: req.params.id,
      title,
      status: 'todo' as TaskStatus,
      assigneeId,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLES.projectTasks, Item: task }));

    if (assigneeId && assigneeId !== req.user.id) {
      const [actor, usersById] = await Promise.all([
        ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } })),
        getUsersById(memberIds),
      ]);
      if (actor.Item) {
        await createNotification({
          userId: assigneeId,
          type: 'project_activity',
          activityKind: 'task_assigned',
          actor: actor.Item,
          targetType: 'project',
          targetId: req.params.id,
          targetTitle: req.project.title,
          targetUrl: getProjectSpaceUrl(req.project, usersById),
        });
      }
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/projects/:id/tasks/:taskId', authenticate, requireProjectMember, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.projectTasks, Key: { taskId: req.params.taskId } }));
    if (!current.Item || current.Item.projectId !== req.params.id) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }

    const memberIds = getProjectMemberIds(req.project);
    const updated: Record<string, any> = { ...current.Item };

    if (req.body?.status !== undefined) {
      const status = req.body.status;
      if (!['todo', 'doing', 'done'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido.' });
      }
      updated.status = status;
      updated.completedAt = status === 'done' ? new Date().toISOString() : undefined;
    }

    let newlyAssignedId: string | undefined;
    if (req.body?.assigneeId !== undefined) {
      const assigneeId = req.body.assigneeId ? String(req.body.assigneeId) : undefined;
      if (assigneeId && !memberIds.includes(assigneeId)) {
        return res.status(400).json({ error: 'Só é possível atribuir a alguém do projeto.' });
      }
      if (assigneeId && assigneeId !== current.Item.assigneeId) newlyAssignedId = assigneeId;
      updated.assigneeId = assigneeId;
    }

    await ddb.send(new PutCommand({ TableName: TABLES.projectTasks, Item: updated }));

    if (newlyAssignedId && newlyAssignedId !== req.user.id) {
      const [actor, usersById] = await Promise.all([
        ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } })),
        getUsersById(memberIds),
      ]);
      if (actor.Item) {
        await createNotification({
          userId: newlyAssignedId,
          type: 'project_activity',
          activityKind: 'task_assigned',
          actor: actor.Item,
          targetType: 'project',
          targetId: req.params.id,
          targetTitle: req.project.title,
          targetUrl: getProjectSpaceUrl(req.project, usersById),
        });
      }
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/projects/:id/tasks/:taskId', authenticate, requireProjectMember, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.projectTasks, Key: { taskId: req.params.taskId } }));
    if (!current.Item || current.Item.projectId !== req.params.id) {
      return res.status(404).json({ error: 'Tarefa não encontrada.' });
    }
    await ddb.send(new DeleteCommand({ TableName: TABLES.projectTasks, Key: { taskId: req.params.taskId } }));
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/:id/notes', authenticate, requireProjectMember, async (req: any, res) => {
  try {
    let updatedBy = null;
    if (req.project.notesUpdatedBy) {
      const u = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.project.notesUpdatedBy } }));
      if (u.Item) updatedBy = toPublicAuthor(u.Item);
    }
    res.json({
      notes: req.project.notes ?? '',
      notesUpdatedBy: updatedBy,
      notesUpdatedAt: req.project.notesUpdatedAt ?? null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/projects/:id/notes', authenticate, requireProjectMember, async (req: any, res) => {
  try {
    const notes = String(req.body?.notes ?? '').slice(0, 20000);
    const now = new Date().toISOString();

    await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: 'SET notes = :notes, notesUpdatedBy = :by, notesUpdatedAt = :at, updatedAt = :at',
      ExpressionAttributeValues: { ':notes': notes, ':by': req.user.id, ':at': now },
    }));

    const actor = await ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } }));
    res.json({
      notes,
      notesUpdatedBy: actor.Item ? toPublicAuthor(actor.Item) : null,
      notesUpdatedAt: now,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Página pública do projeto (/usuário/slug) e formulário de edição.
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

    const acceptedCollaboratorIds = ((project.collaborators ?? []) as Array<{ userId: string; status: string }>)
      .filter((c) => c.status === 'accepted')
      .map((c) => c.userId);
    const [liked, usersById] = await Promise.all([
      hasLiked(req.user?.id, project.id),
      getUsersById(acceptedCollaboratorIds),
    ]);
    res.json(toProjectResponse(project, owner, liked, usersById));
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
    const { title, slug, blocks, tags, coverImageUrl, isPublic } = req.body ?? {};
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
      blocks: blocks ?? [],
      coverImageUrl,
      tags: tags ?? [],
      isPublic: Boolean(isPublic),
      feedKey: isPublic ? 'PUBLIC' : undefined,
      styles: DEFAULT_PROJECT_STYLES,
      collaborators: [],
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

    const { title, slug, blocks, tags, coverImageUrl, isPublic } = req.body ?? {};
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
      blocks: blocks ?? [],
      coverImageUrl,
      tags: tags ?? [],
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

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const PROJECT_THEMES = ['light', 'dark'];
const PROJECT_WIDTHS = ['narrow', 'default', 'wide'];

// Camada de aparência do projeto, separada do salvamento de conteúdo acima —
// o painel "Estilos" do editor salva só isso, sem precisar reenviar título,
// blocos etc.
router.put('/projects/:id/styles', authenticate, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!current.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (current.Item.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem permissão para editar esse projeto.' });
    }

    const { theme, width, accentColor } = req.body ?? {};
    if (!PROJECT_THEMES.includes(theme)) return res.status(400).json({ error: 'Tema inválido.' });
    if (!PROJECT_WIDTHS.includes(width)) return res.status(400).json({ error: 'Largura inválida.' });
    if (typeof accentColor !== 'string' || !HEX_COLOR_RE.test(accentColor)) {
      return res.status(400).json({ error: 'Cor de destaque inválida.' });
    }

    const styles: ProjectStyles = { theme, width, accentColor };

    await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: 'SET styles = :styles, updatedAt = :updatedAt',
      ExpressionAttributeValues: { ':styles': styles, ':updatedAt': new Date().toISOString() },
    }));

    res.json(toProjectResponse({ ...current.Item, styles }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Troca só a capa, sem reenviar título/blocos/tags — usado pela ação rápida
// "Alterar capa" na página pública do projeto (dono não precisa abrir o editor).
router.put('/projects/:id/cover', authenticate, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!current.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (current.Item.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem permissão para editar esse projeto.' });
    }

    const { coverImageUrl } = req.body ?? {};
    if (!coverImageUrl) return res.status(400).json({ error: 'Adicione uma imagem de capa.' });

    await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: 'SET coverImageUrl = :cover, updatedAt = :updatedAt',
      ExpressionAttributeValues: { ':cover': coverImageUrl, ':updatedAt': new Date().toISOString() },
    }));

    res.json(toProjectResponse({ ...current.Item, coverImageUrl }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Visibilidade (público/rascunho) isolada do resto do conteúdo — usada pelo
// painel "Configurações" do editor.
router.patch('/projects/:id/visibility', authenticate, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!current.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (current.Item.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem permissão para editar esse projeto.' });
    }

    const isPublic = Boolean(req.body?.isPublic);
    // feedKey só existe quando público — é a chave do GSI "feed-index", que
    // precisa ficar ausente (não nula) num rascunho pra não aparecer no feed.
    await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: isPublic
        ? 'SET isPublic = :pub, feedKey = :feedKey, updatedAt = :updatedAt'
        : 'SET isPublic = :pub, updatedAt = :updatedAt REMOVE feedKey',
      ExpressionAttributeValues: {
        ':pub': isPublic,
        ...(isPublic ? { ':feedKey': 'PUBLIC' } : {}),
        ':updatedAt': new Date().toISOString(),
      },
    }));

    res.json(toProjectResponse({ ...current.Item, isPublic }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Botão de call-to-action personalizado (label + link externo), exibido na
// página pública do projeto. Enviar label vazio remove o botão.
router.put('/projects/:id/button', authenticate, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!current.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (current.Item.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem permissão para editar esse projeto.' });
    }

    const label = String(req.body?.label ?? '').trim().slice(0, 40);
    const url = String(req.body?.url ?? '').trim().slice(0, 500);
    if (label && !url) return res.status(400).json({ error: 'Informe o link do botão.' });

    const customButtonLabel = label || null;
    const customButtonUrl = label ? url : null;

    await ddb.send(new UpdateCommand({
      TableName: TABLES.projects,
      Key: { id: req.params.id },
      UpdateExpression: 'SET customButtonLabel = :label, customButtonUrl = :url, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':label': customButtonLabel,
        ':url': customButtonUrl,
        ':updatedAt': new Date().toISOString(),
      },
    }));

    res.json(toProjectResponse({ ...current.Item, customButtonLabel, customButtonUrl }));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Exclusão de projeto — irreversível. Limpa curtidas, mensagens e tarefas do
// espaço de colaboração antes de apagar o item em si (mesmo padrão de limpeza
// usado em DELETE /users/me).
router.delete('/projects/:id', authenticate, async (req: any, res) => {
  try {
    const current = await ddb.send(new GetCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    if (!current.Item) return res.status(404).json({ error: 'Projeto não encontrado.' });
    if (current.Item.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem permissão para excluir esse projeto.' });
    }

    const [projectLikes, projectMessages, projectTasks] = await Promise.all([
      ddb.send(new QueryCommand({
        TableName: TABLES.likes,
        IndexName: 'projectId-index',
        KeyConditionExpression: 'projectId = :v',
        ExpressionAttributeValues: { ':v': req.params.id },
      })),
      ddb.send(new QueryCommand({
        TableName: TABLES.projectMessages,
        IndexName: 'projectId-createdAt-index',
        KeyConditionExpression: 'projectId = :v',
        ExpressionAttributeValues: { ':v': req.params.id },
      })),
      ddb.send(new QueryCommand({
        TableName: TABLES.projectTasks,
        IndexName: 'projectId-createdAt-index',
        KeyConditionExpression: 'projectId = :v',
        ExpressionAttributeValues: { ':v': req.params.id },
      })),
    ]);

    await Promise.all([
      ...(projectLikes.Items ?? []).map((l: any) =>
        ddb.send(new DeleteCommand({ TableName: TABLES.likes, Key: { userId: l.userId, projectId: l.projectId } }))
      ),
      ...(projectMessages.Items ?? []).map((m: any) =>
        ddb.send(new DeleteCommand({ TableName: TABLES.projectMessages, Key: { messageId: m.messageId } }))
      ),
      ...(projectTasks.Items ?? []).map((t: any) =>
        ddb.send(new DeleteCommand({ TableName: TABLES.projectTasks, Key: { taskId: t.taskId } }))
      ),
    ]);

    await ddb.send(new DeleteCommand({ TableName: TABLES.projects, Key: { id: req.params.id } }));
    res.json({ ok: true });
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
    if (project.Item.ownerId !== req.user.id) {
      const [actor, owner] = await Promise.all([
        ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: req.user.id } })),
        ddb.send(new GetCommand({ TableName: TABLES.users, Key: { id: project.Item.ownerId } })),
      ]);
      if (actor.Item) {
        const targetUrl = owner.Item?.username && project.Item.slug ? `/${owner.Item.username}/${project.Item.slug}` : '';
        await createNotification({
          userId: project.Item.ownerId,
          type: 'like',
          actor: actor.Item,
          targetType: 'project',
          targetId: project.Item.id,
          targetTitle: project.Item.title,
          targetUrl,
        });
      }
    }
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
async function optimizeUploadedImage(file: Express.Multer.File, folder: 'avatars' | 'projects', purpose?: string) {
  const maxDimension = purpose === 'profile-cover' ? 1500 : folder === 'avatars' ? 500 : 2000;
  const buffer = await sharp(file.buffer)
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return {
    buffer,
    contentType: 'image/jpeg',
    extension: '.jpg',
  };
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

// Prefixos de rota de primeiro nível do app (App.tsx) — como a URL de perfil não
// tem mais o "@" pra desambiguar, um usuário com um desses nomes tornaria o
// próprio perfil inalcançável (a rota estática sempre vence /:handle).
const RESERVED_USERNAMES = new Set([
  'descobrir', 'criadores', 'login', 'register', 'onboarding',
  'novo-projeto', 'configuracoes', 'blog', 'vagas',
]);

function isValidUsername(value: string) {
  return /^[a-z0-9_]{3,24}$/.test(value) && !RESERVED_USERNAMES.has(value);
}

function uploadSingleImage(req: any, res: any, next: any) {
  upload.single('file')(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'Arquivo muito grande. Envie um arquivo menor.' });
      return;
    }

    res.status(400).json({ error: error.message || 'Não foi possível receber a imagem.' });
  });
}

router.post('/upload', authenticate, uploadSingleImage, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem para continuar.' });
  try {
    const folder = req.body.folder === 'avatars' ? 'avatars' : 'projects';
    const kind = resolveUploadKind(folder, req.body.purpose);
    if (req.file.size > UPLOAD_LIMITS_BYTES[kind]) {
      return res.status(413).json({ error: formatUploadLimitError(kind) });
    }

    const optimized = await optimizeUploadedImage(req.file, folder, req.body.purpose);
    const key = `${folder}/${uuidv4()}${optimized.extension}`;

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: optimized.buffer,
      ContentType: optimized.contentType,
    }));

    res.json({ url: s3PublicUrl(key) });
  } catch {
    res.status(500).json({ error: 'Não foi possível otimizar e enviar a imagem. Tente novamente.' });
  }
});

export { router as apiRouter };
