import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStateHandler } from "./stateHandler.ts";

let store: string | null;

beforeEach(() => {
  store = null;
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    const [command, , value] = JSON.parse(init.body) as string[];
    if (command === "SET") store = value;
    return new Response(JSON.stringify({ result: command === "GET" ? store : "OK" }));
  });
});

afterEach(() => vi.unstubAllGlobals());

const handler = createStateHandler({ redisUrl: "http://redis", redisToken: "t", adminPin: "1234" });

function put(data: unknown, baseUpdatedAt: string | null, pin = "1234") {
  return handler(new Request("http://x/api/state", {
    method: "PUT",
    headers: { "x-admin-pin": pin },
    body: JSON.stringify({ data, baseUpdatedAt }),
  }));
}

describe("state handler", () => {
  it("GET publik mengembalikan data kosong lalu data tersimpan", async () => {
    const empty = await (await handler(new Request("http://x/api/state"))).json();
    expect(empty).toMatchObject({ data: null, isAdmin: false });

    const saved = (await (await put({ a: 1 }, null)).json()) as { updatedAt: string };
    const read = await (await handler(new Request("http://x/api/state"))).json();
    expect(read).toMatchObject({ data: { a: 1 }, updatedAt: saved.updatedAt, isAdmin: false });
  });

  it("menolak tulis tanpa PIN yang benar", async () => {
    expect((await put({ a: 1 }, null, "salah")).status).toBe(401);
    expect(store).toBeNull();
  });

  it("GET dengan PIN benar menandai isAdmin", async () => {
    const response = await handler(new Request("http://x/api/state", { headers: { "x-admin-pin": "1234" } }));
    expect(((await response.json()) as { isAdmin: boolean }).isAdmin).toBe(true);
  });

  it("409 jika baseUpdatedAt basi", async () => {
    await put({ a: 1 }, null);
    const stale = await put({ a: 2 }, "2000-01-01T00:00:00.000Z");
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { data: unknown }).data).toEqual({ a: 1 });
  });

  it("500 jika belum dikonfigurasi", async () => {
    const unconfigured = createStateHandler({ redisUrl: undefined, redisToken: undefined, adminPin: undefined });
    expect((await unconfigured(new Request("http://x/api/state"))).status).toBe(500);
  });
});
