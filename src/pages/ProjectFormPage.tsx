import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Plus,
  Trash2,
  Type as TypeIcon,
  UploadCloud,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { slugify } from '../mockData';
import { uploadFile } from '../lib/upload';
import { getVideoEmbedUrl } from '../lib/video';
import type { ProjectBlock, ProjectBlockType } from '../types/project';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const BLOCK_META: Record<ProjectBlockType, { label: string; icon: typeof ImageIcon }> = {
  image: { label: 'Imagem', icon: ImageIcon },
  grid: { label: 'Grade de fotos', icon: LayoutGrid },
  text: { label: 'Texto', icon: TypeIcon },
  video: { label: 'Vídeo', icon: VideoIcon },
};

type PendingUpload = { id: string; previewUrl: string };

function AddContentButton({ type, onClick }: { type: ProjectBlockType; onClick: () => void }) {
  const { label, icon: Icon } = BLOCK_META[type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-input bg-background hover:border-primary/60 hover:bg-primary/5 transition-colors py-4"
    >
      <Icon className="w-5 h-5 text-foreground" />
      <span className="text-xs font-medium text-foreground text-center px-1">{label}</span>
    </button>
  );
}

/** Botão circular do estado vazio do canvas — mesma ação do AddContentButton
    da sidebar, só que maior e mais convidativo (como no editor do Behance). */
function EmptyStateAddButton({ type, onClick }: { type: ProjectBlockType; onClick: () => void }) {
  const { label, icon: Icon } = BLOCK_META[type];
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2.5 group">
      <span className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Icon className="w-6 h-6" />
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}

