// Aturan jeda penarikan data dari server. Dipisah dari komponen agar mudah dites.
// Tujuannya menjaga pemakaian kuota gratis (Vercel + Upstash) tetap kecil.

export const VIEWER_POLL_MS = 10_000;
/** Jeda lebih panjang setelah data tidak berubah beberapa kali berturut-turut. */
export const VIEWER_IDLE_POLL_MS = 30_000;
export const IDLE_AFTER_UNCHANGED_POLLS = 6;
export const RETRY_MS = 5_000;
export const MAX_RETRY_MS = 60_000;

export interface PollState {
  /** Sudah pernah berhasil menarik data dari server. */
  ready: boolean;
  /** Jumlah kegagalan berturut-turut. */
  failures: number;
  /** Jumlah penarikan berturut-turut tanpa perubahan data. */
  unchanged: number;
}

export function nextPollDelay({ ready, failures, unchanged }: PollState): number {
  // Saat server bermasalah, jeda dilipatgandakan agar tidak membanjiri server dan kuota.
  if (failures > 0) return Math.min(RETRY_MS * 2 ** (failures - 1), MAX_RETRY_MS);
  if (!ready) return RETRY_MS;
  return unchanged >= IDLE_AFTER_UNCHANGED_POLLS ? VIEWER_IDLE_POLL_MS : VIEWER_POLL_MS;
}
