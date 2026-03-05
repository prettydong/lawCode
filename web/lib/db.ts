/**
 * lib/db.ts — SQLite 数据库工具
 *
 * 使用 better-sqlite3（同步 API，适合 Next.js API routes）
 * 后期迁移 PostgreSQL 时，只需替换此文件中的实现即可。
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// 数据库文件路径：项目根目录的 data/ 下
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

// 确保 data 目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 单例
const globalForDb = globalThis as unknown as { db: Database.Database };
const db = globalForDb.db || new Database(DB_PATH);
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

// WAL 模式提升并发性能
db.pragma("journal_mode = WAL");

// ─── 初始化表结构 ─────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        TEXT PRIMARY KEY,
    email     TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    name      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);


db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ─── 简单的 cuid-like ID 生成器 ──────────────────────────
function generateId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    return `c${ts}${rand}`;
}

// ─── User 操作 ────────────────────────────────────────────
export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface PublicUser {
    id: string;
    email: string;
    name: string;
}

export const userDb = {
    findByEmail(email: string): User | undefined {
        return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
    },

    findById(id: string): User | undefined {
        return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
    },

    create(data: { email: string; password: string; name: string }): PublicUser {
        const id = generateId();
        const now = new Date().toISOString();
        db.prepare(
            "INSERT INTO users (id, email, password, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(id, data.email, data.password, data.name, now, now);
        return { id, email: data.email, name: data.name };
    },

    toPublic(user: User): PublicUser {
        return { id: user.id, email: user.email, name: user.name };
    },
};

// ─── Case 操作 ────────────────────────────────────────────
export interface Case {
    id: string;
    user_id: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export const caseDb = {
    listByUser(userId: string): Case[] {
        return db
            .prepare("SELECT * FROM cases WHERE user_id = ? ORDER BY updated_at DESC")
            .all(userId) as Case[];
    },

    findById(id: string): Case | undefined {
        return db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as Case | undefined;
    },

    create(data: { userId: string; title: string; description?: string }): Case {
        const id = generateId();
        const now = new Date().toISOString();
        db.prepare(
            "INSERT INTO cases (id, user_id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)"
        ).run(id, data.userId, data.title, data.description || "", now, now);
        return {
            id, user_id: data.userId, title: data.title,
            description: data.description || "", status: "active",
            created_at: now, updated_at: now,
        };
    },

    update(id: string, data: { title?: string; description?: string; status?: string }): boolean {
        const existing = this.findById(id);
        if (!existing) return false;
        const now = new Date().toISOString();
        db.prepare(
            "UPDATE cases SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?"
        ).run(
            data.title ?? existing.title,
            data.description ?? existing.description,
            data.status ?? existing.status,
            now, id
        );
        return true;
    },

    delete(id: string): boolean {
        const result = db.prepare("DELETE FROM cases WHERE id = ?").run(id);
        return result.changes > 0;
    },
};

// ─── 文件管理：诉状记录 ────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    template_id TEXT NOT NULL DEFAULT '',
    form_data   TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export interface Document {
    id: string;
    user_id: string;
    title: string;
    template_id: string;
    form_data: string;
    created_at: string;
}

export const documentDb = {
    listByUser(userId: string): Document[] {
        return db
            .prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC")
            .all(userId) as Document[];
    },

    create(data: { userId: string; title: string; templateId: string; formData?: string }): Document {
        const id = generateId();
        const now = new Date().toISOString();
        db.prepare(
            "INSERT INTO documents (id, user_id, title, template_id, form_data, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(id, data.userId, data.title, data.templateId, data.formData || "{}", now);
        return {
            id, user_id: data.userId, title: data.title,
            template_id: data.templateId, form_data: data.formData || "{}",
            created_at: now,
        };
    },

    delete(id: string): boolean {
        const result = db.prepare("DELETE FROM documents WHERE id = ?").run(id);
        return result.changes > 0;
    },

    findById(id: string): Document | undefined {
        return db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Document | undefined;
    },
};

// ─── 文件管理：分析记录 ────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS analyses (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    input       TEXT NOT NULL,
    mode        TEXT NOT NULL DEFAULT '',
    result      TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

export interface Analysis {
    id: string;
    user_id: string;
    input: string;
    mode: string;
    result: string;
    created_at: string;
}

export const analysisDb = {
    listByUser(userId: string): Analysis[] {
        return db
            .prepare("SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC")
            .all(userId) as Analysis[];
    },

    create(data: { userId: string; input: string; mode: string; result: string }): Analysis {
        const id = generateId();
        const now = new Date().toISOString();
        db.prepare(
            "INSERT INTO analyses (id, user_id, input, mode, result, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(id, data.userId, data.input, data.mode, data.result, now);
        return {
            id, user_id: data.userId, input: data.input,
            mode: data.mode, result: data.result, created_at: now,
        };
    },

    delete(id: string): boolean {
        const result = db.prepare("DELETE FROM analyses WHERE id = ?").run(id);
        return result.changes > 0;
    },

    findById(id: string): Analysis | undefined {
        return db.prepare("SELECT * FROM analyses WHERE id = ?").get(id) as Analysis | undefined;
    },
};

export default db;
