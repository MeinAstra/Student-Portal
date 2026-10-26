import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type PoolClient } from "pg";
import type { CollectionName, PublicContent, Role } from "@portal/contracts";
import type { AuditContext, AuthUser, SessionRecord, Store } from "./store.js";

type CollectionConfig = {
  table: string;
  select: string;
  columns: string[];
  values(input: Record<string, unknown>): unknown[];
};

const meta = 'id, created_at AS "createdAt", updated_at AS "updatedAt"';
const collections: Record<CollectionName, CollectionConfig> = {
  notices: {
    table: "notices",
    select: `title, summary, category, publish_date::text AS "publishDate", COALESCE(expiry_date::text, '') AS "expiryDate", image_url AS "imageUrl", visible, ${meta}`,
    columns: ["title", "summary", "category", "publish_date", "expiry_date", "image_url", "visible"],
    values: (x) => [x.title, x.summary, x.category, x.publishDate, x.expiryDate || null, x.imageUrl, x.visible]
  },
  events: {
    table: "events",
    select: `title, description, event_date::text AS date, location, category, registration_url AS "registrationUrl", visible, ${meta}`,
    columns: ["title", "description", "event_date", "location", "category", "registration_url", "visible"],
    values: (x) => [x.title, x.description, x.date, x.location, x.category, x.registrationUrl, x.visible]
  },
  directory: {
    table: "directory_entries",
    select: `name, role, department, email, location, visible, ${meta}`,
    columns: ["name", "role", "department", "email", "location", "visible"],
    values: (x) => [x.name, x.role, x.department, x.email, x.location, x.visible]
  },
  resources: {
    table: "resources",
    select: `title, description, category, url, visible, ${meta}`,
    columns: ["title", "description", "category", "url", "visible"],
    values: (x) => [x.title, x.description, x.category, x.url, x.visible]
  },
  support: {
    table: "support_contacts",
    select: `section, title, description, contact_label AS "contactLabel", url, visible, ${meta}`,
    columns: ["section", "title", "description", "contact_label", "url", "visible"],
    values: (x) => [x.section, x.title, x.description, x.contactLabel, x.url, x.visible]
  },
  feedbackForms: {
    table: "feedback_forms",
    select: `name, url, visible, ${meta}`,
    columns: ["name", "url", "visible"],
    values: (x) => [x.name, x.url, x.visible]
  },
  assets: {
    table: "asset_metadata",
    select: `name, url, alt_text AS "altText", media_type AS "mediaType", visible, ${meta}`,
    columns: ["name", "url", "alt_text", "media_type", "visible"],
    values: (x) => [x.name, x.url, x.altText, x.mediaType, x.visible]
  }
};

function placeholders(length: number, start = 1): string {
  return Array.from({ length }, (_, index) => `$${index + start}`).join(", ");
}

export class PgStore implements Store {
  readonly pool: Pool;

  constructor(databaseUrl: string, pool?: Pool) {
    if (!databaseUrl) throw new Error("DATABASE_URL is required.");
    this.pool = pool ?? new Pool({ connectionString: databaseUrl, max: 10 });
  }

  async readiness(): Promise<void> {
    const result = await this.pool.query("SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE name = $1) AS ready", ["001_initial.sql"]);
    if (result.rows[0]?.ready !== true) throw new Error("Required database migration is not applied.");
  }

