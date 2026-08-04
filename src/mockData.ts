// Dados locais em memória para desenvolvimento do frontend sem depender do backend/DB.
// Troque por chamadas reais de API quando o banco estiver pronto novamente.

export interface MockUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  bio?: string;
  category?: string;
  location?: string;
  avatarUrl?: string;
  coverUrl?: string;
  portfolioLink?: string;
  contactEmail?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  createdAt: Date;
  followers: number;
  skills: string[];
  /** Slugs dos selos do usuário (ver mockBadgeCatalog). Equivalente aos rows de user_badges no banco. */
  badgeSlugs?: string[];
  /** Se ausente, o login mock aceita qualquer senha para esse usuário. */
  password?: string;
}

export interface MockProject {
  id: string;
  ownerId: string;
  title: string;
  /** Único por dono — usado na URL pública /@username/slug. */
  slug: string;
  description?: string;
  coverImageUrl: string;
  tags: string[];
  gallery: string[];
  /** false = rascunho, só visível pro dono. true = publicado, acessível sem login. */
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockBadge {
  id: string;
  slug: string;
  label: string;
  description: string;
  /** Chave que o frontend usa para escolher o ícone (ver BadgeIcon.tsx). */
  iconName: string;
  /** Chave que o frontend usa para escolher a cor (ver BadgeIcon.tsx). */
  color: string;
}

// Espelha a tabela `badges` do banco. Concessão ainda é manual (via user_badges) —
// não existe lógica automática de atribuição por enquanto.
export const mockBadgeCatalog: MockBadge[] = [
  {
    id: 'badge-verified',
    slug: 'verified',
    label: 'Verificado',
    description: 'Identidade confirmada pela equipe da Portsy.',
    iconName: 'check',
    color: 'blue',
  },
  {
    id: 'badge-top-creator',
    slug: 'top_creator',
    label: 'Top criador do mês',
    description: 'Um dos criadores mais engajados do mês.',
    iconName: 'trophy',
    color: 'amber',
  },
  {
    id: 'badge-active-collaborator',
    slug: 'active_collaborator',
    label: 'Colaborador ativo',
    description: 'Participa ativamente de projetos em colaboração com outros criadores.',
    iconName: 'users',
    color: 'green',
  },
];

const mockUsers: MockUser[] = [
  {
    id: 'admin',
    username: 'admin',
    email: 'admin',
    fullName: 'Admin',
    bio: 'Conta de teste local.',
    category: 'Criador',
    avatarUrl: 'https://i.pravatar.cc/150?img=68',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop',
    createdAt: new Date('2024-01-01'),
    followers: 0,
    skills: ['Criador'],
    password: 'admin',
  },
  {
    id: 'u1',
    username: 'anacreator',
    email: 'ana@example.com',
    fullName: 'Ana Ribeiro',
    bio: 'Product designer focada em experiências digitais limpas e funcionais.',
    category: 'UI/UX Designer',
    location: 'São Paulo, BR',
    avatarUrl: 'https://i.pravatar.cc/150?img=47',
    coverUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop',
    createdAt: new Date('2024-01-10'),
    followers: 342,
    skills: ['UI/UX', 'Design de Produto', 'Design System'],
    badgeSlugs: ['verified', 'top_creator'],
  },
  {
    id: 'u2',
    username: 'joaodev',
    email: 'joao@example.com',
    fullName: 'João Andrade',
    bio: 'Desenvolvedor full-stack apaixonado por performance e DX.',
    category: 'Dev',
    location: 'Lisboa, PT',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
    coverUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop',
    createdAt: new Date('2024-02-20'),
    followers: 128,
    skills: ['Dev', 'Frontend', 'Backend'],
  },
  {
    id: 'u3',
    username: 'melillustra',
    email: 'mel@example.com',
    fullName: 'Mel Souza',
    bio: 'Ilustradora digital, apaixonada por cores vibrantes e personagens.',
    category: 'Ilustração',
    location: 'Curitiba, BR',
    avatarUrl: 'https://i.pravatar.cc/150?img=32',
    coverUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1600&auto=format&fit=crop',
    createdAt: new Date('2024-03-05'),
    followers: 891,
    skills: ['Ilustração', 'Character Design', 'Arte Digital'],
    badgeSlugs: ['verified'],
  },
  {
    id: 'u4',
    username: 'rafaelfoto',
    email: 'rafael@example.com',
    fullName: 'Rafael Lima',
    bio: 'Fotógrafo documental, sempre em busca de luz natural e histórias reais.',
    category: 'Fotografia',
    location: 'Austin, EUA',
    avatarUrl: 'https://i.pravatar.cc/150?img=15',
    coverUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
    createdAt: new Date('2024-04-02'),
    followers: 210,
    skills: ['Fotografia', 'Edição', 'Direção de Arte'],
  },
  {
    id: 'u5',
    username: 'biatorres3d',
    email: 'bia@example.com',
    fullName: 'Bia Torres',
    bio: 'Artista 3D e motion designer, criando mundos e objetos que não existem.',
    category: '3D',
    location: 'Tóquio, JP',
    avatarUrl: 'https://i.pravatar.cc/150?img=26',
    coverUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1600&auto=format&fit=crop',
    createdAt: new Date('2024-05-08'),
    followers: 156,
    skills: ['3D', 'Motion', 'Blender'],
    badgeSlugs: ['active_collaborator'],
  },
  {
    id: 'u6',
    username: 'carlosbrand',
    email: 'carlos@example.com',
    fullName: 'Carlos Nunes',
    bio: 'Designer de marcas, construindo identidades visuais com propósito.',
    category: 'Branding',
    location: 'Berlim, DE',
    avatarUrl: 'https://i.pravatar.cc/150?img=53',
    coverUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?q=80&w=1600&auto=format&fit=crop',
    createdAt: new Date('2024-05-22'),
    followers: 75,
    skills: ['Branding', 'Identidade Visual', 'Ilustração'],
    badgeSlugs: ['verified', 'active_collaborator'],
  },
];

const mockProjects: MockProject[] = [
  {
    id: 'p1',
    ownerId: 'u1',
    title: 'Redesign do App Financeiro',
    slug: 'redesign-do-app-financeiro',
    description: 'Um redesign completo focado em simplificar o controle financeiro pessoal, com hierarquia visual clara e microinterações.',
    coverImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop',
    tags: ['UI/UX', 'Figma', 'Principle'],
    gallery: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1559028012-481c04fa702d?q=80&w=1600&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 1840,
    likeCount: 128,
    commentCount: 12,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
  },
  {
    id: 'p2',
    ownerId: 'u2',
    title: 'Dashboard de Analytics em Tempo Real',
    slug: 'dashboard-de-analytics-em-tempo-real',
    description: 'Plataforma de dashboards com atualização em tempo real via WebSockets, construída com React e Node.',
    coverImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop',
    tags: ['Dev', 'React', 'Node.js', 'WebSockets'],
    gallery: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 1190,
    likeCount: 94,
    commentCount: 8,
    createdAt: new Date('2024-05-15'),
    updatedAt: new Date('2024-05-15'),
  },
  {
    id: 'p3',
    ownerId: 'u3',
    title: 'Série de Personagens - Reino Encantado',
    slug: 'serie-de-personagens-reino-encantado',
    description: 'Coleção de ilustrações digitais de personagens para um livro infantil.',
    coverImageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1600&auto=format&fit=crop',
    tags: ['Ilustração', 'Procreate', 'Photoshop'],
    gallery: [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1600&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 2380,
    likeCount: 156,
    commentCount: 19,
    createdAt: new Date('2024-07-02'),
    updatedAt: new Date('2024-07-02'),
  },
  {
    id: 'p4',
    ownerId: 'u1',
    title: 'Landing Page - Startup de Viagens',
    slug: 'landing-page-startup-de-viagens',
    description: 'Landing page com foco em conversão para uma startup de viagens sustentáveis.',
    coverImageUrl: 'https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=1600&auto=format&fit=crop',
    tags: ['UI/UX', 'Figma', 'Webflow'],
    gallery: [
      'https://images.unsplash.com/photo-1522199755839-a2bacb67c546?q=80&w=1600&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 1420,
    likeCount: 102,
    commentCount: 7,
    createdAt: new Date('2024-04-18'),
    updatedAt: new Date('2024-04-18'),
  },
  {
    id: 'p5',
    ownerId: 'u3',
    title: 'Capa de Álbum - Noites de Verão',
    slug: 'capa-de-album-noites-de-verao',
    description: 'Arte de capa para um álbum indie, explorando texturas pintadas à mão.',
    coverImageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&h=1400&auto=format&fit=crop',
    tags: ['Ilustração', 'Procreate'],
    gallery: [
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&h=1400&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 1150,
    likeCount: 88,
    commentCount: 6,
    createdAt: new Date('2024-07-20'),
    updatedAt: new Date('2024-07-20'),
  },
  {
    id: 'p6',
    ownerId: 'u2',
    title: 'Site Institucional - Estúdio de Arquitetura',
    slug: 'site-institucional-estudio-de-arquitetura',
    description: 'Site minimalista para um estúdio de arquitetura, com foco em fotografia de projetos.',
    coverImageUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=1600&h=1000&auto=format&fit=crop',
    tags: ['Dev', 'Next.js', 'Tailwind'],
    gallery: [
      'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=1600&h=1000&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 1930,
    likeCount: 137,
    commentCount: 18,
    createdAt: new Date('2024-06-25'),
    updatedAt: new Date('2024-06-25'),
  },
  {
    id: 'p7',
    ownerId: 'u1',
    title: 'App de Meditação - Onboarding',
    slug: 'app-de-meditacao-onboarding',
    description: 'Fluxo de onboarding para um app de meditação, com microanimações suaves.',
    coverImageUrl: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1000&h=1500&auto=format&fit=crop',
    tags: ['UI/UX', 'Figma', 'After Effects'],
    gallery: [
      'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1000&h=1500&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 820,
    likeCount: 63,
    commentCount: 4,
    createdAt: new Date('2024-03-11'),
    updatedAt: new Date('2024-03-11'),
  },
  {
    id: 'p8',
    ownerId: 'u3',
    title: 'Ensaio Fotográfico - Luz Natural',
    slug: 'ensaio-fotografico-luz-natural',
    description: 'Série fotográfica explorando luz natural em ambientes internos.',
    coverImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1600&h=900&auto=format&fit=crop',
    tags: ['Fotografia', 'Câmera Analógica', 'Lightroom'],
    gallery: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1600&h=900&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 950,
    likeCount: 71,
    commentCount: 5,
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-08-01'),
  },
  {
    id: 'p9',
    ownerId: 'u4',
    title: 'Ensaio Urbano - Concreto e Luz',
    slug: 'ensaio-urbano-concreto-e-luz',
    description: 'Registro fotográfico da arquitetura brutalista sob luz dura de meio-dia.',
    coverImageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&h=1000&auto=format&fit=crop',
    tags: ['Fotografia', 'Câmera Analógica', 'Lightroom'],
    gallery: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&h=1000&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 600,
    likeCount: 45,
    commentCount: 3,
    createdAt: new Date('2024-08-10'),
    updatedAt: new Date('2024-08-10'),
  },
  {
    id: 'p10',
    ownerId: 'u5',
    title: 'Objetos Impossíveis',
    slug: 'objetos-impossiveis',
    description: 'Série de renders 3D explorando formas e materiais que desafiam a física.',
    coverImageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&h=1500&auto=format&fit=crop',
    tags: ['3D', 'Blender', 'Octane'],
    gallery: [
      'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&h=1500&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 1500,
    likeCount: 112,
    commentCount: 9,
    createdAt: new Date('2024-06-14'),
    updatedAt: new Date('2024-06-14'),
  },
  {
    id: 'p11',
    ownerId: 'u6',
    title: 'Identidade Visual - Café Origem',
    slug: 'identidade-visual-cafe-origem',
    description: 'Sistema de marca completo para uma torrefadora de café especial, incluindo logotipo, paleta de cores, tipografia e aplicações em embalagens e sinalização.',
    coverImageUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?q=80&w=1600&h=1100&auto=format&fit=crop',
    tags: ['Branding', 'Identidade Visual'],
    gallery: [
      'https://images.unsplash.com/photo-1558655146-9f40138edfeb?q=80&w=1600&h=1100&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1200&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 520,
    likeCount: 39,
    commentCount: 2,
    createdAt: new Date('2024-07-28'),
    updatedAt: new Date('2024-07-28'),
  },
  {
    id: 'p12',
    ownerId: 'admin',
    title: 'Sistema de Design — Portsy',
    slug: 'sistema-de-design-portsy',
    description: 'Exploração de um design system para uma rede social de portfólios: paleta de cores, tipografia, componentes reutilizáveis (cards, badges, tags) e diretrizes de uso para manter consistência visual em toda a plataforma.',
    coverImageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1600&h=1000&auto=format&fit=crop',
    tags: ['UI/UX', 'Design System', 'Figma'],
    gallery: [
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1600&h=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1545235617-9465d2a55698?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?q=80&w=1200&auto=format&fit=crop',
    ],
    isPublic: true,
    viewCount: 84,
    likeCount: 11,
    commentCount: 1,
    createdAt: new Date('2026-07-20'),
    updatedAt: new Date('2026-07-20'),
  },
];

// Faixa Unicode das marcas diacríticas combinantes (U+0300-U+036F), usada após normalize('NFD')
// pra transformar "café" -> "cafe". Construída por code point pra não depender de
// caracteres literais/escapes no arquivo-fonte.
const DIACRITICS_REGEX = new RegExp(
  '[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']',
  'g'
);

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateUniqueSlug(ownerId: string, seed: string, excludeProjectId?: string): string {
  const base = slugify(seed) || 'projeto';
  let slug = base;
  let suffix = 2;
  while (mockProjects.some((p) => p.ownerId === ownerId && p.slug === slug && p.id !== excludeProjectId)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function userSummary(user: MockUser) {
  const { id, username, fullName, avatarUrl, email, whatsapp, instagram, facebook } = user;
  return { id, username, fullName, avatarUrl, email, whatsapp, instagram, facebook };
}

function userWithProfile(user: MockUser) {
  const {
    id, username, fullName, avatarUrl, coverUrl, category, location, bio,
    followers, skills, badgeSlugs, portfolioLink, contactEmail, whatsapp, instagram, facebook,
  } = user;
  const badges = (badgeSlugs ?? [])
    .map((slug) => mockBadgeCatalog.find((b) => b.slug === slug))
    .filter((b): b is MockBadge => Boolean(b));
  return {
    id, username, fullName, avatarUrl, coverUrl, category, location, bio,
    followers, skills, badges, portfolioLink, contactEmail, whatsapp, instagram, facebook,
  };
}

function projectWithOwner(project: MockProject) {
  const owner = mockUsers.find((u) => u.id === project.ownerId)!;
  return { ...project, user: userSummary(owner) };
}

export function getCreators() {
  return [...mockUsers]
    .filter((u) => u.followers > 0)
    .sort((a, b) => b.followers - a.followers)
    .map((u) => userWithProfile(u));
}

/** Projetos publicados, mais recentes primeiro — usado no feed (Home/Descobrir). */
export function getProjects() {
  return mockProjects
    .filter((p) => p.isPublic)
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((p) => projectWithOwner(p));
}

export function getLatestProjects(limit: number) {
  return getProjects().slice(0, limit);
}

/** Todos os projetos de um usuário. Por padrão só os publicados — passe includeDrafts pro próprio dono ver os rascunhos. */
export function getProjectsByUser(userId: string, options?: { includeDrafts?: boolean }) {
  return mockProjects
    .filter((p) => p.ownerId === userId && (options?.includeDrafts || p.isPublic))
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((p) => projectWithOwner(p));
}

/** Lookup usado tanto pela página pública (/@user/slug) quanto pelo formulário de edição. */
export function getProjectByUsernameAndSlug(username: string, slug: string) {
  const user = mockUsers.find((u) => u.username === username);
  if (!user) return null;
  const project = mockProjects.find((p) => p.ownerId === user.id && p.slug === slug);
  if (!project) return null;
  return projectWithOwner(project);
}

/** Incremento simples de visualização — sem sistema de analytics, só um contador. */
export function incrementProjectViewCount(projectId: string) {
  const project = mockProjects.find((p) => p.id === projectId);
  if (project) project.viewCount += 1;
}

export function createMockProject(ownerId: string, data: {
  title: string;
  slug?: string;
  description: string;
  tags: string[];
  coverImageUrl: string;
  gallery: string[];
  isPublic: boolean;
}) {
  const id = `p-${Date.now()}`;
  const slug = generateUniqueSlug(ownerId, data.slug?.trim() || data.title);
  const now = new Date();
  const project: MockProject = {
    id,
    ownerId,
    title: data.title,
    slug,
    description: data.description,
    coverImageUrl: data.coverImageUrl,
    tags: data.tags,
    gallery: data.gallery,
    isPublic: data.isPublic,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  mockProjects.push(project);
  return projectWithOwner(project);
}

export function updateMockProject(projectId: string, ownerId: string, data: {
  title: string;
  slug?: string;
  description: string;
  tags: string[];
  coverImageUrl: string;
  gallery: string[];
  isPublic: boolean;
}) {
  const project = mockProjects.find((p) => p.id === projectId);
  if (!project) throw new Error('Projeto não encontrado');
  if (project.ownerId !== ownerId) throw new Error('Você não tem permissão para editar esse projeto');

  const requestedSlug = slugify(data.slug?.trim() || data.title) || 'projeto';
  const slug = requestedSlug === project.slug ? project.slug : generateUniqueSlug(ownerId, requestedSlug, project.id);

  project.title = data.title;
  project.slug = slug;
  project.description = data.description;
  project.coverImageUrl = data.coverImageUrl;
  project.tags = data.tags;
  project.gallery = data.gallery;
  project.isPublic = data.isPublic;
  project.updatedAt = new Date();

  return projectWithOwner(project);
}

export function getUserByUsername(username: string) {
  const user = mockUsers.find((u) => u.username === username);
  if (!user) return null;
  const { password: _password, badgeSlugs, ...rest } = user;
  const badges = (badgeSlugs ?? [])
    .map((slug) => mockBadgeCatalog.find((b) => b.slug === slug))
    .filter((b): b is MockBadge => Boolean(b));
  const userProjects = getProjectsByUser(user.id, { includeDrafts: true });
  return { ...rest, badges, projects: userProjects };
}

export function updateUserProfile(userId: string, data: {
  fullName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  portfolioLink: string;
  contactEmail: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
}) {
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) throw new Error('Usuário não encontrado');
  if (data.username !== user.username && mockUsers.some((u) => u.username === data.username)) {
    throw new Error('Esse nome de usuário já está em uso');
  }

  user.fullName = data.fullName;
  user.username = data.username;
  user.bio = data.bio;
  user.avatarUrl = data.avatarUrl;
  user.coverUrl = data.coverUrl;
  user.portfolioLink = data.portfolioLink;
  user.contactEmail = data.contactEmail;
  user.whatsapp = data.whatsapp;
  user.instagram = data.instagram;
  user.facebook = data.facebook;

  return userSummary(user);
}

export function mockLogin(emailOrUsername: string, password: string) {
  const user = mockUsers.find((u) => u.email === emailOrUsername || u.username === emailOrUsername);
  if (!user) throw new Error('Credenciais inválidas');
  if (user.password && user.password !== password) throw new Error('Credenciais inválidas');
  return { token: `mock-token-${user.id}`, user: userSummary(user) };
}

export function mockRegister(data: { username: string; email: string; password: string; fullName: string }) {
  if (mockUsers.some((u) => u.email === data.email || u.username === data.username)) {
    throw new Error('Usuário já existe');
  }
  const user: MockUser = {
    id: `u${mockUsers.length + 1}-${Date.now()}`,
    username: data.username,
    email: data.email,
    fullName: data.fullName,
    createdAt: new Date(),
    followers: 0,
    skills: [],
  };
  mockUsers.push(user);
  return { token: `mock-token-${user.id}`, user: userSummary(user) };
}
