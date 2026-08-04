import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { Check, Loader2, RefreshCw, UploadCloud } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { uploadFile, type UploadStatus } from '../lib/upload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const steps = ['Perfil', 'Avatar', 'Capa', 'Projeto'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function coverDataUrl(colors: [string, string, string]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500" viewBox="0 0 1500 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="0.55" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient></defs><rect width="1500" height="500" fill="url(#g)"/><circle cx="1280" cy="110" r="210" fill="rgba(255,255,255,.18)"/><circle cx="210" cy="420" r="180" fill="rgba(255,255,255,.16)"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const defaultCovers = [
  coverDataUrl(['#1769ff', '#66a3ff', '#eaf1ff']),
  coverDataUrl(['#191919', '#1769ff', '#8ec5ff']),
  coverDataUrl(['#0f52cc', '#5eead4', '#f8fafc']),
  coverDataUrl(['#6366f1', '#1769ff', '#f5f5f5']),
];

function initialStepForUser(user?: { fullName?: string; username?: string; avatarUrl?: string; coverUrl?: string; onboardingStep?: number }) {
  if (!user?.fullName || !user?.username) return 1;
  if (!user.avatarUrl) return 2;
  if (!user.coverUrl) return 3;
  return Math.min(Math.max(user.onboardingStep ?? 4, 1), 4);
}

