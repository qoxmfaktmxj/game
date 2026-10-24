import { resolve } from "node:path";
import { JsonTableRepository, PostgresTableRepository } from "@moyeotable/db";
import { guestAuthenticator, localAuthenticator, supabaseAuthenticator } from "./auth.js";
import { startServer } from "./server.js";

for (const candidate of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
]) {
  try {
    process.loadEnvFile(candidate);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
const mode = process.env.AUTH_MODE ?? "supabase";
const host =
  process.env.GAME_HOST ?? (mode === "local" ? "127.0.0.1" : "0.0.0.0");
const port = Number(process.env.PORT ?? process.env.GAME_PORT ?? 2567);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT or GAME_PORT must be a valid port");
const defaultOrigins =
  mode === "local" ? "http://localhost:3000,http://127.0.0.1:3000" : "";
const origins = (process.env.WEB_ORIGIN ?? defaultOrigins)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (origins.length === 0)
  throw new Error("WEB_ORIGIN must list the permitted frontend origins");
for (const origin of origins) {
  const parsed = new URL(origin);
  if (
    parsed.origin !== origin ||
    !["http:", "https:"].includes(parsed.protocol)
  )
    throw new Error(
      "WEB_ORIGIN entries must be exact HTTP(S) origins, without paths or trailing slashes",
    );
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")
    throw new Error("Production WEB_ORIGIN must use HTTPS");
}
let auth, repository;
if (mode === "local") {
  if (
    process.env.ALLOW_LOCAL_GUEST !== "true" ||
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "::1"].includes(host)
  )
    throw new Error(
      "Local guests require ALLOW_LOCAL_GUEST=true, a loopback host, and a non-production environment",
    );
  const directory = resolve(process.env.LOCAL_DATA_DIR ?? "../../.local-data");
  auth = await localAuthenticator(directory);
  repository = new JsonTableRepository(resolve(directory, "tables"));
} else if (mode === "guest") {
  const { GUEST_SIGNING_SECRET, DATABASE_URL } = process.env;
  if (!GUEST_SIGNING_SECRET || !DATABASE_URL)
    throw new Error("Guest mode requires a persistent GUEST_SIGNING_SECRET and DATABASE_URL");
  auth = guestAuthenticator(GUEST_SIGNING_SECRET, {
    ttlSeconds: process.env.GUEST_TOKEN_TTL_SECONDS ? Number(process.env.GUEST_TOKEN_TTL_SECONDS) : undefined,
  });
  repository = new PostgresTableRepository(DATABASE_URL, {
    sslMode: (process.env.DATABASE_SSL_MODE ?? "verify-full") as "verify-full" | "disable",
    sslCa: process.env.DATABASE_SSL_CA,
    allowPrivateNetwork: process.env.DATABASE_ALLOW_PRIVATE_NETWORK === "true",
    poolSize: process.env.DATABASE_POOL_SIZE ? Number(process.env.DATABASE_POOL_SIZE) : undefined,
  });
} else if (mode === "supabase") {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !DATABASE_URL)
    throw new Error(
      "Supabase mode requires SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL. For local play run the explicit local development command.",
    );
  auth = supabaseAuthenticator(SUPABASE_URL, SUPABASE_ANON_KEY);
  repository = new PostgresTableRepository(DATABASE_URL, {
    sslMode: (process.env.DATABASE_SSL_MODE ?? "verify-full") as
      "verify-full" | "disable",
    sslCa: process.env.DATABASE_SSL_CA,
    poolSize: process.env.DATABASE_POOL_SIZE
      ? Number(process.env.DATABASE_POOL_SIZE)
      : 5,
  });
} else throw new Error("AUTH_MODE must be local, guest or supabase");
if (process.env.TRUST_PROXY !== undefined && process.env.TRUST_PROXY !== "0" && process.env.TRUST_PROXY !== "1")
  throw new Error("TRUST_PROXY must be 0 or 1");
const running = await startServer({
  host,
  port,
  webOrigins: origins,
  auth,
  repository,
  trustProxy: process.env.TRUST_PROXY === "1" ? 1 : undefined,
});
console.log(`Game server: http://${host}:${running.port} · auth=${mode}`);
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await running.close();
  process.exit(0);
};
process.once("SIGINT", () => {
  void close();
});
process.once("SIGTERM", () => {
  void close();
});
