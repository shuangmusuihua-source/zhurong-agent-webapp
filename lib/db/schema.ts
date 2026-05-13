import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// ==================== Better Auth 表 ====================
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  avatar: text("avatar"),
  emailVerified: integer("emailVerified", { mode: "boolean" }),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => user.id),
  token: text("token").notNull().unique(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  expiresAt: integer("expiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ==================== 业务表 ====================

// 工作空间
export const workspace = sqliteTable("workspace", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  name: text("name").notNull(),
  description: text("description"),
  lastActiveAt: integer("last_active_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  index("workspace_user_id_idx").on(table.userId),
]);

// 数字伙伴（Skill 的拟人化包装）
export const digitalBuddy = sqliteTable("digital_buddy", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  description: text("description").notNull(),
  skillId: text("skill_id").notNull(), // 关联的 Skill ID
  tags: text("tags"), // JSON 数组
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 任务（Skill 执行实例）
export const task = sqliteTable("task", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id),
  buddyId: text("buddy_id").notNull().references(() => digitalBuddy.id),
  conversationId: text("conversation_id").references(() => conversation.id),
  status: text("status").notNull().default("running"), // 'running' | 'completed' | 'failed'
  agentSessionId: text("agent_session_id"), // Claude Agent Session ID，用于 resume
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  index("task_workspace_id_idx").on(table.workspaceId),
]);

// 对话
export const conversation = sqliteTable("conversation", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id),
  title: text("title"),
  agentSessionId: text("agent_session_id"), // Claude Agent Session ID
  activeBuddyId: text("active_buddy_id").references(() => digitalBuddy.id),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  index("conversation_workspace_id_idx").on(table.workspaceId),
]);

// 消息
export const message = sqliteTable("message", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversation.id),
  role: text("role").notNull(), // 'user' | 'assistant' | 'buddy'
  buddyId: text("buddy_id").references(() => digitalBuddy.id),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON: { type: 'progress' | 'product', productId?: string }
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  index("message_conversation_id_idx").on(table.conversationId),
]);

// 生成产物
export const product = sqliteTable("product", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id),
  taskId: text("task_id").references(() => task.id),
  conversationId: text("conversation_id").references(() => conversation.id),
  type: text("type").notNull(), // 'slides' | 'document' | 'code' | 'image'
  name: text("name").notNull(),
  content: text("content"), // 文件内容或路径
  preview: text("preview"), // 预览图路径
  status: text("status").notNull().default("draft"), // 'draft' | 'generating' | 'completed' | 'error'
  metadata: text("metadata"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => [
  index("product_workspace_id_idx").on(table.workspaceId),
  index("product_task_id_idx").on(table.taskId),
]);

// 上下文文件
export const contextFile = sqliteTable("context_file", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id),
  name: text("name").notNull(),
  path: text("path"),
  type: text("type").notNull(), // 'file' | 'url' | 'text'
  content: text("content"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
