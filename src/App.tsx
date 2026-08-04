import { useState, FormEvent } from 'react';
import { Routes, Route, Navigate, Link, NavLink, useLocation, useNavigate, matchPath, type Location } from 'react-router';
import { useAuthStore } from './store/auth';
import { Mail, Menu, Plus, Search, Settings } from 'lucide-react';
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
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import SettingsLayout from './pages/settings/SettingsLayout';
import SettingsProfilePage from './pages/settings/SettingsProfilePage';
import SettingsAccountPage from './pages/settings/SettingsAccountPage';
import SettingsPlaceholderPage from './pages/settings/SettingsPlaceholderPage';

/** Caminho de projeto (/@usuario/slug) — exatamente 2 segmentos, sem bater com /:handle/:slug/editar. */
const PROJECT_PATH = '/:handle/:slug';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-semibold transition-colors',
    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
  );

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
                className="pl-9 h-9 rounded-full bg-muted"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="hidden sm:inline-flex relative">
                  <Mail className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                </Button>

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
                      <Link to={`/@${user.username}`}>Meu perfil</Link>
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

  // Acesso direto a /@usuario/slug (sem vir navegando de dentro do app — refresh,
  // link compartilhado): não existe um "fundo" real pra mostrar, então forçamos a
  // Home como pano de fundo genérico e ainda assim abrimos o modal por cima dela.
  const directProjectMatch = matchPath({ path: PROJECT_PATH, end: true }, location.pathname);
  const isDirectProjectAccess = Boolean(
    !state?.backgroundLocation &&
    directProjectMatch &&
    directProjectMatch.params.handle?.startsWith('@')
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
          <Route path="/:handle" element={<ProfilePage />} />
          <Route path="/:handle/:slug/editar" element={<ProjectFormPage />} />
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
