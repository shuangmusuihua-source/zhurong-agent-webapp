import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DATABASE_URL?.replace("file:", "") || "./sqlite.db");

sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// 启动时清理孤儿任务（服务器重启后 running 状态的任务已无进程执行）
try {
  const result = sqlite.prepare("UPDATE task SET status = 'failed', updated_at = datetime('now') WHERE status = 'running'").run();
  if (result.changes > 0) {
    console.log(`[DB] Cleaned ${result.changes} orphan running task(s)`);
  }
} catch {
  // task 表可能不存在（首次启动），忽略
}
