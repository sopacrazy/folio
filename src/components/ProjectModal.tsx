import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router';
import { Camera, Check, Copy, ExternalLink, Eye, Heart, Loader2, MessagesSquare, Pencil, Share2, UserCheck, UserPlus, X } from 'lucide-react';
import { getProjectByUsernameAndSlug, incrementProjectViewCount } from '../mockData';
import { useAuthStore } from '../store/auth';
import { getVideoEmbedUrl } from '../lib/video';
import { uploadFile } from '../lib/upload';
import { DEFAULT_PROJECT_STYLES, type ProjectBlock, type ProjectStyles } from '../types/project';
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
  isDark: boolean;
  children: React.ReactNode;
}

function ActionIconButton({ onClick, label, active, disabled, isDark, children }: ActionIconButtonProps) {
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
          ? 'bg-primary/20 border-primary/30 text-primary'
          : isDark
            ? 'border-white/15 text-white/70 hover:text-white hover:bg-white/10'
            : 'border-border text-muted-foreground hover:text-foreground hover:bg-black/[0.06]',
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
  isDark: boolean;
  showSpace: boolean;
  spaceHref: string;
}

/** Trilha de ações flutuante à direita, fixa em relação ao painel do modal (não
    rola junto com o conteúdo) — como no Behance. Só existe a partir de 768px
    (ver <MobileActionBar /> abaixo disso). */
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
  isDark,
  showSpace,
  spaceHref,
}: SidebarProps) {
  const profileHref = `/${project.user.username}`;
  const textIdle = isDark ? 'text-white/60' : 'text-muted-foreground';
  const textHover = isDark ? 'hover:text-white' : 'hover:text-foreground';
  const bubbleBg = isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-black/[0.05] hover:bg-black/[0.08]';
  const avatarBorder = isDark ? 'border-white/20 group-hover:border-white/40' : 'border-border group-hover:border-foreground/30';

  return (
    <aside className="hidden md:flex flex-col items-center gap-5 absolute right-6 top-1/2 -translate-y-1/2 z-30">
      <Link to={profileHref} className="flex flex-col items-center gap-1.5 group">
        <Avatar className={cn('w-11 h-11 border-2 transition-colors', avatarBorder)}>
          <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
          <AvatarFallback>{project.user.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className={cn('text-[11px] font-medium transition-colors', textIdle, textHover)}>Perfil</span>
      </Link>

      {isOwner ? (
        <Link to={editHref} className={cn('flex flex-col items-center gap-1.5 transition-colors', textIdle, textHover)}>
          <span className={cn('w-11 h-11 rounded-full flex items-center justify-center transition-colors', bubbleBg)}>
            <Pencil className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-medium">Editar</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={onFollowToggle}
          disabled={!isReal || followLoading}
          className={cn('flex flex-col items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none', textIdle, textHover)}
        >
          <span
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
              isFollowing ? 'bg-primary text-primary-foreground' : bubbleBg
            )}
          >
            {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </span>
          <span className="text-[11px] font-medium">{isFollowing ? 'Seguindo' : 'Seguir'}</span>
        </button>
      )}

      {showSpace && (
        <Link to={spaceHref} className={cn('flex flex-col items-center gap-1.5 transition-colors', textIdle, textHover)}>
          <span className={cn('w-11 h-11 rounded-full flex items-center justify-center transition-colors', bubbleBg)}>
            <MessagesSquare className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-medium">Espaço</span>
        </Link>
      )}

      <button
        type="button"
        onClick={onLikeToggle}
        disabled={!isReal}
        aria-label={liked ? 'Descurtir' : 'Curtir'}
        className={cn('flex flex-col items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none', textIdle, textHover)}
      >
        <span
          className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
            liked ? 'bg-primary/20 text-primary' : bubbleBg
          )}
        >
          <Heart className={cn('w-4 h-4', liked && 'fill-primary')} />
        </span>
        <span className="text-[11px] font-medium tabular-nums">{likeCount}</span>
      </button>

      <button
        type="button"
        onClick={onShare}
        className={cn('flex flex-col items-center gap-1.5 transition-colors', textIdle, textHover)}
      >
        <span className={cn('w-11 h-11 rounded-full flex items-center justify-center transition-colors', bubbleBg)}>
          <Share2 className="w-4 h-4" />
        </span>
        <span className="text-[11px] font-medium">Compartilhar</span>
      </button>

      <button
        type="button"
        onClick={onCopyLink}
        className={cn('flex flex-col items-center gap-1.5 transition-colors', textIdle, textHover)}
      >
        <span className={cn('w-11 h-11 rounded-full flex items-center justify-center transition-colors', bubbleBg)}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </span>
        <span className="text-[11px] font-medium">{copied ? 'Copiado' : 'Copiar link'}</span>
      </button>

      <div className={cn('flex flex-col items-center gap-1.5 pt-3 border-t w-full', isDark ? 'text-white/40 border-white/10' : 'text-muted-foreground/70 border-border')}>
        <Eye className="w-4 h-4" />
        <span className="text-[11px] font-medium tabular-nums">{project.viewCount.toLocaleString('pt-BR')}</span>
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
  isDark,
  showSpace,
  spaceHref,
}: SidebarProps) {
  const profileHref = `/${project.user.username}`;

  return (
    <div
      className={cn(
        'md:hidden sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 backdrop-blur border-b flex items-center justify-between gap-2 mb-6',
        isDark ? 'bg-neutral-950/95 border-white/10' : 'bg-white/95 border-border'
      )}
    >
      <Link to={profileHref} className="flex items-center gap-2 min-w-0">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
          <AvatarFallback className="text-xs">{project.user.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className={cn('text-sm font-semibold truncate', isDark ? 'text-white' : 'text-foreground')}>{project.user.fullName}</span>
      </Link>

      <div className="flex items-center gap-1.5 shrink-0">
        {isOwner ? (
          <Button
            asChild
            size="icon"
            variant="outline"
            className={isDark ? 'border-white/20 bg-white/10 text-white hover:bg-white/20' : 'border-border bg-black/[0.05] text-foreground hover:bg-black/[0.08]'}
            aria-label="Editar projeto"
            title="Editar projeto"
          >
            <Link to={editHref}>
              <Pencil className="w-4 h-4" />
            </Link>
          </Button>
        ) : (
          <Button
            size="icon"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            disabled={!isReal || followLoading}
            onClick={onFollowToggle}
            aria-label={isFollowing ? 'Seguindo' : 'Seguir'}
            title={isFollowing ? 'Seguindo' : 'Seguir'}
          >
            {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </Button>
        )}
        <ActionIconButton onClick={onLikeToggle} label={liked ? 'Descurtir' : 'Curtir'} active={liked} disabled={!isReal} isDark={isDark}>
          <Heart className={cn('w-4 h-4', liked && 'fill-primary text-primary')} />
        </ActionIconButton>
        <ActionIconButton onClick={onShare} label="Compartilhar" isDark={isDark}>
          <Share2 className="w-4 h-4" />
        </ActionIconButton>
        <ActionIconButton onClick={onCopyLink} label={copied ? 'Link copiado' : 'Copiar link'} isDark={isDark}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </ActionIconButton>
        {showSpace && (
          <Button asChild size="icon" variant="outline" className={isDark ? 'border-white/20 bg-white/10 text-white hover:bg-white/20' : 'border-border bg-black/[0.05] text-foreground hover:bg-black/[0.08]'} aria-label="Espaço do projeto" title="Espaço do projeto">
            <Link to={spaceHref}>
              <MessagesSquare className="w-4 h-4" />
            </Link>
          </Button>
        )}
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
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const viewCounted = useRef(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  // Troca rápida de capa direto na página pública — sem precisar entrar no
  // editor completo. Só existe pro dono de um projeto real (mock não persiste).
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !project || source !== 'real') return;
    setCoverError('');
    setCoverUploading(true);
    try {
      const url = await uploadFile(file, token, 'projects');
      const res = await fetch(`/api/projects/${project.id}/cover`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ coverImageUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível atualizar a capa.');
      setProject((p: any) => ({ ...p, coverImageUrl: url }));
    } catch (err: any) {
      setCoverError(err.message || 'Não foi possível atualizar a capa.');
    } finally {
      setCoverUploading(false);
    }
  };

  const isOwner = currentUser?.id === project?.ownerId;
  const isReal = source === 'real';
  const isCollaborator = Boolean(
    currentUser && project?.collaborators?.some((c: any) => c.id === currentUser.id)
  );
  const editHref = `/${username}/${slug}/editar`;
  const spaceHref = `/${username}/${slug}/espaco`;
  // Projetos reais são montados com blocos; os dados mock (demonstração) ainda
  // usam o formato antigo (galeria + descrição) — os dois são suportados aqui.
  const blocks: ProjectBlock[] = project?.blocks ?? [];
  const hasBlocks = blocks.length > 0;
  const gallery: string[] = project?.gallery ?? [];
  const flatImages: string[] = hasBlocks
    ? blocks.flatMap((b) => (b.type === 'image' ? [b.url] : b.type === 'grid' ? b.images : []))
    : gallery;
  const notFound = !loading && (!project || (!project.isPublic && !isOwner));

  const projectStyles: ProjectStyles = project?.styles ?? DEFAULT_PROJECT_STYLES;
  const isDark = projectStyles.theme === 'dark';
  const contentMaxWidthClass =
    projectStyles.width === 'narrow' ? 'max-w-2xl' : projectStyles.width === 'wide' ? 'max-w-5xl' : 'max-w-3xl';
  const accentStyle = { '--primary': projectStyles.accentColor } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 md:flex md:items-center md:justify-center" onClick={close}>
      <div
        className={cn(
          'relative w-full h-full md:w-[97%] md:h-[97%] md:rounded-2xl md:shadow-2xl overflow-hidden flex flex-col backdrop-blur-md',
          isDark ? 'bg-neutral-950/60' : 'bg-white/95'
        )}
        style={accentStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className={cn(
            'absolute top-4 right-4 z-40 w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors',
            isDark ? 'bg-black/40 hover:bg-black/60 text-white' : 'bg-white/80 hover:bg-white text-foreground border border-border'
          )}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className={cn(contentMaxWidthClass, 'mx-auto px-4 sm:px-6 md:pr-28 py-8')}>
              <Skeleton className={cn('h-7 w-2/3 mb-3', isDark ? 'bg-white/10' : 'bg-black/5')} />
              <div className="flex items-center gap-2 mb-6">
                <Skeleton className={cn('w-7 h-7 rounded-full', isDark ? 'bg-white/10' : 'bg-black/5')} />
                <Skeleton className={cn('h-4 w-40', isDark ? 'bg-white/10' : 'bg-black/5')} />
              </div>
              <Skeleton className={cn('w-full h-80 rounded-2xl mb-4', isDark ? 'bg-white/10' : 'bg-black/5')} />
              <Skeleton className={cn('w-full h-80 rounded-2xl', isDark ? 'bg-white/10' : 'bg-black/5')} />
            </div>
          ) : notFound ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
              <h1 className={cn('text-xl font-bold mb-2', isDark ? 'text-white' : 'text-foreground')}>Projeto não encontrado</h1>
              <p className={cn('mb-6', isDark ? 'text-white/60' : 'text-muted-foreground')}>Esse projeto não existe ou não está mais disponível.</p>
              <Button
                variant="outline"
                className={isDark ? 'border-white/20 bg-white/10 text-white hover:bg-white/20' : ''}
                onClick={close}
              >
                Fechar
              </Button>
            </div>
          ) : (
            <div className={cn(contentMaxWidthClass, 'mx-auto px-4 sm:px-6 md:pr-28 py-8')}>
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
                isDark={isDark}
                showSpace={isOwner || isCollaborator}
                spaceHref={spaceHref}
              />

              {coverError && (
                <div className="text-sm rounded-xl p-3 mb-4 font-medium bg-red-50 text-red-700">{coverError}</div>
              )}

              {/* Título — a capa entra só como miniatura aqui; quem "abre pra
                  visualizar" (lightbox) é a galeria, não ela. */}
              <div className="flex items-start gap-4 mb-4">
                <div className={cn('relative w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center', isDark ? 'bg-white/5' : 'bg-black/[0.03]')}>
                  <img
                    src={project.coverImageUrl}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                  {isOwner && isReal && (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={coverUploading}
                      aria-label="Alterar capa"
                      title="Alterar capa"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity hover:opacity-100 disabled:opacity-100"
                    >
                      {coverUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="min-w-0 pt-0.5">
                  <h1 className={cn('text-2xl font-semibold mb-2', isDark ? 'text-white' : 'text-foreground')}>{project.title}</h1>
                  <Link to={`/${project.user.username}`} className="inline-flex items-center gap-2 group">
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
                      <AvatarFallback className="text-xs">{project.user.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className={cn('text-sm font-medium transition-colors', isDark ? 'text-white/80 group-hover:text-white' : 'text-foreground/80 group-hover:text-foreground')}>
                      {project.user.fullName}
                    </span>
                    <span className={cn('text-sm', isDark ? 'text-white/40' : 'text-muted-foreground/70')}>
                      · publicado em {new Date(project.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    </span>
                  </Link>
                </div>
              </div>
              {isOwner && isReal && (
                <input
                  type="file"
                  ref={coverInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverFileChange}
                  className="hidden"
                />
              )}

              {/* Tags */}
              {project.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {project.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Botão de call-to-action personalizado, quando configurado no editor. */}
              {project.customButtonLabel && project.customButtonUrl && (
                <a
                  href={project.customButtonUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {project.customButtonLabel}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {/* Conteúdo do projeto — blocos (imagem, grade, texto, vídeo) na
                  ordem em que o dono os montou, cada imagem abrindo no
                  lightbox ao clicar. Dados mock caem no formato antigo
                  (galeria + descrição) abaixo. */}
              {hasBlocks ? (
                <div className="space-y-4">
                  {(() => {
                    let imgIndex = -1;
                    return blocks.map((block) => {
                      if (block.type === 'image') {
                        if (!block.url) return null;
                        imgIndex += 1;
                        const index = imgIndex;
                        return (
                          <button
                            key={block.id}
                            type="button"
                            onClick={() => setLightboxIndex(index)}
                            className="block w-full rounded-2xl overflow-hidden group focus-visible:outline-2 focus-visible:outline-primary"
                            aria-label="Ampliar imagem"
                          >
                            <img
                              src={block.url}
                              alt=""
                              className="w-full h-auto object-cover group-hover:opacity-90 transition-opacity duration-300"
                            />
                          </button>
                        );
                      }

                      if (block.type === 'grid') {
                        if (block.images.length === 0) return null;
                        return (
                          <div key={block.id} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {block.images.map((url) => {
                              imgIndex += 1;
                              const index = imgIndex;
                              return (
                                <button
                                  key={url + index}
                                  type="button"
                                  onClick={() => setLightboxIndex(index)}
                                  className="block aspect-square rounded-xl overflow-hidden group focus-visible:outline-2 focus-visible:outline-primary"
                                  aria-label="Ampliar imagem"
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity duration-300"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        );
                      }

                      if (block.type === 'text') {
                        if (!block.content) return null;
                        return (
                          <p key={block.id} className={cn('leading-relaxed whitespace-pre-wrap', isDark ? 'text-white/70' : 'text-foreground/70')}>
                            {block.content}
                          </p>
                        );
                      }

                      if (block.type === 'video') {
                        const embedUrl = getVideoEmbedUrl(block.url);
                        if (!embedUrl) return null;
                        return (
                          <div key={block.id} className="aspect-video rounded-2xl overflow-hidden bg-black">
                            <iframe
                              src={embedUrl}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Vídeo do projeto"
                            />
                          </div>
                        );
                      }

                      return null;
                    });
                  })()}
                </div>
              ) : (
                <>
                  {gallery.length > 0 && (
                    <div className="space-y-4 mb-8">
                      {gallery.map((url, index) => (
                        <button
                          key={url + index}
                          type="button"
                          onClick={() => setLightboxIndex(index)}
                          className="block w-full rounded-2xl overflow-hidden group focus-visible:outline-2 focus-visible:outline-primary"
                          aria-label={`Ampliar imagem ${index + 1} da galeria`}
                        >
                          <img
                            src={url}
                            alt=""
                            className="w-full h-auto object-cover group-hover:opacity-90 transition-opacity duration-300"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {project.description && (
                    <p className={cn('leading-relaxed whitespace-pre-wrap', isDark ? 'text-white/70' : 'text-foreground/70')}>{project.description}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {!loading && !notFound && (
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
            isDark={isDark}
            showSpace={isOwner || isCollaborator}
            spaceHref={spaceHref}
          />
        )}
      </div>

      {lightboxIndex !== null && flatImages.length > 0 && (
        <Lightbox images={flatImages} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
