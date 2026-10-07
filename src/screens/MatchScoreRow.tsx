import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import { outcomeFromScores } from "../logic/scoring";
import { scoreEditorMessage } from "../logic/scoreEditorMessage";
import { useTournament } from "../state/TournamentContext";
import { ScoreLine, cellsFromMatch } from "../components/ScoreLine";
import { ResultChip } from "../components/ResultChip";
import { Button } from "../components/Button";
import { teamPlayerNames } from "../logic/format";
import type { Match, MatchSetScores, Team } from "../types/tournament";

type ScoreDraft = { a: string; b: string }[];

function zeroDraft(): ScoreDraft {
  return Array.from({ length: 3 }, () => ({ a: "0", b: "0" }));
}

function isZeroDraft(draft: ScoreDraft): boolean {
  return draft.every(({ a, b }) => a.trim() !== "" && b.trim() !== "" && Number(a) === 0 && Number(b) === 0);
}

function initialDraft(match: Match): ScoreDraft {
  return (match.setScores ?? [null, null, null]).map((score) => ({
    a: score ? String(score.teamAScore) : "",
    b: score ? String(score.teamBScore) : "",
  }));
}

function draftToScores(draft: ScoreDraft): MatchSetScores {
  const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
  return [
    { teamAScore: toNumber(draft[0].a), teamBScore: toNumber(draft[0].b) },
    { teamAScore: toNumber(draft[1].a), teamBScore: toNumber(draft[1].b) },
    draft[2].a.trim() === "" && draft[2].b.trim() === "" ? null : { teamAScore: toNumber(draft[2].a), teamBScore: toNumber(draft[2].b) },
  ];
}

function hasDownstreamResults(match: Match, allMatches: Match[]): boolean {
  if (match.stage === "group") {
    return allMatches.some((m) => m.stage !== "group" && m.result !== null);
  }
  function anyDownstream(current: Match): boolean {
    for (const id of [current.nextMatchId, current.loserNextMatchId]) {
      if (!id) continue;
      const next = allMatches.find((m) => m.id === id);
      if (next && (next.result !== null || anyDownstream(next))) return true;
    }
    return false;
  }
  return anyDownstream(match);
}

function resultChipInfo(match: Match, teamsById: Map<string, Team>): { text: string; tone: "win" | "neutral" } {
  if (!match.result) return { text: "Belum diisi", tone: "neutral" };
  if (match.result === "1-1") return { text: "Imbang 1–1", tone: "neutral" };
  const winnerLabel = `Tim ${teamsById.get(match.winnerTeamId!)?.seq ?? "?"}`;
  if (match.stage === "semifinal") return { text: `${winnerLabel} ke final`, tone: "win" };
  if (match.stage === "final") return { text: `${winnerLabel} juara`, tone: "win" };
  if (match.stage === "third_place") return { text: `${winnerLabel} juara 3`, tone: "win" };
  return { text: `${winnerLabel} menang ${match.result}`, tone: "win" };
}

interface ScoreEditorPanelProps {
  match: Match;
  teamALabel: string;
  teamBLabel: string;
  onClose: () => void;
}

