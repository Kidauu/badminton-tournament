import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTournament } from "../state/TournamentContext";
import { MatchScoreRow } from "./MatchScoreRow";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { SegmentedControl } from "../components/SegmentedControl";
import type { Match, Team } from "../types/tournament";
import type { TabId } from "../types/nav";

type Filter = "all" | "A" | "B" | "knockout";

function isPlayable(match: Match): boolean {
  return Boolean(match.teamAId && match.teamBId);
}

function MatchSection({
  title,
  meta,
  matches,
  codes,
  teamsById,
  waitingMessage,
  openId,
  setOpenId,
}: {
  title: string;
  meta?: string;
  matches: Match[];
  codes: string[];
  teamsById: Map<string, Team>;
  waitingMessage?: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  const playable = matches.filter(isPlayable);
  return (
    <div className="score-section">
      <div className="score-section-head">
        <h2 className="text-h2">{title}</h2>
        {meta && <span className="score-section-meta">{meta}</span>}
      </div>
      <div className="card">
        <ul className="score-row-list">
          {playable.map((match) => (
            <MatchScoreRow
              key={match.id}
              match={match}
              code={codes[matches.indexOf(match)]}
              teamsById={teamsById}
              isOpen={openId === match.id}
              onOpen={() => setOpenId(match.id)}
              onClose={() => setOpenId(null)}
            />
          ))}
          {playable.length === 0 && waitingMessage && <li className="match-waiting">{waitingMessage}</li>}
        </ul>
      </div>
    </div>
  );
}

export function ScoreEntryScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state, role } = useTournament();
  const viewer = role === "viewer";
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const groupA = state.matches.filter((m) => m.stage === "group" && m.groupId === "A");
  const groupB = state.matches.filter((m) => m.stage === "group" && m.groupId === "B");
  const semifinals = state.matches.filter((m) => m.stage === "semifinal");
  const final = state.matches.filter((m) => m.stage === "final");
  const thirdPlace = state.matches.filter((m) => m.stage === "third_place");
  const knockout = [...semifinals, ...final, ...thirdPlace];

  const allPlayable = state.matches.filter(isPlayable);
  const filledCount = allPlayable.filter((m) => m.result !== null).length;
  const fillPercent = allPlayable.length > 0 ? Math.round((filledCount / allPlayable.length) * 100) : 0;

  const knockoutCodes = knockout.map((m) => (m.id === "semifinal-1" ? "SF1" : m.id === "semifinal-2" ? "SF2" : m.id === "final" ? "F" : "J3"));

  return (
    <section>
      <PageHeader
        title={viewer ? "Skor Pertandingan" : "Input Skor"}
        description={
          viewer
            ? "Hasil pertandingan terbaru, diperbarui otomatis. Poin dan klasemen langsung terhitung."
            : "Isi skor per set. Hasil, poin, dan klasemen langsung terhitung."
        }
        actions={
          <Button variant="secondary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("klasemen")}>
            Lihat klasemen
          </Button>
        }
      />

      <div className="rule-chips">
        <span className="rule-chip">
          Fase grup · <strong>2 set</strong>
        </span>
        <span className="rule-chip">
          Menang 2–0 · <strong>3 poin</strong>
        </span>
        <span className="rule-chip">
          Imbang 1–1 · <strong>1 poin</strong> per tim
        </span>
        <span className="rule-chip">
          Babak gugur · <strong>harus ada pemenang</strong>
        </span>
      </div>

      <div className="score-toolbar">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Semua", count: allPlayable.length },
            { value: "A", label: "Grup A", count: groupA.filter(isPlayable).length },
            { value: "B", label: "Grup B", count: groupB.filter(isPlayable).length },
            { value: "knockout", label: "Babak gugur", count: knockout.filter(isPlayable).length },
          ]}
        />
        <div className="score-fill-status">
          <span className="score-fill-count mono-num">
            {filledCount} / {allPlayable.length} {viewer ? "selesai" : "terisi"}
          </span>
          <div className="score-fill-track">
            <div className="score-fill-bar" style={{ width: `${fillPercent}%` }} />
          </div>
        </div>
      </div>

      {(filter === "all" || filter === "A") && (
        <MatchSection
          title="Fase Grup A"
          matches={groupA}
          codes={groupA.map((_, i) => `A${i + 1}`)}
          teamsById={teamsById}
          openId={openId}
          setOpenId={setOpenId}
        />
      )}

      {(filter === "all" || filter === "B") && (
        <MatchSection
          title="Fase Grup B"
          matches={groupB}
          codes={groupB.map((_, i) => `B${i + 1}`)}
          teamsById={teamsById}
          openId={openId}
          setOpenId={setOpenId}
        />
      )}

      {(filter === "all" || filter === "knockout") && (
        <MatchSection
          title="Babak Gugur"
          meta="Semifinal · Final · Perebutan Juara 3"
          matches={knockout}
          codes={knockoutCodes}
          teamsById={teamsById}
          waitingMessage="Babak gugur terbuka setelah semua pertandingan grup selesai."
          openId={openId}
          setOpenId={setOpenId}
        />
      )}
    </section>
  );
}
