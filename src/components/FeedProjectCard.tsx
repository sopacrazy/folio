import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Heart } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import CollaboratorAvatars from './CollaboratorAvatars';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface FeedProjectCardProps {
  project: any;
}

/**
 * Card do feed estilo Behance: coração sobreposto no canto da imagem (em vez de
 * numa linha de ícones abaixo) e sem recortar a proporção original da capa —
 * é o que cria o efeito escalonado quando renderizado dentro do masonry.
 */
export default function FeedProjectCard({ project }: FeedProjectCardProps) {
  const href = `/${project.user?.username}/${project.slug}`;
  const isReal = project.source !== 'mock';
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  // Abre o projeto como modal por cima da página atual (ver App.tsx/ProjectModal.tsx).
  const modalLinkState = { backgroundLocation: location };

  const [liked, setLiked] = useState(Boolean(project.likedByMe));
  const [likeCount, setLikeCount] = useState(project.likeCount || 0);
  const allCreators = project.user ? [project.user, ...(project.collaborators ?? [])] : (project.collaborators ?? []);

  useEffect(() => {
    setLiked(Boolean(project.likedByMe));
    setLikeCount(project.likeCount || 0);
  }, [project.id, project.likedByMe, project.likeCount]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isReal) return;
    if (!token) {
      navigate('/login');
      return;
    }

    const next = !liked;
    setLiked(next);
    setLikeCount((c: number) => c + (next ? 1 : -1));
    try {
      const res = await fetch(`/api/projects/${project.id}/like`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((c: number) => c + (next ? -1 : 1));
    }
  };

  return (
    <Link
      to={href}
      state={modalLinkState}
      className="group block overflow-hidden rounded-2xl border border-border bg-white transition-shadow duration-300 hover:shadow-md"
    >
      <div className="relative">
        <img
          src={project.coverImageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'}
          alt={project.title}
          loading="lazy"
          className="block aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <button
          type="button"
          onClick={handleLikeToggle}
          disabled={!isReal}
          aria-label={liked ? 'Descurtir' : 'Curtir'}
          className={cn(
            'absolute top-3 right-3 flex w-8 h-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-colors',
            isReal ? 'cursor-pointer hover:bg-white' : 'cursor-default'
          )}
        >
          <Heart className={cn('w-4 h-4', liked ? 'fill-primary text-primary' : 'text-foreground')} />
        </button>
      </div>

      <div className="p-4">
        <h3 className="mb-2.5 line-clamp-1 text-sm font-bold text-foreground">{project.title}</h3>
        <div className="flex items-center justify-between gap-2">
          {allCreators.length > 1 ? (
            <CollaboratorAvatars creators={allCreators} />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarImage src={project.user?.avatarUrl} alt="" />
                <AvatarFallback className="text-[10px]">{project.user?.fullName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate text-xs text-muted-foreground">{project.user?.fullName}</span>
            </div>
          )}
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Heart className="w-3.5 h-3.5" /> {likeCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
