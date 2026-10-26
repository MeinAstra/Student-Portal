import type { CollectionName, PublicContent, SessionState } from "@portal/contracts";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event("portal:unauthorized"));
    const body = await response.json().catch(() => ({ error: "Request failed." })) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export const api = {
  publicContent: () => request<PublicContent>("/api/v1/content"),
  session: () => request<SessionState>("/api/v1/auth/session"),
  login: (email: string, password: string) => request<SessionState>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: (csrfToken: string) => request<void>("/api/v1/auth/logout", { method: "POST", headers: { "X-CSRF-Token": csrfToken } }),
  adminList: (collection: CollectionName) => request<Array<Record<string, unknown>>>(`/api/v1/admin/${collection}`),
  auditEvents: () => request<Array<Record<string, unknown>>>("/api/v1/admin/audit-events"),
  create: (collection: CollectionName, body: Record<string, unknown>, csrfToken: string) => request<Record<string, unknown>>(`/api/v1/admin/${collection}`, { method: "POST", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }),
  update: (collection: CollectionName, id: string, body: Record<string, unknown>, csrfToken: string) => request<Record<string, unknown>>(`/api/v1/admin/${collection}/${id}`, { method: "PUT", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }),
  remove: (collection: CollectionName, id: string, csrfToken: string) => request<void>(`/api/v1/admin/${collection}/${id}`, { method: "DELETE", headers: { "X-CSRF-Token": csrfToken } }),
  updateSingleton: (name: "campusMap" | "portalStatus", body: Record<string, unknown>, csrfToken: string) => request<Record<string, unknown>>(`/api/v1/admin/singletons/${name}`, { method: "PUT", headers: { "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) })
};
