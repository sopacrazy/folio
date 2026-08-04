export type UploadFolder = 'avatars' | 'projects';
export type UploadStatus = 'optimizing' | 'uploading';
export interface UploadOptions {
  maxDimension?: number;
  purpose?: 'profile-cover';
}

const SERVER_UPLOAD_LIMIT_BYTES = 15 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Não foi possível otimizar a imagem.'));
      },
      type,
      quality
    );
  });
}

async function imageToBitmap(file: File) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    image.src = url;
  });
}

async function optimizeImage(file: File, folder: UploadFolder, options?: UploadOptions) {
  if (!file.type.startsWith('image/')) return file;

  const maxDimension = options?.maxDimension ?? (folder === 'avatars' ? 500 : 2000);
  const image = await imageToBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível otimizar a imagem.');
  context.drawImage(image, 0, 0, width, height);

  if ('close' in image && typeof image.close === 'function') image.close();

  const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY);
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export async function uploadFile(
  file: File,
  token: string | null,
  folder: UploadFolder,
  onStatus?: (status: UploadStatus) => void,
  options?: UploadOptions
): Promise<string> {
  onStatus?.('optimizing');
  const optimizedFile = await optimizeImage(file, folder, options);

  if (optimizedFile.size > SERVER_UPLOAD_LIMIT_BYTES) {
    throw new Error('Imagem muito grande mesmo após compressão. Tente uma imagem menor.');
  }

  const formData = new FormData();
  formData.append('file', optimizedFile);
  formData.append('folder', folder);
  if (options?.purpose) formData.append('purpose', options.purpose);

  onStatus?.('uploading');
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 413) {
      throw new Error('Imagem muito grande mesmo após compressão. Tente uma imagem menor.');
    }
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Falha ao enviar a imagem (HTTP ${res.status}).`);
  }

  const data = await res.json();
  return data.url as string;
}
