import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // We will use UUIDs
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  bio: text('bio'),
  category: text('category'), // e.g. "UI/UX Designer", "Illustrator"
  avatarUrl: text('avatar_url'),
  coverUrl: text('cover_url'),
  whatsapp: text('whatsapp'),
  instagram: text('instagram'),
  facebook: text('facebook'),
  externalLinks: text('external_links', { mode: 'json' }), // array of { title, url }
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  coverUrl: text('cover_url').notNull(),
  category: text('category'),
  tools: text('tools', { mode: 'json' }), // array of string e.g. ["Figma", "Photoshop"]
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const projectImages = sqliteTable('project_images', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  orderIndex: integer('order_index').notNull(),
});

export const likes = sqliteTable('likes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const follows = sqliteTable('follows', {
  id: text('id').primaryKey(),
  followerId: text('follower_id').notNull().references(() => users.id),
  followingId: text('following_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Selos de reputação (ex: "verified", "top_creator"). Concedidos manualmente por enquanto,
// via inserts diretos em user_badges — a lógica automática de concessão fica pra depois.
export const badges = sqliteTable('badges', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(), // e.g. "verified"
  label: text('label').notNull(), // e.g. "Verificado"
  description: text('description'),
  iconName: text('icon_name').notNull(), // chave usada pelo frontend p/ escolher o ícone: "check" | "trophy" | "users"
  color: text('color').notNull(), // chave usada pelo frontend p/ escolher a cor: "blue" | "amber" | "green"
});

export const userBadges = sqliteTable('user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: text('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  awardedAt: integer('awarded_at', { mode: 'timestamp' }).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  likes: many(likes),
  followers: many(follows, { relationName: 'followers' }),
  following: many(follows, { relationName: 'following' }),
  comments: many(comments),
  userBadges: many(userBadges),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  images: many(projectImages),
  likes: many(likes),
  comments: many(comments),
}));

export const projectImagesRelations = relations(projectImages, ({ one }) => ({
  project: one(projects, {
    fields: [projectImages.projectId],
    references: [projects.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [likes.projectId],
    references: [projects.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'following',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'followers',
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [comments.projectId],
    references: [projects.id],
  }),
}));
