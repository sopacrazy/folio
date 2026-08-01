import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import CreatorCard from '../components/CreatorCard';
import ProjectCard from '../components/ProjectCard';
import { fetchCreators } from '../lib/creators';
import { fetchProjectFeed } from '../lib/projects';
import { useAuthStore } from '../store/auth';
import { cn } from '@/lib/utils';

export default function DiscoverPage() {
  const { token } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const categories = ['Todos', 'UI/UX', 'Ilustração', 'Dev', 'Fotografia', '3D', 'Branding'];
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim().toLowerCase() ?? '';

  const [creatorMatches, setCreatorMatches] = useState<any[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProjectFeed(token).then((all) => {
      if (!cancelled) {
        setProjects(all);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Busca criadores só quando há uma query digitada — a listagem "Todos" já
  // tem página própria em /criadores, não precisa duplicar aqui.
  useEffect(() => {
    if (!query) {
      setCreatorMatches([]);
      return;
    }
    let cancelled = false;
    setCreatorsLoading(true);
    fetchCreators(query).then((matches) => {
      if (!cancelled) {
        setCreatorMatches(matches);
        setCreatorsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const filteredProjects = projects.filter((p: any) => {
    const matchesCategory = activeCategory === 'Todos' || p.tags?.includes(activeCategory);
    const matchesQuery =
      !query ||
      p.title.toLowerCase().includes(query) ||
      p.user?.fullName?.toLowerCase().includes(query) ||
      p.user?.username?.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen">
      {/* Categorias (sticky) */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'relative py-3 text-sm font-semibold whitespace-nowrap transition-colors outline-none',
                  activeCategory === cat ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
                {activeCategory === cat && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {query && (
          <p className="text-sm text-muted-foreground mb-6">
            Resultados para <span className="font-semibold text-foreground">"{searchParams.get('q')}"</span>
          </p>
        )}

        {/* Criadores que batem com a busca */}
        {query && !creatorsLoading && creatorMatches.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-foreground mb-4">Criadores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {creatorMatches.map((creator) => (
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

        {query && creatorMatches.length > 0 && filteredProjects.length > 0 && (
          <h2 className="text-lg font-bold text-foreground mb-4">Projetos</h2>
        )}

        {loading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="mb-6 break-inside-avoid animate-pulse bg-white rounded-2xl border border-gray-100"
                style={{ height: 220 + (i % 3) * 60 }}
              />
            ))}
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6">
            {filteredProjects.map((project: any) => (
              <div key={project.id} className="mb-6 break-inside-avoid">
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        )}

        {!loading && !creatorsLoading && filteredProjects.length === 0 && creatorMatches.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">Nenhum resultado encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
