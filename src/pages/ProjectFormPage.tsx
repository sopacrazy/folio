import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  MessagesSquare,
  Moon,
  Paintbrush,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  Type as TypeIcon,
  UploadCloud,
  Users,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { slugify } from '../mockData';
import { uploadFile, type UploadStatus } from '../lib/upload';
import { getVideoEmbedUrl } from '../lib/video';
import {
  ACCENT_COLOR_PRESETS,
  DEFAULT_PROJECT_STYLES,
  type ProjectBlock,
  type ProjectBlockType,
  type ProjectStyles,
} from '../types/project';
import { UPLOAD_LIMITS_MB } from '../config/uploadLimits';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BLOCK_META: Record<ProjectBlockType, { label: string; icon: typeof ImageIcon }> = {
  image: { label: 'Imagem', icon: ImageIcon },
  grid: { label: 'Grade de fotos', icon: LayoutGrid },
  text: { label: 'Texto', icon: TypeIcon },
  video: { label: 'Vídeo', icon: VideoIcon },
};

type PendingUpload = { id: string; previewUrl: string; status: UploadStatus };

function AddContentButton({ type, onClick }: { type: ProjectBlockType; onClick: () => void }) {
  const { label, icon: Icon } = BLOCK_META[type];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-24 flex-col items-center justify-center rounded-xl border border-border bg-muted/60 px-4 py-5 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="mb-2 h-7 w-7 text-foreground transition-colors group-hover:text-primary" />
      <span className="text-xs font-semibold leading-tight text-foreground">{label}</span>
    </button>
  );
}

function EditProjectButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: typeof Paintbrush;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="group flex min-h-20 flex-col items-center justify-center rounded-xl border border-border bg-muted/60 px-3 py-4 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-muted/60"
    >
      <Icon className="mb-2 h-5 w-5 text-foreground transition-colors group-hover:text-primary" />
      <span className="text-xs font-semibold leading-tight text-foreground">{label}</span>
    </button>
  );
}

const WIDTH_OPTIONS: { value: ProjectStyles['width']; label: string; barWidth: string }[] = [
  { value: 'narrow', label: 'Estreito', barWidth: '45%' },
  { value: 'default', label: 'Padrão', barWidth: '70%' },
  { value: 'wide', label: 'Largo', barWidth: '92%' },
];

