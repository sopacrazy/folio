/** Limites de tamanho por tipo de upload — compartilhado entre frontend e
    backend, única fonte de verdade pra validação e pras mensagens de erro.
    Vídeo não entra aqui: o app só aceita links incorporados (YouTube/Vimeo),
    não há rota de upload direto de arquivo de vídeo. */
export type UploadKind = 'avatar' | 'profileCover' | 'projectImage';

export const UPLOAD_LIMITS_MB: Record<UploadKind, number> = {
  avatar: 3,
  profileCover: 5,
  projectImage: 8,
};

const toBytes = (mb: number) => mb * 1024 * 1024;

export const UPLOAD_LIMITS_BYTES: Record<UploadKind, number> = {
  avatar: toBytes(UPLOAD_LIMITS_MB.avatar),
  profileCover: toBytes(UPLOAD_LIMITS_MB.profileCover),
  projectImage: toBytes(UPLOAD_LIMITS_MB.projectImage),
};

export const UPLOAD_LIMIT_LABELS: Record<UploadKind, string> = {
  avatar: 'avatar',
  profileCover: 'capa de perfil',
  projectImage: 'imagem de projeto',
};

/** Teto absoluto aceito pelo multer, só como proteção de memória contra
    payloads muito fora da curva — a checagem que realmente vale (por tipo,
    com mensagem específica) acontece depois, em resolveUploadKind. */
export const UPLOAD_SAFETY_CEILING_BYTES = 20 * 1024 * 1024;

/** Mesma regra usada nos dois lados pra descobrir qual limite vale pro
    upload: 'folder' e 'purpose' já viajam no form-data hoje. */
export function resolveUploadKind(folder: 'avatars' | 'projects', purpose?: string): UploadKind {
  if (folder === 'avatars') return 'avatar';
  if (purpose === 'profile-cover') return 'profileCover';
  return 'projectImage';
}

export function formatUploadLimitError(kind: UploadKind): string {
  return `Arquivo muito grande. Máximo permitido: ${UPLOAD_LIMITS_MB[kind]}MB para ${UPLOAD_LIMIT_LABELS[kind]}.`;
}
