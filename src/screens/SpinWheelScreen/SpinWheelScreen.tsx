import { useEffect, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { useTournament } from "../../state/TournamentContext";
import { participantName } from "../../logic/format";
import { useSpinAnimation } from "./useSpinAnimation";
import { SpinWheel } from "./SpinWheel";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import type { TabId } from "../../types/nav";
import type { GroupId } from "../../types/tournament";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Shuffles the remaining ids, but pins `pair`'s two members at opposite
 * indices (0 and n/2) so a spin landing on one always reveals the other
 * under the bottom pointer — exactly the "pasangan = indeks seberang" rule. */
function buildPairOrder(remainingIds: string[], pair: [string, string] | null): string[] {
  if (!pair) return shuffle(remainingIds);
  const [a, b] = pair;
  const rest = shuffle(remainingIds.filter((id) => id !== a && id !== b));
  const n = remainingIds.length;
  const half = n / 2;
  const order = new Array<string>(n);
  order[0] = a;
  order[half] = b;
  let cursor = 0;
  for (let pos = 0; pos < n; pos++) {
    if (pos === 0 || pos === half) continue;
    order[pos] = rest[cursor++];
  }
  return order;
}

interface Reveal {
  label: string;
  primary: string;
  meta: string;
}

export function SpinWheelScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state, dispatch } = useTournament();
  const totalTeams = state.participants.length / 2;
  const remainingIds = state.pendingPairs.flat();
  const assigningGroups = state.pendingPairs.length === 0 && (state.pendingGroupSlots.length > 0 || state.groupAssignments.length > 0);

  const [pairOrder, setPairOrder] = useState<string[]>(() => buildPairOrder(remainingIds, state.pendingPairs[0] ?? null));
  const [groupOrder, setGroupOrder] = useState<string[]>(() => shuffle(state.pendingGroupSlots));
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useEffect(() => {
    setPairOrder(buildPairOrder(state.pendingPairs.flat(), state.pendingPairs[0] ?? null));
    // Rebuild only when the remaining pool actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pendingPairs.length]);

  useEffect(() => {
    setGroupOrder(shuffle(state.pendingGroupSlots));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pendingGroupSlots.length]);

  const wheelSegments = assigningGroups ? groupOrder.length : pairOrder.length;
  const labels = assigningGroups
    ? groupOrder.map((g) => `Grup ${g}`)
    : pairOrder.map((id) => participantName(state.participants, id));

  const { rotation, isSpinning, spin, handleTransitionEnd, duration, resetRotation } = useSpinAnimation(
    wheelSegments,
    !assigningGroups,
    (result) => {
      if (assigningGroups) {
        const team = state.teams[state.groupAssignments.length];
        const groupId = groupOrder[result.topIndex] as GroupId;
        setReveal({ label: "Hasil undian grup", primary: `Tim ${team.seq}`, meta: `Tim ${team.seq} · Grup ${groupId}` });
        dispatch({ type: "REVEAL_NEXT_GROUP" });
      } else {
        const nameA = participantName(state.participants, pairOrder[result.topIndex]);
        const nameB = participantName(state.participants, pairOrder[result.bottomIndex!]);
        setReveal({ label: "Pasangan terakhir", primary: `${nameA} & ${nameB}`, meta: `Tim ${state.teams.length + 1}` });
        dispatch({ type: "REVEAL_NEXT_TEAM" });
      }
      resetRotation();
    },
  );

  function handleSpin() {
    if (assigningGroups) {
      // The next team is always consumed in sequence; land on whichever
      // visual slot holds the real next group so the reveal stays honest.
      const nextGroup = state.pendingGroupSlots[0];
      const candidates = groupOrder.map((_, i) => i).filter((i) => groupOrder[i] === nextGroup);
      spin(candidates[Math.floor(Math.random() * candidates.length)]);
    } else {
      const nextPair = state.pendingPairs[0];
      const candidates = [pairOrder.indexOf(nextPair[0]), pairOrder.indexOf(nextPair[1])];
      spin(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }

  const groupQuota: Record<GroupId, number> = { A: Math.ceil(totalTeams / 2), B: Math.floor(totalTeams / 2) };
  const groupFilled: Record<GroupId, number> = {
    A: state.groupAssignments.filter((a) => a.groupId === "A").length,
    B: state.groupAssignments.filter((a) => a.groupId === "B").length,
  };
  const highlightIndex = assigningGroups ? state.groupAssignments.length - 1 : state.teams.length - 1;

  const allDone = wheelSegments === 0;

  return (
    <section>
      <PageHeader
        title={assigningGroups ? "Undian Grup" : "Undian Tim"}
        description={
          assigningGroups
            ? "Setiap tim diundi masuk ke Grup A atau Grup B."
            : "Dua penunjuk mengungkap satu pasangan sekaligus — nama di bawah tiap penunjuk langsung menjadi satu tim."
        }
      />

      <div className="draw-grid">
        <div className="card draw-wheel-card">
          {allDone ? (
            <div className="draw-complete">
              <span className="draw-complete-circle">
                <Check size={32} />
              </span>
              <p className="draw-complete-title">Undian selesai</p>
              <p className="draw-complete-text">{totalTeams} tim siap bertanding</p>
              <Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("tim")}>
                Lihat Hasil Tim
              </Button>
            </div>
          ) : (
            <>
              <div className="wheel-wrap">
                <span className="wheel-pointer wheel-pointer-top" aria-hidden="true" />
                {!assigningGroups && <span className="wheel-pointer wheel-pointer-bottom" aria-hidden="true" />}
                <SpinWheel labels={labels} rotation={rotation} duration={duration} isSpinning={isSpinning} onTransitionEnd={handleTransitionEnd} />
                <button type="button" className="wheel-hub" onClick={handleSpin} disabled={isSpinning}>
                  {isSpinning ? "Memutar" : "Putar"}
                </button>
              </div>

              {(isSpinning || reveal) && (
                <div className="draw-reveal" aria-live="polite">
                  <p className="draw-reveal-label">{isSpinning ? "Memutar roda…" : reveal?.label}</p>
                  {!isSpinning && reveal && (
                    <>
                      <p className="draw-reveal-name">{reveal.primary}</p>
                      <p className="draw-reveal-meta mono-num">{reveal.meta}</p>
                    </>
                  )}
                  <p className="draw-reveal-remaining">
                    Sisa {wheelSegments} {assigningGroups ? "tim" : "pemain"} di roda
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card draw-side-card">
          <div className="draw-side-head">
            <h2 className="text-h2-card">Hasil undian</h2>
            <span className="mono-num">
              {state.teams.length} / {totalTeams} tim
            </span>
          </div>
          <div className="draw-progress-track">
            {Array.from({ length: totalTeams }, (_, i) => (
              <span key={i} className={`draw-progress-seg ${i < state.teams.length ? "draw-progress-seg-filled" : ""}`} />
            ))}
          </div>
          <div className="draw-quota-row">
            {(["A", "B"] as const).map((g) => (
              <div className="draw-quota-box" key={g}>
                <p className="draw-quota-label">Grup {g}</p>
                <p className="draw-quota-value mono-num">
                  {groupFilled[g]} / {groupQuota[g]}
                </p>
              </div>
            ))}
          </div>
          <div className="draw-slot-list">
            {Array.from({ length: totalTeams }, (_, i) => {
              const team = state.teams[i];
              if (!team) {
                return (
                  <div className="draw-slot draw-slot-empty" key={i}>
                    Menunggu undian
                  </div>
                );
              }
              const group = state.groupAssignments.find((a) => a.teamId === team.id)?.groupId;
              const names = [participantName(state.participants, team.playerAId), participantName(state.participants, team.playerBId)];
              return (
                <div className={`draw-slot ${i === highlightIndex ? "draw-slot-highlight" : ""}`} key={team.id}>
                  <span className="draw-slot-badge mono-num">{String(team.seq).padStart(2, "0")}</span>
                  <span className="draw-slot-name">{names.join(" & ")}</span>
                  {group && <span className="count-pill">Grup {group}</span>}
                </div>
              );
            })}
          </div>
          <Button variant="secondary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("tim")} disabled={state.teams.length === 0}>
            Lihat semua tim
          </Button>
        </div>
      </div>
    </section>
  );
}
