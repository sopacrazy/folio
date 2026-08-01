import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/auth';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function LoginPage({ isRegister = false }: { isRegister?: boolean }) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister
        ? { username, email: emailOrUsername, password, fullName }
        : { emailOrUsername, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ocorreu um erro.');

      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-primary-foreground fill-current" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isRegister ? 'Mostre seu trabalho ao mundo.' : 'Entre para continuar.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nome Completo</label>
                  <Input
                    type="text" required
                    value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Username</label>
                  <Input
                    type="text" required
                    value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="seunome"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {isRegister ? 'E-mail' : 'E-mail ou usuário'}
              </label>
              <Input
                type={isRegister ? 'email' : 'text'} required
                value={emailOrUsername} onChange={e => setEmailOrUsername(e.target.value)}
                placeholder={isRegister ? 'seu@email.com' : 'seu@email.com ou usuário'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Senha</label>
              <Input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              {isRegister ? 'Cadastrar' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground font-medium">
            {isRegister ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
            <a href={isRegister ? '/login' : '/register'} className="text-primary hover:text-primary/80 ml-1">
              {isRegister ? 'Faça login' : 'Cadastre-se'}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
