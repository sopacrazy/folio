import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/auth';
import { cn } from '@/lib/utils';

const sections = [
  { to: '/configuracoes/perfil', label: 'Perfil' },
  { to: '/configuracoes/conta', label: 'Conta' },
  { to: '/configuracoes/notificacoes', label: 'Notificações' },
  { to: '/configuracoes/privacidade', label: 'Privacidade' },
];

export default function SettingsLayout() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-[1880px] px-5 py-10 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Configurações</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar lg:overflow-visible pb-1 lg:pb-0">
          {sections.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              className={({ isActive }) =>
                cn(
                  'px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors',
                  isActive ? 'bg-tag text-tag-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
