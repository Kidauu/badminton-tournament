import type { TournamentState } from "../types/tournament";

const API_URL = "/api/state";
const PIN_KEY = "badminton-tournament:admin-pin";

export type RemoteResult =
  | { kind: "ok"; data: TournamentState | null; updatedAt: string | null; isAdmin: boolean }
  | { kind: "unavailable" } // API tidak ada (mis. dev lokal tanpa `vercel dev`)
  | { kind: "offline" }; // jaringan/server bermasalah

export type PushResult =
  | { kind: "ok"; updatedAt: string }
  | { kind: "conflict"; data: TournamentState; updatedAt: string }
  | { kind: "unauthorized" }
  | { kind: "offline" };

export function loadAdminPin(): string | null {
  try {
    return localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

export function saveAdminPin(pin: string | null): void {
  try {
    if (pin) localStorage.setItem(PIN_KEY, pin);
    else localStorage.removeItem(PIN_KEY);
  } catch {
    // ignore
  }
}

export async function fetchRemote(pin: string | null): Promise<RemoteResult> {
  try {
    const response = await fetch(API_URL, { headers: pin ? { "x-admin-pin": pin } : {}, cache: "no-store" });
    if (response.status === 404) return { kind: "unavailable" };
    if (!response.ok) return { kind: "offline" };
    if (!response.headers.get("content-type")?.includes("application/json")) return { kind: "unavailable" };
    const body = (await response.json()) as { data: TournamentState | null; updatedAt: string | null; isAdmin: boolean };
    return { kind: "ok", data: body.data, updatedAt: body.updatedAt, isAdmin: body.isAdmin };
  } catch {
    return { kind: "offline" };
  }
}

export async function pushRemote(pin: string, data: TournamentState, baseUpdatedAt: string | null): Promise<PushResult> {
  try {
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-pin": pin },
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
