import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router';
import { Check, Copy, Eye, Heart, Pencil, Share2, User, UserCheck, UserPlus, X } from 'lucide-react';
import { getProjectByUsernameAndSlug, incrementProjectViewCount } from '../mockData';
import { useAuthStore } from '../store/auth';
import Lightbox from './Lightbox';
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
  editHref: string;
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
  editHref,
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

        <div className="flex items-center gap-2">
          {isOwner ? (
            <Button asChild size="icon" variant="outline" aria-label="Editar projeto" title="Editar projeto">
              <Link to={editHref}>
                <Pencil className="w-4 h-4" />
              </Link>
            </Button>
          ) : (
            <Button
              size="icon"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!isReal || followLoading}
              onClick={onFollowToggle}
              aria-label={isFollowing ? 'Seguindo' : 'Seguir'}
              title={isFollowing ? 'Seguindo' : 'Seguir'}
            >
              {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </Button>
          )}
          <Button asChild size="icon" variant="outline" aria-label="Ver perfil" title="Ver perfil">
            <Link to={profileHref}>
              <User className="w-4 h-4" />
            </Link>
          </Button>
        </div>

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

/** Barra horizontal sticky no topo do conteúdo do modal — só existe abaixo de 768px. */
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
  editHref,
}: SidebarProps) {
  const profileHref = `/@${project.user.username}`;

  return (
    <div className="md:hidden sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-white/95 backdrop-blur border-b border-border flex items-center justify-between gap-2 mb-6">
      <Link to={profileHref} className="flex items-center gap-2 min-w-0">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
          <AvatarFallback className="text-xs">{project.user.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold text-foreground truncate">{project.user.fullName}</span>
      </Link>

      <div className="flex items-center gap-1.5 shrink-0">
        {isOwner ? (
          <Button asChild size="icon" variant="outline" aria-label="Editar projeto" title="Editar projeto">
            <Link to={editHref}>
              <Pencil className="w-4 h-4" />
            </Link>
          </Button>
        ) : (
          <Button
            size="icon"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!isReal || followLoading}
            onClick={onFollowToggle}
            aria-label={isFollowing ? 'Seguindo' : 'Seguir'}
            title={isFollowing ? 'Seguindo' : 'Seguir'}
          >
            {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
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

export default function ProjectModal() {
  const { handle, slug } = useParams();
  const username = handle?.startsWith('@') ? handle.slice(1) : handle;
  const { user: currentUser, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;

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

  // Fecha o modal usando o histórico do navegador: se veio de uma navegação
  // dentro do app (backgroundLocation), "voltar" restaura a página de origem
  // naturalmente. Se foi acesso direto (refresh, link compartilhado), não há
  // pra onde voltar — manda pra Home.
  const close = () => {
    if (backgroundLocation) navigate(-1);
    else navigate('/', { replace: true });
  };

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

  useEffect(() => {
    if (!project || viewCounted.current) return;
    viewCounted.current = true;

    if (source === 'real') {
      fetch(`/api/projects/${project.id}/view`, { method: 'POST' }).catch(() => {});
    } else if (source === 'mock') {
      incrementProjectViewCount(project.id);
    }
  }, [project, source]);

  // Esc fecha o modal — mas só quando o lightbox da galeria não está aberto por
  // cima dele (o lightbox tem seu próprio Esc; um Esc só deve fechar uma camada
  // por vez, não as duas de uma vez).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxIndex === null) close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, backgroundLocation]);

  // Trava o scroll da página de fundo enquanto o modal está aberto.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

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
    const shareData = { title: project?.title, url: window.location.href };
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

  const isOwner = currentUser?.id === project?.ownerId;
  const isReal = source === 'real';
  const editHref = `/@${username}/${slug}/editar`;
  const gallery: string[] = project?.gallery ?? [];
  const notFound = !loading && (!project || (!project.isPublic && !isOwner));

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 md:flex md:items-center md:justify-center" onClick={close}>
      <div
        className="relative bg-white/95 backdrop-blur-xl w-full h-full md:w-[97%] md:h-[97%] md:rounded-2xl md:shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="absolute top-4 right-4 z-40 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="px-4 sm:px-6 py-8">
              <Skeleton className="w-full h-56 rounded-2xl mb-6" />
              <Skeleton className="h-6 w-2/3 mb-4" />
              <div className="flex items-center gap-2 mb-6">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ) : notFound ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
              <h1 className="text-xl font-bold text-foreground mb-2">Projeto não encontrado</h1>
              <p className="text-muted-foreground mb-6">Esse projeto não existe ou não está mais disponível.</p>
              <Button variant="outline" onClick={close}>Fechar</Button>
            </div>
          ) : (
            <div className="px-4 sm:px-6 py-8">
              {!project.isPublic && (
                <div className="bg-tag text-tag-foreground text-sm font-medium text-center py-2 -mx-4 sm:-mx-6 mb-6">
                  Este projeto é um rascunho — só você consegue vê-lo.
                </div>
              )}

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
                editHref={editHref}
              />

              <div className="md:grid md:grid-cols-[1fr_240px] md:gap-10">
                <div className="min-w-0">
                  {/* Capa */}
                  <img
                    src={project.coverImageUrl}
                    alt={project.title}
                    className="w-full h-auto rounded-2xl mb-6"
                  />

                  {/* Título */}
                  <h1 className="text-xl font-medium text-foreground mb-3">{project.title}</h1>

                  <p className="text-sm text-muted-foreground mb-4">
                    publicado em {new Date(project.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </p>

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
                  editHref={editHref}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {lightboxIndex !== null && gallery.length > 0 && (
        <Lightbox images={gallery} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
