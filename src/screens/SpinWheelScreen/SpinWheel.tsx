const WEDGE_COLORS = ["#0b6e4f", "#0f8a63"];
const CENTER = 150;
const RADIUS = 140;

function polarToCartesian(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + RADIUS * Math.sin(rad), y: CENTER - RADIUS * Math.cos(rad) };
}

function wedgePath(startAngle: number, endAngle: number): string {
  const p1 = polarToCartesian(startAngle);
  const p2 = polarToCartesian(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${p1.x} ${p1.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
}

interface SpinWheelProps {
  segmentCount: number;
  rotation: number;
  transitionDuration: number;
  isSpinning: boolean;
  onTransitionEnd: () => void;
}

export function SpinWheel({ segmentCount, rotation, transitionDuration, isSpinning, onTransitionEnd }: SpinWheelProps) {
  const n = Math.max(segmentCount, 1);
  const step = 360 / n;

  return (
    <div className="spin-wheel-stage">
      <div className="spin-wheel-pointer" />
      <div
        className="spin-wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? `transform ${transitionDuration}s cubic-bezier(0.17, 0.67, 0.35, 1)` : "none",
        }}
        onTransitionEnd={onTransitionEnd}
      >
        <svg viewBox="0 0 300 300" role="img" aria-label="Roda undian tim">
          {n === 1 ? (
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={WEDGE_COLORS[0]} />
          ) : (
            Array.from({ length: n }, (_, i) => (
              <path key={i} d={wedgePath(i * step, (i + 1) * step)} fill={WEDGE_COLORS[i % 2]} stroke="#ffffff" strokeWidth={2} />
            ))
          )}
          <circle cx={CENTER} cy={CENTER} r={36} fill="#ffffff" />
          <text x={CENTER} y={CENTER + 12} textAnchor="middle" fontSize="28">
            🏸
          </text>
        </svg>
      </div>
    </div>
  );
}
