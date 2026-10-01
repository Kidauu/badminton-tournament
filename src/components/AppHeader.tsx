import { useTournament } from "../state/TournamentContext";
import { tournamentPhaseLabel } from "../logic/tournamentPhase";
import { ShuttlecockIcon } from "./icons/ShuttlecockIcon";
import { StatusChip } from "./StatusChip";
import { OverflowMenu } from "./OverflowMenu";
import { StepTabs } from "./StepTabs";
import type { TabId } from "../types/nav";

interface AppHeaderProps {
  activeTab: TabId;
  unlocked: Record<TabId, boolean>;
  onSelectTab: (tab: TabId) => void;
}

export function AppHeader({ activeTab, unlocked, onSelectTab }: AppHeaderProps) {
  const { state } = useTournament();
  const phaseLabel = tournamentPhaseLabel(state);

  return (
    <header className="app-header">
      <div className="app-header-top">
        <span className="app-logo">
          <ShuttlecockIcon size={20} />
        </span>
        <div className="app-header-text">
          <span className="app-header-title">Turnamen Badminton</span>
          <span className="app-header-subtitle">
            Ganda putra · {state.teams.length} tim · {state.participants.length} pemain
          </span>
        </div>
        <div className="app-header-right">
          <StatusChip label={phaseLabel} />
          <OverflowMenu />
        </div>
      </div>
      <StepTabs activeTab={activeTab} unlocked={unlocked} onSelect={onSelectTab} />
    </header>
  );
}
