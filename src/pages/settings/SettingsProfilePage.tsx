import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/auth';
import { uploadFile } from '../../lib/upload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ProfileFormData {
  fullName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  portfolioLink: string;
  contactEmail: string;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const emptyForm: ProfileFormData = {
  fullName: '',
  username: '',
  bio: '',
  avatarUrl: '',
  coverUrl: '',
  portfolioLink: '',
  contactEmail: '',
};

export default function SettingsProfilePage() {
  const { user: authUser, token, login } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileFormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [fileError, setFileError] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(authUser!.username)}`);
        const fullProfile = res.ok ? await res.json() : null;
        if (fullProfile && !cancelled) {
          setForm({
            fullName: fullProfile.fullName ?? '',
            username: fullProfile.username ?? '',
            bio: fullProfile.bio ?? '',
            avatarUrl: fullProfile.avatarUrl ?? '',
            coverUrl: fullProfile.coverUrl ?? '',
            portfolioLink: fullProfile.portfolioLink ?? '',
            contactEmail: fullProfile.contactEmail ?? '',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  // A rota /configuracoes já é protegida pelo SettingsLayout (pai) — aqui só
  // garantimos o tipo pro TypeScript, sem duplicar o redirecionamento.
  if (!authUser) return null;

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

  const onCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !validateFile(file)) return;
    try {
      const url = await uploadFile(file, token, 'avatars');
      setForm((f) => ({ ...f, coverUrl: url }));
    } catch (err: any) {
      setFileError(err.message || 'Falha ao enviar a imagem.');
    }
  };

  const onAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !validateFile(file)) return;
    try {
      const url = await uploadFile(file, token, 'avatars');
      setForm((f) => ({ ...f, avatarUrl: url }));
    } catch (err: any) {
      setFileError(err.message || 'Falha ao enviar a imagem.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível salvar as alterações.');

      // Reemitido porque o username (parte do token) pode ter mudado — atualiza
      // token + usuário no header/menu junto.
      login(data.token, data.user);
      setFeedback({ type: 'success', message: 'Perfil atualizado com sucesso.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Não foi possível salvar as alterações.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground text-sm">Carregando...</div>;
  }

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <h2 className="text-lg font-bold text-foreground">Editar perfil</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">Essas informações aparecem publicamente no seu perfil.</p>

        {feedback && (
          <div
            className={cn(
              'text-sm rounded-xl p-4 mb-6 font-medium',
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            )}
          >
            {feedback.message}
          </div>
        )}
        {fileError && <div className="text-sm rounded-xl p-4 mb-6 font-medium bg-red-50 text-red-700">{fileError}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Foto de capa</label>
            <div className="relative h-24 sm:h-28 rounded-xl overflow-hidden bg-muted">
              {form.coverUrl && <img src={form.coverUrl} alt="Capa" className="w-full h-full object-cover" />}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-white text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                Alterar
              </button>
            </div>
            <input
              type="file"
              ref={coverInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={onCoverChange}
              className="hidden"
            />
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 shrink-0">
              <AvatarImage src={form.avatarUrl} alt={form.fullName} />
              <AvatarFallback className="text-lg">{form.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">Foto de perfil</p>
              <Button type="button" variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                Alterar foto
              </Button>
            </div>
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={onAvatarChange}
              className="hidden"
            />
          </div>

          {/* Nome + Usuário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Nome</label>
              <Input
                required
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Usuário</label>
              <Input
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
          </div>

          {/* Sobre */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Sobre</label>
            <Textarea
              rows={3}
              className="resize-y"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>

          {/* Link + Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Link do portfólio</label>
              <Input
                value={form.portfolioLink}
                onChange={(e) => setForm((f) => ({ ...f, portfolioLink: e.target.value }))}
                placeholder="meuportfolio.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Contato</label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
