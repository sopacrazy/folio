/** Envia um arquivo pro backend (POST /api/upload) e devolve a URL pública salva no disco do servidor. */
export async function uploadFile(file: File, token: string | null): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao enviar o arquivo.');
  return data.url as string;
}
