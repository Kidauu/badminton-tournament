import { useState, type ClipboardEvent } from "react";
import { useTournament } from "../state/TournamentContext";
import type { TabId } from "../types/nav";

const DEFAULT_PARTICIPANT_COUNT = 14;
const MIN_PARTICIPANT_COUNT = 4;
const STEP = 2;

export function ParticipantsScreen({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { state, dispatch } = useTournament();
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
      lines.forEach((line, i) => { next[index + i] = line; });
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
    return (
      <section className="screen">
        <h1>Peserta</h1>
        <p>{state.participants.length} peserta sudah dikunci karena tim sudah terbentuk. Reset turnamen untuk mengubah daftar peserta.</p>
        <ul className="participants-readonly-grid">
          {state.participants.map((p, i) => (
            <li key={p.id}>
              {i + 1}. {p.name}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className="screen">
      <h1>Peserta</h1>
      <p>Masukkan {names.length} nama peserta. Nama harus unik dan tidak boleh kosong. Jumlah peserta harus genap. Tips: tempel (paste) daftar nama sekaligus (satu nama per baris) ke salah satu kotak di bawah.</p>
      <div className="participant-count-actions">
        <button
          className="btn btn-ghost btn-small"
          onClick={removeParticipants}
          disabled={names.length <= MIN_PARTICIPANT_COUNT}
        >
          − 2 peserta
        </button>
        <span className="participant-count-label">{names.length} peserta</span>
        <button className="btn btn-ghost btn-small" onClick={addParticipants}>
          + 2 peserta
        </button>
      </div>
      <div className="participant-form-grid">
        {names.map((name, i) => (
          <div className="participant-field" key={i}>
            <label htmlFor={`peserta-${i}`}>Peserta {i + 1}</label>
            <input
              id={`peserta-${i}`}
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
      <div className="spin-wheel-actions">
        <button className="btn btn-primary" onClick={handleSubmit}>
          Simpan &amp; Mulai Undian
        </button>
      </div>
    </section>
  );
}
