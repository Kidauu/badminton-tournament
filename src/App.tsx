import { useEffect, useRef, useState } from "react";
import { TournamentProvider, useTournament } from "./state/TournamentContext";
import { ParticipantsScreen } from "./screens/ParticipantsScreen";
import { SpinWheelScreen } from "./screens/SpinWheelScreen/SpinWheelScreen";
import { TeamsScreen } from "./screens/TeamsScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { ScoreEntryScreen } from "./screens/ScoreEntryScreen";
import { StandingsScreen } from "./screens/StandingsScreen";
import { ChampionScreen } from "./screens/ChampionScreen";
import type { TabId } from "./types/nav";

const TAB_META: { id: TabId; label: string }[] = [
  { id: "peserta", label: "Peserta" },
  { id: "undian", label: "Undian" },
  { id: "tim", label: "Tim" },
  { id: "jadwal", label: "Bagan" },
  { id: "skor", label: "Skor" },
  { id: "klasemen", label: "Klasemen" },
  { id: "juara", label: "Juara" },
];

function AppShell() {
  const { state, dispatch } = useTournament();
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

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  function handleReset() {
    dispatch({ type: "RESET_TOURNAMENT" });
    hasAutoNavigated.current = false;
    setActiveTab("peserta");
    setResetConfirmOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">🏸 Turnamen Badminton Ganda Putra</h1>
      </header>
      <nav className="tab-nav">
        {TAB_META.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "tab-button tab-button-active" : "tab-button"}
            disabled={!unlocked[tab.id]}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="app-main">
        {activeTab === "peserta" && <ParticipantsScreen onNavigate={setActiveTab} />}
        {activeTab === "undian" && <SpinWheelScreen onNavigate={setActiveTab} />}
        {activeTab === "tim" && <TeamsScreen onNavigate={setActiveTab} />}
        {activeTab === "jadwal" && <ScheduleScreen />}
        {activeTab === "skor" && <ScoreEntryScreen />}
        {activeTab === "klasemen" && <StandingsScreen />}
        {activeTab === "juara" && <ChampionScreen />}
      </main>
      <footer className="app-footer">
        {resetConfirmOpen ? (
          <span className="reset-confirm">
            Ini akan menghapus semua peserta, tim, jadwal, dan skor. Lanjutkan?
            <button className="btn btn-danger btn-small" onClick={handleReset}>
              Ya, reset
            </button>
            <button className="btn btn-ghost btn-small" onClick={() => setResetConfirmOpen(false)}>
              Batal
            </button>
          </span>
        ) : (
          <button className="btn btn-ghost btn-small" onClick={() => setResetConfirmOpen(true)}>
            Reset turnamen
          </button>
        )}
      </footer>
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
