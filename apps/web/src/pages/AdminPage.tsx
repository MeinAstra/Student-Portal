import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CollectionName, PublicContent, SessionState } from "@portal/contracts";
import { api } from "../api.js";
import { Page } from "../components/Page.js";

type Field = { name: string; label: string; type?: "text" | "textarea" | "date" | "url" | "email" | "checkbox" | "select"; options?: string[] };

const fields: Record<CollectionName, Field[]> = {
  notices: [field("title"), field("summary", "Summary", "textarea"), field("category"), field("publishDate", "Publish date", "date"), field("expiryDate", "Expiry date", "date"), field("imageUrl", "Image URL", "url"), field("visible", "Visible", "checkbox")],
  events: [field("title"), field("description", "Description", "textarea"), field("date", "Date", "date"), field("location"), field("category"), field("registrationUrl", "Registration URL", "url"), field("visible", "Visible", "checkbox")],
  directory: [field("name"), field("role"), field("department"), field("email", "Email", "email"), field("location"), field("visible", "Visible", "checkbox")],
  resources: [field("title"), field("description", "Description", "textarea"), field("category"), field("url", "External URL", "url"), field("visible", "Visible", "checkbox")],
  support: [field("section", "Section", "select", ["health_emergency", "wellbeing", "community_safety"]), field("title"), field("description", "Description", "textarea"), field("contactLabel", "Contact label"), field("url", "External URL", "url"), field("visible", "Visible", "checkbox")],
  feedbackForms: [field("name"), field("url", "HTTPS form URL", "url"), field("visible", "Visible", "checkbox")],
  assets: [field("name"), field("url", "HTTPS asset URL", "url"), field("altText", "Alternative text"), field("mediaType", "Media type", "select", ["image", "document"]), field("visible", "Visible", "checkbox")]
};

function field(name: string, label = name[0]!.toUpperCase() + name.slice(1), type: Field["type"] = "text", options?: string[]): Field {
  return options ? { name, label, type, options } : { name, label, type };
}

const labels: Record<CollectionName, string> = { notices: "Updates", events: "Events", directory: "Directory", resources: "Resources", support: "Support directory", feedbackForms: "Feedback forms", assets: "Asset metadata" };

export function AdminPage({ session, setSession, refreshPublic, content }: { session: SessionState; setSession: (state: SessionState) => void; refreshPublic: () => Promise<void>; content: PublicContent }) {
  if (session.writeMode !== "local") return <Page eyebrow="Administration" title="Read-only demonstration" intro="Hosted/public deployments intentionally disable demo login and content mutations."><p className="empty">Run the project locally with explicitly enabled local write mode to explore the administration flow.</p></Page>;
  if (!session.user) return <Login setSession={setSession} />;
  if (!session.user.roles.includes("content_admin") || !session.csrfToken) return <Page eyebrow="Administration" title="Access denied" intro="A server-verified content_admin role is required."><p className="empty">This account cannot manage content.</p></Page>;
  return <Workspace session={session} setSession={setSession} refreshPublic={refreshPublic} content={content} />;
}

function Login({ setSession }: { setSession: (state: SessionState) => void }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const data = new FormData(event.currentTarget);
    try { setSession(await api.login(String(data.get("email")), String(data.get("password")))); }
    catch (reason) { setError((reason as Error).message); }
    finally { setPending(false); }
  }
  return <Page eyebrow="Local demonstration" title="Admin sign in" intro="Use a fictional local account created with the demo-user setup command. No credentials are included in this repository."><form className="admin-form narrow" aria-busy={pending} onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" minLength={12} autoComplete="current-password" required /></label>{error && <p className="form-error">{error}</p>}<button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></form></Page>;
}