function diceBearOptions(username: string, batch: number) {
  const base = username || 'portsy';
  const styles = ['notionists', 'avataaars'];
  return Array.from({ length: 8 }, (_, index) => {
    const style = styles[index % styles.length];
    const seed = `${base}-${batch}-${index}`;
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=eaf1ff,dbeafe,f5f5f5`;
  });
}

async function readJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function OnboardingPage() {
  const { user, token, login } = useAuthStore();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(initialStepForUser(user));
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl ?? '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [avatarBatch, setAvatarBatch] = useState(1);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const avatarOptions = useMemo(() => diceBearOptions(username, avatarBatch), [username, avatarBatch]);
  const progress = (step / steps.length) * 100;

  useEffect(() => {
    const hasRequiredFields = Boolean(user?.fullName && user?.username && user?.avatarUrl && user?.coverUrl);
    if (!user) navigate('/login', { replace: true });
    else if (user.onboardingCompleted && hasRequiredFields) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const value = username.trim().replace(/^@+/, '').toLowerCase();
    if (!value) {
      setUsernameStatus('idle');
      return;
    }
    if (!/^[a-z0-9_]{3,24}$/.test(value)) {
      setUsernameStatus('invalid');
      return;
    }
    if (value === user?.username) {
      setUsernameStatus('available');
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(value)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = res.ok ? await readJsonResponse(res) : null;
        if (!cancelled) setUsernameStatus(data?.available ? 'available' : 'taken');
      } catch {
        if (!cancelled) setUsernameStatus('idle');
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, token, user?.username]);

  const saveProgress = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse(res);
      if (!data) {
        throw new Error('Não foi possível confirmar seu progresso. Recarregue a página e tente novamente.');
      }
      if (!res.ok) {
        const serverError = String(data.error || '');
        const isTechnicalError = /EACCES|ECONN|connect|socket|amazonaws|:\d+/i.test(serverError);
        throw new Error(
          isTechnicalError
            ? 'Não foi possível salvar seu progresso agora. Verifique sua conexão e tente novamente.'
            : serverError || 'Não foi possível salvar seu progresso.',
        );
      }
      if (!data.token || !data.user) {
        throw new Error('Não foi possível confirmar seu progresso. Recarregue a página e tente novamente.');
      }
      login(data.token, data.user);
      return data.user;
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar seu progresso.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const validateImage = (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Formato inválido. Use JPG, PNG ou WEBP.');
      return false;
    }
    setError('');
    return true;
  };

  const uploadAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !validateImage(file)) return;
    try {
      setUploadStatus('optimizing');
      const url = await uploadFile(file, token, 'avatars', setUploadStatus);
      setAvatarUrl(url);
      await saveProgress({ avatarUrl: url, onboardingStep: 2 });
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar o avatar.');
    } finally {
      setUploadStatus(null);
    }
  };

  const uploadCover = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !validateImage(file)) return;
    try {
      setUploadStatus('optimizing');
      const url = await uploadFile(file, token, 'projects', setUploadStatus, { maxDimension: 1500, purpose: 'profile-cover' });
      setCoverUrl(url);
      await saveProgress({ coverUrl: url, onboardingStep: 3 });
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar a capa.');
    } finally {
      setUploadStatus(null);
    }
  };

  const nextFromProfile = async () => {
    const cleanUsername = username.trim().replace(/^@+/, '').toLowerCase();
    if (!fullName.trim()) return setError('Informe seu nome completo.');
    if (usernameStatus !== 'available') return setError('Escolha um nome de usuário disponível.');
    await saveProgress({ fullName: fullName.trim(), username: cleanUsername, bio, onboardingStep: 2 });
    setUsername(cleanUsername);
    setStep(2);
  };

  const nextFromAvatar = async () => {
    if (!avatarUrl) return setError('Escolha ou envie um avatar para continuar.');
    await saveProgress({ avatarUrl, onboardingStep: 3 });
    setStep(3);
  };

  const nextFromCover = async () => {
    if (!coverUrl) return setError('Escolha ou envie uma capa para continuar.');
    await saveProgress({ coverUrl, onboardingStep: 4 });
    setStep(4);
  };

  const complete = async (destination: '/' | '/novo-projeto') => {
    if (!fullName || !username || !avatarUrl || !coverUrl) return setError('Complete as etapas obrigatórias antes de finalizar.');
    await saveProgress({ onboardingCompleted: true, onboardingStep: 4 });
    navigate(destination, { replace: true });
  };

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold text-muted-foreground">
            <span>Configuração inicial</span>
            <span>{step} de {steps.length}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground">
            {steps.map((label, index) => (
              <span key={label} className={cn(index + 1 <= step && 'text-primary')}>{label}</span>
            ))}
          </div>
        </div>

        <Card className="rounded-xl">
          <CardContent className="p-6 sm:p-8">
            {error && <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
            {uploadStatus && (
              <div className="mb-6 rounded-xl bg-primary/10 p-4 text-sm font-medium text-primary">
                {uploadStatus === 'optimizing' ? 'Otimizando imagem...' : 'Enviando imagem...'}
              </div>
            )}

            {step === 1 && (
              <div>
                <h1 className="text-2xl font-bold text-foreground">Vamos montar seu perfil</h1>
                <p className="mt-1 text-muted-foreground">Essas informações aparecem publicamente.</p>
                <div className="mt-8 space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-foreground">Nome completo</label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-foreground">Nome de usuário</label>
                    <div className="flex items-center rounded-xl border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
                      <span className="pl-4 text-sm text-muted-foreground">@</span>
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-10 flex-1 bg-transparent px-1 pr-4 text-sm outline-none"
                        placeholder="seunome"
                      />
                    </div>
                    <p className={cn('mt-2 text-xs font-medium', usernameStatus === 'available' ? 'text-emerald-600' : usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'text-red-600' : 'text-muted-foreground')}>
                      {usernameStatus === 'checking' && 'Verificando disponibilidade...'}
                      {usernameStatus === 'available' && 'Disponível'}
                      {usernameStatus === 'taken' && 'Esse nome já está em uso.'}
                      {usernameStatus === 'invalid' && 'Use 3 a 24 letras, números ou underline.'}
                      {usernameStatus === 'idle' && 'Seu endereço público na Portsy.'}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-foreground">Bio curta</label>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 180))} rows={4} placeholder="Conte em uma frase o que você cria." />
                    <p className="mt-1 text-xs text-muted-foreground">{bio.length}/180</p>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <Button onClick={nextFromProfile} disabled={saving || usernameStatus === 'checking'}>Continuar</Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h1 className="text-2xl font-bold text-foreground">Escolha seu avatar</h1>
                <p className="mt-1 text-muted-foreground">Envie uma foto ou escolha uma opção gerada automaticamente.</p>
                <div className="mt-8 flex flex-col gap-8 lg:flex-row">
                  <div className="lg:w-56">
                    <Avatar className="h-32 w-32 border border-border">
                      <AvatarImage src={avatarUrl} alt={fullName} />
                      <AvatarFallback className="text-3xl">{fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Button type="button" variant="outline" className="mt-4" onClick={() => avatarInputRef.current?.click()}>
                      <UploadCloud className="h-4 w-4" /> Enviar imagem
                    </Button>
                    <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAvatar} />
                  </div>
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {avatarOptions.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={async () => {
                            setAvatarUrl(url);
                            await saveProgress({ avatarUrl: url, onboardingStep: 2 });
                          }}
                          className={cn('relative rounded-xl border bg-muted p-3 transition-colors hover:border-primary', avatarUrl === url && 'border-primary ring-2 ring-primary/20')}
                        >
                          <img src={url} alt="" className="mx-auto h-20 w-20 rounded-full" />
                          {avatarUrl === url && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                    <Button type="button" variant="ghost" className="mt-4" onClick={() => setAvatarBatch((n) => n + 1)}>
                      <RefreshCw className="h-4 w-4" /> Gerar outros
                    </Button>
                  </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                  <Button onClick={nextFromAvatar} disabled={saving}>Continuar</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h1 className="text-2xl font-bold text-foreground">Adicione uma capa</h1>
                <p className="mt-1 text-muted-foreground">Use uma imagem larga para dar identidade ao seu perfil.</p>
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="relative flex aspect-[3/1] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    {coverUrl ? <img src={coverUrl} alt="" className="h-full w-full object-cover" /> : (
                      <span className="flex flex-col items-center gap-2 text-sm font-medium text-muted-foreground">
                        <UploadCloud className="h-7 w-7" /> Enviar imagem de capa
                      </span>
                    )}
                  </button>
                  <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadCover} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {defaultCovers.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={async () => {
                        setCoverUrl(url);
                        await saveProgress({ coverUrl: url, onboardingStep: 3 });
                      }}
                      className={cn('aspect-[3/1] overflow-hidden rounded-xl border transition-colors hover:border-primary', coverUrl === url && 'border-primary ring-2 ring-primary/20')}
                    >
                      <img src={url} alt={`Capa padrão ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                  <Button onClick={nextFromCover} disabled={saving}>Continuar</Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="py-6 text-center">
                <h1 className="text-2xl font-bold text-foreground">Tudo pronto</h1>
                <p className="mx-auto mt-2 max-w-lg text-muted-foreground">Seu perfil já pode ser visto. Você pode criar seu primeiro projeto agora ou explorar a Portsy e publicar depois.</p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button onClick={() => complete('/novo-projeto')} disabled={saving}>Criar projeto</Button>
                  <Button variant="outline" onClick={() => complete('/')} disabled={saving}>Pular por agora</Button>
                </div>
                <Button variant="ghost" className="mt-4" onClick={() => setStep(3)}>Voltar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
