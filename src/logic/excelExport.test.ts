import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx-js-style";
import { generateGroupTournament } from "./schedule";
import { createTournamentWorkbook } from "./excelExport";
import type { Participant, Team, TournamentState } from "../types/tournament";

function makeState(): TournamentState {
  const participants: Participant[] = [
    { id: "p1", name: "Ari" }, { id: "p2", name: "Bima" },
    { id: "p3", name: "Citra" }, { id: "p4", name: "Dina" },
    { id: "p5", name: "Eko" }, { id: "p6", name: "Fani" },
    { id: "p7", name: "Gilang" }, { id: "p8", name: "Hana" },
  ];
  const teams: Team[] = [
    { id: "t1", seq: 1, playerAId: "p1", playerBId: "p2" },
    { id: "t2", seq: 2, playerAId: "p3", playerBId: "p4" },
    { id: "t3", seq: 3, playerAId: "p5", playerBId: "p6" },
    { id: "t4", seq: 4, playerAId: "p7", playerBId: "p8" },
  ];
  const groupAssignments = [
    { teamId: "t1", groupId: "A" as const }, { teamId: "t2", groupId: "A" as const },
    { teamId: "t3", groupId: "B" as const }, { teamId: "t4", groupId: "B" as const },
  ];
  const { matches, byes } = generateGroupTournament(teams, groupAssignments);
  matches[0] = {
    ...matches[0],
    result: "2-0",
    winnerTeamId: "t1",
    setScores: [{ teamAScore: 21, teamBScore: 16 }, { teamAScore: 21, teamBScore: 19 }, null],
  };
  return { participants, pendingPairs: [], teams, pendingGroupSlots: [], groupAssignments, manualGroupRankings: [], matches, byes };
}

describe("createTournamentWorkbook", () => {
  it("creates a detailed workbook with all tournament export tabs", () => {
    const workbook = createTournamentWorkbook(makeState());

    expect(workbook.SheetNames).toEqual(["Ringkasan", "Peserta", "Tim", "Klasemen", "Jadwal & Skor", "Bagan Gugur"]);
    expect(workbook.Sheets["Ringkasan"].A1.v).toBe("Rekap Turnamen Badminton");
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Peserta"], { header: 1 })).toContainEqual([1, "Ari", "Tim 1", "A"]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Jadwal & Skor"], { header: 1 })).toContainEqual([
      "A1", "Fase Grup A", "A", "Tim 1", "Ari", "Bima", "Tim 2", "Citra", "Dina", "21-16", "21-19", "-", "Tim 1 menang 2-0", "Tim 1", "Belum diatur", "Belum diatur", "Selesai",
    ]);
  });
});
