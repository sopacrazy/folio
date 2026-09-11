import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Credenciais (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) vêm da cadeia padrão do SDK
// (variáveis de ambiente, carregadas via dotenv em server.ts) — nunca hardcode aqui.
const client = new DynamoDBClient({ region: process.env.AWS_REGION });

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLES = {
  users: 'FolioUsers',
  projects: 'FolioProjects',
  badges: 'FolioBadges',
  userBadges: 'FolioUserBadges',
  follows: 'FolioFollows',
  likes: 'FolioLikes',
  notifications: 'FolioNotifications',
  projectMessages: 'FolioProjectMessages',
  projectTasks: 'FolioProjectTasks',
  directMessages: 'FolioDirectMessages',
  conversations: 'FolioConversations',
} as const;