  async publicContent(today: string): Promise<PublicContent> {
    const [notices, events, directory, resources, support, feedbackForms, assets, campusMap, portalStatus] = await Promise.all([
      this.pool.query(`SELECT ${collections.notices.select} FROM notices WHERE visible AND publish_date <= $1 AND (expiry_date IS NULL OR expiry_date >= $1) ORDER BY publish_date DESC`, [today]),
      this.pool.query(`SELECT ${collections.events.select} FROM events WHERE visible AND event_date >= $1 ORDER BY event_date`, [today]),
      this.pool.query(`SELECT ${collections.directory.select} FROM directory_entries WHERE visible ORDER BY name`),
      this.pool.query(`SELECT ${collections.resources.select} FROM resources WHERE visible ORDER BY category, title`),
      this.pool.query(`SELECT ${collections.support.select} FROM support_contacts WHERE visible ORDER BY section, title`),
      this.pool.query(`SELECT ${collections.feedbackForms.select} FROM feedback_forms WHERE visible ORDER BY name`),
      this.pool.query(`SELECT ${collections.assets.select} FROM asset_metadata WHERE visible ORDER BY name`),
      this.pool.query(`SELECT title, description, image_url AS "imageUrl", visible, ${meta} FROM campus_map WHERE visible`),
      this.pool.query(`SELECT message, ${meta} FROM portal_status`)
    ]);
    return {
      notices: notices.rows,
      events: events.rows,
      directory: directory.rows,
      resources: resources.rows,
      support: support.rows,
      feedbackForms: feedbackForms.rows,
      assets: assets.rows,
      campusMap: campusMap.rows[0] ?? null,
      portalStatus: portalStatus.rows[0] ?? null
    } as PublicContent;
  }

  async list(collection: CollectionName): Promise<unknown[]> {
    const config = collections[collection];
    return (await this.pool.query(`SELECT ${config.select} FROM ${config.table} ORDER BY updated_at DESC`)).rows;
  }

