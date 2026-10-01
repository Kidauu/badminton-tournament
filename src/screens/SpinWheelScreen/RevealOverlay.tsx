import { Confetti } from "../../components/Confetti";

interface RevealOverlayProps {
  title: string;
  names?: [string, string];
  message?: string;
  confettiKey: number;
  onContinue: () => void;
}

export function RevealOverlay({ title, names, message, confettiKey, onContinue }: RevealOverlayProps) {
  return (
    <div className="reveal-overlay">
      <Confetti trigger={confettiKey} />
      <div className="reveal-card">
        <p className="reveal-label">{title}</p>
        {names && <p className="reveal-names">{names[0]} &amp; {names[1]}</p>}
        {message && <p className="reveal-names">{message}</p>}
        <button className="btn btn-primary" onClick={onContinue}>
          Lanjut
        </button>
      </div>
    </div>
  );
}
