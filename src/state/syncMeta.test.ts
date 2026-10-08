import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadSyncMeta, saveSyncMeta } from "./persistence";

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("sync meta", () => {
  it("menyimpan dan membaca kembali", () => {
    saveSyncMeta({ baseVersion: "2026-10-08T10:00:00.000Z", syncedJson: '{"a":1}' });
    expect(loadSyncMeta()).toEqual({ baseVersion: "2026-10-08T10:00:00.000Z", syncedJson: '{"a":1}' });
  });

  it("menerima baseVersion null (server masih kosong saat sinkron pertama)", () => {
    saveSyncMeta({ baseVersion: null, syncedJson: "{}" });
    expect(loadSyncMeta()).toEqual({ baseVersion: null, syncedJson: "{}" });
  });

  it("null menghapus catatan", () => {
    saveSyncMeta({ baseVersion: "v1", syncedJson: "{}" });
    saveSyncMeta(null);
    expect(loadSyncMeta()).toBeNull();
  });

  it("mengabaikan isi yang rusak atau tidak lengkap", () => {
    store.set("badminton-tournament:sync-meta", "bukan json");
    expect(loadSyncMeta()).toBeNull();
    store.set("badminton-tournament:sync-meta", JSON.stringify({ baseVersion: "v1" }));
    expect(loadSyncMeta()).toBeNull();
  });
});
