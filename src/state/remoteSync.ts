import type { TournamentState } from "../types/tournament";

const API_URL = "/api/state";
const AUTH_KEY = "badminton-tournament:admin-auth";

export type RemoteResult =
  | { kind: "ok"; data: TournamentState | null; updatedAt: string | null; isAdmin: boolean }
  | { kind: "blocked" } // terlalu banyak percobaan login gagal
  | { kind: "unavailable" } // API tidak ada (mis. dev lokal tanpa `vercel dev`)
  | { kind: "offline" }; // jaringan/server bermasalah

export type PushResult =
  | { kind: "ok"; updatedAt: string }
  | { kind: "conflict"; data: TournamentState; updatedAt: string }
  | { kind: "unauthorized" }
  | { kind: "offline" };

/** Nilai header `Authorization: Basic …` untuk username + password. */
export function makeBasicAuth(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username.trim()}:${password}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
}

export function loadAdminAuth(): string | null {
  try {
    return localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}

export function saveAdminAuth(auth: string | null): void {
  try {
    if (auth) localStorage.setItem(AUTH_KEY, auth);
    else localStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

export async function fetchRemote(auth: string | null): Promise<RemoteResult> {
  try {
    const response = await fetch(API_URL, { headers: auth ? { authorization: auth } : {}, cache: "no-store" });
    if (response.status === 429) return { kind: "blocked" };
    if (response.status === 404) return { kind: "unavailable" };
    if (!response.ok) return { kind: "offline" };
    if (!response.headers.get("content-type")?.includes("application/json")) return { kind: "unavailable" };
    const body = (await response.json()) as { data: TournamentState | null; updatedAt: string | null; isAdmin: boolean };
    return { kind: "ok", data: body.data, updatedAt: body.updatedAt, isAdmin: body.isAdmin };
  } catch {
    return { kind: "offline" };
  }
}

export async function pushRemote(auth: string, data: TournamentState, baseUpdatedAt: string | null): Promise<PushResult> {
  try {
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: auth },
      body: JSON.stringify({ data, baseUpdatedAt }),
    });
    if (response.status === 401) return { kind: "unauthorized" };
    if (response.status === 409) {
      const body = (await response.json()) as { data: TournamentState; updatedAt: string };
      return { kind: "conflict", data: body.data, updatedAt: body.updatedAt };
    }
    if (!response.ok) return { kind: "offline" };
    return { kind: "ok", updatedAt: ((await response.json()) as { updatedAt: string }).updatedAt };
  } catch {
    return { kind: "offline" };
  }
}
