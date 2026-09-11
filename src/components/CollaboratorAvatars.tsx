import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Creator {
  username: string;
  fullName: string;
  avatarUrl?: string;
}

/** Avatares sobrepostos + contador ("2 criadores") pra projetos com mais de um
    criador aceito. Só decorativo (sem link) — com vários criadores não há um
    perfil único óbvio pra apontar. */
export default function CollaboratorAvatars({ creators }: { creators: Creator[] }) {
  const visible = creators.slice(0, 3);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex -space-x-2 shrink-0">
        {visible.map((c) => (
          <Avatar key={c.username} className="w-6 h-6 border-2 border-white shrink-0">
            <AvatarImage src={c.avatarUrl} alt="" />
            <AvatarFallback className="text-[10px]">{c.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <span className="truncate text-xs text-muted-foreground">{creators.length} criadores</span>
    </div>
  );
}
