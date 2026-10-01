import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Owns only the wheel's cosmetic rotation. The true outcome (which pair of
 * names comes next) is already fixed before any spin happens — this hook
 * never touches that; it just picks a plausible-looking landing wedge among
 * the currently-generic, interchangeable segments and animates a rotation
 * that ends there.
 *
 * A setTimeout fallback mirrors `handleTransitionEnd` in case the CSS
 * `transitionend` event never fires (e.g. the tab is backgrounded/throttled,
 * or the browser drops the event) — the spin must always resolve.
 */
export function useSpinAnimation(remainingCount: number, onRevealReady: () => void) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const reduced = prefersReducedMotion();
  const transitionDuration = reduced ? 1.2 : 4;

  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef(false);

  function clearFallback() {
    if (fallbackTimer.current !== null) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  }

  function finishSpin() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    clearFallback();
    setIsSpinning(false);
    onRevealReady();
  }

  function spin() {
    if (isSpinning || remainingCount <= 0) return;
    resolvedRef.current = false;
    setIsSpinning(true);
    const fullTurns = reduced ? 1 : 4 + Math.floor(Math.random() * 3);
    const i = Math.floor(Math.random() * remainingCount);
    const wedgeCenter = (i + 0.5) * (360 / remainingCount);
    const delta = (((360 - wedgeCenter) % 360) + 360) % 360;
    setRotation((prev) => prev + fullTurns * 360 + delta);
    fallbackTimer.current = setTimeout(finishSpin, transitionDuration * 1000 + 250);
  }

  function handleTransitionEnd() {
    if (!isSpinning) return;
    finishSpin();
  }

  useEffect(() => clearFallback, []);

  return { rotation, isSpinning, spin, handleTransitionEnd, transitionDuration };
}