  private async audited<T>(audit: AuditContext, operation: (client: PoolClient) => Promise<{ value: T; entityId: string | null }>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      if (result.entityId) {
        await client.query(
          "INSERT INTO audit_events (actor_user_id, action, entity_type, entity_id, request_id) VALUES ($1, $2, $3, $4, $5)",
          [audit.actorUserId, audit.action, audit.entityType, result.entityId, audit.requestId]
        );
      }
      await client.query("COMMIT");
      return result.value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async create(collection: CollectionName, input: Record<string, unknown>, audit: AuditContext): Promise<Record<string, unknown>> {
    const config = collections[collection];
    return this.audited(audit, async (client) => {
      const result = await client.query(
        `INSERT INTO ${config.table} (${config.columns.join(", ")}) VALUES (${placeholders(config.columns.length)}) RETURNING ${config.select}`,
        config.values(input)
      );
      const value = result.rows[0] as Record<string, unknown>;
      return { value, entityId: String(value.id) };
    });
  }

  async update(collection: CollectionName, id: string, input: Record<string, unknown>, audit: AuditContext): Promise<Record<string, unknown> | null> {
    const config = collections[collection];
    const assignments = config.columns.map((column, index) => `${column} = $${index + 1}`).join(", ");
    return this.audited(audit, async (client) => {
      const result = await client.query(
        `UPDATE ${config.table} SET ${assignments} WHERE id = $${config.columns.length + 1} RETURNING ${config.select}`,
        [...config.values(input), id]
      );
      const value = (result.rows[0] as Record<string, unknown> | undefined) ?? null;
      return { value, entityId: value ? id : null };
    });
  }

  async remove(collection: CollectionName, id: string, audit: AuditContext): Promise<boolean> {
    return this.audited(audit, async (client) => {
      const result = await client.query(`DELETE FROM ${collections[collection].table} WHERE id = $1`, [id]);
      const removed = result.rowCount === 1;
      return { value: removed, entityId: removed ? id : null };
    });
  }

  async updateSingleton(name: "campusMap" | "portalStatus", input: Record<string, unknown>, audit: AuditContext): Promise<Record<string, unknown>> {
    if (name === "campusMap") {
      return this.audited(audit, async (client) => {
        const result = await client.query(
          `INSERT INTO campus_map (singleton, title, description, image_url, visible) VALUES (true, $1, $2, $3, $4)
           ON CONFLICT (singleton) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, image_url = EXCLUDED.image_url, visible = EXCLUDED.visible
           RETURNING title, description, image_url AS "imageUrl", visible, ${meta}`,
          [input.title, input.description, input.imageUrl, input.visible]
        );
        const value = result.rows[0] as Record<string, unknown>;
        return { value, entityId: String(value.id) };
      });
    }
    return this.audited(audit, async (client) => {
      const result = await client.query(
        `INSERT INTO portal_status (singleton, message) VALUES (true, $1)
         ON CONFLICT (singleton) DO UPDATE SET message = EXCLUDED.message
         RETURNING message, ${meta}`,
        [input.message]
      );
      const value = result.rows[0] as Record<string, unknown>;
      return { value, entityId: String(value.id) };
    });
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.display_name AS "displayName", u.password_hash AS "passwordHash", u.active,
        COALESCE(array_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '{}') AS roles
       FROM portal_users u LEFT JOIN user_roles r ON r.user_id = u.id
       WHERE u.email = $1 GROUP BY u.id`, [email]
    );
    return (result.rows[0] as AuthUser | undefined) ?? null;
  }

  async createUser(input: { email: string; displayName: string; passwordHash: string; roles: Role[] }): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const user = await client.query(
        `INSERT INTO portal_users (email, display_name, password_hash) VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash, active = true
         RETURNING id`, [input.email, input.displayName, input.passwordHash]
      );
      const userId = user.rows[0].id as string;
      await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);
      for (const role of input.roles) await client.query("INSERT INTO user_roles (user_id, role) VALUES ($1, $2)", [userId, role]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createSession(input: { idHash: string; userId: string; csrfHash: string; expiresAt: Date }): Promise<void> {
    await this.pool.query("DELETE FROM sessions WHERE expires_at <= now()");
    await this.pool.query("INSERT INTO sessions (id_hash, user_id, csrf_hash, expires_at) VALUES ($1, $2, $3, $4)", [input.idHash, input.userId, input.csrfHash, input.expiresAt]);
  }

  async getSession(idHash: string): Promise<SessionRecord | null> {
    const result = await this.pool.query(
      `SELECT s.csrf_hash AS "csrfHash", s.expires_at AS "expiresAt", u.id, u.email, u.display_name AS "displayName",
        COALESCE(array_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '{}') AS roles
       FROM sessions s JOIN portal_users u ON u.id = s.user_id LEFT JOIN user_roles r ON r.user_id = u.id
       WHERE s.id_hash = $1 AND s.expires_at > now() AND u.active
       GROUP BY s.csrf_hash, s.expires_at, u.id`, [idHash]
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      csrfHash: row.csrfHash as string,
      expiresAt: row.expiresAt as Date,
      user: { id: row.id as string, email: row.email as string, displayName: row.displayName as string, roles: row.roles as Role[] }
    };
  }

  async deleteSession(idHash: string): Promise<void> {
    await this.pool.query("DELETE FROM sessions WHERE id_hash = $1", [idHash]);
  }

  async listAuditEvents(limit: number): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT a.id, u.display_name AS "actorDisplayName", a.action, a.entity_type AS "entityType",
        a.entity_id AS "entityId", a.request_id AS "requestId", a.occurred_at AS "occurredAt"
       FROM audit_events a LEFT JOIN portal_users u ON u.id = a.actor_user_id
       ORDER BY a.occurred_at DESC LIMIT $1`, [limit]
    );
    return result.rows;
  }

  async close(): Promise<void> { await this.pool.end(); }
}

export async function migrate(store: PgStore): Promise<void> {
  const client = await store.pool.connect();
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", ["student-campus-portal-migrations"]);
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for (const name of (await readdir(directory)).filter((item) => item.endsWith(".sql")).sort()) {
      const exists = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
      if (exists.rowCount) continue;
      await client.query("BEGIN");
      try {
        await client.query(await readFile(resolve(directory, name), "utf8"));
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", ["student-campus-portal-migrations"]).catch(() => undefined);
    client.release();
  }
}
