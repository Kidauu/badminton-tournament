function wedgeBackground(n: number): string {
  if (n <= 1) return "#FFFFFF";
  const seg = 360 / n;
  const stops: string[] = [];
  for (let i = 0; i < n; i++) {
    const color = i % 2 === 0 ? "#FFFFFF" : "#EEF2EC";
    stops.push(`${color} ${i * seg}deg ${(i + 1) * seg}deg`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

interface SpinWheelProps {
  labels: string[];
  rotation: number;
  duration: number;
  isSpinning: boolean;
  onTransitionEnd: () => void;
}

export function SpinWheel({ labels, rotation, duration, isSpinning, onTransitionEnd }: SpinWheelProps) {
  const n = Math.max(labels.length, 1);
  const seg = 360 / n;

  return (
    <div
      className="wheel-svg"
      role="img"
      aria-label="Roda undian"
      style={{
        background: wedgeBackground(n),
        transform: `rotate(${rotation}deg)`,
        transition: isSpinning ? `transform ${duration}s cubic-bezier(0.15, 0.7, 0.1, 1)` : "none",
      }}
      onTransitionEnd={onTransitionEnd}
    >
      {labels.map((label, k) => (
        <span
          key={k}
          className="wheel-label"
          style={{ transform: `rotate(${(k + 0.5) * seg - 90}deg) translateX(46px)` }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
