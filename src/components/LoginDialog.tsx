import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTournament } from "../state/TournamentContext";

const MESSAGES = {
  invalid: "Username atau password salah.",
  blocked: "Terlalu banyak percobaan gagal. Coba lagi 15 menit lagi.",
  error: "Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.",
} as const;

export function LoginDialog() {
  const { loginOpen, closeLogin, login } = useTournament();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (loginOpen && !dialog.open) {
      setError(null);
      dialog.showModal();
      usernameRef.current?.focus();
    } else if (!loginOpen && dialog.open) {
      dialog.close();
      setPassword("");
    }
  }, [loginOpen]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await login(username, password);
    setBusy(false);
    if (result !== "ok") setError(MESSAGES[result]);
  }

  return (
    <dialog ref={dialogRef} className="confirm-dialog" onClose={closeLogin}>
      <form className="confirm-dialog-body login-form" onSubmit={(event) => void handleSubmit(event)}>
        <p className="confirm-dialog-title">Masuk admin</p>
        <p className="confirm-dialog-text">Hanya admin yang bisa mengubah skor dan data turnamen.</p>
        <div className="login-field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            ref={usernameRef}
            className="field-input"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="login-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="field-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error && (
          <p className="field-status field-status-invalid" role="alert">
            {error}
          </p>
        )}
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={closeLogin}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !username.trim() || !password}>
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
