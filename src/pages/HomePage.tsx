import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Briefcase, Coffee, Heart, Share2, Sprout, UserPlus, Users } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { getCreators } from '../mockData';
import { fetchProjectFeed } from '../lib/projects';
import { Button } from '@/components/ui/button';
import CreatorCard from '../components/CreatorCard';
import ProjectCard from '../components/ProjectCard';
import EmptyState from '../components/EmptyState';

function HeroIllustration() {
  return (
    <div className="relative hidden md:block">
      <div className="rounded-2xl border border-border bg-white shadow-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-full bg-muted" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2 w-28 bg-muted rounded-full" />
              <div className="h-2 w-16 bg-muted rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="aspect-square rounded-xl bg-gradient-to-br from-orange-200 to-primary/50" />
            <div className="aspect-square rounded-xl bg-gradient-to-br from-sky-200 to-indigo-300" />
            <div className="aspect-square rounded-xl bg-gradient-to-br from-emerald-200 to-teal-300" />
          </div>
        </div>
      </div>

      <div className="absolute -left-6 -bottom-6 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Sprout className="w-8 h-8 text-primary" />
      </div>
      <div className="absolute -right-5 -top-5 w-14 h-14 rounded-2xl bg-white shadow-md border border-border flex items-center justify-center">
        <Coffee className="w-6 h-6 text-primary" />
      </div>
    </div>
  );
}

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
      {/* Hero */}
      <section className="bg-accent/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Descubra portfólios criativos que inspiram.
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-xl">
              Folio é o lar de artistas, designers e criadores. Explore trabalhos originais e apoie quem está por trás deles.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link to="/criadores">
                  Explorar Criadores <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>

          <HeroIllustration />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Criadores */}
        {creators.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Criadores</h2>
              <Link to="/criadores" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

        {/* Últimos projetos */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Últimos projetos</h2>
            <Link to="/descobrir" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              Ver todos os projetos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
            {latestProjects.map((project: any) => (
              <div key={project.id} className="mb-6 break-inside-avoid">
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function FollowingFeed({ token }: { token: string | null }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const creators = getCreators();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const res = await fetch('/api/feed/following', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setProjects(data.projects ?? []);
            setFollowingCount(data.followingCount ?? 0);
          }
          return;
        }
      } catch {
        // API indisponível — trata como feed vazio abaixo.
      }
      if (!cancelled) {
        setProjects([]);
        setFollowingCount(0);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-2xl font-bold text-foreground mb-1">Seu feed</h1>
      <p className="text-muted-foreground mb-8">Projetos recentes de quem você segue.</p>

      {loading ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="mb-6 break-inside-avoid animate-pulse bg-white rounded-2xl border border-gray-100"
              style={{ height: 220 + (i % 3) * 60 }}
            />
          ))}
        </div>
      ) : followingCount === 0 ? (
        <div>
          <EmptyState
            icon={UserPlus}
            title="Você ainda não segue ninguém"
            description="Siga criadores pra ver os projetos deles aqui no seu feed."
          />
          {creators.length > 0 && (
            <div className="mt-4">
              <h2 className="text-lg font-bold text-foreground mb-4">Sugestões de criadores</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
            </div>
          )}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Quem você segue ainda não publicou nada"
          description="Volte mais tarde ou explore novos criadores enquanto isso."
          actionLabel="Explorar Descobrir"
          actionTo="/descobrir"
        />
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
          {projects.map((project: any) => (
            <div key={project.id} className="mb-6 break-inside-avoid">
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user, token } = useAuthStore();

  return (
    <div>
      {user ? <FollowingFeed token={token} /> : <DiscoveryHome token={token} />}

      {/* Recursos */}
      <section className="bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
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

      {!user && (
        <section className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
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
