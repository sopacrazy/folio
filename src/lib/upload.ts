export type UploadFolder = 'avatars' | 'projects';

/** Envia um arquivo pro backend (POST /api/upload), que repassa pro S3, e devolve a URL pública. */
export async function uploadFile(file: File, token: string | null, folder: UploadFolder): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  // Respostas de erro nem sempre são JSON — um proxy na frente do servidor
  // (nginx, por exemplo) pode responder com uma página HTML antes mesmo do
  // Express ver a requisição (ex: 413 por limite de tamanho do corpo).
  if (!res.ok) {
    if (res.status === 413) throw new Error('Arquivo grande demais para o servidor aceitar.');
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Falha ao enviar o arquivo (HTTP ${res.status}).`);
  }

  const data = await res.json();
  return data.url as string;
}
