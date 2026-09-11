import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Plus, Send, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

interface SpaceMessage {
  messageId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

type TaskStatus = 'todo' | 'doing' | 'done';

interface SpaceTask {
  taskId: string;
  title: string;
  status: TaskStatus;
  assigneeId?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

const TABS = ['Discussão', 'Tarefas', 'Notas'] as const;
type Tab = (typeof TABS)[number];

const STATUS_COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'A fazer' },
  { key: 'doing', label: 'Fazendo' },
  { key: 'done', label: 'Concluído' },
];

function DiscussionTab({ projectId, token, currentUserId }: { projectId: string; token: string | null; currentUserId: string }) {
  const [messages, setMessages] = useState<SpaceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((data.messages ?? []).slice().reverse());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = window.setInterval(loadMessages, 25000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar a mensagem.');
      setMessages((list) => (list.some((m) => m.messageId === data.messageId) ? list : [...list, data]));
      setContent('');
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {error && <div className="text-sm rounded-xl p-4 mb-4 font-medium bg-red-50 text-red-700">{error}</div>}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="max-h-[480px] min-h-[280px] overflow-y-auto p-4 space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-14 w-2/3 rounded-xl" />
              <Skeleton className="h-14 w-1/2 rounded-xl ml-auto" />
            </>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhuma mensagem ainda. Comece a conversa.</p>
          ) : (
            messages.map((m) => {
              const isMine = m.authorId === currentUserId;
              return (
                <div key={m.messageId} className={cn('flex gap-2.5', isMine && 'flex-row-reverse')}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={m.authorAvatar} alt="" />
                    <AvatarFallback className="text-xs">{m.authorName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2.5',
                      isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {!isMine && <p className="text-xs font-semibold mb-0.5 opacity-70">{m.authorName}</p>}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva uma mensagem... use @usuário para mencionar"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !content.trim()} aria-label="Enviar mensagem">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function TasksTab({ projectId, token, members }: { projectId: string; token: string | null; members: Member[] }) {
  const [tasks, setTasks] = useState<SpaceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const createTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível criar a tarefa.');
      setTasks((list) => (list.some((t) => t.taskId === data.taskId) ? list : [...list, data]));
      setNewTitle('');
    } catch (err: any) {
      setError(err.message || 'Não foi possível criar a tarefa.');
    } finally {
      setCreating(false);
    }
  };

  const updateTask = async (taskId: string, patch: Partial<Pick<SpaceTask, 'status' | 'assigneeId'>>) => {
    setTasks((list) => list.map((t) => (t.taskId === taskId ? { ...t, ...patch } : t)));
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks((list) => list.map((t) => (t.taskId === taskId ? data : t)));
    } catch {
      loadTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks((list) => list.filter((t) => t.taskId !== taskId));
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
    <div>
      {error && <div className="text-sm rounded-xl p-4 mb-4 font-medium bg-red-50 text-red-700">{error}</div>}

      <form onSubmit={createTask} className="flex gap-2 mb-5">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nova tarefa..." disabled={creating} />
        <Button type="submit" disabled={creating || !newTitle.trim()}>
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((c) => (
            <Skeleton key={c.key} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-2.5 text-sm font-bold text-foreground">
                  {col.label} <span className="text-muted-foreground font-normal">({colTasks.length})</span>
                </div>
                <div className="p-3 space-y-2.5 min-h-[80px]">
                  {colTasks.map((task) => {
                    const assignee = task.assigneeId ? memberById.get(task.assigneeId) : undefined;
                    return (
                      <div key={task.taskId} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.taskId)}
                            className="text-muted-foreground hover:text-red-600 shrink-0"
                            aria-label="Remover tarefa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <select
                            value={task.assigneeId ?? ''}
                            onChange={(e) => updateTask(task.taskId, { assigneeId: e.target.value || undefined })}
                            className="text-xs rounded-lg border border-input bg-background px-2 py-1 max-w-[112px] truncate"
                          >
                            <option value="">Sem responsável</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                @{m.username}
                              </option>
                            ))}
                          </select>
                          {assignee && (
                            <Avatar className="w-6 h-6 shrink-0" title={assignee.fullName}>
                              <AvatarImage src={assignee.avatarUrl} alt="" />
                              <AvatarFallback className="text-[10px]">{assignee.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                        </div>

                        <div className="mt-2.5 flex gap-1.5">
                          {STATUS_COLUMNS.map((c) => (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() => updateTask(task.taskId, { status: c.key })}
                              disabled={c.key === task.status}
                              className={cn(
                                'flex-1 rounded-md py-1 text-[11px] font-semibold transition-colors',
                                c.key === task.status
                                  ? 'bg-primary/10 text-primary cursor-default'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
                              )}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nada por aqui.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NotesTab({ projectId, token }: { projectId: string; token: string | null }) {
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [updatedBy, setUpdatedBy] = useState<Member | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/projects/${projectId}/notes`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setNotes(data.notes ?? '');
          setSavedNotes(data.notes ?? '');
          setUpdatedBy(data.notesUpdatedBy ?? null);
          setUpdatedAt(data.notesUpdatedAt ?? null);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível salvar as notas.');
      setSavedNotes(data.notes ?? '');
      setUpdatedBy(data.notesUpdatedBy ?? null);
      setUpdatedAt(data.notesUpdatedAt ?? null);
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar as notas.');
    } finally {
      setSaving(false);
    }
  };

  const dirty = notes !== savedNotes;

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div>
      {error && <div className="text-sm rounded-xl p-4 mb-4 font-medium bg-red-50 text-red-700">{error}</div>}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={14}
        placeholder="Plano, decisões, links úteis..."
        className="resize-y"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {updatedBy && updatedAt
            ? `Editado por último por ${updatedBy.fullName} · ${new Date(updatedAt).toLocaleString('pt-BR')}`
            : 'Ainda não editado.'}
        </p>
        <Button type="button" onClick={save} disabled={saving || !dirty}>
          {saving ? 'Salvando...' : 'Salvar notas'}
        </Button>
      </div>
    </div>
  );
}

export default function ProjectSpacePage() {
  const { handle, slug } = useParams();
  const username = handle?.startsWith('@') ? handle.slice(1) : handle;
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('Discussão');
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      if (!username || !slug) {
        if (!cancelled) { setNotFound(true); setLoading(false); }
        return;
      }
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          const isOwner = data.ownerId === user!.id;
          const isCollaborator = (data.collaborators ?? []).some((c: any) => c.id === user!.id);
          if (!cancelled) {
            setProjectId(data.id);
            setProjectTitle(data.title);
            setHasAccess(isOwner || isCollaborator);
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
  }, [username, slug, user, token]);

  useEffect(() => {
    if (!projectId || !hasAccess || !token) return;
    fetch(`/api/projects/${projectId}/members`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMembers(data.members ?? []);
      })
      .catch(() => {});
  }, [projectId, hasAccess, token]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8">
        <Skeleton className="h-6 w-24 mb-6" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40 mb-8" />
        <Skeleton className="h-10 w-full max-w-sm mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound || !hasAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-xl font-bold text-foreground mb-2">
          {notFound ? 'Projeto não encontrado' : 'Você não tem acesso a este espaço'}
        </h1>
        <p className="text-muted-foreground mb-6">
          {notFound
            ? 'Esse projeto não existe ou não está mais disponível.'
            : 'Só o autor principal e colaboradores aceitos podem ver essa área.'}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <h1 className="text-2xl font-bold text-foreground mt-4">Espaço do projeto</h1>
      <p className="text-muted-foreground mt-0.5">{projectTitle}</p>

      <div className="mt-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'Discussão' && projectId && <DiscussionTab projectId={projectId} token={token} currentUserId={user.id} />}
        {tab === 'Tarefas' && projectId && <TasksTab projectId={projectId} token={token} members={members} />}
        {tab === 'Notas' && projectId && <NotesTab projectId={projectId} token={token} />}
      </div>
    </div>
  );
}
