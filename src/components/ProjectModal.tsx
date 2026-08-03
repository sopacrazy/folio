import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router';
import { Check, Copy, Eye, Heart, Pencil, Share2, UserCheck, UserPlus, X } from 'lucide-react';
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
          ? 'bg-red-500/20 border-red-500/30 text-red-400'
          : 'border-white/15 text-white/70 hover:text-white hover:bg-white/10',
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
}: SidebarProps) {
  const profileHref = `/@${project.user.username}`;

  return (
    <aside className="hidden md:flex flex-col items-center gap-5 absolute right-6 top-1/2 -translate-y-1/2 z-30">
      <Link to={profileHref} className="flex flex-col items-center gap-1.5 group">
        <Avatar className="w-11 h-11 border-2 border-white/20 group-hover:border-white/40 transition-colors">
          <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
          <AvatarFallback>{project.user.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-[11px] font-medium text-white/60 group-hover:text-white transition-colors">Perfil</span>
      </Link>

      {isOwner ? (
        <Link to={editHref} className="flex flex-col items-center gap-1.5 text-white/60 hover:text-white transition-colors">
          <span className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
            <Pencil className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-medium">Editar</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={onFollowToggle}
          disabled={!isReal || followLoading}
          className="flex flex-col items-center gap-1.5 text-white/60 hover:text-white transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <span
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
              isFollowing ? 'bg-primary text-primary-foreground' : 'bg-white/10 hover:bg-white/15'
            )}
          >
            {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </span>
          <span className="text-[11px] font-medium">{isFollowing ? 'Seguindo' : 'Seguir'}</span>
        </button>
      )}

      <button
        type="button"
        onClick={onLikeToggle}
        disabled={!isReal}
        aria-label={liked ? 'Descurtir' : 'Curtir'}
        className="flex flex-col items-center gap-1.5 text-white/60 hover:text-white transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <span
          className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
            liked ? 'bg-red-500/20 text-red-400' : 'bg-white/10 hover:bg-white/15'
          )}
        >
          <Heart className={cn('w-4 h-4', liked && 'fill-red-400')} />
        </span>
        <span className="text-[11px] font-medium tabular-nums">{likeCount}</span>
      </button>

      <button
        type="button"
        onClick={onShare}
        className="flex flex-col items-center gap-1.5 text-white/60 hover:text-white transition-colors"
      >
        <span className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
          <Share2 className="w-4 h-4" />
        </span>
        <span className="text-[11px] font-medium">Compartilhar</span>
      </button>

      <button
        type="button"
        onClick={onCopyLink}
        className="flex flex-col items-center gap-1.5 text-white/60 hover:text-white transition-colors"
      >
        <span className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </span>
        <span className="text-[11px] font-medium">{copied ? 'Copiado' : 'Copiar link'}</span>
      </button>

      <div className="flex flex-col items-center gap-1.5 text-white/40 pt-3 border-t border-white/10 w-full">
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
}: SidebarProps) {
  const profileHref = `/@${project.user.username}`;

  return (
    <div className="md:hidden sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-neutral-950/95 backdrop-blur border-b border-white/10 flex items-center justify-between gap-2 mb-6">
      <Link to={profileHref} className="flex items-center gap-2 min-w-0">
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
          <AvatarFallback className="text-xs">{project.user.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold text-white truncate">{project.user.fullName}</span>
      </Link>

      <div className="flex items-center gap-1.5 shrink-0">
        {isOwner ? (
          <Button asChild size="icon" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" aria-label="Editar projeto" title="Editar projeto">
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
    <div className="fixed inset-0 z-[70] bg-black/50 md:flex md:items-center md:justify-center" onClick={close}>
      <div
        className="relative bg-neutral-950/60 backdrop-blur-md w-full h-full md:w-[97%] md:h-[97%] md:rounded-2xl md:shadow-2xl overflow-hidden flex flex-col"
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
            <div className="max-w-3xl mx-auto px-4 sm:px-6 md:pr-28 py-8">
              <Skeleton className="h-7 w-2/3 mb-3 bg-white/10" />
              <div className="flex items-center gap-2 mb-6">
                <Skeleton className="w-7 h-7 rounded-full bg-white/10" />
                <Skeleton className="h-4 w-40 bg-white/10" />
              </div>
              <Skeleton className="w-full h-80 rounded-2xl mb-4 bg-white/10" />
              <Skeleton className="w-full h-80 rounded-2xl bg-white/10" />
            </div>
          ) : notFound ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
              <h1 className="text-xl font-bold text-white mb-2">Projeto não encontrado</h1>
              <p className="text-white/60 mb-6">Esse projeto não existe ou não está mais disponível.</p>
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={close}>Fechar</Button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 md:pr-28 py-8">
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

              {/* Título */}
              <h1 className="text-2xl font-semibold text-white mb-3">{project.title}</h1>

              <Link to={`/@${project.user.username}`} className="inline-flex items-center gap-2 mb-4 group">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
                  <AvatarFallback className="text-xs">{project.user.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                  {project.user.fullName}
                </span>
                <span className="text-sm text-white/40">
                  · publicado em {new Date(project.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                </span>
              </Link>

              {/* Tags */}
              {project.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {project.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Imagens do projeto — capa + galeria, uma abaixo da outra, no
                  tamanho padrão da coluna (como no Behance). */}
              <div className="space-y-4 mb-8">
                <img
                  src={project.coverImageUrl}
                  alt={project.title}
                  className="w-full h-auto rounded-2xl"
                />
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

              {/* Descrição */}
              {project.description && (
                <p className="text-white/70 leading-relaxed whitespace-pre-wrap">{project.description}</p>
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
          />
        )}
      </div>

      {lightboxIndex !== null && gallery.length > 0 && (
        <Lightbox images={gallery} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
