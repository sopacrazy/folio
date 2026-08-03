import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Check, Copy, Eye, Heart, Pencil, Share2 } from 'lucide-react';
import { getProjectByUsernameAndSlug, incrementProjectViewCount } from '../mockData';
import { useAuthStore } from '../store/auth';
import Lightbox from '../components/Lightbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ActionIconButtonProps {
  onClick: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function ActionIconButton({ onClick, label, active, disabled, children }: ActionIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'w-9 h-9 rounded-full border flex items-center justify-center transition-colors shrink-0',
        active
          ? 'bg-red-50 border-red-200 text-red-500'
          : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
        disabled && 'opacity-50 cursor-default pointer-events-none'
      )}
    >
      {children}
    </button>
  );
}

interface SidebarProps {
  project: any;
  isOwner: boolean;
  isReal: boolean;
  liked: boolean;
  likeCount: number;
  onLikeToggle: () => void;
  isFollowing: boolean;
  followLoading: boolean;
  onFollowToggle: () => void;
  copied: boolean;
  onCopyLink: () => void;
  onShare: () => void;
}

/** Coluna sticky à direita — só existe a partir de 768px (ver <MobileActionBar /> abaixo disso). */
function DesktopSidebar({
  project,
  isOwner,
  isReal,
  liked,
  likeCount,
  onLikeToggle,
  isFollowing,
  followLoading,
  onFollowToggle,
  copied,
  onCopyLink,
  onShare,
}: SidebarProps) {
  const profileHref = `/@${project.user.username}`;

  return (
    <aside className="hidden md:block">
      <div className="sticky top-24 space-y-5">
        <Link to={profileHref} className="flex items-center gap-3 min-w-0">
          <Avatar className="w-12 h-12 shrink-0">
            <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
            <AvatarFallback>{project.user.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{project.user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">@{project.user.username}</p>
          </div>
        </Link>

        {!isOwner && (
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!isReal || followLoading}
            onClick={onFollowToggle}
          >
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </Button>
        )}
        <Button asChild variant="outline" className="w-full">
          <Link to={profileHref}>Ver perfil</Link>
        </Button>

        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border">
          <span className="flex items-center gap-1.5">
            <Heart className={cn('w-4 h-4', liked && 'fill-red-500 text-red-500')} /> {likeCount}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> {project.viewCount.toLocaleString('pt-BR')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ActionIconButton onClick={onLikeToggle} label={liked ? 'Descurtir' : 'Curtir'} active={liked} disabled={!isReal}>
            <Heart className={cn('w-4 h-4', liked && 'fill-red-500 text-red-500')} />
          </ActionIconButton>
          <ActionIconButton onClick={onShare} label="Compartilhar">
            <Share2 className="w-4 h-4" />
          </ActionIconButton>
          <ActionIconButton onClick={onCopyLink} label={copied ? 'Link copiado' : 'Copiar link'}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </ActionIconButton>
        </div>
      </div>
    </aside>
  );
}

/** Barra horizontal sticky abaixo do header do site — só existe abaixo de 768px. */
function MobileActionBar({
  project,
  isOwner,
  isReal,
  liked,
  onLikeToggle,
  isFollowing,
  followLoading,
  onFollowToggle,
  copied,
  onCopyLink,
  onShare,
}: SidebarProps) {
  const profileHref = `/@${project.user.username}`;

  return (
    <div className="md:hidden sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-white/95 backdrop-blur border-b border-border flex items-center justify-between gap-2 mb-6">
      <Link to={profileHref} className="flex items-center gap-2 min-w-0">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
          <AvatarFallback className="text-xs">{project.user.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold text-foreground truncate">{project.user.fullName}</span>
      </Link>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isOwner && (
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!isReal || followLoading}
            onClick={onFollowToggle}
          >
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </Button>
        )}
        <ActionIconButton onClick={onLikeToggle} label={liked ? 'Descurtir' : 'Curtir'} active={liked} disabled={!isReal}>
          <Heart className={cn('w-4 h-4', liked && 'fill-red-500 text-red-500')} />
        </ActionIconButton>
        <ActionIconButton onClick={onShare} label="Compartilhar">
          <Share2 className="w-4 h-4" />
        </ActionIconButton>
        <ActionIconButton onClick={onCopyLink} label={copied ? 'Link copiado' : 'Copiar link'}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </ActionIconButton>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const { handle, slug } = useParams();
  const username = handle?.startsWith('@') ? handle.slice(1) : handle;
  const { user: currentUser, token } = useAuthStore();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [source, setSource] = useState<'real' | 'mock' | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const viewCounted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!username || !slug) {
        if (!cancelled) { setProject(null); setLoading(false); }
        return;
      }

      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setProject(data);
            setSource('real');
            setLiked(Boolean(data.likedByMe));
            setLikeCount(data.likeCount || 0);
            setLoading(false);
          }
          return;
        }
      } catch {
        // API indisponível — cai pro fallback mock abaixo.
      }

      // Projetos de demonstração ainda só existem nos dados mock.
      const found = getProjectByUsernameAndSlug(username, slug);
      if (!cancelled) {
        setProject(found);
        setSource('mock');
        setLiked(false);
        setLikeCount(found?.likeCount || 0);
        setLoading(false);
      }
    }

    setLoading(true);
    viewCounted.current = false;
    load();
    return () => {
      cancelled = true;
    };
  }, [username, slug, token]);

  // Status de "seguindo" o criador — só existe pra dono real (DynamoDB) e visitante logado.
  useEffect(() => {
    if (!project || source !== 'real' || !token || currentUser?.id === project.ownerId) {
      setIsFollowing(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/users/${encodeURIComponent(project.user.username)}/follow-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setIsFollowing(Boolean(data.following));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [project, source, token, currentUser?.id]);

  const handleLikeToggle = async () => {
    if (source !== 'real' || !project) return;
    if (!token) {
      navigate('/login');
      return;
    }

    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
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
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  };

  const handleFollowToggle = async () => {
    if (source !== 'real' || !project) return;
    if (!token) {
      navigate('/login');
      return;
    }

    setFollowLoading(true);
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(project.user.username)}/follow`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível atualizar o seguir.');
      setIsFollowing(data.following);
    } catch {
      setIsFollowing(!next);
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    if (!project || viewCounted.current) return;
    viewCounted.current = true;

    if (source === 'real') {
      fetch(`/api/projects/${project.id}/view`, { method: 'POST' }).catch(() => {});
    } else if (source === 'mock') {
      incrementProjectViewCount(project.id);
    }
  }, [project, source]);

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="border-b border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <Skeleton className="w-full h-56 rounded-2xl mb-6" />
          <Skeleton className="h-6 w-2/3 mb-4" />
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-2 mb-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  const isOwner = currentUser?.id === project?.ownerId;
  const isReal = source === 'real';

  if (!project || (!project.isPublic && !isOwner)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-xl font-bold text-foreground mb-2">Projeto não encontrado</h1>
        <p className="text-muted-foreground mb-6">Esse projeto não existe ou não está mais disponível.</p>
        <Button asChild variant="outline">
          <Link to="/descobrir">Explorar outros projetos</Link>
        </Button>
      </div>
    );
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível (ex: contexto não seguro) — ignora silenciosamente.
    }
  };

  const handleShare = async () => {
    const shareData = { title: project.title, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Usuário cancelou o share nativo — não faz nada.
      }
    } else {
      handleCopyLink();
    }
  };

  const publishedDate = new Date(project.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  const gallery: string[] = project.gallery ?? [];

  return (
    <div className="bg-white min-h-screen">
      {/* Header simples */}
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight text-primary">
            Portsy
          </Link>
          {isOwner && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/@${username}/${slug}/editar`}>
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      {!project.isPublic && (
        <div className="bg-tag text-tag-foreground text-sm font-medium text-center py-2">
          Este projeto é um rascunho — só você consegue vê-lo.
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <MobileActionBar
          project={project}
          isOwner={isOwner}
          isReal={isReal}
          liked={liked}
          likeCount={likeCount}
          onLikeToggle={handleLikeToggle}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onFollowToggle={handleFollowToggle}
          copied={copied}
          onCopyLink={handleCopyLink}
          onShare={handleShare}
        />

        <div className="md:grid md:grid-cols-[1fr_240px] md:gap-10">
          <div className="max-w-3xl min-w-0">
            {/* Capa */}
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="w-full h-56 sm:h-72 rounded-2xl object-cover mb-6"
            />

            {/* Título */}
            <h1 className="text-xl font-medium text-foreground mb-3">{project.title}</h1>

            <p className="text-sm text-muted-foreground mb-4">publicado em {publishedDate}</p>

            {/* Tags */}
            {project.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {project.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Descrição */}
            {project.description && (
              <p className="text-muted-foreground leading-relaxed mb-8 whitespace-pre-wrap">{project.description}</p>
            )}

            {/* Galeria */}
            {gallery.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gallery.map((url, index) => (
                  <button
                    key={url + index}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className={cn(
                      'block rounded-2xl overflow-hidden group focus-visible:outline-2 focus-visible:outline-primary',
                      index === 0 ? 'sm:col-span-2' : ''
                    )}
                    aria-label={`Ampliar imagem ${index + 1} da galeria`}
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover group-hover:opacity-90 group-hover:scale-[1.02] transition-all duration-300"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <DesktopSidebar
            project={project}
            isOwner={isOwner}
            isReal={isReal}
            liked={liked}
            likeCount={likeCount}
            onLikeToggle={handleLikeToggle}
            isFollowing={isFollowing}
            followLoading={followLoading}
            onFollowToggle={handleFollowToggle}
            copied={copied}
            onCopyLink={handleCopyLink}
            onShare={handleShare}
          />
        </div>
      </div>

      {lightboxIndex !== null && gallery.length > 0 && (
        <Lightbox images={gallery} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
