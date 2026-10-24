import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient, isAuthRetryableFetchError } from "@supabase/supabase-js";
import type { UserIdentity } from "@moyeotable/contracts";
import { boundedString, id, ServiceError } from "./errors.js";

export interface AuthenticatedIdentity extends UserIdentity {
  expiresAt?: number;
}
export interface Authenticator {
  mode: "local" | "guest" | "supabase";
  verify(token: unknown): Promise<AuthenticatedIdentity>;
  issueGuest?(nickname: unknown): { accessToken: string; user: UserIdentity };
}

/** Explicit self-hosted mode: the operator supplies and backs up this secret. */
export function guestAuthenticator(
  signingSecret: string,
  options: { ttlSeconds?: number; now?: () => number } = {},
): Authenticator {
  if (typeof signingSecret !== "string" || !/^(?:[a-f0-9]{2}){32,64}$/i.test(signingSecret))
    throw new Error("GUEST_SIGNING_SECRET must contain 32–64 random bytes encoded as hex");
  const ttl = options.ttlSeconds ?? 604_800;
  if (!Number.isSafeInteger(ttl) || ttl < 60 || ttl > 604_800)
    throw new Error("GUEST_TOKEN_TTL_SECONDS must be between 60 and 604800");
  const now = options.now ?? Date.now, secret = Buffer.from(signingSecret, "hex");
  const sign = (payload: string) => createHmac("sha256", secret).update(payload).digest("base64url");
  return {
    mode: "guest",
    issueGuest(nickname) {
      const user = { id: randomUUID(), nickname: boundedString(nickname, 2, 20) };
      const issued = now();
      const payload = Buffer.from(JSON.stringify({ ...user, v: 1, aud: "ringuringu", iat: issued, exp: issued + ttl * 1_000 })).toString("base64url");
      return { user, accessToken: `guest.${payload}.${sign(payload)}` };
    },
    async verify(token) {
      try {
        if (typeof token !== "string" || token.length > 2048) throw new Error();
        const segments = token.split(".");
        const [prefix, payload, signature] = segments;
        if (segments.length !== 3 || prefix !== "guest" || !payload || !signature || !/^[A-Za-z0-9_-]+$/.test(payload)) throw new Error();
        const expected = Buffer.from(sign(payload)), actual = Buffer.from(signature);
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error();
        const claims: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!claims || typeof claims !== "object" || Array.isArray(claims)) throw new Error();
        const value = claims as Record<string, unknown>, current = now();
        if (value.v !== 1 || value.aud !== "ringuringu" || !Number.isSafeInteger(value.iat) || !Number.isSafeInteger(value.exp) ||
          (value.iat as number) > current + 30_000 || (value.exp as number) <= current ||
          (value.exp as number) <= (value.iat as number) || (value.exp as number) - (value.iat as number) > 604_800_000) throw new Error();
        return { id: id(value.id), nickname: boundedString(value.nickname, 2, 20), expiresAt: value.exp as number };
      } catch { throw new ServiceError("UNAUTHENTICATED"); }
    },
  };
}
export async function localAuthenticator(
  directory: string,
): Promise<Authenticator> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const secretPath = join(directory, "guest-signing-secret");
  try {
    await writeFile(secretPath, randomBytes(48).toString("hex"), {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const secret = await readFile(secretPath, "utf8");
  if (secret.length !== 96) throw new Error("Invalid local auth secret");
  const sign = (payload: string) =>
    createHmac("sha256", secret).update(payload).digest("base64url");
  return {
    mode: "local",
    issueGuest(nickname) {
      const user = {
        id: randomUUID(),
        nickname: boundedString(nickname, 2, 20),
      };
      const payload = Buffer.from(
        JSON.stringify({ ...user, exp: Date.now() + 7 * 86_400_000 }),
      ).toString("base64url");
      return { user, accessToken: `local.${payload}.${sign(payload)}` };
    },
    async verify(token) {
      try {
        if (typeof token !== "string" || token.length > 2048) throw new Error();
        const segments = token.split(".");
        const [prefix, payload, signature] = segments;
        if (segments.length !== 3 || prefix !== "local" || !payload || !signature)
          throw new Error();
        const expected = Buffer.from(sign(payload));
        const actual = Buffer.from(signature);
        if (
          expected.length !== actual.length ||
          !timingSafeEqual(expected, actual)
        )
          throw new Error();
        const claims = JSON.parse(
          Buffer.from(payload, "base64url").toString(),
        ) as { id: string; nickname: string; exp: number };
        if (
          !Number.isFinite(claims.exp) ||
          claims.exp <= Date.now() ||
          typeof claims.id !== "string"
        )
          throw new Error();
        return {
          id: claims.id,
          nickname: boundedString(claims.nickname, 2, 20),
        };
      } catch {
        throw new ServiceError("UNAUTHENTICATED");
      }
    },
  };
}
export function supabaseAuthenticator(
  url: string,
  anonKey: string,
): Authenticator {
  const client = createClient(url, anonKey, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.any([
            AbortSignal.timeout(10_000),
            ...(init?.signal ? [init.signal] : []),
          ]),
        }),
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return {
    mode: "supabase",
    async verify(token) {
      if (typeof token !== "string" || token.length > 8192)
        throw new ServiceError("UNAUTHENTICATED");
      // getUser validates the token with the actual Auth server. A temporary
      // upstream outage must not be presented as a revoked user session.
      let response;
      try {
        response = await client.auth.getUser(token);
      } catch {
        throw new ServiceError("AUTH_UNAVAILABLE");
      }
      const { data, error } = response;
      if (error) {
        if (
          isAuthRetryableFetchError(error) ||
          (error.status ?? 0) >= 500 ||
          error.status === 429
        )
          throw new ServiceError("AUTH_UNAVAILABLE");
        throw new ServiceError("UNAUTHENTICATED");
      }
      try {
        if (!data.user) throw new Error();
        const claims = JSON.parse(
          Buffer.from(token.split(".")[1]!, "base64url").toString(),
        ) as {
          iss?: string;
          aud?: string | string[];
          exp?: number;
          sub?: string;
        };
        const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
        if (
          claims.iss !== `${url.replace(/\/$/, "")}/auth/v1` ||
          !audience.includes("authenticated") ||
          !Number.isSafeInteger(claims.exp) ||
          !claims.exp ||
          claims.exp * 1000 <= Date.now() ||
          claims.sub !== data.user.id
        )
          throw new Error();
        const displayName: unknown =
          data.user.user_metadata.nickname ??
          data.user.user_metadata.display_name;
        const nickname =
          typeof displayName === "string" && displayName.trim().length >= 2
            ? displayName.trim().slice(0, 20)
            : "링구 친구";
        return {
          id: data.user.id,
          nickname: boundedString(nickname, 2, 20),
          expiresAt: claims.exp * 1000,
        };
      } catch {
        throw new ServiceError("UNAUTHENTICATED");
      }
    },
  };
}
