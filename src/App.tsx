import { useEffect, useRef, useState } from "react";
import { TournamentProvider, useTournament } from "./state/TournamentContext";
import { AppHeader } from "./components/AppHeader";
import { ParticipantsScreen } from "./screens/ParticipantsScreen";
import { SpinWheelScreen } from "./screens/SpinWheelScreen/SpinWheelScreen";
import { TeamsScreen } from "./screens/TeamsScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { ScoreEntryScreen } from "./screens/ScoreEntryScreen";
import { StandingsScreen } from "./screens/StandingsScreen";
import { ChampionScreen } from "./screens/ChampionScreen";
import type { TabId } from "./types/nav";

function AppShell() {
  const { state } = useTournament();
  const hasParticipants = state.participants.length > 0;
  const teamsFormed = state.teams.length;
  const hasSchedule = state.matches.length > 0;
  // A match with no team assigned to either slot can never be played (e.g. a
  // third-place playoff left empty because both semifinals were walkovers) —
  // treat it as vacuously done rather than blocking the tournament forever.
  const allDone = hasSchedule && state.matches.every((m) => m.result !== null || (!m.teamAId && !m.teamBId));

  const unlocked: Record<TabId, boolean> = {
    peserta: true,
    undian: hasParticipants,
    tim: teamsFormed > 0,
    jadwal: hasSchedule,
    skor: hasSchedule,
    klasemen: hasSchedule,
    juara: allDone,
  };

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (allDone) return "juara";
    if (hasSchedule) return "skor";
    if (teamsFormed > 0) return "tim";
    if (hasParticipants) return "undian";
    return "peserta";
  });

  const hasAutoNavigated = useRef(allDone);
  useEffect(() => {
    if (allDone && !hasAutoNavigated.current) {
      hasAutoNavigated.current = true;
      setActiveTab("juara");
    }
  }, [allDone]);

  // Reset turnamen now lives in the header's overflow menu; detect it here by
  // watching for the state going back to empty, so the auto-navigate guard
  // and the active tab both return to a fresh start.
  const wasEmpty = useRef(!hasParticipants);
  useEffect(() => {
    if (!hasParticipants && !wasEmpty.current) {
      hasAutoNavigated.current = false;
      setActiveTab("peserta");
    }
    wasEmpty.current = !hasParticipants;
  }, [hasParticipants]);

  return (
    <div className="app-shell">
      <AppHeader activeTab={activeTab} unlocked={unlocked} onSelectTab={setActiveTab} />
      <main className="app-main">
        {activeTab === "peserta" && <ParticipantsScreen onNavigate={setActiveTab} />}
        {activeTab === "undian" && <SpinWheelScreen onNavigate={setActiveTab} />}
        {activeTab === "tim" && <TeamsScreen onNavigate={setActiveTab} />}
        {activeTab === "jadwal" && <ScheduleScreen />}
        {activeTab === "skor" && <ScoreEntryScreen />}
        {activeTab === "klasemen" && <StandingsScreen />}
        {activeTab === "juara" && <ChampionScreen />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <TournamentProvider>
      <AppShell />
    </TournamentProvider>
  );
}
