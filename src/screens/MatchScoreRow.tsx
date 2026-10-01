import { useState } from "react";
import { goldenSetRequired, outcomeFromScores, scoreLabel, scoreValidationMessage } from "../logic/scoring";
import { useTournament } from "../state/TournamentContext";
import type { Match, MatchSetScores } from "../types/tournament";

interface MatchScoreRowProps {
  match: Match;
  teamALabel: string;
  teamBLabel: string;
}

type ScoreDraft = { a: string; b: string }[];

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

export function MatchScoreRow({ match, teamALabel, teamBLabel }: MatchScoreRowProps) {
  const { state, dispatch } = useTournament();
  const [editing, setEditing] = useState(match.result === null);
  const [draft, setDraft] = useState<ScoreDraft>(() => initialDraft(match));
  const scores = draftToScores(draft);
  const outcome = outcomeFromScores(match.stage, scores);
  const validationMessage = scoreValidationMessage(match.stage, scores);
  const isKnockout = match.stage === "semifinal" || match.stage === "final" || match.stage === "third_place";
  const needsGoldenSet = isKnockout && goldenSetRequired(scores);

  function updateScore(setIndex: number, side: "a" | "b", value: string) {
    setDraft((current) => current.map((score, index) => (index === setIndex ? { ...score, [side]: value } : score)));
  }

  function submit() {
    if (!outcome) return;
    dispatch({ type: "RECORD_SCORES", matchId: match.id, setScores: scores });
    setEditing(false);
  }

  function handleEditClick() {
    if (hasDownstreamResults(match, state.matches)) {
      const confirmed = window.confirm("Mengubah skor pertandingan ini akan menghapus hasil babak berikutnya yang sudah tercatat. Lanjutkan?");
      if (!confirmed) return;
    }
    setDraft(initialDraft(match));
    setEditing(true);
  }

  if (!editing && match.result) {
    const winnerLabel = match.winnerTeamId === match.teamAId ? teamALabel : teamBLabel;
    const scoreText = (match.setScores ?? []).map((score) => (score ? scoreLabel(score) : null)).filter(Boolean).join(", ");
    const resultLabel = match.result === "1-1" ? "Imbang 1-1 — masing-masing 1 poin" : `${winnerLabel} menang ${match.result}`;
    return (
      <li className="match-score-row">
        <span className="match-teams">{teamALabel} vs {teamBLabel}</span>
        <span className="match-result-badge" data-result={match.result}>{resultLabel}{scoreText ? ` (${scoreText})` : ""}</span>
        <button className="btn btn-ghost" onClick={handleEditClick}>Edit</button>
      </li>
    );
  }

  return (
    <li className="match-score-row match-score-row-editing">
      <span className="match-teams">{teamALabel} vs {teamBLabel}</span>
      {[0, 1].map((setIndex) => (
        <div className="score-input-grid" key={setIndex}>
          <span>Set {setIndex + 1}</span>
          <label>{teamALabel}<input aria-invalid={Boolean(validationMessage)} type="number" inputMode="numeric" min="0" max="30" value={draft[setIndex].a} onChange={(event) => updateScore(setIndex, "a", event.target.value)} /></label>
          <span className="vs">-</span>
          <label>{teamBLabel}<input aria-invalid={Boolean(validationMessage)} type="number" inputMode="numeric" min="0" max="30" value={draft[setIndex].b} onChange={(event) => updateScore(setIndex, "b", event.target.value)} /></label>
        </div>
      ))}
      {needsGoldenSet && (
        <div className="score-input-grid score-input-golden">
          <span>Golden set (15)</span>
          <label>{teamALabel}<input aria-invalid={Boolean(validationMessage)} type="number" inputMode="numeric" min="0" max="15" value={draft[2].a} onChange={(event) => updateScore(2, "a", event.target.value)} /></label>
          <span className="vs">-</span>
          <label>{teamBLabel}<input aria-invalid={Boolean(validationMessage)} type="number" inputMode="numeric" min="0" max="15" value={draft[2].b} onChange={(event) => updateScore(2, "b", event.target.value)} /></label>
        </div>
      )}
      <span className="score-rule">
        {isKnockout
          ? "Set reguler: 21 poin (selisih 2, maksimal 30). Jika 1-1, golden set: lebih dulu 15 poin."
          : "Set reguler: 21 poin (selisih 2, maksimal 30). Hasil dua set menentukan 2-0 atau 1-1."}
      </span>
      {validationMessage && <p className="score-validation" role="alert">⚠️ {validationMessage}</p>}
      <button className="btn btn-primary" disabled={!outcome} onClick={submit}>Simpan hasil</button>
    </li>
  );
}
