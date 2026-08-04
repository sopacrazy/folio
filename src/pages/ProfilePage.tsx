import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import ProjectCard from '../components/ProjectCard';
import BadgeIcon from '../components/BadgeIcon';
import EmptyState from '../components/EmptyState';
import { FolderPlus, Link as LinkIcon, Mail, MoreHorizontal, Plus, UserPlus } from 'lucide-react';
import { getUserByUsername } from '../mockData';
import { useAuthStore } from '../store/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        // API indisponível — cai pro fallback abaixo.
      }

      // Os usuários de demonstração (Ana, João, Mel...) ainda só existem nos
      // dados mock, não no DynamoDB — fallback pra manter a navegação funcionando.
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
        <Skeleton className="h-36 md:h-40 w-full rounded-none" />
        <div className="mx-auto w-full max-w-[1880px] px-5 pb-16 lg:px-8">
          <div className="relative -mt-14 sm:-mt-16 mb-8 flex flex-col md:flex-row gap-6 md:items-end justify-between">
            <div className="flex flex-col md:flex-row gap-5 md:items-end">
              <Skeleton className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white" />
              <div className="pb-2 space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 lg:gap-6">
            <div className="order-2 lg:order-1">
              <Card>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            </div>
            <div className="order-1 lg:order-2 min-w-0 columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton
                  key={i}
                  className="mb-6 break-inside-avoid rounded-2xl"
                  style={{ height: 220 + (i % 2) * 60 }}
                />
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

  return (
    <div>
      {/* Cover */}
      <div className="h-36 md:h-40 bg-muted w-full relative overflow-hidden">
        {user.coverUrl && (
          <img src={user.coverUrl} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="mx-auto w-full max-w-[1880px] px-5 pb-16 lg:px-8">
        {/* Profile Info */}
        <div className="relative -mt-14 sm:-mt-16 mb-8 flex flex-col md:flex-row gap-6 md:items-end justify-between">
          <div className="flex flex-col md:flex-row gap-5 md:items-end">
            <Avatar className="w-28 h-28 md:w-32 md:h-32 border-4 border-white shadow-sm">
              <AvatarImage src={user.avatarUrl} alt={user.fullName} />
              <AvatarFallback className="text-3xl">{user.fullName.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{user.fullName}</h1>
                {user.category && (
                  <span className="bg-tag text-tag-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full">
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
              <p className="text-muted-foreground font-medium">
                @{user.username} · {followerCount.toLocaleString('pt-BR')} seguidores
              </p>
            </div>
          </div>

          <div className="flex gap-2 pb-2">
            {isOwnProfile ? (
              <Button asChild>
                <Link to="/novo-projeto">
                  <Plus className="w-4 h-4" /> Novo projeto
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  onClick={handleFollowToggle}
                  disabled={user.source !== 'real' || followLoading}
                >
                  <UserPlus className="w-4 h-4" /> {isFollowing ? 'Seguindo' : 'Seguir'}
                </Button>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="projetos">
          <TabsList className="mb-8">
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
            <TabsTrigger value="sobre">Sobre</TabsTrigger>
          </TabsList>

          <TabsContent value="projetos">
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 lg:gap-6">
              {/* Sidebar */}
              <div className="order-2 lg:order-1">
                <Card>
                  <CardContent className="p-5 space-y-5">
                    {user.bio && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Sobre</h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">{user.bio}</p>
                      </div>
                    )}

                    {(user.portfolioLink || user.contactEmail) && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Links</h3>
                        <ul className="space-y-2.5 text-sm">
                          {user.portfolioLink && (
                            <li>
                              <a
                                href={user.portfolioLink.startsWith('http') ? user.portfolioLink : `https://${user.portfolioLink}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors truncate"
                              >
                                <LinkIcon className="w-4 h-4 shrink-0" /> {user.portfolioLink}
                              </a>
                            </li>
                          )}
                          {user.contactEmail && (
                            <li>
                              <a
                                href={`mailto:${user.contactEmail}`}
                                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors truncate"
                              >
                                <Mail className="w-4 h-4 shrink-0" /> {user.contactEmail}
                              </a>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Projects */}
              <div className="order-1 lg:order-2 min-w-0">
                {visibleProjects.length > 0 ? (
                  <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-6">
                    {visibleProjects.map((project: any) => (
                      <div key={project.id} className="mb-6 break-inside-avoid">
                        <ProjectCard project={project} />
                      </div>
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sobre">
            <Card className="max-w-2xl">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">Sobre {user.fullName}</h3>
                <p className="text-muted-foreground leading-relaxed">{user.bio || 'Este criador ainda não escreveu uma bio.'}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
