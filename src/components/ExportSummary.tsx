import { computeStandings, teamsInGroup } from "../logic/standings";
import { scoreLabel } from "../logic/scoring";
import { useTournament } from "../state/TournamentContext";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ExportSummary() {
  const { state, dispatch } = useTournament();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const groupMatches = state.matches.filter((match) => match.stage === "group");

  function exportCsv() {
    const rows: (string | number)[][] = [["REKAP TURNAMEN BADMINTON"], []];
    for (const groupId of ["A", "B"] as const) {
      rows.push([`KLASEMEN GRUP ${groupId}`], ["Rank", "Tim", "Main", "Menang", "Seri", "Kalah", "Poin", "Selisih Poin", "Poin Dicetak", "Poin Diterima"]);
      for (const row of computeStandings(teamsInGroup(state.teams, state.groupAssignments, groupId), groupMatches, groupId)) {
        rows.push([row.rank, `Tim ${teamsById.get(row.teamId)?.seq ?? "?"}`, row.played, row.won, row.drawn, row.lost, row.points, row.pointDiff, row.matchPoints, row.matchPointsConceded]);
      }
      rows.push([]);
    }
    rows.push(["HASIL PERTANDINGAN"], ["Fase", "Grup", "Tim A", "Tim B", "Set 1", "Set 2", "Golden set", "Hasil", "Pemenang"]);
    for (const match of state.matches) {
      const scores = match.setScores ?? [];
      rows.push([
        match.stage === "group" ? "Fase grup" : match.stage === "semifinal" ? "Semifinal" : match.stage === "third_place" ? "Perebutan Juara 3" : "Final",
        match.groupId ?? "-",
        match.teamAId ? `Tim ${teamsById.get(match.teamAId)?.seq ?? "?"}` : "-",
        match.teamBId ? `Tim ${teamsById.get(match.teamBId)?.seq ?? "?"}` : "-",
        scores[0] ? scoreLabel(scores[0]) : "-",
        scores[1] ? scoreLabel(scores[1]) : "-",
        scores[2] ? scoreLabel(scores[2]) : "-",
        match.result ?? "Belum main",
        match.winnerTeamId ? `Tim ${teamsById.get(match.winnerTeamId)?.seq ?? "?"}` : "-",
      ]);
    }
    download("rekap-turnamen-badminton.csv", `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
  }

  function exportBackup() {
    const date = new Date().toISOString().slice(0, 10);
    download(`backup-turnamen-badminton-${date}.json`, createBackup(state), "application/json;charset=utf-8");
    setBackupMessage("Backup berhasil diunduh.");
  }

  function importBackup(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const importedState = typeof reader.result === "string" ? parseBackup(reader.result) : null;
      if (!importedState) {
        setBackupMessage("File tidak valid. Pilih file backup JSON dari aplikasi ini.");
        return;
      }
      if (!window.confirm("Restore akan menggantikan seluruh data turnamen yang sedang terbuka. Lanjutkan?")) return;
      dispatch({ type: "IMPORT_TOURNAMENT", state: importedState });
      setBackupMessage("Backup berhasil dipulihkan.");
    };
    reader.onerror = () => setBackupMessage("File backup tidak dapat dibaca.");
    reader.readAsText(file);
  }

  return (
    <div className="export-actions">
      <button className="btn btn-primary" onClick={exportCsv}>Unduh rekap CSV</button>
      <button className="btn btn-ghost" onClick={() => window.print()}>Cetak / simpan PDF</button>
      <button className="btn btn-ghost" onClick={exportBackup}>Backup data JSON</button>
      <button className="btn btn-ghost" onClick={() => importInputRef.current?.click()}>Restore backup</button>
      <input
        ref={importInputRef}
        className="backup-file-input"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          importBackup(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {backupMessage && <p className="backup-message" role="status">{backupMessage}</p>}
    </div>
  );
}
import { useRef, useState } from "react";
import { createBackup, parseBackup } from "../logic/backup";
