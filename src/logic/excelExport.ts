import * as XLSX from "xlsx-js-style";
import { scoreLabel } from "./scoring";
import { computeStandings, teamsInGroup } from "./standings";
import { teamPlayerNames } from "./format";
import type { Match, Participant, Team, TournamentState } from "../types/tournament";

const BRAND = "0E6B47";
const INK = "111813";
const MUTED = "69726C";
const LINE = "E4E7E2";

const titleStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
  fill: { patternType: "solid", fgColor: { rgb: BRAND } },
  alignment: { horizontal: "left", vertical: "center" },
};

const subtitleStyle = {
  font: { italic: true, color: { rgb: MUTED }, sz: 10 },
  alignment: { horizontal: "left", vertical: "center" },
};

const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
  fill: { patternType: "solid", fgColor: { rgb: INK } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: { bottom: { style: "thin", color: { rgb: "FFFFFF" } } },
};

const bodyBorder = {
  bottom: { style: "thin", color: { rgb: LINE } },
};

type SheetValue = string | number | boolean | Date | null;

function safeDate(value?: string): Date | string {
  if (!value) return "Belum diatur";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date;
}

function teamLabel(teamId: string | null, teamsById: Map<string, Team>): string {
  return teamId ? `Tim ${teamsById.get(teamId)?.seq ?? "?"}` : "Menunggu";
}

function teamNames(teamId: string | null, teamsById: Map<string, Team>, participants: Participant[]): [string, string] {
  const team = teamId ? teamsById.get(teamId) : undefined;
  return team ? teamPlayerNames(team, participants) : ["-", "-"];
}

function stageLabel(match: Match): string {
  if (match.stage === "group") return `Fase Grup ${match.groupId}`;
  if (match.stage === "semifinal") return "Semifinal";
  if (match.stage === "third_place") return "Perebutan Juara 3";
  return "Final";
}

function matchCode(match: Match, groupIndexes: Map<string, number>): string {
  if (match.stage === "group") return `${match.groupId}${groupIndexes.get(match.id) ?? ""}`;
  if (match.id === "semifinal-1") return "SF1";
  if (match.id === "semifinal-2") return "SF2";
  if (match.id === "third-place") return "J3";
  return "F";
}

function matchResult(match: Match, teamsById: Map<string, Team>): string {
  if (match.isBye && match.winnerTeamId) return `Menang WO · ${teamLabel(match.winnerTeamId, teamsById)}`;
  if (!match.result) return "Belum dimainkan";
  if (match.result === "1-1") return "Imbang 1–1";
  return `${teamLabel(match.winnerTeamId, teamsById)} menang ${match.result}`;
}

function operationalStatus(match: Match): string {
  if (match.isBye) return "Walkover";
  if (match.result) return "Selesai";
  if (match.operationalStatus === "in_progress") return "Sedang berlangsung";
  return "Terjadwal";
}

function ensureCell(sheet: XLSX.WorkSheet, address: string): XLSX.CellObject {
  const cell = sheet[address];
  if (cell) return cell;
  const created: XLSX.CellObject = { t: "s", v: "" };
  sheet[address] = created;
  return created;
}

function styleTable(
  sheet: XLSX.WorkSheet,
  headers: string[],
  rows: SheetValue[][],
  widths: number[],
  dateColumns: number[] = [],
) {
  const headerRow = 4;
  const dataStart = headerRow + 1;
  const lastColumn = XLSX.utils.encode_col(headers.length - 1);
  const dataEnd = Math.max(dataStart, dataStart + rows.length - 1);

  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ];
  sheet["!cols"] = widths.map((width) => ({ wch: width }));
  sheet["!rows"] = [{ hpt: 27 }, { hpt: 19 }, { hpt: 8 }, { hpt: 30 }];
  sheet["!autofilter"] = { ref: `A${headerRow}:${lastColumn}${dataEnd}` };

  ensureCell(sheet, "A1").s = titleStyle;
  ensureCell(sheet, "A2").s = subtitleStyle;
  for (let col = 0; col < headers.length; col += 1) {
    const cell = ensureCell(sheet, XLSX.utils.encode_cell({ r: headerRow - 1, c: col }));
    cell.s = headerStyle;
  }
  for (let row = dataStart; row <= dataEnd; row += 1) {
    for (let col = 0; col < headers.length; col += 1) {
      const cell = ensureCell(sheet, XLSX.utils.encode_cell({ r: row - 1, c: col }));
      cell.s = {
        border: bodyBorder,
        fill: { patternType: "solid", fgColor: { rgb: row % 2 === 0 ? "F7F8F6" : "FFFFFF" } },
        font: { color: { rgb: INK }, sz: 10 },
        alignment: { vertical: "center", wrapText: col === 3 || col === 6 },
      };
    }
    for (const col of dateColumns) {
      const cell = ensureCell(sheet, XLSX.utils.encode_cell({ r: row - 1, c: col }));
      if (cell.t === "d" || cell.v instanceof Date) cell.z = "yyyy-mm-dd hh:mm";
    }
  }
  sheet["!freeze"] = { xSplit: 0, ySplit: headerRow };
}

