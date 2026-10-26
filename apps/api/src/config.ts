import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env"), quiet: true });

export interface Config {
  databaseUrl: string;
  host: string;
  port: number;
  writeMode: "readonly" | "local";
  secureCookie: boolean;
  allowedOrigin: string;
  nodeEnv: string;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): Config {
  const writeMode = environment.PORTAL_WRITE_MODE === "local" ? "local" : "readonly";
  const nodeEnv = (environment.NODE_ENV ?? "development").trim().toLowerCase();
  if (nodeEnv === "production" && writeMode === "local") {
    throw new Error("Production startup refused: PORTAL_WRITE_MODE must remain readonly.");
  }
  return {
    databaseUrl: environment.DATABASE_URL ?? "",
    host: environment.HOST?.trim() || "127.0.0.1",
    port: Number(environment.PORT ?? 3000),
    writeMode,
    secureCookie: environment.SESSION_COOKIE_SECURE === "true" || nodeEnv === "production",
    allowedOrigin: environment.ALLOWED_ORIGIN ?? "http://localhost:5173",
    nodeEnv
  };
}
