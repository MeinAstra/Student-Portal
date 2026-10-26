import type { CollectionName, PublicContent, Role, SessionUser } from "@portal/contracts";

export interface AuthUser extends SessionUser {
  passwordHash: string;
  active: boolean;
}

export interface SessionRecord {
  user: SessionUser;
  csrfHash: string;
  expiresAt: Date;
}

export interface AuditContext {
  actorUserId: string;
  action: "create" | "update" | "delete";
  entityType: string;
  requestId: string;
}

export interface Store {
  readiness(): Promise<void>;
  publicContent(today: string): Promise<PublicContent>;
  list(collection: CollectionName): Promise<unknown[]>;
  create(collection: CollectionName, input: Record<string, unknown>, audit: AuditContext): Promise<Record<string, unknown>>;
  update(collection: CollectionName, id: string, input: Record<string, unknown>, audit: AuditContext): Promise<Record<string, unknown> | null>;
  remove(collection: CollectionName, id: string, audit: AuditContext): Promise<boolean>;
  updateSingleton(name: "campusMap" | "portalStatus", input: Record<string, unknown>, audit: AuditContext): Promise<Record<string, unknown>>;
  findUserByEmail(email: string): Promise<AuthUser | null>;
  createUser(input: { email: string; displayName: string; passwordHash: string; roles: Role[] }): Promise<void>;
  createSession(input: { idHash: string; userId: string; csrfHash: string; expiresAt: Date }): Promise<void>;
  getSession(idHash: string): Promise<SessionRecord | null>;
  deleteSession(idHash: string): Promise<void>;
  listAuditEvents(limit: number): Promise<unknown[]>;
  close(): Promise<void>;
}
