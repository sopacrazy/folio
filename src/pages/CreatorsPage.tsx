import { useEffect, useState } from 'react';
import CreatorCard from '../components/CreatorCard';
import { fetchCreators } from '../lib/creators';

export default function CreatorsPage() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCreators().then((all) => {
      if (!cancelled) {
        setCreators(all);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1880px] px-5 py-10 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Criadores</h1>
        <p className="text-muted-foreground mt-1">Conheça quem está publicando na Portsy.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-gray-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : creators.length > 0 ? (
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
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">Nenhum criador encontrado.</p>
        </div>
      )}
    </div>
  );
}
