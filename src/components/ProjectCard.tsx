import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Heart, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: any;
  compact?: boolean;
  [key: string]: any;
}

export default function ProjectCard({ project, compact = false }: ProjectCardProps) {
  const href = `/@${project.user?.username}/${project.slug}`;
  const isReal = project.source !== 'mock';
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  // Abre o projeto como modal por cima da página atual, guardando ela como "fundo"
  // pra restaurar quando o modal fechar (ver App.tsx e ProjectModal.tsx).
  const modalLinkState = { backgroundLocation: location };

  const [liked, setLiked] = useState(Boolean(project.likedByMe));
  const [likeCount, setLikeCount] = useState(project.likeCount || 0);

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
    <Card className="group relative overflow-hidden hover:shadow-md transition-shadow duration-300 p-0">
      {project.isPublic === false && (
        <Badge className="absolute top-3 left-3 z-10 bg-foreground/80 text-white border-transparent">
          Rascunho
        </Badge>
      )}

      <Link to={href} state={modalLinkState} className="block overflow-hidden">
        <img
          src={project.coverImageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'}
          alt={project.title}
          loading="lazy"
          className={cn(
            'w-full block group-hover:scale-105 transition-transform duration-500',
            compact ? 'aspect-[4/3] h-auto object-cover' : 'h-auto'
          )}
        />
      </Link>

      <div className="p-4">
        <Link to={href} state={modalLinkState}>
          <h3 className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1">
            {project.title}
          </h3>
        </Link>
        {project.tags?.[0] && (
          <p className="text-xs text-muted-foreground mt-0.5">{project.tags[0]}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <Link to={`/@${project.user?.username}`} className="flex items-center gap-2 min-w-0">
            <Avatar className="w-6 h-6 shrink-0">
              <AvatarImage src={project.user?.avatarUrl} alt="" />
              <AvatarFallback className="text-[10px]">{project.user?.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors">{project.user?.fullName}</span>
          </Link>

          <div className="flex items-center gap-3 text-muted-foreground shrink-0">
            <button
              type="button"
              onClick={handleLikeToggle}
              disabled={!isReal}
              aria-label={liked ? 'Descurtir' : 'Curtir'}
              className={cn(
                'flex items-center gap-1 text-xs transition-colors',
                isReal ? 'hover:text-primary cursor-pointer' : 'cursor-default'
              )}
            >
              <Heart className={cn('w-3.5 h-3.5', liked && 'fill-primary text-primary')} /> {likeCount}
            </button>
            <span className="flex items-center gap-1 text-xs">
              <MessageCircle className="w-3.5 h-3.5" /> {project.commentCount || 0}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
