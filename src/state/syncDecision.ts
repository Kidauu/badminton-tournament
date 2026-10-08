// Keputusan sinkronisasi admin ↔ server, dipisah dari komponen agar bisa dites.
// Tujuan utama: perubahan yang belum terkirim (sinyal putus / halaman di-reload)
// tidak boleh ditimpa diam-diam oleh data dari server.

export type PullDecision =
  /** Pakai data server (tidak ada perubahan lokal yang belum terkirim). */
  | "adopt"
  /** Tidak ada yang perlu dilakukan. */
  | "unchanged"
  /** Server belum berubah sejak perubahan lokal dibuat: pertahankan data lokal, lalu kirim. */
  | "keep-local"
  /** Data server sudah sama persis dengan data lokal: cukup catat versinya. */
  | "mark-synced"
  /** Server dan perangkat ini sama-sama berubah: tanya admin mana yang dipakai. */
  | "ask";

export interface PullInput {
  /** Sudah pernah berhasil menarik data pada sesi ini. */
  alreadyPulled: boolean;
  localJson: string;
  /** JSON terakhir yang diketahui sama dengan server; null jika belum pernah sinkron. */
  syncedJson: string | null;
  /** Versi server (updatedAt) yang menjadi dasar data lokal. */
  baseVersion: string | null;
  serverJson: string;
  serverVersion: string | null;
}

export function decidePull(input: PullInput): PullDecision {
  const hasUnsyncedChanges = input.syncedJson !== null && input.localJson !== input.syncedJson;
  if (!hasUnsyncedChanges) {
    return !input.alreadyPulled || input.serverVersion !== input.baseVersion ? "adopt" : "unchanged";
  }
  if (input.serverJson === input.localJson) return "mark-synced";
  if (input.serverVersion === input.baseVersion) return "keep-local";
  return "ask";
}

/** Server menolak kiriman (409) karena versinya lebih baru dari dasar data lokal. */
export function decideConflict(localJson: string, serverJson: string): "mark-synced" | "ask" {
  // Kiriman sebelumnya bisa saja sudah diterima server tapi balasannya hilang di jalan.
  return localJson === serverJson ? "mark-synced" : "ask";
}

export const CONFLICT_MESSAGE =
  "Data di server sudah berubah (kemungkinan dari perangkat lain), padahal di perangkat ini ada perubahan yang belum terkirim.\n\n" +
  "OK = timpa server dengan data di perangkat ini.\n" +
  "Batal = pakai data server (perubahan di perangkat ini dibuang).";
