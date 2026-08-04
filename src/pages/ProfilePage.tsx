import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import ProjectCard from '../components/ProjectCard';
import BadgeIcon from '../components/BadgeIcon';
import EmptyState from '../components/EmptyState';
import {
  Calendar,
  ExternalLink,
  FolderPlus,
  Heart,
  Link as LinkIcon,
  Mail,
  MapPin,
  MoreHorizontal,
  Plus,
  UserPlus,
} from 'lucide-react';
import { getUserByUsername } from '../mockData';
import { useAuthStore } from '../store/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function ProfileProjectCard({ project }: { project: any }) {
  return (
    <div className="min-w-0">
      <ProjectCard project={project} compact />
    </div>
  );
}

function formatJoinDate(value?: string | Date) {
  if (!value) return 'Entrou recentemente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Entrou recentemente';
  return `Entrou em ${date.getFullYear()}`;
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function AboutCard({ user }: { user: any }) {
  const portfolioHref = user.portfolioLink
    ? user.portfolioLink.startsWith('http')
      ? user.portfolioLink
      : `https://${user.portfolioLink}`
    : '';

  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <h2 className="mb-3 text-base font-bold text-foreground">Sobre</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {user.bio || 'Este criador ainda não escreveu uma bio.'}
        </p>

        <div className="mt-5 space-y-3 text-sm text-muted-foreground">
          {user.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{user.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{formatJoinDate(user.createdAt)}</span>
          </div>
          {user.portfolioLink && (
            <a
              href={portfolioHref}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-2 transition-colors hover:text-primary"
            >
              <LinkIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{user.portfolioLink}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          )}
          {user.contactEmail && (
            <a
              href={`mailto:${user.contactEmail}`}
              className="flex min-w-0 items-center gap-2 transition-colors hover:text-primary"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{user.contactEmail}</span>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { handle } = useParams();
  const username = handle?.startsWith('@') ? handle.slice(1) : handle;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser, token } = useAuthStore();
  const navigate = useNavigate();

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!username) {
        if (!cancelled) setUser(null);
        return;
      }

      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            const projects = (data.projects ?? []).map((p: any) => ({ ...p, source: 'real' as const }));
            setUser({ ...data, source: 'real', projects });
            setIsFollowing(Boolean(data.isFollowingByMe));
            setFollowerCount(data.followers ?? 0);
          }
          return;
        }
      } catch {
        // API indisponível: usa os perfis de demonstração.
      }

      const mockUser = getUserByUsername(username);
      if (!cancelled) {
        if (mockUser) {
          const projects = (mockUser.projects ?? []).map((p: any) => ({ ...p, source: 'mock' as const }));
          setUser({ ...mockUser, source: 'mock', projects });
        } else {
          setUser(null);
        }
        setIsFollowing(false);
        setFollowerCount(mockUser?.followers ?? 0);
      }
    }

    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [username, token]);

  const handleFollowToggle = async () => {
    if (!username || user?.source !== 'real') return;
    if (!token) {
      navigate('/login');
      return;
    }

    setFollowLoading(true);
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowerCount((c) => c + (next ? 1 : -1));
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/follow`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível atualizar o seguir.');
      setIsFollowing(data.following);
      setFollowerCount(data.followers);
    } catch {
      setIsFollowing(!next);
      setFollowerCount((c) => c + (next ? -1 : 1));
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton className="h-56 w-full rounded-none md:h-80 lg:h-96" />
        <div className="mx-auto w-full max-w-[1880px] px-5 pb-16 lg:px-8">
          <div className="-mt-11 mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <Skeleton className="h-28 w-28 rounded-full border-4 border-white" />
              <div className="space-y-2 pb-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <Skeleton className="mb-8 h-20 rounded-xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <Skeleton className="h-56 rounded-xl" />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-20 text-muted-foreground">Usuário não encontrado.</div>;
  }

  const isOwnProfile = currentUser?.username === user.username;
  const visibleProjects = isOwnProfile ? user.projects : user.projects.filter((p: any) => p.isPublic);
  const receivedLikes = visibleProjects.reduce((sum: number, project: any) => sum + (project.likeCount || 0), 0);
  const followingCount = user.followingCount ?? user.following ?? 0;
  const likedProjects = user.likedProjects ?? [];

  const stats = [
    { label: 'projetos', value: visibleProjects.length },
    { label: 'seguidores', value: followerCount },
    { label: 'seguindo', value: followingCount },
    { label: 'curtidas recebidas', value: receivedLikes },
  ];

  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden bg-muted md:h-80 lg:h-96">
        {user.coverUrl && (
          <>
            <img
              src={user.coverUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl md:hidden"
            />
            <div className="absolute inset-0 bg-black/10 md:hidden" />
            <img
              src={user.coverUrl}
              alt="Capa do perfil"
              className="relative h-full w-full object-contain md:object-cover"
            />
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-[1880px] px-5 pb-16 lg:px-8">
        <header className="-mt-11 mb-0">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <Avatar className="h-28 w-28 border-4 border-background shadow-sm">
                <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                <AvatarFallback className="text-3xl">{user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground md:text-3xl">{user.fullName}</h1>
                  {user.category && (
                    <span className="rounded-full bg-tag px-2.5 py-1 text-[11px] font-semibold text-tag-foreground">
                      {user.category}
                    </span>
                  )}
                  {user.badges?.length > 0 && (
                    <span className="flex items-center gap-1">
                      {user.badges.map((badge: any) => (
                        <BadgeIcon key={badge.id} iconName={badge.iconName} color={badge.color} label={badge.label} />
                      ))}
                    </span>
                  )}
                </div>
                <p className="mt-1 font-medium text-muted-foreground">@{user.username}</p>
              </div>
            </div>

            <div className="flex gap-2 pb-2">
              {isOwnProfile ? (
                <Button asChild>
                  <Link to="/novo-projeto">
                    <Plus className="h-4 w-4" /> Novo projeto
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant={isFollowing ? 'outline' : 'default'}
                    onClick={handleFollowToggle}
                    disabled={user.source !== 'real' || followLoading}
                  >
                    <UserPlus className="h-4 w-4" /> {isFollowing ? 'Seguindo' : 'Seguir'}
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Mais opções">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="mt-7 border-y border-border py-5">
          <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:items-center sm:gap-10">
            {stats.map((stat) => (
              <div key={stat.label}>
                <span className="text-xl font-bold text-foreground">{compactNumber(stat.value)}</span>
                <span className="ml-1 text-sm font-medium text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="order-1 lg:sticky lg:top-24">
            <AboutCard user={user} />
          </aside>

          <main className="order-2 min-w-0">
            <Tabs defaultValue="projetos">
              <TabsList className="mb-6">
                <TabsTrigger value="projetos">Projetos</TabsTrigger>
                <TabsTrigger value="curtidos">Curtidos</TabsTrigger>
              </TabsList>

              <TabsContent value="projetos">
                {visibleProjects.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleProjects.map((project: any) => (
                      <ProfileProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <EmptyState
                      icon={FolderPlus}
                      title={isOwnProfile ? 'Você ainda não publicou projetos' : `${user.fullName} ainda não publicou projetos`}
                      description={isOwnProfile ? 'Mostre seu trabalho e comece a atrair seguidores.' : undefined}
                      actionLabel={isOwnProfile ? 'Criar meu primeiro projeto' : undefined}
                      actionTo={isOwnProfile ? '/novo-projeto' : undefined}
                    />
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="curtidos">
                {likedProjects.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {likedProjects.map((project: any) => (
                      <ProfileProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <EmptyState
                      icon={Heart}
                      title="Nenhum projeto curtido ainda"
                      description="Os projetos curtidos por este perfil aparecerão aqui."
                    />
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}
