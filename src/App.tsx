import { useEffect, useState, FormEvent } from 'react';
import { Routes, Route, Navigate, Link, NavLink, useLocation, useNavigate, matchPath, type Location } from 'react-router';
import { useAuthStore } from './store/auth';
import { Bell, CheckSquare, Heart, Mail, Menu, MessageCircle, Plus, Search, Settings, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import Footer from './components/Footer';
import ProjectModal from './components/ProjectModal';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import CreatorsPage from './pages/CreatorsPage';
import ProfilePage from './pages/ProfilePage';
import ProjectFormPage from './pages/ProjectFormPage';
import ProjectSpacePage from './pages/ProjectSpacePage';
import MessagesPage from './pages/MessagesPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import SettingsLayout from './pages/settings/SettingsLayout';
import SettingsProfilePage from './pages/settings/SettingsProfilePage';
import SettingsAccountPage from './pages/settings/SettingsAccountPage';
import SettingsPlaceholderPage from './pages/settings/SettingsPlaceholderPage';

/** Caminho de projeto (/usuario/slug) — exatamente 2 segmentos, sem bater com /:handle/:slug/editar. */
const PROJECT_PATH = '/:handle/:slug';

// Prefixos de rota de primeiro nível (ver <Routes> abaixo) — sem o "@" a URL de
// projeto (/usuario/slug) e uma rota estática de 2 segmentos (ex: /configuracoes/perfil)
// têm o mesmo formato; só dá pra diferenciar excluindo os nomes reservados daqui.
const RESERVED_HANDLES = new Set([
  'descobrir', 'criadores', 'login', 'register', 'onboarding',
  'novo-projeto', 'configuracoes', 'blog', 'vagas', 'mensagens',
]);

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-semibold transition-colors',
    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
  );

type NotificationItem = {
  notificationId: string;
  type: 'like' | 'follow' | 'comment' | 'mention' | 'collaboration_invite' | 'collaboration_accepted' | 'project_activity';
  actorName: string;
  actorAvatar?: string;
  targetType: 'project' | 'profile';
  targetId: string;
  targetTitle?: string;
  targetUrl?: string;
  activityKind?: 'mention' | 'task_assigned';
  read?: boolean;
  createdAt: string;
};

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function notificationText(item: NotificationItem) {
  if (item.type === 'like') return `${item.actorName} curtiu seu projeto "${item.targetTitle || 'Projeto'}"`;
  if (item.type === 'follow') return `${item.actorName} começou a seguir você`;
  if (item.type === 'comment') return `${item.actorName} comentou no seu projeto "${item.targetTitle || 'Projeto'}"`;
  if (item.type === 'collaboration_invite') return `${item.actorName} te convidou para colaborar em "${item.targetTitle || 'Projeto'}"`;
  if (item.type === 'collaboration_accepted') return `${item.actorName} aceitou seu convite para colaborar em "${item.targetTitle || 'Projeto'}"`;
  if (item.type === 'project_activity') {
    if (item.activityKind === 'task_assigned') return `${item.actorName} atribuiu uma tarefa a você em "${item.targetTitle || 'Projeto'}"`;
    return `${item.actorName} mencionou você na discussão de "${item.targetTitle || 'Projeto'}"`;
  }
  return `${item.actorName} mencionou você`;
}

