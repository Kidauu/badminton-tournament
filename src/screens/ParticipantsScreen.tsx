import { useState, type ClipboardEvent } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { useTournament } from "../state/TournamentContext";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { Avatar } from "../components/Avatar";
import type { TabId } from "../types/nav";

const DEFAULT_PARTICIPANT_COUNT = 14;
const MIN_PARTICIPANT_COUNT = 4;
const STEP = 2;

export function ParticipantsScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state, dispatch, role } = useTournament();
  const locked = state.teams.length > 0;

  const [names, setNames] = useState<string[]>(() =>
    state.participants.length >= MIN_PARTICIPANT_COUNT && state.participants.length % 2 === 0
      ? state.participants.map((p) => p.name)
      : Array(DEFAULT_PARTICIPANT_COUNT).fill(""),
  );
  const [errors, setErrors] = useState<string[]>([]);

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  function addParticipants() {
    setNames((prev) => [...prev, ...Array(STEP).fill("")]);
  }

  function removeParticipants() {
    setNames((prev) => (prev.length <= MIN_PARTICIPANT_COUNT ? prev : prev.slice(0, -STEP)));
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length <= 1) return;
    event.preventDefault();
    setNames((prev) => {
      const next = [...prev];
      let needed = index + lines.length;
      if (needed % 2 !== 0) needed += 1;
      while (next.length < needed) next.push("");
      lines.forEach((line, i) => {
        next[index + i] = line;
      });
      return next;
    });
  }

  function handleSubmit() {
    const trimmed = names.map((n) => n.trim());
    const nextErrors: string[] = [];

    if (trimmed.some((n) => n.length === 0)) {
      nextErrors.push(`Semua ${names.length} nama harus diisi.`);
    }
    const lower = trimmed.map((n) => n.toLowerCase());
    const hasDuplicate = lower.some((n, i) => n.length > 0 && lower.indexOf(n) !== i);
    if (hasDuplicate) {
      nextErrors.push("Ada nama yang sama — tiap peserta harus punya nama yang unik.");
    }

    setErrors(nextErrors);
    if (nextErrors.length > 0) return;

    dispatch({ type: "SET_PARTICIPANTS", names: trimmed });
    onNavigate("undian");
  }

  if (locked) {
    const totalTeams = state.teams.length;
    const teamSeqByPlayerId = new Map<string, number>();
    for (const team of state.teams) {
      teamSeqByPlayerId.set(team.playerAId, team.seq);
      teamSeqByPlayerId.set(team.playerBId, team.seq);
    }

    return (
      <section>
        <PageHeader
          title="Peserta"
          countPill={`${state.participants.length} pemain`}
          description={`Semua pemain sudah dipasangkan menjadi ${totalTeams} tim ganda putra.`}
          actions={
            <Button variant="primary" icon={<ArrowRight size={16} />} onClick={() => onNavigate("undian")}>
              Lihat hasil undian
            </Button>
          }
        />

        <div className="lock-banner">
          <span className="lock-banner-icon">
            <Lock size={18} />
          </span>
          <div>
            <p className="lock-banner-title">Daftar peserta dikunci</p>
            <p className="lock-banner-text">Tim sudah terbentuk. Untuk mengubah daftar, reset turnamen lewat menu di kanan atas.</p>
          </div>
        </div>

        <div className="participants-grid">
          {state.participants.map((p) => {
            const seq = teamSeqByPlayerId.get(p.id);
            return (
              <div className="participant-card" key={p.id}>
                <Avatar name={p.name} size={36} />
                <span className="participant-card-name">{p.name}</span>
                {seq && <span className="participant-card-team">Tim {seq}</span>}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (role === "viewer") {
    return (
      <section>
        <PageHeader title="Peserta" description="Daftar peserta belum dibuat. Menunggu admin memulai turnamen." />
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title="Peserta"
        countPill={`${names.length} pemain`}
        description={`Masukkan ${names.length} nama peserta. Nama harus unik dan tidak boleh kosong. Jumlah peserta harus genap. Tips: tempel (paste) daftar nama sekaligus (satu nama per baris) ke salah satu kotak di bawah.`}
      />

      <div className="participant-count-row">
        <Button small onClick={removeParticipants} disabled={names.length <= MIN_PARTICIPANT_COUNT}>
          − 2 peserta
        </Button>
        <span className="participant-count-label mono-num">{names.length} peserta</span>
        <Button small onClick={addParticipants}>
          + 2 peserta
        </Button>
      </div>

      <div className="participant-form-grid">
        {names.map((name, i) => (
          <div className="participant-field" key={i}>
            <label htmlFor={`peserta-${i}`}>Peserta {i + 1}</label>
            <input
              id={`peserta-${i}`}
              className="field-input"
              type="text"
              value={name}
              onChange={(e) => updateName(i, e.target.value)}
              onPaste={(event) => handlePaste(i, event)}
              placeholder={`Nama peserta ${i + 1}`}
            />
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <ul className="form-error-list">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <Button variant="primary" onClick={handleSubmit}>
        Simpan &amp; Mulai Undian
      </Button>
    </section>
  );
}
