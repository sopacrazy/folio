import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SettingsAccountPage() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const canConfirm = confirmText.trim() === user.username;

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;

    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Não foi possível excluir a conta.');
      }
      logout();
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Não foi possível excluir a conta.');
      setDeleting(false);
    }
  };

  return (
    <Card className="rounded-xl border-red-200">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-1">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Excluir conta</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Isso apaga seu perfil, todos os seus projetos, curtidas, seguidores e quem você segue.
              Essa ação é permanente e não pode ser desfeita.
            </p>
          </div>
        </div>

        {!confirming ? (
          <Button
            type="button"
            variant="outline"
            className="mt-5 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirming(true)}
          >
            Excluir minha conta
          </Button>
        ) : (
          <form onSubmit={handleDelete} className="mt-5 border-t border-red-100 pt-5 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Pra confirmar, digite seu nome de usuário: <span className="font-bold">{user.username}</span>
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={user.username}
                autoComplete="off"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirming(false);
                  setConfirmText('');
                  setError('');
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={!canConfirm || deleting}>
                {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
