import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { ZodError, campusMapInput, collectionName, collectionSchemas, loginInput, portalStatusInput, recordId, type SessionState } from "@portal/contracts";
import type { Config } from "./config.js";
import { randomToken, sha256, verifyPassword } from "./security.js";
import type { SessionRecord, Store } from "./store.js";

const sessionCookie = "portal_session";
const csrfCookie = "portal_csrf";
const sessionLifetimeMs = 8 * 60 * 60 * 1000;

interface PortalRequest extends Request {
  portalSession?: SessionRecord;
  requestId?: string;
}

function cookies(request: Request): Record<string, string> {
  return Object.fromEntries((request.headers.cookie ?? "").split(";").map((value) => value.trim()).filter(Boolean).map((value) => {
    const index = value.indexOf("=");
    if (index < 0) return [value, ""];
    try { return [value.slice(0, index), decodeURIComponent(value.slice(index + 1))]; }
    catch { return [value.slice(0, index), ""]; }
  }));
}

function asyncRoute(handler: (request: PortalRequest, response: Response) => Promise<void>) {
  return (request: PortalRequest, response: Response, next: NextFunction) => handler(request, response).catch(next);
}

export function createApp(store: Store, config: Config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    referrerPolicy: { policy: "no-referrer" },
    hsts: config.nodeEnv === "production" ? { maxAge: 31_536_000, includeSubDomains: true } : false
  }));
  app.use((_request, response, next) => {
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  app.use((request: PortalRequest, response, next) => {
    request.requestId = randomUUID();
    response.setHeader("X-Request-Id", request.requestId);
    response.on("finish", () => console.info(JSON.stringify({ requestId: request.requestId, method: request.method, route: request.route?.path ?? "unmatched", status: response.statusCode })));
    next();
  });
  app.use(["/api/v1/auth", "/api/v1/admin"], (_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get("/api/v1/health/live", (_request, response) => response.json({ status: "ok" }));
  const readiness = asyncRoute(async (_request, response) => {
    try {
      await store.readiness();
      response.json({ status: "ready", writeMode: config.writeMode });
    } catch {
      response.status(503).json({ status: "not_ready", writeMode: config.writeMode });
    }
  });
  app.get("/api/v1/health", readiness);
  app.get("/api/v1/health/ready", readiness);
  app.use((request, response, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
    const origin = request.headers.origin;
    if (origin !== config.allowedOrigin) return response.status(403).json({ error: "Origin is not allowed." });
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.use((request: PortalRequest, _response, next) => {
    const token = cookies(request)[sessionCookie];
    if (!token) return next();
    store.getSession(sha256(token))
      .then((session) => { if (session) request.portalSession = session; next(); })
      .catch(next);
  });

  const requireAdmin = (request: PortalRequest, response: Response, next: NextFunction) => {
    if (!request.portalSession) return response.status(401).json({ error: "Authentication required." });
    if (!request.portalSession.user.roles.includes("content_admin")) return response.status(403).json({ error: "Content administrator role required." });
    next();
  };
  const requireLocalMode = (_request: PortalRequest, response: Response, next: NextFunction) => {
    if (config.writeMode !== "local") return response.status(403).json({ error: "Administration is disabled in this deployment." });
    next();
  };
  const requireWritable = (request: PortalRequest, response: Response, next: NextFunction) => {
    if (config.writeMode !== "local") return response.status(403).json({ error: "This deployment is read-only." });
    if (!request.portalSession || sha256(String(request.headers["x-csrf-token"] ?? "")) !== request.portalSession.csrfHash) {
      return response.status(403).json({ error: "Valid CSRF token required." });
    }
    next();
  };
  const mutationLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });

  app.get("/api/v1/content", asyncRoute(async (_request, response) => {
    response.json(await store.publicContent(new Date().toISOString().slice(0, 10)));
  }));

  app.get("/api/v1/auth/session", (request: PortalRequest, response) => {
    const state: SessionState = {
      user: request.portalSession?.user ?? null,
      csrfToken: request.portalSession ? (cookies(request)[csrfCookie] ?? null) : null,
      writeMode: config.writeMode
    };
    response.json(state);
  });

  app.post("/api/v1/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: "draft-8", legacyHeaders: false }), asyncRoute(async (request, response) => {
    if (config.writeMode !== "local") {
      response.status(403).json({ error: "Demo login is disabled in read-only deployments." });
      return;
    }
    const input = loginInput.parse(request.body);
    const user = await store.findUserByEmail(input.email.toLowerCase());
    if (!user || !user.active || !verifyPassword(input.password, user.passwordHash)) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }
    const token = randomToken();
    const csrfToken = randomToken();
    await store.createSession({ idHash: sha256(token), userId: user.id, csrfHash: sha256(csrfToken), expiresAt: new Date(Date.now() + sessionLifetimeMs) });
    response.cookie(sessionCookie, token, { httpOnly: true, secure: config.secureCookie, sameSite: "lax", maxAge: sessionLifetimeMs, path: "/" });
    response.cookie(csrfCookie, csrfToken, { httpOnly: false, secure: config.secureCookie, sameSite: "strict", maxAge: sessionLifetimeMs, path: "/" });
    response.json({ user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles }, csrfToken, writeMode: config.writeMode } satisfies SessionState);
  }));

  app.post("/api/v1/auth/logout", requireWritable, asyncRoute(async (request, response) => {
    const token = cookies(request)[sessionCookie];
    if (token) await store.deleteSession(sha256(token));
    response.clearCookie(sessionCookie, { httpOnly: true, secure: config.secureCookie, sameSite: "lax", path: "/" });
    response.clearCookie(csrfCookie, { httpOnly: false, secure: config.secureCookie, sameSite: "strict", path: "/" });
    response.status(204).end();
  }));

  app.get("/api/v1/admin/audit-events", requireAdmin, requireLocalMode, asyncRoute(async (_request, response) => {
    response.json(await store.listAuditEvents(100));
  }));

  app.get("/api/v1/admin/:collection", requireAdmin, requireLocalMode, asyncRoute(async (request, response) => {
    const collection = collectionName.parse(request.params.collection);
    response.json(await store.list(collection));
  }));

  app.post("/api/v1/admin/:collection", mutationLimiter, requireAdmin, requireWritable, asyncRoute(async (request, response) => {
    const collection = collectionName.parse(request.params.collection);
    const input = collectionSchemas[collection].parse(request.body) as Record<string, unknown>;
    const created = await store.create(collection, input, { actorUserId: request.portalSession!.user.id, action: "create", entityType: collection, requestId: request.requestId! });
    response.status(201).json(created);
  }));

  app.put("/api/v1/admin/singletons/:name", mutationLimiter, requireAdmin, requireWritable, asyncRoute(async (request, response) => {
    const name = request.params.name;
    if (name !== "campusMap" && name !== "portalStatus") { response.status(404).json({ error: "Unknown setting." }); return; }
    const input = (name === "campusMap" ? campusMapInput : portalStatusInput).parse(request.body) as Record<string, unknown>;
    const updated = await store.updateSingleton(name, input, { actorUserId: request.portalSession!.user.id, action: "update", entityType: name, requestId: request.requestId! });
    response.json(updated);
  }));

  app.put("/api/v1/admin/:collection/:id", mutationLimiter, requireAdmin, requireWritable, asyncRoute(async (request, response) => {
    const collection = collectionName.parse(request.params.collection);
    const { id } = recordId.parse(request.params);
    const input = collectionSchemas[collection].parse(request.body) as Record<string, unknown>;
    const updated = await store.update(collection, id, input, { actorUserId: request.portalSession!.user.id, action: "update", entityType: collection, requestId: request.requestId! });
    if (!updated) { response.status(404).json({ error: "Record not found." }); return; }
    response.json(updated);
  }));

  app.delete("/api/v1/admin/:collection/:id", mutationLimiter, requireAdmin, requireWritable, asyncRoute(async (request, response) => {
    const collection = collectionName.parse(request.params.collection);
    const { id } = recordId.parse(request.params);
    if (!await store.remove(collection, id, { actorUserId: request.portalSession!.user.id, action: "delete", entityType: collection, requestId: request.requestId! })) { response.status(404).json({ error: "Record not found." }); return; }
    response.status(204).end();
  }));

  if (config.nodeEnv === "production") {
    app.use("/api", (_request, response) => response.status(404).json({ error: "Not found." }));
    const web = resolve(dirname(fileURLToPath(import.meta.url)), "../../web/dist");
    app.use(express.static(web, { index: false, maxAge: "1h" }));
    const sendWebApp = (_request: Request, response: Response) => {
      response.setHeader("Cache-Control", "no-cache");
      response.sendFile(resolve(web, "index.html"));
    };
    app.get("/", sendWebApp);
    app.get("/*path", sendWebApp);
  }

  app.use((_request, response) => response.status(404).json({ error: "Not found." }));
  app.use((error: unknown, request: PortalRequest, response: Response, next: NextFunction) => {
    void next;
    if (error instanceof ZodError) {
      response.status(400).json({ error: "Validation failed.", issues: error.issues.map(({ path, message }) => ({ path, message })) });
      return;
    }
    const parserError = error as { type?: string; status?: number };
    if (parserError.type === "entity.parse.failed") {
      response.status(400).json({ error: "Malformed JSON request body." });
      return;
    }
    if (parserError.type === "entity.too.large" || parserError.status === 413) {
      response.status(413).json({ error: "Request body is too large." });
      return;
    }
    console.error(JSON.stringify({ requestId: request.requestId, event: "request_failed", route: request.route?.path ?? "unmatched", status: 500 }));
    response.status(500).json({ error: "Unexpected server error." });
  });
  return app;
}
