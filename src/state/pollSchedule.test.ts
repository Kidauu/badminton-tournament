import { describe, expect, it } from "vitest";
import { nextPollDelay } from "./pollSchedule";

describe("nextPollDelay", () => {
  it("mencoba lagi tiap 5 detik sebelum data pertama berhasil ditarik", () => {
    expect(nextPollDelay({ ready: false, failures: 0, unchanged: 0 })).toBe(5_000);
  });

  it("melipatgandakan jeda saat gagal berturut-turut, maksimum 60 detik", () => {
    const delays = [1, 2, 3, 4, 5, 6, 10].map((failures) => nextPollDelay({ ready: true, failures, unchanged: 0 }));
    expect(delays).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000]);
  });

  it("kegagalan lebih diutamakan daripada mode hemat", () => {
    expect(nextPollDelay({ ready: true, failures: 2, unchanged: 50 })).toBe(10_000);
  });

  it("polling 10 detik selama data masih berubah", () => {
    expect(nextPollDelay({ ready: true, failures: 0, unchanged: 0 })).toBe(10_000);
    expect(nextPollDelay({ ready: true, failures: 0, unchanged: 5 })).toBe(10_000);
  });

  it("melambat jadi 30 detik setelah 6 penarikan tanpa perubahan", () => {
    expect(nextPollDelay({ ready: true, failures: 0, unchanged: 6 })).toBe(30_000);
    expect(nextPollDelay({ ready: true, failures: 0, unchanged: 100 })).toBe(30_000);
  });
});