function ScoreEditorPanel({ match, teamALabel, teamBLabel, onClose }: ScoreEditorPanelProps) {
  const { state, dispatch } = useTournament();
  const [draft, setDraft] = useState<ScoreDraft>(() => initialDraft(match));
  const firstInputRef = useRef<HTMLInputElement>(null);
  const isGroup = match.stage === "group";

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const scores = draftToScores(draft);
  const outcome = outcomeFromScores(match.stage, scores);
  const resetRequested = isZeroDraft(draft);
  const message = resetRequested
    ? { tone: "valid" as const, text: "Skor akan direset. Simpan untuk mengosongkan hasil pertandingan." }
    : scoreEditorMessage(match.stage, scores, teamALabel, teamBLabel);

  function updateScore(setIndex: number, side: "a" | "b", value: string) {
    setDraft((current) => current.map((score, index) => (index === setIndex ? { ...score, [side]: value } : score)));
  }

  function resetScores() {
    setDraft(zeroDraft());
    firstInputRef.current?.focus();
  }

  function submit() {
    if (resetRequested) {
      const bracketSeeded = isGroup && state.matches.some((item) => item.stage !== "group" && (item.teamAId || item.teamBId || item.result));
      if (bracketSeeded && !window.confirm("Mereset skor pertandingan grup akan mengosongkan bagan gugur (semifinal, final, juara 3) dan peringkat manual grup. Lanjutkan?")) return;
      dispatch({ type: "RESET_MATCH_SCORES", matchId: match.id });
      onClose();
      return;
    }
    if (!outcome) return;
    dispatch({ type: "RECORD_SCORES", matchId: match.id, setScores: scores });
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className="score-editor-panel" onKeyDown={handleKeyDown}>
      <p className="score-editor-title">
        Urutan skor: {teamALabel} – {teamBLabel}
      </p>
      <div className="score-editor-sets">
        {[0, 1].map((setIndex) => (
          <div className="score-editor-set" key={setIndex}>
            <span className="score-editor-set-label">Set {setIndex + 1}</span>
            <div className="score-editor-set-inputs">
              <input
                ref={setIndex === 0 ? firstInputRef : undefined}
                className="field-input field-input-score"
                type="number"
                inputMode="numeric"
                aria-label={`Skor set ${setIndex + 1} ${teamALabel}`}
                value={draft[setIndex].a}
                onChange={(event) => updateScore(setIndex, "a", event.target.value)}
              />
              <span aria-hidden="true">–</span>
              <input
                className="field-input field-input-score"
                type="number"
                inputMode="numeric"
                aria-label={`Skor set ${setIndex + 1} ${teamBLabel}`}
                value={draft[setIndex].b}
                onChange={(event) => updateScore(setIndex, "b", event.target.value)}
              />
            </div>
          </div>
        ))}
        {!isGroup && (
          <div className="score-editor-set">
            <span className="score-editor-set-label">Set 3 · penentu</span>
            <div className="score-editor-set-inputs">
              <input
                className="field-input field-input-score"
                type="number"
                inputMode="numeric"
                aria-label={`Skor set 3 ${teamALabel}`}
                value={draft[2].a}
                onChange={(event) => updateScore(2, "a", event.target.value)}
              />
              <span aria-hidden="true">–</span>
              <input
                className="field-input field-input-score"
                type="number"
                inputMode="numeric"
                aria-label={`Skor set 3 ${teamBLabel}`}
                value={draft[2].b}
                onChange={(event) => updateScore(2, "b", event.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      <p className={`field-status ${message.tone === "valid" ? "field-status-valid" : "field-status-invalid"}`} role="status">
        {message.text}
      </p>
      <div className="score-editor-actions">
        <Button variant="primary" disabled={!outcome && !resetRequested} onClick={submit}>
          Simpan skor
        </Button>
        <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={resetScores}>
          Reset 0–0
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
      </div>
    </div>
  );
}

interface MatchScoreRowProps {
  match: Match;
  code: string;
  teamsById: Map<string, Team>;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function MatchScoreRow({ match, code, teamsById, isOpen, onOpen, onClose }: MatchScoreRowProps) {
  const { state } = useTournament();
  const teamA = match.teamAId ? teamsById.get(match.teamAId) : undefined;
  const teamB = match.teamBId ? teamsById.get(match.teamBId) : undefined;
  if (!teamA || !teamB) return null;

  const cellCount = match.stage === "group" ? 2 : 3;
  const isDraw = match.result === "1-1";
  const [namesA, namesB] = [teamPlayerNames(teamA, state.participants), teamPlayerNames(teamB, state.participants)];
  const chip = resultChipInfo(match, teamsById);

  function handleEditClick() {
    if (hasDownstreamResults(match, state.matches)) {
      const confirmed = window.confirm("Mengubah skor pertandingan ini akan menghapus hasil babak berikutnya yang sudah tercatat. Lanjutkan?");
      if (!confirmed) return;
    }
    onOpen();
  }

  return (
    <li className="score-row">
      <span className="score-row-code mono-num">{code}</span>
      <div className="score-row-lines">
        <ScoreLine
          name={`Tim ${teamA.seq}`}
          members={namesA.join(" & ")}
          isWinner={match.winnerTeamId === teamA.id}
          isDraw={isDraw}
          cells={cellsFromMatch(match, "A", cellCount)}
        />
        <ScoreLine
          name={`Tim ${teamB.seq}`}
          members={namesB.join(" & ")}
          isWinner={match.winnerTeamId === teamB.id}
          isDraw={isDraw}
          cells={cellsFromMatch(match, "B", cellCount)}
        />
      </div>
      <div className="score-row-actions">
        <ResultChip text={chip.text} tone={chip.tone} rowFit />
        {match.result ? (
          <Button iconOnly variant="secondary" icon={<Pencil size={16} />} aria-label={`Ubah skor ${code}`} onClick={handleEditClick} />
        ) : (
          <Button variant="secondary" onClick={handleEditClick}>
            Isi skor
          </Button>
        )}
      </div>
      {isOpen && (
        <ScoreEditorPanel match={match} teamALabel={`Tim ${teamA.seq}`} teamBLabel={`Tim ${teamB.seq}`} onClose={onClose} />
      )}
    </li>
  );
}
