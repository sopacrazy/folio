import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowRight, Check, Copy, Eye, Heart, Pencil } from 'lucide-react';
import { getProjectByUsernameAndSlug, incrementProjectViewCount } from '../mockData';
import { useAuthStore } from '../store/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
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
          <div className="flex items-center justify-between border-t border-border pt-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    );
  }

  const isOwner = currentUser?.id === project?.ownerId;

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

  const publishedDate = new Date(project.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <div className="bg-white min-h-screen">
      {/* Header simples */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-extrabold text-lg tracking-tight text-primary">
            Folio
          </Link>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button asChild variant="outline" size="sm">
                <Link to={`/@${username}/${slug}/editar`}>
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Link copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copiar link
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {!project.isPublic && (
        <div className="bg-tag text-tag-foreground text-sm font-medium text-center py-2">
          Este projeto é um rascunho — só você consegue vê-lo.
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Capa */}
        <img
          src={project.coverImageUrl}
          alt={project.title}
          className="w-full h-56 rounded-2xl object-cover mb-6"
        />

        {/* Título */}
        <h1 className="text-xl font-medium text-foreground mb-3">{project.title}</h1>

        {/* Atribuição */}
        <Link to={`/@${project.user.username}`} className="flex items-center gap-2 mb-4 w-fit">
          <Avatar className="w-6 h-6">
            <AvatarImage src={project.user.avatarUrl} alt={project.user.fullName} />
            <AvatarFallback className="text-[10px]">{project.user.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-foreground font-medium hover:text-primary transition-colors">
            {project.user.fullName}
          </span>
          <span className="text-sm text-muted-foreground">· publicado em {publishedDate}</span>
        </Link>

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
        {project.gallery?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {project.gallery.map((url: string, index: number) => (
              <img
                key={url + index}
                src={url}
                alt=""
                className={`w-full rounded-2xl object-cover ${index === 0 ? 'sm:col-span-2' : ''}`}
              />
            ))}
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <button
              type="button"
              onClick={handleLikeToggle}
              disabled={source !== 'real'}
              aria-label={liked ? 'Descurtir' : 'Curtir'}
              className={cn(
                'flex items-center gap-1.5 transition-colors',
                source === 'real' ? 'hover:text-red-500 cursor-pointer' : 'cursor-default'
              )}
            >
              <Heart className={cn('w-4 h-4', liked && 'fill-red-500 text-red-500')} /> {likeCount}
            </button>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> {project.viewCount.toLocaleString('pt-BR')} visualizações
            </span>
          </div>
          <Link
            to={`/@${project.user.username}`}
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Ver mais projetos de {project.user.fullName.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