function Workspace({ session, setSession, refreshPublic, content }: { session: SessionState; setSession: (state: SessionState) => void; refreshPublic: () => Promise<void>; content: PublicContent }) {
  const [collection, setCollection] = useState<CollectionName>("notices");
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const loadRequest = useRef(0);
  const csrf = session.csrfToken!;
  const load = async () => {
    const requestId = ++loadRequest.current;
    const nextRecords = await api.adminList(collection);
    if (requestId === loadRequest.current) setRecords(nextRecords);
  };
  useEffect(() => {
    setEditing(null); setError("");
    load().catch((reason: Error) => setError(reason.message));
    return () => { loadRequest.current += 1; };
  }, [collection]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};
    for (const definition of fields[collection]) body[definition.name] = definition.type === "checkbox" ? data.has(definition.name) : String(data.get(definition.name) ?? "");
    try {
      if (editing?.id) await api.update(collection, String(editing.id), body, csrf);
      else await api.create(collection, body, csrf);
      setEditing(null); await Promise.all([load(), refreshPublic()]);
    } catch (reason) { setError((reason as Error).message); }
    finally { setPending(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this fictional demo record?")) return;
    setPending(true);
    try { await api.remove(collection, id, csrf); setEditing(null); await Promise.all([load(), refreshPublic()]); }
    catch (reason) { setError((reason as Error).message); }
    finally { setPending(false); }
  }

  async function logout() {
    setPending(true);
    try { await api.logout(csrf); setSession({ user: null, csrfToken: null, writeMode: "local" }); }
    catch (reason) { setError((reason as Error).message); }
    finally { setPending(false); }
  }

  return <Page eyebrow="Local content administration" title="Admin workspace" intro="Mutations are authorized by the server, validated against shared contracts, and written to an audit log.">
    <div className="admin-heading"><p>Signed in as <strong>{session.user!.displayName}</strong></p><button className="secondary" disabled={pending} onClick={logout}>Sign out</button></div>
    <div className="admin-tabs" role="tablist">{(Object.keys(labels) as CollectionName[]).map((name) => <button className={collection === name ? "active" : ""} disabled={pending} key={name} onClick={() => setCollection(name)}>{labels[name]}</button>)}</div>
    <form className="admin-form" aria-busy={pending} onSubmit={save} key={`${collection}-${String(editing?.id ?? "new")}`}>
      <h2>{editing ? `Edit ${labels[collection]}` : `Add ${labels[collection]}`}</h2>
      <div className="form-grid">{fields[collection].map((definition) => <EditorField key={definition.name} definition={definition} value={editing?.[definition.name]} />)}</div>
      {error && <p className="form-error">{error}</p>}
      <div className="button-row"><button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Add record"}</button>{editing && <button className="secondary" type="button" disabled={pending} onClick={() => setEditing(null)}>Cancel</button>}</div>
    </form>
    <div className="record-list">{records.map((record) => <article key={String(record.id)}><div><strong>{String(record.title ?? record.name ?? record.section ?? "Record")}</strong><small>{record.visible === false ? "Hidden" : "Visible"}</small></div><div><button className="secondary" disabled={pending} onClick={() => setEditing(record)}>Edit</button><button className="danger" disabled={pending} onClick={() => remove(String(record.id))}>Delete</button></div></article>)}</div>
    <Settings content={content} csrf={csrf} refreshPublic={refreshPublic} />
    <AuditPanel />
  </Page>;
}

function EditorField({ definition, value }: { definition: Field; value: unknown }) {
  if (definition.type === "checkbox") return <label className="checkbox"><input name={definition.name} type="checkbox" defaultChecked={value === undefined ? true : Boolean(value)} /> {definition.label}</label>;
  if (definition.type === "textarea") return <label className="wide">{definition.label}<textarea name={definition.name} defaultValue={String(value ?? "")} required /></label>;
  if (definition.type === "select") return <label>{definition.label}<select name={definition.name} defaultValue={String(value ?? definition.options?.[0] ?? "")}>{definition.options?.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
  const required = !["expiryDate", "imageUrl", "registrationUrl", "email", "location", "url", "contactLabel"].includes(definition.name);
  return <label>{definition.label}<input name={definition.name} type={definition.type} defaultValue={String(value ?? "")} required={required} /></label>;
}

function Settings({ content, csrf, refreshPublic }: { content: PublicContent; csrf: string; refreshPublic: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function saveMap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); const data = new FormData(event.currentTarget);
    try { await api.updateSingleton("campusMap", { title: String(data.get("title")), description: String(data.get("description")), imageUrl: String(data.get("imageUrl")), visible: data.has("visible") }, csrf); await refreshPublic(); setMessage("Map settings saved."); }
    catch (reason) { setMessage((reason as Error).message); }
    finally { setPending(false); }
  }
  async function saveStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); const data = new FormData(event.currentTarget);
    try { await api.updateSingleton("portalStatus", { message: String(data.get("message")) }, csrf); await refreshPublic(); setMessage("Portal status saved."); }
    catch (reason) { setMessage((reason as Error).message); }
    finally { setPending(false); }
  }
  return <section className="settings"><h2>Singleton settings</h2>{message && <p role="status">{message}</p>}<form className="admin-form" aria-busy={pending} onSubmit={saveMap}><h3>Campus map</h3><label>Title<input name="title" defaultValue={content.campusMap?.title ?? ""} required /></label><label className="wide">Description<textarea name="description" defaultValue={content.campusMap?.description ?? ""} required /></label><label>HTTPS image URL<input name="imageUrl" type="url" defaultValue={content.campusMap?.imageUrl ?? ""} /></label><label className="checkbox"><input name="visible" type="checkbox" defaultChecked={content.campusMap?.visible ?? true} /> Visible</label><button disabled={pending}>Save map</button></form><form className="admin-form" aria-busy={pending} onSubmit={saveStatus}><h3>Portal status</h3><label className="wide">Message<input name="message" maxLength={300} defaultValue={content.portalStatus?.message ?? ""} /></label><button disabled={pending}>Save status</button></form></section>;
}

function AuditPanel() {
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function load() { setPending(true); try { setEvents(await api.auditEvents()); setError(""); } catch (reason) { setError((reason as Error).message); } finally { setPending(false); } }
  return <section className="settings"><div className="admin-heading"><div><h2>Audit events</h2><p>Recent mutation metadata; request bodies and credentials are never included.</p></div><button className="secondary" disabled={pending} onClick={load}>{pending ? "Loading…" : "Load recent events"}</button></div>{error && <p className="form-error">{error}</p>}<div className="record-list">{events.map((event) => <article key={String(event.id ?? event.requestId)}><div><strong>{String(event.action)} · {String(event.entityType)}</strong><small>{String(event.occurredAt ?? "Current test session")}</small></div><code>{String(event.entityId)}</code></article>)}</div></section>;
}
