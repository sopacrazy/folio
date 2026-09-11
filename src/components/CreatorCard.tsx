import { useState } from 'react';
import { Link } from 'react-router';
import { Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface CreatorCardProps {
  name: string;
  handle: string;
  followers: number;
  avatarUrl?: string;
  coverUrl?: string;
  tags?: string[];
  bio?: string;
  isLiked?: boolean;
  className?: string;
}

export default function CreatorCard({
  name,
  handle,
  followers,
  avatarUrl,
  coverUrl,
  tags = [],
  bio,
  isLiked = false,
  className,
}: CreatorCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const profileHref = `/${handle}`;

  return (
    <Card className={cn('overflow-hidden p-0 rounded-xl border border-border shadow-none', className)}>
      <div className="relative h-40 bg-muted">
        <Link to={profileHref} className="block h-full w-full">
          {coverUrl && <img src={coverUrl} alt="" className="h-full w-full object-cover" />}
        </Link>

        <button
          type="button"
          onClick={() => setLiked((prev) => !prev)}
          aria-label={liked ? 'Remover dos salvos' : 'Salvar criador'}
          aria-pressed={liked}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <Heart className={cn('w-4 h-4 transition-colors', liked ? 'fill-primary text-primary' : 'text-foreground')} />
        </button>
      </div>

      <div className="p-4">
        <Link to={profileHref} className="flex items-center gap-3 min-w-0">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">
              @{handle} · {followers.toLocaleString('pt-BR')} seguidores
            </p>
          </div>
        </Link>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="font-medium">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {bio && <p className="text-sm text-muted-foreground leading-relaxed mt-3 line-clamp-2">{bio}</p>}
      </div>
    </Card>
  );
}