interface BlockShellProps {
  type: ProjectBlockType;
  isDragOver: boolean;
  onRemove: () => void;
  onDragStart: (e: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  setContainerRef: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}

function BlockShell({ type, isDragOver, onRemove, onDragStart, onDragEnd, onDragOver, onDrop, setContainerRef, children }: BlockShellProps) {
  const { label, icon: Icon } = BLOCK_META[type];
  return (
    <div
      ref={setContainerRef}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn('border-t border-border p-5 sm:p-6 transition-colors', isDragOver && 'bg-primary/5')}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Icon className="w-4 h-4" />
          {label}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing"
            aria-label="Arrastar para reordenar"
            title="Arrastar para reordenar"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50"
            aria-label="Remover bloco"
            title="Remover bloco"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

function ImageBlockEditor({
  url,
  uploading,
  previewUrl,
  onFile,
}: {
  url: string;
  uploading: boolean;
  previewUrl?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const display = previewUrl || url;

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={cn(
          'relative w-full aspect-video rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors',
          display ? 'border-transparent' : isDragging ? 'border-primary bg-primary/5' : 'border-input bg-muted hover:border-primary/60 hover:bg-primary/5'
        )}
      >
        {display ? (
          <img src={display} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-muted-foreground">
            <UploadCloud className="w-7 h-7 mx-auto mb-2" />
            <span className="text-sm font-medium">Arraste uma imagem ou clique para enviar</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
        )}
      </div>
      <input
        type="file"
        ref={inputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

function GridBlockEditor({
  images,
  pending,
  onFiles,
  onRemoveImage,
}: {
  images: string[];
  pending: PendingUpload[];
  onFiles: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((url, i) => (
          <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveImage(i)}
              className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              aria-label="Remover imagem"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {pending.map((p) => (
          <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border">
            <img src={p.previewUrl} alt="" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="aspect-square rounded-lg border-2 border-dashed border-input hover:border-primary/60 bg-muted flex items-center justify-center cursor-pointer transition-colors"
        >
          <Plus className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>
      <input
        type="file"
        multiple
        ref={inputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = '';
          if (files.length > 0) onFiles(files);
        }}
      />
    </div>
  );
}

function TextBlockEditor({ content, onChange }: { content: string; onChange: (value: string) => void }) {
  return (
    <Textarea
      rows={5}
      className="resize-y"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Escreva um parágrafo sobre o projeto…"
    />
  );
}

function VideoBlockEditor({ url, onChange }: { url: string; onChange: (value: string) => void }) {
  const embedUrl = url ? getVideoEmbedUrl(url) : null;
  return (
    <div>
      <Input value={url} onChange={(e) => onChange(e.target.value)} placeholder="Cole o link do YouTube ou Vimeo" />
      {url && !embedUrl && (
        <p className="text-xs text-red-600 mt-2">Não reconheci esse link. Use uma URL do YouTube ou Vimeo.</p>
      )}
      {embedUrl && (
        <div className="mt-3 aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Prévia do vídeo"
          />
        </div>
      )}
    </div>
  );
}

export default function ProjectFormPage() {
  const { handle, slug: editingSlug } = useParams();
  const isEditMode = Boolean(editingSlug);
  const navigate = useNavigate();
  const { user, token } = useAuthStore();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [wasPublished, setWasPublished] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState('');
  const [slugValue, setSlugValue] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish' | 'save' | null>(null);

  const [blocks, setBlocks] = useState<ProjectBlock[]>([]);
  const [blockUploads, setBlockUploads] = useState<Record<string, PendingUpload[]>>({});
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!isEditMode || !user) return;
    let cancelled = false;
    const username = handle?.startsWith('@') ? handle.slice(1) : handle;

    async function load() {
      if (!username || !editingSlug) {
        if (!cancelled) { setNotFound(true); setLoading(false); }
        return;
      }

      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(username)}/${encodeURIComponent(editingSlug)}`);
        if (res.ok) {
          const existing = await res.json();
          if (existing.ownerId !== user!.id) {
            if (!cancelled) { setNotFound(true); setLoading(false); }
            return;
          }
          if (!cancelled) {
            setProjectId(existing.id);
            setTitle(existing.title);
            setSlugValue(existing.slug);
            setTags(existing.tags ?? []);
            setCoverImageUrl(existing.coverImageUrl);
            setBlocks(existing.blocks ?? []);
            setIsPublic(existing.isPublic);
            setWasPublished(existing.isPublic);
            setLoading(false);
          }
          return;
        }
      } catch {
        // segue pro "não encontrado" abaixo
      }
      if (!cancelled) { setNotFound(true); setLoading(false); }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, handle, editingSlug, user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 md:p-12">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="w-full aspect-[21/9] md:aspect-[3/1] rounded-2xl mb-8" />
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-10 w-full rounded-xl mb-8" />
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-10 w-full rounded-xl mb-8" />
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </Card>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-xl font-bold text-foreground mb-2">Projeto não encontrado</h1>
        <p className="text-muted-foreground">Esse projeto não existe ou você não tem permissão pra editá-lo.</p>
      </div>
    );
  }

  const validateFile = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileError('Formato inválido. Use JPG, PNG ou WEBP.');
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError('O arquivo deve ter no máximo 5MB.');
      return false;
    }
    setFileError('');
    return true;
  };

  const handleCoverFile = async (file: File) => {
    if (!validateFile(file)) return;
    const localPreview = URL.createObjectURL(file);
    setCoverPreview(localPreview);
    setCoverUploading(true);
    try {
      const url = await uploadFile(file, token, 'projects');
      setCoverImageUrl(url);
    } catch (err: any) {
      setFileError(err.message || 'Falha ao enviar a imagem.');
    } finally {
      setCoverUploading(false);
      setCoverPreview(null);
      URL.revokeObjectURL(localPreview);
    }
  };

  const onCoverInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleCoverFile(file);
    e.target.value = '';
  };

  const onCoverDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleCoverFile(file);
  };

  const addTag = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) setTags((t) => [...t, value]);
    setTagInput('');
  };

  const onTagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlugValue(slugify(value));
  };

  // -- Blocos de conteúdo --

  const addBlock = (type: ProjectBlockType) => {
    const id = crypto.randomUUID();
    const block: ProjectBlock =
      type === 'image' ? { id, type, url: '' }
      : type === 'grid' ? { id, type, images: [] }
      : type === 'text' ? { id, type, content: '' }
      : { id, type, url: '' };
    setBlocks((bs) => [...bs, block]);
  };

  const removeBlock = (id: string) => {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    setBlockUploads((u) => {
      const { [id]: _removed, ...rest } = u;
      return rest;
    });
  };

  const updateBlock = (id: string, patch: Record<string, unknown>) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as ProjectBlock) : b)));
  };

  const uploadIntoImageBlock = (blockId: string, file: File) => {
    if (!validateFile(file)) return;
    const pending: PendingUpload = { id: crypto.randomUUID(), previewUrl: URL.createObjectURL(file) };
    setBlockUploads((u) => ({ ...u, [blockId]: [pending] }));
    uploadFile(file, token, 'projects')
      .then((url) => updateBlock(blockId, { url }))
      .catch((err) => setFileError(err.message || 'Falha ao enviar a imagem.'))
      .finally(() => {
        setBlockUploads((u) => ({ ...u, [blockId]: (u[blockId] ?? []).filter((p) => p.id !== pending.id) }));
        URL.revokeObjectURL(pending.previewUrl);
      });
  };

  const uploadIntoGridBlock = (blockId: string, files: File[]) => {
    const validFiles = files.filter(validateFile);
    validFiles.forEach((file) => {
      const pending: PendingUpload = { id: crypto.randomUUID(), previewUrl: URL.createObjectURL(file) };
      setBlockUploads((u) => ({ ...u, [blockId]: [...(u[blockId] ?? []), pending] }));
      uploadFile(file, token, 'projects')
        .then((url) => {
          setBlocks((bs) => bs.map((b) => (b.id === blockId && b.type === 'grid' ? { ...b, images: [...b.images, url] } : b)));
        })
        .catch((err) => setFileError(err.message || 'Falha ao enviar as imagens.'))
        .finally(() => {
          setBlockUploads((u) => ({ ...u, [blockId]: (u[blockId] ?? []).filter((p) => p.id !== pending.id) }));
          URL.revokeObjectURL(pending.previewUrl);
        });
    });
  };

  const removeGridImage = (blockId: string, index: number) => {
    setBlocks((bs) => bs.map((b) => (b.id === blockId && b.type === 'grid' ? { ...b, images: b.images.filter((_, i) => i !== index) } : b)));
  };

  const handleBlockDragStart = (id: string) => (e: DragEvent<HTMLButtonElement>) => {
    setDraggedBlockId(id);
    e.dataTransfer.effectAllowed = 'move';
    const el = blockRefs.current.get(id);
    if (el) e.dataTransfer.setDragImage(el, 24, 24);
  };

  const handleBlockDragOver = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedBlockId && draggedBlockId !== id) setDragOverBlockId(id);
  };

  const handleBlockDrop = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setBlocks((bs) => {
      const from = bs.findIndex((b) => b.id === draggedBlockId);
      const to = bs.findIndex((b) => b.id === id);
      if (from === -1 || to === -1 || from === to) return bs;
      const copy = [...bs];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const handleBlockDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const submit = async (nextIsPublic: boolean, mode: 'draft' | 'publish' | 'save') => {
    setFormError('');
    if (!title.trim()) {
      setFormError('Dê um título ao projeto antes de salvar.');
      return;
    }
    if (!coverImageUrl) {
      setFormError('Adicione uma imagem de capa.');
      return;
    }

    setSaving(mode);
    try {
      const payload = {
        title: title.trim(),
        slug: slugValue.trim() || undefined,
        tags,
        coverImageUrl,
        blocks,
        isPublic: nextIsPublic,
      };

      const res = await fetch(projectId ? `/api/projects/${projectId}` : '/api/projects', {
        method: projectId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Não foi possível salvar o projeto.');

      navigate(`/@${user.username}/${result.slug}`);
    } catch (err: any) {
      setFormError(err.message || 'Não foi possível salvar o projeto.');
      setSaving(null);
    }
  };

  const showSplitActions = !isEditMode || !wasPublished;
  const uploadsPending = coverUploading || Object.values(blockUploads).some((list) => list.length > 0);

  return (
    <div>
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-center gap-3">
            {showSplitActions ? (
              <>
                <Button type="button" variant="outline" size="sm" disabled={saving !== null || uploadsPending} onClick={() => submit(false, 'draft')}>
                  {saving === 'draft' ? 'Salvando...' : 'Salvar rascunho'}
                </Button>
                <Button type="button" size="sm" disabled={saving !== null || uploadsPending} onClick={() => submit(true, 'publish')}>
                  {saving === 'publish' ? 'Publicando...' : 'Publicar projeto'}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" disabled={saving !== null || uploadsPending} onClick={() => submit(isPublic, 'save')}>
                {saving === 'save' ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {formError && (
        <div className="text-sm rounded-xl p-4 mb-6 font-medium bg-red-50 text-red-700">{formError}</div>
      )}
      {fileError && (
        <div className="text-sm rounded-xl p-4 mb-6 font-medium bg-red-50 text-red-700">{fileError}</div>
      )}

      <form onSubmit={(e: FormEvent) => e.preventDefault()} className="lg:flex lg:items-start lg:gap-8">
        <div className="flex-1 min-w-0 rounded-2xl bg-card overflow-hidden">
          <div className="p-8 md:p-12">
            <h1 className="text-3xl font-bold text-foreground mb-8">
              {isEditMode ? 'Editar projeto' : 'Novo projeto'}
            </h1>

            <div className="space-y-8">
              {/* Cover */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-3">Imagem de capa</label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onCoverDrop}
                  className={cn(
                    'relative w-full aspect-[21/9] md:aspect-[3/1] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors',
                    (coverPreview || coverImageUrl) ? 'border-transparent' : isDragging ? 'border-primary bg-primary/5' : 'border-input bg-muted hover:border-primary/60 hover:bg-primary/5'
                  )}
                >
                  {(coverPreview || coverImageUrl) ? (
                    <img src={coverPreview || coverImageUrl} alt="Prévia da capa" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <UploadCloud className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-sm font-medium">Arraste uma imagem ou clique para enviar</span>
                    </div>
                  )}
                  {coverUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={coverInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onCoverInputChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Título do projeto</label>
                <Input
                  required
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Ex: Identidade visual — Café Lumen"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Endereço do projeto</label>
                <div className="flex items-center rounded-xl border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring overflow-hidden">
                  <span className="pl-4 text-sm text-muted-foreground shrink-0">portsy.app/@{user.username}/</span>
                  <input
                    value={slugValue}
                    onChange={(e) => { setSlugTouched(true); setSlugValue(slugify(e.target.value)); }}
                    className="flex-1 min-w-0 h-10 pr-4 py-2 text-sm bg-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Tags</label>
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1.5">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags((t) => t.filter((x) => x !== tag))}
                        className="hover:opacity-70"
                        aria-label={`Remover tag ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={onTagInputKeyDown}
                    onBlur={addTag}
                    placeholder={tags.length === 0 ? 'Adicionar tag' : ''}
                    className="flex-1 min-w-[100px] h-7 text-sm bg-transparent outline-none px-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Blocos de conteúdo — continuação do mesmo canvas, sem cards
              separados: cada seção só é dividida por uma linha fina, como no
              Behance. */}
          {blocks.length === 0 ? (
            <div className="min-h-[380px] border-t border-border flex flex-col items-center justify-center gap-10 py-16 px-6">
              <p className="text-lg text-muted-foreground">Comece a criar seu projeto:</p>
              <div className="flex flex-wrap items-start justify-center gap-8">
                <EmptyStateAddButton type="image" onClick={() => addBlock('image')} />
                <EmptyStateAddButton type="text" onClick={() => addBlock('text')} />
                <EmptyStateAddButton type="grid" onClick={() => addBlock('grid')} />
                <EmptyStateAddButton type="video" onClick={() => addBlock('video')} />
              </div>
            </div>
          ) : (
              blocks.map((block) => (
                <BlockShell
                  key={block.id}
                  type={block.type}
                  isDragOver={dragOverBlockId === block.id}
                  onRemove={() => removeBlock(block.id)}
                  onDragStart={handleBlockDragStart(block.id)}
                  onDragEnd={handleBlockDragEnd}
                  onDragOver={handleBlockDragOver(block.id)}
                  onDrop={handleBlockDrop(block.id)}
                  setContainerRef={(el) => {
                    if (el) blockRefs.current.set(block.id, el);
                    else blockRefs.current.delete(block.id);
                  }}
                >
                  {block.type === 'image' && (
                    <ImageBlockEditor
                      url={block.url}
                      uploading={(blockUploads[block.id]?.length ?? 0) > 0}
                      previewUrl={blockUploads[block.id]?.[0]?.previewUrl}
                      onFile={(file) => uploadIntoImageBlock(block.id, file)}
                    />
                  )}
                  {block.type === 'grid' && (
                    <GridBlockEditor
                      images={block.images}
                      pending={blockUploads[block.id] ?? []}
                      onFiles={(files) => uploadIntoGridBlock(block.id, files)}
                      onRemoveImage={(index) => removeGridImage(block.id, index)}
                    />
                  )}
                  {block.type === 'text' && (
                    <TextBlockEditor content={block.content} onChange={(value) => updateBlock(block.id, { content: value })} />
                  )}
                  {block.type === 'video' && (
                    <VideoBlockEditor url={block.url} onChange={(value) => updateBlock(block.id, { url: value })} />
                  )}
                </BlockShell>
              ))
            )}
        </div>

        <aside className="lg:w-72 shrink-0 mt-6 lg:mt-0">
          <div className="lg:sticky lg:top-6 space-y-6">
            <Card className="p-6">
              <h2 className="text-sm font-bold text-foreground mb-4">Adicionar conteúdo</h2>
              <div className="grid grid-cols-2 gap-3">
                <AddContentButton type="image" onClick={() => addBlock('image')} />
                <AddContentButton type="text" onClick={() => addBlock('text')} />
                <AddContentButton type="grid" onClick={() => addBlock('grid')} />
                <AddContentButton type="video" onClick={() => addBlock('video')} />
              </div>
            </Card>

            <Card className="p-6">
              <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-input accent-primary"
                />
                Permitir acesso público sem login
              </label>
            </Card>
          </div>
        </aside>
      </form>
      </div>
    </div>
  );
}
