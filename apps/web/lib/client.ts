import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UserIdentity } from "@moyeotable/contracts";

export const SERVER_URL =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:2567" : "");
export interface IdentitySession {
  accessToken: string;
  user: UserIdentity;
}
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}
let supabase: SupabaseClient | null = null;
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabase ??= createClient(url, key);
  return supabase;
}

export async function api<T>(
  path: string,
  token?: string,
  body?: unknown,
): Promise<T> {
  if (!SERVER_URL)
    throw new Error(
      "플레이 서버를 준비하고 있어요. 연결이 열리면 친구를 초대할 수 있어요.",
    );
  let response: Response;
  try {
    response = await fetch(`${SERVER_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new Error(
      "테이블 서버에 연결하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("서버가 잠시 쉬고 있어요. 조금 뒤 다시 시도해 주세요.");
  }
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("moyeotable:session-expired"));
    throw new ApiError(
      data.message ||
        data.error?.message ||
        "요청을 처리하지 못했어요. 다시 시도해 주세요.",
      response.status,
      data.error?.code || "REQUEST_FAILED",
    );
  }
  return data as T;
}

export function readLocalSession(): IdentitySession | null {
  try {
    const raw = sessionStorage.getItem("moyeotable.session");
    if (!raw) return null;
    const value = JSON.parse(raw) as IdentitySession;
    return value.accessToken && value.user?.id ? value : null;
  } catch {
    return null;
  }
}

export const suits = ["aurora", "ember", "tide", "moss", "dusk"] as const;
export const suitNames = {
  aurora: "멍이",
  ember: "냥이",
  tide: "물개",
  moss: "수달",
  dusk: "랑이",
};