function StylesPanel({
  open,
  onClose,
  styles,
  onChange,
  onSave,
  saving,
  error,
}: {
  open: boolean;
  onClose: () => void;
  styles: ProjectStyles;
  onChange: (patch: Partial<ProjectStyles>) => void;
  onSave: () => void;
  saving: boolean;
  error: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Estilos do projeto</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Personalize a aparência da página pública deste projeto.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-7 p-6">
          {error && (
            <div className="text-sm rounded-xl p-4 font-medium bg-red-50 text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-bold text-foreground mb-3">Tema</label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: 'light' as const, label: 'Claro', icon: Sun },
                  { value: 'dark' as const, label: 'Escuro', icon: Moon },
                ]
              ).map(({ value, label, icon: Icon }) => {
                const selected = styles.theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ theme: value })}
                    className={cn(
                      'relative rounded-xl border-2 p-4 text-left transition-colors',
                      selected ? 'border-primary' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div
                      className={cn(
                        'mb-3 flex h-14 items-center justify-center rounded-lg',
                        value === 'light' ? 'bg-white border border-border' : 'bg-neutral-900'
                      )}
                    >
                      <Icon className={cn('h-5 w-5', value === 'light' ? 'text-neutral-800' : 'text-white')} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    {selected && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-3">Largura do conteúdo</label>
            <div className="grid grid-cols-3 gap-3">
              {WIDTH_OPTIONS.map(({ value, label, barWidth }) => {
                const selected = styles.width === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ width: value })}
                    className={cn(
                      'relative rounded-xl border-2 p-3 text-center transition-colors',
                      selected ? 'border-primary' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="mb-3 flex h-14 flex-col items-center justify-center rounded-lg bg-muted px-2">
                      <div className="h-8 rounded-sm bg-primary/70" style={{ width: barWidth }} />
                    </div>
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                    {selected && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-3">Cor de destaque</label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLOR_PRESETS.map((color) => {
                const selected = styles.accentColor.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onChange({ accentColor: color })}
                    aria-label={`Cor ${color}`}
                    title={color}
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center transition-transform hover:scale-105',
                      selected && 'ring-2 ring-offset-2 ring-primary'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {selected && <Check className="h-4 w-4 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-white px-6 py-4">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={onSave}>
            {saving ? 'Salvando...' : 'Salvar estilos'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CollaboratorEntry {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  status: 'pending' | 'accepted' | 'declined';
}

function CollaboratorStatusBadge({ status }: { status: CollaboratorEntry['status'] }) {
  if (status === 'accepted') return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Colaborador</Badge>;
  if (status === 'declined') return <Badge variant="secondary" className="bg-red-50 text-red-700">Recusado</Badge>;
  return <Badge variant="secondary">Convite enviado</Badge>;
}

interface CollaboratorSuggestion {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

function CollaboratorsPanel({
  open,
  onClose,
  collaborators,
  loading,
  query,
  onQueryChange,
  onInvite,
  inviting,
  error,
  suggestions,
  suggestionsLoading,
  onSelectSuggestion,
}: {
  open: boolean;
  onClose: () => void;
  collaborators: CollaboratorEntry[];
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onInvite: () => void;
  inviting: boolean;
  error: string;
  suggestions: CollaboratorSuggestion[];
  suggestionsLoading: boolean;
  onSelectSuggestion: (user: CollaboratorSuggestion) => void;
}) {
  if (!open) return null;

  const showDropdown = query.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={() => {
        if (!inviting) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Colaboradores</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Convide outros criadores para este projeto.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {error && (
            <div className="text-sm rounded-xl p-4 font-medium bg-red-50 text-red-700">{error}</div>
          )}

          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onInvite();
                  }
                }}
                placeholder="Buscar criador por @usuário"
                className="pl-9"
                autoComplete="off"
              />

              {showDropdown && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
                  {suggestionsLoading ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">Buscando...</div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">Nenhum criador encontrado.</div>
                  ) : (
                    suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectSuggestion(s)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted"
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={s.avatarUrl} alt="" />
                          <AvatarFallback className="text-xs">{s.fullName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="block text-sm font-medium text-foreground">{s.fullName}</span>
                          <span className="block text-xs text-muted-foreground">@{s.username}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button type="button" onClick={onInvite} disabled={inviting || !query.trim()}>
              {inviting ? 'Convidando...' : 'Convidar'}
            </Button>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : collaborators.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Nenhum colaborador convidado ainda.</div>
            ) : (
              collaborators.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={c.avatarUrl} alt="" />
                      <AvatarFallback className="text-xs">{c.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium text-foreground">@{c.username}</span>
                  </div>
                  <CollaboratorStatusBadge status={c.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({
  open,
  onClose,
  isPublic,
  onSaveVisibility,
  savingVisibility,
  error,
  onDelete,
  deleting,
}: {
  open: boolean;
  onClose: () => void;
  isPublic: boolean;
  onSaveVisibility: (next: boolean) => void;
  savingVisibility: boolean;
  error: string;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!open) return null;

  const busy = savingVisibility || deleting;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Configurações do projeto</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Visibilidade e outras opções deste projeto.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-7 p-6">
          {error && (
            <div className="text-sm rounded-xl p-4 font-medium bg-red-50 text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-bold text-foreground mb-3">Visibilidade</label>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: true, label: 'Público', desc: 'Qualquer pessoa pode ver.' },
                  { value: false, label: 'Rascunho', desc: 'Só você consegue ver.' },
                ]
              ).map(({ value, label, desc }) => {
                const selected = isPublic === value;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={busy}
                    onClick={() => onSaveVisibility(value)}
                    className={cn(
                      'relative rounded-xl border-2 p-4 text-left transition-colors disabled:opacity-50',
                      selected ? 'border-primary' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">{label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{desc}</span>
                    {selected && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700">Excluir projeto</p>
                <p className="mt-1 text-xs text-red-700/80">
                  Essa ação é permanente. O projeto, curtidas e conversas do espaço de colaboração serão apagados.
                </p>
                {confirmingDelete ? (
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="destructive" size="sm" disabled={deleting} onClick={onDelete}>
                      {deleting ? 'Excluindo...' : 'Sim, excluir definitivamente'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => setConfirmingDelete(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="destructive" size="sm" className="mt-3" onClick={() => setConfirmingDelete(true)}>
                    Excluir projeto
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomButtonPanel({
  open,
  onClose,
  label,
  url,
  onLabelChange,
  onUrlChange,
  onSave,
  onRemove,
  saving,
  error,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  url: string;
  onLabelChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onSave: () => void;
  onRemove: () => void;
  saving: boolean;
  error: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Botão personalizado</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Adicione um call-to-action (ex: "Visitar site") na página pública do projeto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {error && (
            <div className="text-sm rounded-xl p-4 font-medium bg-red-50 text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Texto do botão</label>
            <Input value={label} onChange={(e) => onLabelChange(e.target.value)} placeholder="Ex: Visitar site" maxLength={40} />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Link</label>
            <Input value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-white px-6 py-4">
          <button
            type="button"
            onClick={onRemove}
            disabled={saving || (!label && !url)}
            className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
          >
            Remover botão
          </button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={onSave}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
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
  uploadStatus,
  previewUrl,
  onFile,
}: {
  url: string;
  uploading: boolean;
  uploadStatus?: UploadStatus;
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
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="w-7 h-7 animate-spin" />
            <span className="text-sm font-medium">
              {uploadStatus === 'optimizing' ? 'Otimizando imagem...' : 'Enviando imagem...'}
            </span>
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
      <p className="mt-1.5 text-xs text-muted-foreground">Máximo {UPLOAD_LIMITS_MB.projectImage}MB</p>
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
              <div className="flex flex-col items-center gap-1.5 text-white">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[11px] font-medium text-center px-2">
                  {p.status === 'optimizing' ? 'Otimizando...' : 'Enviando...'}
                </span>
              </div>
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
      <p className="mt-1.5 text-xs text-muted-foreground">Máximo {UPLOAD_LIMITS_MB.projectImage}MB por imagem</p>
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
  const [coverUploadStatus, setCoverUploadStatus] = useState<UploadStatus | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish' | 'save' | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeMode, setFinalizeMode] = useState<'draft' | 'publish' | 'save'>('publish');

  const [projectStyles, setProjectStyles] = useState<ProjectStyles>(DEFAULT_PROJECT_STYLES);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [stylesSaving, setStylesSaving] = useState(false);
  const [stylesError, setStylesError] = useState('');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [customButtonLabel, setCustomButtonLabel] = useState('');
  const [customButtonUrl, setCustomButtonUrl] = useState('');
  const [draftButtonLabel, setDraftButtonLabel] = useState('');
  const [draftButtonUrl, setDraftButtonUrl] = useState('');
  const [buttonOpen, setButtonOpen] = useState(false);
  const [buttonSaving, setButtonSaving] = useState(false);
  const [buttonError, setButtonError] = useState('');

  const [collabOpen, setCollabOpen] = useState(false);
  const [collabList, setCollabList] = useState<CollaboratorEntry[]>([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabQuery, setCollabQuery] = useState('');
  const [collabInviting, setCollabInviting] = useState(false);
  const [collabError, setCollabError] = useState('');
  const [collabSuggestions, setCollabSuggestions] = useState<CollaboratorSuggestion[]>([]);
  const [collabSuggestionsLoading, setCollabSuggestionsLoading] = useState(false);

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
            setProjectStyles(existing.styles ?? DEFAULT_PROJECT_STYLES);
            setCustomButtonLabel(existing.customButtonLabel ?? '');
            setCustomButtonUrl(existing.customButtonUrl ?? '');
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

  // Autocompletar do painel de Colaboradores — busca ao digitar (debounced),
  // no máximo 10 sugestões, excluindo o próprio usuário e quem já está na lista.
  useEffect(() => {
    if (!collabOpen) return;
    const q = collabQuery.trim().replace(/^@+/, '');
    if (!q) {
      setCollabSuggestions([]);
      setCollabSuggestionsLoading(false);
      return;
    }

    setCollabSuggestionsLoading(true);
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (cancelled) return;
        const existingIds = new Set(collabList.map((c) => c.id));
        const filtered = (Array.isArray(data) ? data : [])
          .filter((u: CollaboratorSuggestion) => u.id !== user?.id && !existingIds.has(u.id))
          .slice(0, 10);
        setCollabSuggestions(filtered);
      } catch {
        if (!cancelled) setCollabSuggestions([]);
      } finally {
        if (!cancelled) setCollabSuggestionsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [collabQuery, collabOpen, collabList, user?.id]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1880px] px-5 py-12 lg:px-8">
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
    setFileError('');
    return true;
  };

  const handleCoverFile = async (file: File) => {
    if (!validateFile(file)) return;
    const localPreview = URL.createObjectURL(file);
    setCoverPreview(localPreview);
    setCoverUploading(true);
    setCoverUploadStatus('optimizing');
    try {
      const url = await uploadFile(file, token, 'projects', setCoverUploadStatus);
      setCoverImageUrl(url);
    } catch (err: any) {
      setFileError(err.message || 'Falha ao enviar a imagem.');
    } finally {
      setCoverUploading(false);
      setCoverUploadStatus(null);
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
    const pending: PendingUpload = { id: crypto.randomUUID(), previewUrl: URL.createObjectURL(file), status: 'optimizing' };
    setBlockUploads((u) => ({ ...u, [blockId]: [pending] }));
    uploadFile(file, token, 'projects', (status) => {
      setBlockUploads((u) => ({
        ...u,
        [blockId]: (u[blockId] ?? []).map((p) => (p.id === pending.id ? { ...p, status } : p)),
      }));
    })
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
      const pending: PendingUpload = { id: crypto.randomUUID(), previewUrl: URL.createObjectURL(file), status: 'optimizing' };
      setBlockUploads((u) => ({ ...u, [blockId]: [...(u[blockId] ?? []), pending] }));
      uploadFile(file, token, 'projects', (status) => {
        setBlockUploads((u) => ({
          ...u,
          [blockId]: (u[blockId] ?? []).map((p) => (p.id === pending.id ? { ...p, status } : p)),
        }));
      })
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

      setFinalizeOpen(false);
      navigate(`/${user.username}/${result.slug}`);
    } catch (err: any) {
      setFormError(err.message || 'Não foi possível salvar o projeto.');
      setSaving(null);
    }
  };

  const saveStyles = async () => {
    if (!projectId) return;
    setStylesError('');
    setStylesSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/styles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectStyles),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Não foi possível salvar os estilos.');
      setProjectStyles(result.styles ?? projectStyles);
      setStylesOpen(false);
    } catch (err: any) {
      setStylesError(err.message || 'Não foi possível salvar os estilos.');
    } finally {
      setStylesSaving(false);
    }
  };

  const saveVisibility = async (next: boolean) => {
    if (!projectId) return;
    setSettingsError('');
    setSettingsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isPublic: next }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Não foi possível atualizar a visibilidade.');
      setIsPublic(next);
      setWasPublished(next);
    } catch (err: any) {
      setSettingsError(err.message || 'Não foi possível atualizar a visibilidade.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const deleteProject = async () => {
    if (!projectId) return;
    setSettingsError('');
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Não foi possível excluir o projeto.');
      }
      navigate(`/${user.username}`);
    } catch (err: any) {
      setSettingsError(err.message || 'Não foi possível excluir o projeto.');
      setDeleting(false);
    }
  };

  const saveCustomButton = async (label: string, url: string) => {
    if (!projectId) return;
    setButtonError('');
    setButtonSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/button`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label, url }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Não foi possível salvar o botão.');
      setCustomButtonLabel(result.customButtonLabel ?? '');
      setCustomButtonUrl(result.customButtonUrl ?? '');
      setButtonOpen(false);
    } catch (err: any) {
      setButtonError(err.message || 'Não foi possível salvar o botão.');
    } finally {
      setButtonSaving(false);
    }
  };

  const openCollaboratorsPanel = async () => {
    if (!projectId) return;
    setCollabError('');
    setCollabQuery('');
    setCollabSuggestions([]);
    setCollabOpen(true);
    setCollabLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os colaboradores.');
      setCollabList(data.collaborators ?? []);
    } catch (err: any) {
      setCollabError(err.message || 'Não foi possível carregar os colaboradores.');
    } finally {
      setCollabLoading(false);
    }
  };

  const inviteCollaborator = async (usernameOverride?: string) => {
    const rawUsername = usernameOverride ?? collabQuery;
    if (!projectId || !rawUsername.trim()) return;
    setCollabError('');
    setCollabInviting(true);
    try {
      const username = rawUsername.trim().replace(/^@+/, '');
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível convidar esse criador.');
      setCollabList((list) => [...list, data]);
      setCollabQuery('');
      setCollabSuggestions([]);
    } catch (err: any) {
      setCollabError(err.message || 'Não foi possível convidar esse criador.');
    } finally {
      setCollabInviting(false);
    }
  };

  const openFinalizeModal = (mode: 'draft' | 'publish' | 'save') => {
    setFormError('');
    setFinalizeMode(mode);
    if (mode === 'publish') setIsPublic(true);
    setFinalizeOpen(true);
  };

  const showSplitActions = !isEditMode || !wasPublished;
  const uploadsPending = coverUploading || Object.values(blockUploads).some((list) => list.length > 0);

  return (
    <div>
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-none px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
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
                <Button type="button" variant="outline" size="sm" disabled={saving !== null || uploadsPending} onClick={() => openFinalizeModal('draft')}>
                  {saving === 'draft' ? 'Salvando...' : 'Salvar rascunho'}
                </Button>
                <Button type="button" size="sm" disabled={saving !== null || uploadsPending} onClick={() => openFinalizeModal('publish')}>
                  {saving === 'publish' ? 'Publicando...' : 'Publicar projeto'}
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" disabled={saving !== null || uploadsPending} onClick={() => openFinalizeModal('save')}>
                {saving === 'save' ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-none px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
      {formError && (
        <div className="text-sm rounded-xl p-4 mb-6 font-medium bg-red-50 text-red-700">{formError}</div>
      )}
      {fileError && (
        <div className="text-sm rounded-xl p-4 mb-6 font-medium bg-red-50 text-red-700">{fileError}</div>
      )}

      <form onSubmit={(e: FormEvent) => e.preventDefault()} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="min-w-0 min-h-[calc(100vh-14rem)] rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="hidden">
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
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-white">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm font-medium">
                        {coverUploadStatus === 'optimizing' ? 'Otimizando imagem...' : 'Enviando imagem...'}
                      </span>
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
                  <span className="pl-4 text-sm text-muted-foreground shrink-0">portsy.app/{user.username}/</span>
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
            <div className="min-h-[calc(100vh-14rem)] flex flex-col items-center justify-center gap-14 py-16 px-8">
              <p className="text-lg text-muted-foreground">Comece a criar seu projeto:</p>
              <div className="flex flex-wrap items-start justify-center gap-10 xl:gap-14">
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
                      uploadStatus={blockUploads[block.id]?.[0]?.status}
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

        <aside className="w-full xl:w-[300px] shrink-0">
          <div className="xl:sticky xl:top-40 rounded-xl border border-border bg-white shadow-sm overflow-hidden">
            <section className="p-4">
              <h2 className="text-sm font-bold text-foreground mb-3">Adicionar conteúdo</h2>
              <div className="grid grid-cols-2 gap-3">
                <AddContentButton type="image" onClick={() => addBlock('image')} />
                <AddContentButton type="text" onClick={() => addBlock('text')} />
                <AddContentButton type="grid" onClick={() => addBlock('grid')} />
                <AddContentButton type="video" onClick={() => addBlock('video')} />
              </div>
            </section>

            <section className="border-t border-border p-4">
              <h2 className="text-sm font-bold text-foreground mb-3">Editar projeto</h2>
              <div className="grid grid-cols-2 gap-3">
                <EditProjectButton
                  icon={Paintbrush}
                  label="Estilos"
                  disabled={!projectId}
                  title={!projectId ? 'Salve o projeto para personalizar os estilos.' : undefined}
                  onClick={() => {
                    setStylesError('');
                    setStylesOpen(true);
                  }}
                />
                <EditProjectButton
                  icon={Users}
                  label="Colaboradores"
                  disabled={!projectId}
                  title={!projectId ? 'Salve o projeto para convidar colaboradores.' : undefined}
                  onClick={openCollaboratorsPanel}
                />
                <EditProjectButton
                  icon={Settings}
                  label="Configurações"
                  disabled={!projectId}
                  title={!projectId ? 'Salve o projeto para acessar as configurações.' : undefined}
                  onClick={() => {
                    setSettingsError('');
                    setSettingsOpen(true);
                  }}
                />
                <EditProjectButton
                  icon={MessagesSquare}
                  label="Espaço do projeto"
                  disabled={!projectId}
                  title={!projectId ? 'Salve o projeto para acessar o espaço de colaboração.' : undefined}
                  onClick={() => navigate(`/${user.username}/${editingSlug}/espaco`)}
                />
              </div>
            </section>

            <section className="border-t border-border p-4">
              <button
                type="button"
                disabled={!projectId}
                title={!projectId ? 'Salve o projeto para personalizar o botão.' : undefined}
                onClick={() => {
                  setButtonError('');
                  setDraftButtonLabel(customButtonLabel);
                  setDraftButtonUrl(customButtonUrl);
                  setButtonOpen(true);
                }}
                className="w-full rounded-xl border border-border bg-white px-4 py-4 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-white"
              >
                <span className="block text-sm font-bold text-foreground">Botão personalizado</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {customButtonLabel ? `Ativo: "${customButtonLabel}"` : 'Personalize o call-to-action do seu projeto'}
                </span>
              </button>
            </section>
          </div>
        </aside>
      </form>

      {finalizeOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 py-8"
          onClick={() => {
            if (saving === null) setFinalizeOpen(false);
          }}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {finalizeMode === 'draft' ? 'Salvar rascunho' : finalizeMode === 'save' ? 'Finalizar alterações' : 'Publicar projeto'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Preencha os detalhes finais antes de continuar.</p>
              </div>
              <button
                type="button"
                onClick={() => setFinalizeOpen(false)}
                disabled={saving !== null}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-7 p-6">
              {formError && (
                <div className="text-sm rounded-xl p-4 font-medium bg-red-50 text-red-700">{formError}</div>
              )}
              {fileError && (
                <div className="text-sm rounded-xl p-4 font-medium bg-red-50 text-red-700">{fileError}</div>
              )}

              <div>
                <label className="block text-sm font-bold text-foreground mb-3">Imagem de capa</label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onCoverDrop}
                  className={cn(
                    'relative w-full aspect-[21/9] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors',
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
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-white">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm font-medium">
                        {coverUploadStatus === 'optimizing' ? 'Otimizando imagem...' : 'Enviando imagem...'}
                      </span>
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
                <p className="mt-1.5 text-xs text-muted-foreground">Máximo {UPLOAD_LIMITS_MB.projectImage}MB</p>
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
                  <span className="pl-4 text-sm text-muted-foreground shrink-0">portsy.app/{user.username}/</span>
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

              <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 rounded border-input accent-primary"
                />
                Permitir acesso público sem login
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-white px-6 py-4">
              <Button type="button" variant="outline" disabled={saving !== null} onClick={() => setFinalizeOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={saving !== null || uploadsPending}
                onClick={() => submit(finalizeMode === 'draft' ? false : isPublic, finalizeMode)}
              >
                {saving !== null
                  ? 'Salvando...'
                  : finalizeMode === 'draft'
                    ? 'Salvar rascunho'
                    : finalizeMode === 'save'
                      ? 'Salvar alterações'
                      : 'Publicar projeto'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <StylesPanel
        open={stylesOpen}
        onClose={() => setStylesOpen(false)}
        styles={projectStyles}
        onChange={(patch) => setProjectStyles((s) => ({ ...s, ...patch }))}
        onSave={saveStyles}
        saving={stylesSaving}
        error={stylesError}
      />

      <CollaboratorsPanel
        open={collabOpen}
        onClose={() => setCollabOpen(false)}
        collaborators={collabList}
        loading={collabLoading}
        query={collabQuery}
        onQueryChange={setCollabQuery}
        onInvite={() => inviteCollaborator()}
        inviting={collabInviting}
        error={collabError}
        suggestions={collabSuggestions}
        suggestionsLoading={collabSuggestionsLoading}
        onSelectSuggestion={(u) => inviteCollaborator(u.username)}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isPublic={isPublic}
        onSaveVisibility={saveVisibility}
        savingVisibility={settingsSaving}
        error={settingsError}
        onDelete={deleteProject}
        deleting={deleting}
      />

      <CustomButtonPanel
        open={buttonOpen}
        onClose={() => setButtonOpen(false)}
        label={draftButtonLabel}
        url={draftButtonUrl}
        onLabelChange={setDraftButtonLabel}
        onUrlChange={setDraftButtonUrl}
        onSave={() => saveCustomButton(draftButtonLabel, draftButtonUrl)}
        onRemove={() => saveCustomButton('', '')}
        saving={buttonSaving}
        error={buttonError}
      />
      </div>
    </div>
  );
}
