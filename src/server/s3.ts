import { S3Client } from '@aws-sdk/client-s3';

// Credenciais (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) vêm da cadeia padrão do SDK
// (variáveis de ambiente, carregadas via dotenv em server.ts) — nunca hardcode aqui.
// Mesma conta/região já usada pelo DynamoDB.
export const s3 = new S3Client({ region: process.env.AWS_REGION });

export const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME as string;

export function s3PublicUrl(key: string) {
  return `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
