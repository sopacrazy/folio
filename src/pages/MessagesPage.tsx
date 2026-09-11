import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import EmptyState from '../components/EmptyState';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ConversationUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

interface ConversationSummary {
  otherUser: ConversationUser;
  lastMessage: string;
  lastMessageAt: string | null;
  lastSenderId: string | null;
  unreadCount: number;
}

interface ThreadMessage {
  messageId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

function relativeTime(value: string | null) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Lista de conversas do usuário logado, à esquerda. */
function ConversationList({
  conversations,
  loading,
  selectedUsername,
  onSelect,
}: {
  conversations: ConversationSummary[];
  loading: boolean;
  selectedUsername?: string;
  onSelect: (username: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="Nenhuma conversa ainda"
        description="Mensagens que você enviar ou receber de outros criadores aparecem aqui."
      />
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((c) => (
        <button
          key={c.otherUser.username}
          type="button"
          onClick={() => onSelect(c.otherUser.username)}
          className={cn(
            'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted',
            selectedUsername === c.otherUser.username && 'bg-primary/5'
          )}
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={c.otherUser.avatarUrl} alt={c.otherUser.fullName} />
            <AvatarFallback>{c.otherUser.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className={cn('truncate text-sm', c.unreadCount > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground')}>
                {c.otherUser.fullName}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(c.lastMessageAt)}</span>
            </span>
            <span className={cn('block truncate text-xs', c.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {c.lastMessage || 'Iniciar conversa'}
            </span>
          </span>
          {c.unreadCount > 0 && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {c.unreadCount > 99 ? '99+' : c.unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Thread de mensagens com um usuário — carrega, marca como lida e permite responder. */
function Thread({
  username,
  currentUserId,
  token,
  onSent,
}: {
  username: string;
  currentUserId: string;
  token: string | null;
  onSent: () => void;
}) {
  const [otherUser, setOtherUser] = useState<ConversationUser | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    async function load() {
      try {
        const res = await fetch(`/api/messages/${encodeURIComponent(username)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setOtherUser(data.otherUser);
          setMessages(data.messages ?? []);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar a mensagem.');
      setMessages((list) => [...list, data]);
      setText('');
      onSent();
    } catch (err: any) {
      setError(err.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="h-6 w-40 mb-6" />
        <Skeleton className="h-14 w-2/3 rounded-xl mb-3" />
        <Skeleton className="h-14 w-1/2 rounded-xl ml-auto" />
      </div>
    );
  }

  if (notFound || !otherUser) {
    return (
      <div className="flex flex-1 items-center justify-center text-center px-4">
        <p className="text-muted-foreground">Não foi possível carregar essa conversa.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-w-0">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link to={`/${otherUser.username}`} className="flex items-center gap-2.5 min-w-0 group">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={otherUser.avatarUrl} alt={otherUser.fullName} />
            <AvatarFallback>{otherUser.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground group-hover:underline">{otherUser.fullName}</span>
            <span className="block truncate text-xs text-muted-foreground">@{otherUser.username}</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <div className="text-sm rounded-xl p-3 mb-2 font-medium bg-red-50 text-red-700">{error}</div>}
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhuma mensagem ainda. Diga olá para {otherUser.fullName}.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === currentUserId;
            return (
              <div key={m.messageId} className={cn('flex gap-2.5', isMine && 'flex-row-reverse')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2.5',
                    isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem..."
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="Enviar mensagem">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

export default function MessagesPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUsername = searchParams.get('with') ?? undefined;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Marca a conversa aberta como lida na lista local (a leitura de verdade
  // acontece no backend quando a thread carrega).
  useEffect(() => {
    if (!selectedUsername) return;
    setConversations((list) =>
      list.map((c) => (c.otherUser.username === selectedUsername ? { ...c, unreadCount: 0 } : c))
    );
  }, [selectedUsername]);

  if (!user) return null;

  const selectUser = (username: string) => setSearchParams({ with: username });

  return (
    <div className="mx-auto w-full max-w-5xl px-0 sm:px-6 py-0 sm:py-8">
      <div className="hidden sm:block mb-6 px-4 sm:px-0">
        <h1 className="text-2xl font-bold text-foreground">Mensagens</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] rounded-none sm:rounded-xl border-0 sm:border border-border bg-card overflow-hidden" style={{ minHeight: '70vh' }}>
        <div className={cn('border-r border-border overflow-y-auto', selectedUsername && 'hidden md:block')}>
          <ConversationList
            conversations={conversations}
            loading={loading}
            selectedUsername={selectedUsername}
            onSelect={selectUser}
          />
        </div>

        <div className={cn('flex flex-col', !selectedUsername && 'hidden md:flex')}>
          {selectedUsername ? (
            <>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="flex md:hidden items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Conversas
              </button>
              <Thread username={selectedUsername} currentUserId={user.id} token={token} onSent={loadConversations} />
            </>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-center px-4">
              <p className="text-muted-foreground">Escolha uma conversa para começar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
