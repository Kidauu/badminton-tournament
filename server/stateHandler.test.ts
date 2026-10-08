import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStateHandler } from "./stateHandler.ts";

// Kredensial uji (bukan kredensial asli).
const USERNAME = "Admin";
const PASSWORD = "sandi-uji-123";

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    const [command, key, value] = JSON.parse(init.body) as (string | number)[];
    const k = String(key);
    let result: unknown = "OK";
    if (command === "GET") result = store.get(k) ?? null;
    else if (command === "SET") store.set(k, String(value));
    else if (command === "INCR") {
      const next = (Number(store.get(k)) || 0) + 1;
      store.set(k, String(next));
      result = next;
    }
    return new Response(JSON.stringify({ result }));
  });
});

afterEach(() => vi.unstubAllGlobals());

const handler = createStateHandler({ redisUrl: "http://redis", redisToken: "t", adminUsername: USERNAME, adminPassword: PASSWORD });

function basic(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

function get(authorization?: string) {
  return handler(new Request("http://x/api/state", { headers: authorization ? { authorization } : {} }));
}

function put(data: unknown, baseUpdatedAt: string | null, authorization = basic(USERNAME, PASSWORD)) {
  return handler(new Request("http://x/api/state", {
    method: "PUT",
    headers: { authorization },
    body: JSON.stringify({ data, baseUpdatedAt }),
  }));
}

describe("state handler", () => {
  it("GET publik mengembalikan data kosong lalu data tersimpan", async () => {
    expect(await (await get()).json()).toMatchObject({ data: null, isAdmin: false });

    const saved = (await (await put({ a: 1 }, null)).json()) as { updatedAt: string };
    expect(await (await get()).json()).toMatchObject({ data: { a: 1 }, updatedAt: saved.updatedAt, isAdmin: false });
  });

  it("menolak tulis tanpa kredensial atau dengan password salah", async () => {
    expect((await put({ a: 1 }, null, basic(USERNAME, "salah"))).status).toBe(401);
    expect((await put({ a: 1 }, null, basic("orang", PASSWORD))).status).toBe(401);
    expect(store.has("badminton-tournament:shared")).toBe(false);

    const noAuth = await handler(new Request("http://x/api/state", { method: "PUT", body: JSON.stringify({ data: { a: 1 } }) }));
    expect(noAuth.status).toBe(401);
  });

  it("GET dengan kredensial benar menandai isAdmin (username tidak peka huruf besar)", async () => {
    expect(((await (await get(basic("admin", PASSWORD))).json()) as { isAdmin: boolean }).isAdmin).toBe(true);
    expect(((await (await get(basic(USERNAME, "salah"))).json()) as { isAdmin: boolean }).isAdmin).toBe(false);
  });

  it("memblokir setelah terlalu banyak percobaan gagal", async () => {
    for (let i = 0; i < 10; i += 1) await get(basic(USERNAME, "salah"));
    expect((await get(basic(USERNAME, "salah"))).status).toBe(429);
    expect((await get(basic(USERNAME, PASSWORD))).status).toBe(429);
    expect((await get()).status).toBe(200); // penonton tanpa kredensial tetap bisa melihat
  });

  it("409 jika baseUpdatedAt basi", async () => {
    await put({ a: 1 }, null);
    const stale = await put({ a: 2 }, "2000-01-01T00:00:00.000Z");
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { data: unknown }).data).toEqual({ a: 1 });
  });

  it("500 jika belum dikonfigurasi", async () => {
    const unconfigured = createStateHandler({ redisUrl: undefined, redisToken: undefined, adminUsername: undefined, adminPassword: undefined });
    expect((await unconfigured(new Request("http://x/api/state"))).status).toBe(500);
  });
});
