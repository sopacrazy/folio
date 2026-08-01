import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus, UploadCloud, X } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { slugify } from '../mockData';
import { uploadFile } from '../lib/upload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish' | 'save' | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
            setDescription(existing.description ?? '');
            setTags(existing.tags ?? []);
            setCoverImageUrl(existing.coverImageUrl);
            setGallery(existing.gallery ?? []);
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
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
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
    try {
      const url = await uploadFile(file, token);
      setCoverImageUrl(url);
    } catch (err: any) {
      setFileError(err.message || 'Falha ao enviar a imagem.');
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

  const onGalleryInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files) return;
    const validFiles = Array.from(files).filter(validateFile);
    try {
      const urls = await Promise.all(validFiles.map((file) => uploadFile(file, token)));
      setGallery((g) => [...g, ...urls]);
    } catch (err: any) {
      setFileError(err.message || 'Falha ao enviar as imagens.');
    }
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
        description,
        tags,
        coverImageUrl,
        gallery,
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-8 md:p-12">
        <h1 className="text-3xl font-extrabold text-foreground mb-8">
          {isEditMode ? 'Editar projeto' : 'Novo projeto'}
        </h1>

        {formError && (
          <div className="text-sm rounded-xl p-4 mb-6 font-medium bg-red-50 text-red-700">{formError}</div>
        )}
        {fileError && (
          <div className="text-sm rounded-xl p-4 mb-6 font-medium bg-red-50 text-red-700">{fileError}</div>
        )}

        <form onSubmit={(e: FormEvent) => e.preventDefault()} className="space-y-8">
          {/* Cover */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-3">Imagem de capa</label>
            <div
              onClick={() => coverInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onCoverDrop}
              className={cn(
                'w-full aspect-[21/9] md:aspect-[3/1] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors',
                coverImageUrl ? 'border-transparent' : isDragging ? 'border-primary bg-primary/5' : 'border-input bg-muted hover:border-primary/60 hover:bg-primary/5'
              )}
            >
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="Prévia da capa" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <UploadCloud className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">Arraste uma imagem ou clique para enviar</span>
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
              <span className="pl-4 text-sm text-muted-foreground shrink-0">folio.app/@{user.username}/</span>
              <input
                value={slugValue}
                onChange={(e) => { setSlugTouched(true); setSlugValue(slugify(e.target.value)); }}
                className="flex-1 min-w-0 h-10 pr-4 py-2 text-sm bg-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Descrição</label>
            <Textarea
              rows={6}
              className="resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte sobre o projeto, o desafio e sua abordagem."
            />
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

          {/* Gallery */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-3">Galeria de imagens</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {gallery.map((url, i) => (
                <div key={url + i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                  <img src={url} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGallery((g) => g.filter((_, idx) => idx !== i))}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    aria-label="Remover imagem"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-input hover:border-primary/60 bg-muted flex items-center justify-center cursor-pointer transition-colors"
              >
                <Plus className="w-8 h-8 text-muted-foreground" />
              </button>
            </div>
            <input
              type="file"
              multiple
              ref={galleryInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={onGalleryInputChange}
              className="hidden"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-input accent-primary"
            />
            Permitir acesso público sem login
          </label>

          <div className="pt-6 border-t border-border flex flex-wrap justify-end gap-3">
            {showSplitActions ? (
              <>
                <Button type="button" variant="outline" disabled={saving !== null} onClick={() => submit(false, 'draft')}>
                  {saving === 'draft' ? 'Salvando...' : 'Salvar rascunho'}
                </Button>
                <Button type="button" disabled={saving !== null} onClick={() => submit(true, 'publish')}>
                  {saving === 'publish' ? 'Publicando...' : 'Publicar projeto'}
                </Button>
              </>
            ) : (
              <Button type="button" disabled={saving !== null} onClick={() => submit(isPublic, 'save')}>
                {saving === 'save' ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
