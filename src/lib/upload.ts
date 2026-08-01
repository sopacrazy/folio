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

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao enviar o arquivo.');
  return data.url as string;
}