function createTableSheet(
  title: string,
  subtitle: string,
  headers: string[],
  rows: SheetValue[][],
  widths: number[],
  dateColumns?: number[],
): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet([[title], [subtitle], [], headers, ...rows], { cellDates: true });
  styleTable(sheet, headers, rows, widths, dateColumns);
  return sheet;
}

function tournamentDate(): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(new Date());
}

/** Creates a detailed multi-sheet Excel recap from the tournament state currently visible in the app. */
export function createTournamentWorkbook(state: TournamentState): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const groupsByTeamId = new Map(state.groupAssignments.map((assignment) => [assignment.teamId, assignment.groupId]));
  const groupMatches = state.matches.filter((match) => match.stage === "group");
  const groupIndexes = new Map(
    groupMatches.map((match) => [match.id, groupMatches.filter((item) => item.groupId === match.groupId).indexOf(match) + 1]),
  );
  const completed = state.matches.filter((match) => match.result !== null).length;

  const summaryRows: SheetValue[][] = [
    ["Dibuat pada", tournamentDate()],
    ["Jumlah peserta", state.participants.length],
    ["Jumlah tim", state.teams.length],
    ["Pertandingan selesai", completed],
    ["Total pertandingan", state.matches.length],
    ["Status fase grup", `${groupMatches.filter((match) => match.result !== null).length} dari ${groupMatches.length} selesai`],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Rekap Turnamen Badminton"],
    ["Ringkasan data ekspor"],
    [],
    ["Informasi", "Nilai"],
    ...summaryRows,
  ]);
  styleTable(summarySheet, ["Informasi", "Nilai"], summaryRows, [28, 46]);
  const summaryStart = 12;
  const standingHeaders = ["Grup", "Peringkat", "Tim", "Pemain 1", "Pemain 2", "Poin"];
  const standingsPreview = (["A", "B"] as const).flatMap((groupId) => computeStandings(
    teamsInGroup(state.teams, state.groupAssignments, groupId),
    groupMatches,
    groupId,
  ).slice(0, 2).map((row) => {
    const team = teamsById.get(row.teamId)!;
    const [playerA, playerB] = teamPlayerNames(team, state.participants);
    return [groupId, row.rank, `Tim ${team.seq}`, playerA, playerB, row.points];
  }));
  XLSX.utils.sheet_add_aoa(summarySheet, [["Kualifikasi Grup"], [], standingHeaders, ...standingsPreview], { origin: `A${summaryStart}` });
  summarySheet["!merges"]?.push({ s: { r: summaryStart - 1, c: 0 }, e: { r: summaryStart - 1, c: standingHeaders.length - 1 } });
  ensureCell(summarySheet, `A${summaryStart}`).s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: BRAND } } };
  for (let col = 0; col < standingHeaders.length; col += 1) ensureCell(summarySheet, XLSX.utils.encode_cell({ r: summaryStart + 1, c: col })).s = headerStyle;
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");

  const participantRows = state.participants.map((participant, index) => {
    const team = state.teams.find((item) => item.playerAId === participant.id || item.playerBId === participant.id);
    return [index + 1, participant.name, team ? `Tim ${team.seq}` : "Belum masuk tim", team ? groupsByTeamId.get(team.id) ?? "-" : "-"];
  });
  XLSX.utils.book_append_sheet(workbook, createTableSheet(
    "Daftar Peserta",
    "Peserta dan penempatan tim saat ekspor dibuat",
    ["No.", "Nama Peserta", "Tim", "Grup"],
    participantRows,
    [8, 28, 18, 12],
  ), "Peserta");

  const teamRows = state.teams.map((team) => {
    const [playerA, playerB] = teamPlayerNames(team, state.participants);
    return [team.seq, playerA, playerB, groupsByTeamId.get(team.id) ?? "Belum diundi"];
  });
  XLSX.utils.book_append_sheet(workbook, createTableSheet(
    "Daftar Tim",
    "Pasangan pemain dan pembagian grup",
    ["No. Tim", "Pemain 1", "Pemain 2", "Grup"],
    teamRows,
    [12, 28, 28, 18],
  ), "Tim");

  const standingsRows = (["A", "B"] as const).flatMap((groupId) => computeStandings(
    teamsInGroup(state.teams, state.groupAssignments, groupId),
    groupMatches,
    groupId,
  ).map((row) => {
    const team = teamsById.get(row.teamId)!;
    const [playerA, playerB] = teamPlayerNames(team, state.participants);
    return [groupId, row.rank, `Tim ${team.seq}`, playerA, playerB, row.played, row.won, row.drawn, row.lost, row.points, row.setsWon, row.setsLost, row.matchPoints, row.matchPointsConceded, row.pointDiff, row.needsManualDraw ? "Perlu undian admin" : "-"];
  }));
  XLSX.utils.book_append_sheet(workbook, createTableSheet(
    "Klasemen Grup",
    "Peringkat dihitung dari hasil yang tersimpan saat ekspor dibuat",
    ["Grup", "Peringkat", "Tim", "Pemain 1", "Pemain 2", "Main", "Menang", "Imbang", "Kalah", "Poin", "Set Menang", "Set Kalah", "Poin Dicetak", "Poin Diterima", "Selisih Poin", "Catatan"],
    standingsRows,
    [9, 11, 12, 25, 25, 9, 10, 10, 9, 9, 13, 12, 14, 15, 14, 22],
  ), "Klasemen");

  const matchRows = state.matches.map((match) => {
    const scores = match.setScores ?? [];
    const [a1, a2] = teamNames(match.teamAId, teamsById, state.participants);
    const [b1, b2] = teamNames(match.teamBId, teamsById, state.participants);
    return [
      matchCode(match, groupIndexes),
      stageLabel(match),
      match.groupId ?? "-",
      teamLabel(match.teamAId, teamsById),
      a1,
      a2,
      teamLabel(match.teamBId, teamsById),
      b1,
      b2,
      scores[0] ? scoreLabel(scores[0]) : "-",
      scores[1] ? scoreLabel(scores[1]) : "-",
      scores[2] ? scoreLabel(scores[2]) : "-",
      matchResult(match, teamsById),
      match.winnerTeamId ? teamLabel(match.winnerTeamId, teamsById) : "-",
      safeDate(match.scheduledAt),
      match.court || "Belum diatur",
      operationalStatus(match),
    ];
  });
  XLSX.utils.book_append_sheet(workbook, createTableSheet(
    "Jadwal dan Skor",
    "Jadwal, skor per set, dan hasil seluruh pertandingan",
    ["Kode", "Fase", "Grup", "Tim A", "Pemain A1", "Pemain A2", "Tim B", "Pemain B1", "Pemain B2", "Set 1", "Set 2", "Set 3", "Hasil", "Pemenang", "Waktu", "Lapangan", "Status"],
    matchRows,
    [10, 22, 9, 12, 24, 24, 12, 24, 24, 10, 10, 10, 25, 14, 21, 20, 20],
    [14],
  ), "Jadwal & Skor");

  const knockoutRows = state.matches.filter((match) => match.stage !== "group").map((match) => {
    const [a1, a2] = teamNames(match.teamAId, teamsById, state.participants);
    const [b1, b2] = teamNames(match.teamBId, teamsById, state.participants);
    return [
      matchCode(match, groupIndexes),
      stageLabel(match),
      teamLabel(match.teamAId, teamsById),
      `${a1} & ${a2}`,
      teamLabel(match.teamBId, teamsById),
      `${b1} & ${b2}`,
      matchResult(match, teamsById),
      match.winnerTeamId ? teamLabel(match.winnerTeamId, teamsById) : "-",
      operationalStatus(match),
    ];
  });
  XLSX.utils.book_append_sheet(workbook, createTableSheet(
    "Bagan Gugur",
    "Semifinal, perebutan juara 3, dan final",
    ["Kode", "Pertandingan", "Tim A", "Pemain Tim A", "Tim B", "Pemain Tim B", "Hasil", "Pemenang", "Status"],
    knockoutRows,
    [10, 24, 12, 34, 12, 34, 26, 16, 20],
  ), "Bagan Gugur");

  return workbook;
}

export function downloadTournamentExcel(state: TournamentState): void {
  const workbook = createTournamentWorkbook(state);
  XLSX.writeFile(workbook, `rekap-turnamen-badminton-${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true });
}
