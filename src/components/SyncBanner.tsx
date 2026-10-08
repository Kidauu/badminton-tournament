import { useTournament } from "../state/TournamentContext";

export function SyncBanner() {
  const { role, syncStatus } = useTournament();

  if (role === "viewer") {
    return (
      <div className="sync-banner" role="status">
        {syncStatus === "offline"
          ? "Tidak bisa terhubung ke server — menampilkan data terakhir."
          : "Mode lihat saja · data diperbarui otomatis. Menu ⋯ → Masuk admin untuk mengubah skor."}
      </div>
    );
  }
  if (role === "admin" && syncStatus === "offline") {
    return (
      <div className="sync-banner sync-banner-warn" role="status">
        Offline — perubahan tersimpan di HP dan dikirim otomatis saat tersambung.
      </div>
    );
  }
  return null;
}
