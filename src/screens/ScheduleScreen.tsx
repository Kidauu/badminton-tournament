import { Fragment, useState } from "react";
import { Printer, ArrowRight } from "lucide-react";
import { scoreLabel } from "../logic/scoring";
import { teamPlayerNames } from "../logic/format";
import { MatchOperations, MatchStatusCell } from "../components/MatchOperations";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { KnockoutBracket } from "../components/KnockoutBracket";
import { SegmentedControl } from "../components/SegmentedControl";
import { useTournament } from "../state/TournamentContext";
import type { TabId } from "../types/nav";
import type { Match, Participant, Team } from "../types/tournament";

type ScheduleFilter = "all" | "unscheduled" | `week-${string}`;

interface ScheduleWeek {
  value: ScheduleFilter;
  label: string;
  count: number;
}

function teamLabel(teamId: string | null, teamsById: Map<string, Team>, fallback: string): string {
  return teamId ? `Tim ${teamsById.get(teamId)?.seq ?? "?"}` : fallback;
}

function formatScheduleTime(value?: string): string {
  if (!value) return "Waktu belum diatur";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Waktu belum diatur" : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function scheduledDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function weekStart(date: Date): Date {
  const start = new Date(date);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function scheduleWeekKey(match: Match): ScheduleFilter | null {
  const date = scheduledDate(match.scheduledAt);
  return date ? `week-${dateKey(weekStart(date))}` : null;
}

function weekLabel(key: ScheduleFilter): string {
  const start = new Date(`${key.replace("week-", "")}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function scheduleWeeks(matches: Match[]): ScheduleWeek[] {
  const counts = new Map<ScheduleFilter, number>();
  for (const match of matches) {
    const key = scheduleWeekKey(match);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count], index) => ({ value: key, label: `Minggu ${index + 1} · ${weekLabel(key)}`, count }));
}

function nextMatch(matches: Match[]): Match | undefined {
  const playable = matches.filter((match) => !match.result && !match.isBye && match.teamAId && match.teamBId);
  return [...playable].sort((a, b) => {
    const statusOrder = (match: Match) => (match.operationalStatus === "in_progress" ? 0 : 1);
    return statusOrder(a) - statusOrder(b) || (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999") || a.id.localeCompare(b.id);
  })[0];
}

function MatchResultCell({ match, teamsById }: { match: Match; teamsById: Map<string, Team> }) {
  if (!match.result) return <span className="match-table-status-pending">Belum main</span>;
  const scores = (match.setScores ?? []).map((score) => (score ? scoreLabel(score) : null)).filter(Boolean).join(" · ");
  if (match.result === "1-1") {
    return (
      <div>
        <span className="match-table-result-main">1–1</span>
        <p className="match-table-result-draw">Imbang{scores ? ` · ${scores}` : ""}</p>
      </div>
    );
  }
  const winnerLabel = teamLabel(match.winnerTeamId, teamsById, "-");
  return (
    <div>
      <span className="match-table-result-main">
        {match.isBye ? `Menang WO · ${winnerLabel}` : `${match.result} · ${winnerLabel}`}
      </span>
      {scores && !match.isBye && <p className="match-table-result-sets">{scores}</p>}
    </div>
  );
}

function teamMembers(teamId: string | null, teamsById: Map<string, Team>, participants: Participant[]): string | null {
  if (!teamId) return null;
  const team = teamsById.get(teamId);
  return team ? teamPlayerNames(team, participants).join(" & ") : null;
}

function GroupMatchRow({ match, teamsById, participants, code }: { match: Match; teamsById: Map<string, Team>; participants: Participant[]; code: string }) {
  const isDraw = match.result === "1-1";
  const nameClass = (side: "A" | "B") => {
    if (!match.result) return "";
    if (isDraw) return "score-line-name-draw";
    const teamId = side === "A" ? match.teamAId : match.teamBId;
    return match.winnerTeamId === teamId ? "score-line-name-winner" : "score-line-name-loser";
  };

  return (
    <tr>
      <td className="match-table-no">{code}</td>
      <td>
        <div className="match-table-teams">
          {(["A", "B"] as const).map((side) => {
            const teamId = side === "A" ? match.teamAId : match.teamBId;
            return (
              <div key={side} className="match-table-team-info">
                <span className={`match-table-team ${nameClass(side)}`}>{teamLabel(teamId, teamsById, "-")}</span>
                {teamMembers(teamId, teamsById, participants) && <span className="match-table-team-members">{teamMembers(teamId, teamsById, participants)}</span>}
              </div>
            );
          })}
        </div>
      </td>
      <td>
        <MatchResultCell match={match} teamsById={teamsById} />
      </td>
      <td colSpan={2}>
        <MatchOperations match={match} />
      </td>
      <td>
        <MatchStatusCell match={match} />
      </td>
    </tr>
  );
}

export function ScheduleScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state } = useTournament();
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const allGroupMatches = state.matches.filter((match) => match.stage === "group");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const weeks = scheduleWeeks(allGroupMatches);
  const unscheduledCount = allGroupMatches.filter((match) => !scheduleWeekKey(match)).length;
  const scheduleOptions = [
    { value: "all" as const, label: "Semua", count: allGroupMatches.length },
    ...weeks,
    ...(unscheduledCount > 0 ? [{ value: "unscheduled" as const, label: "Belum dijadwalkan", count: unscheduledCount }] : []),
  ];
  const activeScheduleFilter = scheduleOptions.some((option) => option.value === scheduleFilter) ? scheduleFilter : "all";
  const groupMatches = (groupId: "A" | "B") => allGroupMatches.filter((match) => (
    match.groupId === groupId && (activeScheduleFilter === "all" || (activeScheduleFilter === "unscheduled" ? !scheduleWeekKey(match) : scheduleWeekKey(match) === activeScheduleFilter))
  ));
  const visibleGroupCount = groupMatches("A").length + groupMatches("B").length;
  const semifinal1 = state.matches.find((match) => match.id === "semifinal-1");
  const semifinal2 = state.matches.find((match) => match.id === "semifinal-2");
  const final = state.matches.find((match) => match.id === "final");
  const thirdPlace = state.matches.find((match) => match.id === "third-place");
  const upcoming = nextMatch(state.matches);

  const allMatchesCount = state.matches.filter((m) => !(m.stage === "third_place" && !m.teamAId && !m.teamBId)).length;
  const doneCount = state.matches.filter((m) => m.result !== null).length;
  const everythingDone = allMatchesCount > 0 && doneCount === allMatchesCount;

  return (
    <section>
      <PageHeader
        title="Jadwal & Bagan"
        description="Fase grup menentukan dua tim terbaik, lalu bagan gugur mempertemukan grup secara silang."
        actions={
          <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()}>
            Cetak bagan
          </Button>
        }
      />

      <div className="next-match-strip" aria-live="polite">
        {everythingDone ? (
          <div>
            <p className="next-match-strip-label">Status</p>
            <p className="next-match-strip-main">Semua {allMatchesCount} pertandingan selesai</p>
          </div>
        ) : (
          <div>
            <p className="next-match-strip-label">Pertandingan berikutnya</p>
            {upcoming ? (
              <>
                <p className="next-match-strip-main">
                  {teamLabel(upcoming.teamAId, teamsById, "Menunggu")} vs {teamLabel(upcoming.teamBId, teamsById, "Menunggu")}
                </p>
                <p className="next-match-strip-meta mono-num">
                  {formatScheduleTime(upcoming.scheduledAt)} · {upcoming.court || "Lapangan belum diatur"}
                  {upcoming.operationalStatus === "in_progress" ? " · Sedang berlangsung" : ""}
                </p>
              </>
            ) : (
              <p className="next-match-strip-main">Belum ada pertandingan yang siap dimainkan.</p>
            )}
          </div>
        )}
        {everythingDone && (
          <Button variant="secondary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("juara")}>
            Lihat juara
          </Button>
        )}
      </div>

      {semifinal1 && semifinal2 && final && thirdPlace && (
        <KnockoutBracket
          semifinal1={semifinal1}
          semifinal2={semifinal2}
          final={final}
          thirdPlace={thirdPlace}
          teamsById={teamsById}
          participants={state.participants}
        />
      )}

      <div className="group-table-section">
        <div className="schedule-week-toolbar">
          <div>
            <h2 className="text-h2">Jadwal Pertandingan</h2>
            <p className="schedule-week-desc">Pilih minggu untuk melihat dan mengatur jadwal pertandingan fase grup.</p>
          </div>
          <SegmentedControl value={activeScheduleFilter} onChange={setScheduleFilter} options={scheduleOptions} />
        </div>
        <div className="card group-table-wrap">
          <table className="match-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Pertandingan</th>
                <th>Hasil</th>
                <th colSpan={2}>Waktu &amp; Lapangan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleGroupCount > 0 ? (["A", "B"] as const).map((groupId) => {
                const matches = groupMatches(groupId);
                if (matches.length === 0) return null;
                return (
                  <Fragment key={groupId}>
                    <tr className="match-table-group-row">
                      <td colSpan={6}>Fase Grup {groupId}</td>
                    </tr>
                    {matches.map((match) => (
                      <GroupMatchRow
                        key={match.id}
                        match={match}
                        teamsById={teamsById}
                        participants={state.participants}
                        code={`${groupId}${allGroupMatches.filter((item) => item.groupId === groupId).indexOf(match) + 1}`}
                      />
                    ))}
                  </Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="match-table-empty">Tidak ada pertandingan pada pilihan minggu ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