function NotificationsDropdown() {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [respondedInvites, setRespondedInvites] = useState<Record<string, 'accepted' | 'declined'>>({});

  const loadUnreadCount = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // Mantém o contador atual se a rede falhar.
    }
  };

  const loadNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!token || unreadCount === 0) return;
    setUnreadCount(0);
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    await fetch('/api/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = window.setInterval(loadUnreadCount, 45000);
    return () => window.clearInterval(interval);
  }, [token]);

  const handleOpenChange = (open: boolean) => {
    if (!open) return;
    loadNotifications().then(markAllAsRead);
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (token && item.read !== true) {
      await fetch(`/api/notifications/${item.notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    if (item.type === 'follow') navigate(`/${item.targetId}`);
    if ((item.type === 'like' || item.type === 'collaboration_accepted' || item.type === 'project_activity') && item.targetUrl) {
      navigate(item.targetUrl);
    }
  };

  const respondToInvite = async (item: NotificationItem, status: 'accepted' | 'declined') => {
    if (!token || !user) return;
    setRespondedInvites((current) => ({ ...current, [item.notificationId]: status }));
    try {
      await fetch(`/api/projects/${item.targetId}/collaborators/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
    } catch {
      // Mantém o estado otimista — se falhar, o convite ainda existe e o usuário pode tentar de novo.
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-bold text-foreground">Notificações</p>
          <button type="button" onClick={markAllAsRead} className="text-xs font-semibold text-primary hover:text-primary-hover">
            Marcar todas como lidas
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto py-1">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação por enquanto</div>
          ) : (
            items.map((item) => {
              if (item.type === 'collaboration_invite') {
                const responded = respondedInvites[item.notificationId];
                return (
                  <div
                    key={item.notificationId}
                    className={cn('flex w-full gap-3 px-4 py-3 text-left', item.read !== true && 'bg-primary/5')}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={item.actorAvatar} alt={item.actorName} />
                      <AvatarFallback>{item.actorName?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-foreground">{notificationText(item)}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{relativeTime(item.createdAt)}</span>
                      {responded ? (
                        <span className="mt-2 inline-block text-xs font-semibold text-muted-foreground">
                          {responded === 'accepted' ? 'Convite aceito' : 'Convite recusado'}
                        </span>
                      ) : (
                        <span className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => respondToInvite(item, 'accepted')}
                            className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
                          >
                            Aceitar
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToInvite(item, 'declined')}
                            className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                          >
                            Recusar
                          </button>
                        </span>
                      )}
                    </span>
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                );
              }

              return (
                <button
                  key={item.notificationId}
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className={cn(
                    'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted',
                    item.read !== true && 'bg-primary/5'
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={item.actorAvatar} alt={item.actorName} />
                    <AvatarFallback>{item.actorName?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug text-foreground">{notificationText(item)}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{relativeTime(item.createdAt)}</span>
                  </span>
                  {item.type === 'like' ? (
                    <Heart className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : item.type === 'collaboration_accepted' ? (
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : item.type === 'project_activity' ? (
                    item.activityKind === 'task_assigned' ? (
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )
                  ) : (
                    <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Ícone de envelope no header — leva pra /mensagens e mostra a contagem de
    não lidas (mesmo padrão de polling do sino de notificações). */
function MessagesLink() {
  const { token } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await fetch('/api/messages/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch {
        // Mantém o contador atual se a rede falhar.
      }
    };
    load();
    const interval = window.setInterval(load, 45000);
    return () => window.clearInterval(interval);
  }, [token]);

  return (
    <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex relative">
      <Link to="/mensagens" aria-label="Mensagens">
        <Mail className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}

function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/descobrir?q=${encodeURIComponent(query.trim())}` : '/descobrir');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="mx-auto w-full max-w-[1880px] px-5 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-8 min-w-0">
            <Link to="/" className="font-bold text-xl tracking-tight text-primary shrink-0">
              Portsy
            </Link>
            <div className="hidden lg:flex items-center gap-6">
              <NavLink to="/" end className={navLinkClass}>Início</NavLink>
              <NavLink to="/descobrir" className={navLinkClass}>Descobrir</NavLink>
              <NavLink to="/criadores" className={navLinkClass}>Criadores</NavLink>
              <span className="text-sm font-medium text-muted-foreground cursor-default select-none">Vagas</span>
              <span className="text-sm font-medium text-muted-foreground cursor-default select-none">Blog</span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar criadores, projetos, tags..."
                className="pl-9 h-9 rounded-xl bg-muted"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <MessagesLink />
                <NotificationsDropdown />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="w-9 h-9 border border-gray-100">
                        <AvatarImage src={user.avatarUrl} alt={user.username} />
                        <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/${user.username}`}>Meu perfil</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/configuracoes">
                        <Settings className="w-4 h-4" /> Configurações
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                    >
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link to="/novo-projeto">
                    <Plus className="w-4 h-4" /> Publicar
                  </Link>
                </Button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Button asChild variant="ghost">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Cadastrar</Link>
                </Button>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="lg:hidden">
                <DropdownMenuItem asChild>
                  <Link to="/">Início</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/descobrir">Descobrir</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/criadores">Criadores</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Vagas</DropdownMenuItem>
                <DropdownMenuItem disabled>Blog</DropdownMenuItem>
                {!user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/login">Entrar</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/register">Cadastrar</Link>
                    </DropdownMenuItem>
                  </>
                )}
                {user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/mensagens">Mensagens</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/novo-projeto">Publicar projeto</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

function OnboardingNavbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="mx-auto w-full max-w-[1880px] px-5 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <span className="font-bold text-xl tracking-tight text-primary select-none">
            Portsy
          </span>
          <span className="text-sm font-semibold text-muted-foreground">
            Configuração inicial
          </span>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const location = useLocation();
  const { user } = useAuthStore();
  const state = location.state as { backgroundLocation?: Location } | null;
  const hasRequiredOnboardingFields = Boolean(user?.fullName && user?.username && user?.avatarUrl && user?.coverUrl);
  const isOnboardingRoute = location.pathname === '/onboarding';
  const isOnboardingLocked = Boolean(user && (user.onboardingCompleted === false || !hasRequiredOnboardingFields));
  const mustCompleteOnboarding = Boolean(
    user &&
    !isOnboardingRoute &&
    isOnboardingLocked
  );

  // Acesso direto a /usuario/slug (sem vir navegando de dentro do app — refresh,
  // link compartilhado): não existe um "fundo" real pra mostrar, então forçamos a
  // Home como pano de fundo genérico e ainda assim abrimos o modal por cima dela.
  // O "@" ainda é aceito (links antigos), mas não é mais exigido — só usamos a
  // lista de reservados pra não confundir com uma rota estática de 2 segmentos.
  const directProjectMatch = matchPath({ path: PROJECT_PATH, end: true }, location.pathname);
  const isDirectProjectAccess = Boolean(
    !state?.backgroundLocation &&
    directProjectMatch &&
    (directProjectMatch.params.handle?.startsWith('@') || !RESERVED_HANDLES.has(directProjectMatch.params.handle ?? ''))
  );
  const backgroundLocation: Location | undefined =
    state?.backgroundLocation ?? (isDirectProjectAccess ? { ...location, pathname: '/', search: '', hash: '' } : undefined);

  return (
    <div className="min-h-screen bg-muted font-sans text-foreground">
      {isOnboardingRoute && isOnboardingLocked ? <OnboardingNavbar /> : <Navbar />}
      <main>
        {mustCompleteOnboarding ? (
          <Navigate to="/onboarding" replace />
        ) : (
        <Routes location={backgroundLocation ?? location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/descobrir" element={<DiscoverPage />} />
          <Route path="/criadores" element={<CreatorsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage isRegister />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/novo-projeto" element={<ProjectFormPage />} />
          <Route path="/mensagens" element={<MessagesPage />} />
          <Route path="/:handle" element={<ProfilePage />} />
          <Route path="/:handle/:slug/editar" element={<ProjectFormPage />} />
          <Route path="/:handle/:slug/espaco" element={<ProjectSpacePage />} />
          <Route path="/configuracoes" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/configuracoes/perfil" replace />} />
            <Route path="perfil" element={<SettingsProfilePage />} />
            <Route path="conta" element={<SettingsAccountPage />} />
            <Route path="notificacoes" element={<SettingsPlaceholderPage title="Notificações" />} />
            <Route path="privacidade" element={<SettingsPlaceholderPage title="Privacidade" />} />
          </Route>
        </Routes>
        )}
      </main>
      {!(isOnboardingRoute && isOnboardingLocked) && <Footer />}

      {/* Camada de modal: só existe quando há um "fundo" definido (navegação in-app
          ou acesso direto forçado pra Home). Usa a location REAL (não a de fundo)
          pra bater com a URL do projeto de verdade. */}
      {backgroundLocation && (
        <Routes>
          <Route path="/:handle/:slug" element={<ProjectModal />} />
        </Routes>
      )}
    </div>
  );
}
