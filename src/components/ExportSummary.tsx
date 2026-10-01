import { Download, Printer } from "lucide-react";
import { computeStandings, teamsInGroup } from "../logic/standings";
import { scoreLabel } from "../logic/scoring";
import { Button } from "./Button";
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

/** CSV + print export. Backup/restore now live in the header's overflow menu. */
export function ExportSummary() {
  const { state } = useTournament();
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
    download("rekap-turnamen-badminton.csv", `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
  }

  return (
    <>
      <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>
        Cetak PDF
      </Button>
      <Button variant="primary" icon={<Download size={16} />} onClick={exportCsv}>
        Unduh rekap CSV
      </Button>
    </>
  );
}
