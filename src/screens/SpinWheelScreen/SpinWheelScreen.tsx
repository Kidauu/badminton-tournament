import { useState } from "react";
import { useTournament } from "../../state/TournamentContext";
import { participantName } from "../../logic/format";
import { useSpinAnimation } from "./useSpinAnimation";
import { SpinWheel } from "./SpinWheel";
import { RevealOverlay } from "./RevealOverlay";
import type { TabId } from "../../types/nav";

export function SpinWheelScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state, dispatch } = useTournament();
  const remainingCount = state.pendingPairs.length;
  const remainingGroupSlots = state.pendingGroupSlots.length;
  const teamsFormed = state.teams.length;
  const totalTeams = state.participants.length / 2;
  const assigningGroups = remainingCount === 0 && (remainingGroupSlots > 0 || state.groupAssignments.length > 0);

  const [revealing, setRevealing] = useState<[string, string] | null>(null);
  const [revealedGroup, setRevealedGroup] = useState<{ teamId: string; groupId: "A" | "B" } | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  const wheelSegments = assigningGroups ? remainingGroupSlots : remainingCount;
  const { rotation, isSpinning, spin, handleTransitionEnd, transitionDuration } = useSpinAnimation(wheelSegments, () => {
    if (assigningGroups) {
      const nextTeam = state.teams[state.groupAssignments.length];
      const nextGroup = state.pendingGroupSlots[0];
      if (nextTeam && nextGroup) {
        setRevealedGroup({ teamId: nextTeam.id, groupId: nextGroup });
        setConfettiKey((k) => k + 1);
      }
      return;
    }
    const nextPair = state.pendingPairs[0];
    if (nextPair) {
      setRevealing(nextPair);
      setConfettiKey((k) => k + 1);
    }
  });

  function handleLanjut() {
    dispatch({ type: "REVEAL_NEXT_TEAM" });
    setRevealing(null);
  }

  function handleGroupLanjut() {
    dispatch({ type: "REVEAL_NEXT_GROUP" });
    setRevealedGroup(null);
  }

  return (
    <section className="screen spin-wheel-screen">
      <h1>{assigningGroups ? "Undian Grup" : "Undian Tim"}</h1>
      <p className="progress-label">
        {assigningGroups ? `${state.groupAssignments.length} dari ${totalTeams} tim masuk grup` : `${teamsFormed} dari ${totalTeams} tim terbentuk`}
      </p>

      <SpinWheel
        segmentCount={wheelSegments}
        rotation={rotation}
        transitionDuration={transitionDuration}
        isSpinning={isSpinning}
        onTransitionEnd={handleTransitionEnd}
      />

      {revealing && (
        <RevealOverlay
          title="Tim baru terbentuk!"
          names={[participantName(state.participants, revealing[0]), participantName(state.participants, revealing[1])]}
          confettiKey={confettiKey}
          onContinue={handleLanjut}
        />
      )}
      {revealedGroup && (
        <RevealOverlay
          title="Hasil undian grup"
          message={`Tim ${state.teams.find((team) => team.id === revealedGroup.teamId)?.seq} masuk Grup ${revealedGroup.groupId}`}
          confettiKey={confettiKey}
          onContinue={handleGroupLanjut}
        />
      )}

      <div className="spin-wheel-actions">
        {wheelSegments > 0 ? (
          <button className="btn btn-primary btn-spin" onClick={spin} disabled={isSpinning || !!revealing || !!revealedGroup}>
            {isSpinning ? "Memutar..." : "PUTAR!"}
          </button>
        ) : (
          <button className="btn btn-primary btn-spin" onClick={() => onNavigate("tim")}>
            Lihat Hasil Tim
          </button>
        )}
      </div>
    </section>
  );
}
