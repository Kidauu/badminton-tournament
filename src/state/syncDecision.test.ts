import { describe, expect, it } from "vitest";
import { decideConflict, decidePull } from "./syncDecision";

const base = { alreadyPulled: false, localJson: "L", syncedJson: "S", baseVersion: "v1", serverJson: "X", serverVersion: "v1" };

describe("decidePull", () => {
  it("memakai data server saat tidak ada perubahan lokal (pembukaan pertama)", () => {
    expect(decidePull({ ...base, localJson: "S" })).toBe("adopt");
  });

  it("memakai data server saat belum pernah sinkron (perangkat baru)", () => {
    expect(decidePull({ ...base, syncedJson: null })).toBe("adopt");
  });

  it("tidak berbuat apa-apa jika sudah pernah menarik dan versi server sama", () => {
    expect(decidePull({ ...base, localJson: "S", alreadyPulled: true })).toBe("unchanged");
  });

  it("mengambil data server yang lebih baru saat tidak ada perubahan lokal", () => {
    expect(decidePull({ ...base, localJson: "S", alreadyPulled: true, serverVersion: "v2" })).toBe("adopt");
  });

  it("MEMPERTAHANKAN perubahan lokal yang belum terkirim jika server belum berubah (kasus reload saat offline)", () => {
    expect(decidePull(base)).toBe("keep-local");
  });

  it("mempertahankan perubahan lokal juga saat sudah pernah menarik, selama server belum berubah", () => {
    expect(decidePull({ ...base, alreadyPulled: true })).toBe("keep-local");
  });

  it("cukup mencatat versi jika server ternyata sudah sama dengan data lokal", () => {
    expect(decidePull({ ...base, serverJson: "L", serverVersion: "v2" })).toBe("mark-synced");
  });

  it("bertanya ke admin jika server dan perangkat ini sama-sama berubah", () => {
    expect(decidePull({ ...base, serverVersion: "v2" })).toBe("ask");
  });

  it("tidak pernah membuang perubahan lokal tanpa bertanya", () => {
    for (const alreadyPulled of [false, true]) {
      for (const serverVersion of ["v1", "v2", null]) {
        for (const serverJson of ["X", "L"]) {
          expect(decidePull({ ...base, alreadyPulled, serverVersion, serverJson })).not.toBe("adopt");
        }
      }
    }
  });
});

describe("decideConflict", () => {
  it("menganggap sinkron jika server sudah berisi data yang sama persis (balasan sebelumnya hilang)", () => {
    expect(decideConflict("A", "A")).toBe("mark-synced");
  });

  it("bertanya jika isinya berbeda", () => {
    expect(decideConflict("A", "B")).toBe("ask");
  });
});
