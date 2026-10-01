import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
  color: string;
}

const COLORS = ["#0b6e4f", "#ffd23f", "#ffffff", "#12a86b", "#e5484d"];

/** Hand-rolled confetti burst — no npm dependency. Retriggers whenever
 * `trigger` changes to a new non-zero value. */
export function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!trigger) return;
    setPieces(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.6 + Math.random() * 0.8,
        rotation: Math.random() * 360,
        color: COLORS[i % COLORS.length],
      })),
    );
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={`${trigger}-${p.id}`}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              backgroundColor: p.color,
              "--rot": `${p.rotation}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
