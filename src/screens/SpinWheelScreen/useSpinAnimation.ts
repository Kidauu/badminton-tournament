import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export interface DrawResult {
  topIndex: number;
  bottomIndex: number | null;
}

/**
 * Drives only the wheel's rotation. The actual outcome (which two names, or
 * which single team, the spin reveals) is already fixed by the caller before
 * spinning starts — via `displayOrder` plus which index is passed to `spin`
 * — this hook just animates a rotation that lands the chosen index under the
 * top pointer. Partner index = (i + n/2) % n when pairMode is on, matching
 * the Court Line brief's two-pointer formula.
 *
 * A setTimeout fallback mirrors `handleTransitionEnd` in case the CSS
 * `transitionend` event never fires (e.g. the tab is backgrounded/throttled)
 * — the spin must always resolve.
 */
export function useSpinAnimation(segmentCount: number, pairMode: boolean, onLanded: (result: DrawResult) => void) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const reduced = prefersReducedMotion();
  const duration = reduced ? 0.6 : 3.4;

  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef(false);
  const pendingResult = useRef<DrawResult | null>(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  function clearFallback() {
    if (fallbackTimer.current !== null) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  }

  function finish() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearFallback();
    setIsSpinning(false);
    if (pendingResult.current) onLanded(pendingResult.current);
  }

  function spin(requiredTopIndex?: number) {
    if (isSpinning || segmentCount <= 0) return;
    resolvedRef.current = false;
    const n = segmentCount;
    const i = requiredTopIndex ?? Math.floor(Math.random() * n);
    const j = pairMode ? (i + Math.floor(n / 2)) % n : null;
    pendingResult.current = { topIndex: i, bottomIndex: j };

    const seg = 360 / n;
    const center = (i + 0.5) * seg;
    const curMod = ((rotationRef.current % 360) + 360) % 360;
    const delta = (((360 - center - curMod) % 360) + 360) % 360;
    const extraTurns = reduced ? 360 : 1800;
    const target = rotationRef.current + extraTurns + delta;

    setIsSpinning(true);
    setRotation(target);
    fallbackTimer.current = setTimeout(finish, duration * 1000 + 250);
  }

  function handleTransitionEnd() {
    if (!isSpinning) return;
    finish();
  }

  function resetRotation() {
    setRotation(0);
    rotationRef.current = 0;
  }

  useEffect(() => clearFallback, []);

  return { rotation, isSpinning, spin, handleTransitionEnd, duration, resetRotation };
}
