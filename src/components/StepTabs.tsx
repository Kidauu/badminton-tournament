import type { TabId } from "../types/nav";

const STEPS: { id: TabId; num: string; label: string }[] = [
  { id: "peserta", num: "01", label: "Peserta" },
  { id: "undian", num: "02", label: "Undian" },
  { id: "tim", num: "03", label: "Tim" },
  { id: "jadwal", num: "04", label: "Bagan" },
  { id: "skor", num: "05", label: "Skor" },
  { id: "klasemen", num: "06", label: "Klasemen" },
  { id: "juara", num: "07", label: "Juara" },
];

interface StepTabsProps {
  activeTab: TabId;
  unlocked: Record<TabId, boolean>;
  onSelect: (tab: TabId) => void;
}

export function StepTabs({ activeTab, unlocked, onSelect }: StepTabsProps) {
  return (
    <nav className="step-tabs" aria-label="Tahapan turnamen">
      {STEPS.map((step) => {
        const isActive = activeTab === step.id;
        return (
          <button
            key={step.id}
            type="button"
            className={isActive ? "step-tab step-tab-active" : "step-tab"}
            disabled={!unlocked[step.id]}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect(step.id)}
          >
            <span className="step-tab-num">{step.num}</span>
            {step.label}
          </button>
        );
      })}
    </nav>
  );
}
