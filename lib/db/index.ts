import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DATABASE_URL?.replace("file:", "") || "./sqlite.db");

sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// 不清理 orphan running task — SSE 重连依赖 task 保持 running 状态
// 如果服务重启，activeTasks Map 会清空，但 DB 中的 running 状态应保留
// 前端重连时如果 activeTasks 中没有对应 task，会提示用户重试
