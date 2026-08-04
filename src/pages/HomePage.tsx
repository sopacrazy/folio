import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  Briefcase,
  Check,
  Heart,
  LayoutGrid,
  List,
  Search,
  Share2,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { getCreators } from '../mockData';
import { fetchProjectFeed } from '../lib/projects';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import CreatorCard from '../components/CreatorCard';
import ProjectCard from '../components/ProjectCard';
import FeedProjectCard from '../components/FeedProjectCard';
import EmptyState from '../components/EmptyState';

const feedTabs = ['Para você', 'Seguindo', 'O melhor do Portsy'];
const feedCategories = ['Design gráfico', 'Fotografia', 'Ilustração', '3D Art', 'UI/UX', 'Branding', 'Arquitetura'];

function DiscoveryHome({ token }: { token: string | null }) {
  const creators = getCreators();
  const [latestProjects, setLatestProjects] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchProjectFeed(token).then((all) => {
      if (!cancelled) setLatestProjects(all.slice(0, 6));
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <>
      <section className="overflow-hidden bg-primary text-white">
        <div className="mx-auto flex min-h-[640px] w-full max-w-[1880px] flex-col px-5 pt-24 lg:px-8">
          <div className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center text-center">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.24em] text-white/70">Portsy Portfolio</p>
            <h1 className="text-5xl font-semibold leading-[1.04] tracking-tight md:text-7xl">
              Descubra portfólios criativos que inspiram.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl">
              Explore projetos, encontre criadores e publique um portfólio visual para mostrar seu trabalho com presença.
            </p>
            <div className="mt-10">
              <Button asChild size="lg" className="rounded-full bg-white px-9 text-primary shadow-xl hover:bg-white/90">
                <Link to="/criadores">
                  Começar <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-16 grid h-56 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {latestProjects.slice(0, 6).map((project: any, index) => (
              <Link
                key={project.id}
                to={`/@${project.user?.username}/${project.slug}`}
                className="group relative overflow-hidden rounded-t-xl bg-white/15"
              >
                <img
                  src={project.coverImageUrl}
                  alt={project.title}
                  className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 line-clamp-1 text-sm font-bold">{project.title}</span>
                {index === 0 && (
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-primary">
                    Novo
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1880px] px-5 py-14 lg:px-8">
        {creators.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Criadores</h2>
              <Link to="/criadores" className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors">
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
              {creators.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  name={creator.fullName}
                  handle={creator.username}
                  followers={creator.followers}
                  avatarUrl={creator.avatarUrl}
                  coverUrl={creator.coverUrl}
                  tags={creator.skills}
                  bio={creator.bio}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Últimos projetos</h2>
            <Link to="/descobrir" className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors flex items-center gap-1">
              Ver todos os projetos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {latestProjects.map((project: any) => (
              <div key={project.id} className="min-w-0">
                <ProjectCard project={project} compact />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function FollowingFeed({ token }: { token: string | null }) {
  const [followingProjects, setFollowingProjects] = useState<any[]>([]);
  const [recommendedProjects, setRecommendedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'liked'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [feedMode, setFeedMode] = useState<'for-you' | 'following' | 'best'>('following');
  const [searchTerm, setSearchTerm] = useState('');

  const projects = useMemo(() => {
    if (feedMode === 'following') return followingProjects;
    const seen = new Set<string>();
    return [...followingProjects, ...recommendedProjects].filter((project) => {
      const key = String(project.id ?? `${project.user?.username}-${project.slug}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [feedMode, followingProjects, recommendedProjects]);

  const sortedProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const list = projects.filter((project) => {
      if (!query) return true;
      const haystack = [
        project.title,
        project.description,
        project.user?.fullName,
        project.user?.username,
        ...(project.tags ?? []),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });

    if (sortBy === 'liked') {
      list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [projects, searchTerm, sortBy]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [followingRes, recommendations] = await Promise.all([
          fetch('/api/feed/following', { headers: { Authorization: `Bearer ${token}` } }),
          fetchProjectFeed(token),
        ]);
        const data = followingRes.ok ? await followingRes.json() : { projects: [] };
        if (!cancelled) {
          setFollowingProjects(data.projects ?? []);
          setRecommendedProjects(recommendations);
        }
      } catch {
        const recommendations = await fetchProjectFeed(token);
        if (!cancelled) {
          setFollowingProjects([]);
          setRecommendedProjects(recommendations);
        }
      }
    }

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="bg-white">
      <section className="border-b border-border bg-[#fbfbfb]">
        <div className="mx-auto w-full max-w-[1880px] px-5 py-6 lg:px-8">
          <div className="grid gap-4 xl:grid-cols-[minmax(320px,680px)_minmax(0,1fr)] xl:items-center">
            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-12 rounded-lg border-gray-300 bg-white px-4 text-sm font-bold shadow-sm hover:border-primary hover:text-primary">
                    <SlidersHorizontal className="h-4 w-4" /> Ajustes
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSortBy('recent')}>
                    <Check className={cn('h-3.5 w-3.5', sortBy !== 'recent' && 'opacity-0')} /> Mais recentes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('liked')}>
                    <Check className={cn('h-3.5 w-3.5', sortBy !== 'liked' && 'opacity-0')} /> Mais curtidos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="relative min-w-0 flex-1 xl:w-[560px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Pesquisar no Portsy..."
                  className="h-12 w-full rounded-xl border border-border bg-white pl-12 pr-5 text-base font-semibold outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-5 border-b border-border">
              <div className="flex min-w-0 items-end gap-7 overflow-x-auto no-scrollbar">
                {feedTabs.map((label) => {
                  const mode = label === 'Seguindo' ? 'following' : label === 'O melhor do Portsy' ? 'best' : 'for-you';
                  const active = feedMode === mode;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setFeedMode(mode)}
                      className={cn(
                        'relative h-12 shrink-0 text-sm font-bold transition-colors',
                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {label}
                      {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>

              <div className="hidden items-center gap-1 pb-2 md:flex">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Visualização em grade"
                  aria-pressed={viewMode === 'grid'}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                    viewMode === 'grid' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-white hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="Visualização em lista"
                  aria-pressed={viewMode === 'list'}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                    viewMode === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-white hover:text-foreground'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar">
            {feedCategories.map((category, index) => (
              <button
                key={category}
                type="button"
                onClick={() => setSearchTerm(category)}
                className={cn(
                  'group flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors',
                  searchTerm === category
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-white text-foreground hover:border-primary hover:text-primary'
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', searchTerm === category ? 'bg-white' : 'bg-primary/70')} />
                <span className="text-xs opacity-70">{index + 1 < 10 ? `0${index + 1}` : index + 1}</span>
                <span>{category}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1880px] px-5 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-foreground">
            {feedMode === 'following' ? 'Projetos de quem você segue' : 'Recomendações para você'}
          </h1>
          <Button variant="outline" className="rounded-lg border-primary/25 bg-primary/5 font-bold text-primary hover:bg-primary/10">
            Preferências
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : sortedProjects.length === 0 ? (
          <EmptyState
            icon={Users}
            title={feedMode === 'following' ? 'Você ainda não segue projetos publicados' : 'Nenhum projeto encontrado'}
            description={feedMode === 'following' ? 'Use a aba Para você para descobrir criadores e trabalhos novos.' : 'Tente buscar por outro termo ou limpar os filtros.'}
          />
        ) : viewMode === 'list' ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {sortedProjects.map((project: any) => (
              <FeedProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {sortedProjects.map((project: any) => (
              <div key={project.id} className="min-w-0">
                <FeedProjectCard project={project} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, token } = useAuthStore();

  return (
    <div>
      {user ? <FollowingFeed token={token} /> : <DiscoveryHome token={token} />}

      {!user && (
        <section className="bg-white border-t border-border">
          <div className="mx-auto grid w-full max-w-[1880px] grid-cols-1 gap-10 px-5 py-14 sm:grid-cols-3 lg:px-8">
            <div className="text-center sm:text-left">
              <Heart className="w-6 h-6 text-primary mb-3 mx-auto sm:mx-0" />
              <h3 className="font-bold text-foreground mb-1">Apoie Criadores</h3>
              <p className="text-sm text-muted-foreground">Siga seus criadores favoritos e ajude-os a continuar criando.</p>
            </div>
            <div className="text-center sm:text-left">
              <Share2 className="w-6 h-6 text-primary mb-3 mx-auto sm:mx-0" />
              <h3 className="font-bold text-foreground mb-1">Compartilhe e Conecte-se</h3>
              <p className="text-sm text-muted-foreground">Faça parte de uma comunidade que celebra trabalho original.</p>
            </div>
            <div className="text-center sm:text-left">
              <Briefcase className="w-6 h-6 text-primary mb-3 mx-auto sm:mx-0" />
              <h3 className="font-bold text-foreground mb-1">Encontre Oportunidades</h3>
              <p className="text-sm text-muted-foreground">Descubra vagas e projetos para profissionais criativos.</p>
            </div>
          </div>
        </section>
      )}

      {!user && (
        <section className="bg-gray-900 text-white">
          <div className="mx-auto flex w-full max-w-[1880px] flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row lg:px-8">
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold">Pronto para publicar seu portfólio?</h2>
              <p className="text-gray-400 text-sm mt-1">Crie sua conta gratuita e comece agora.</p>
            </div>
            <Button asChild size="lg">
              <Link to="/register">Criar conta</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
