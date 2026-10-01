import { useEffect, useRef, useState } from "react";
import { Download, MoreHorizontal, RotateCcw, Upload } from "lucide-react";
import { useTournament } from "../state/TournamentContext";
import { createBackup, parseBackup } from "../logic/backup";

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function OverflowMenu() {
  const { state, dispatch } = useTournament();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (confirmOpen) {
      dialogRef.current?.showModal();
      cancelButtonRef.current?.focus();
    } else {
      dialogRef.current?.close();
    }
  }, [confirmOpen]);

  function exportBackup() {
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`backup-turnamen-badminton-${date}.json`, createBackup(state), "application/json;charset=utf-8");
    setOpen(false);
  }

  function requestRestore() {
    setOpen(false);
    importInputRef.current?.click();
  }

  function importBackup(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const importedState = typeof reader.result === "string" ? parseBackup(reader.result) : null;
      if (!importedState) {
        setToast("File tidak valid. Pilih file backup JSON dari aplikasi ini.");
        return;
      }
      if (!window.confirm("Restore akan menggantikan seluruh data turnamen yang sedang terbuka. Lanjutkan?")) return;
      dispatch({ type: "IMPORT_TOURNAMENT", state: importedState });
      setToast("Backup berhasil dipulihkan.");
    };
    reader.onerror = () => setToast("File backup tidak dapat dibaca.");
    reader.readAsText(file);
  }

  function openResetDialog() {
    setOpen(false);
    setConfirmOpen(true);
  }

  function handleReset() {
    dispatch({ type: "RESET_TOURNAMENT" });
    setConfirmOpen(false);
  }

  return (
    <div className="overflow-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="overflow-btn"
        aria-label="Menu lainnya"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={20} />
      </button>

      {open && (
        <div className="overflow-menu" role="menu">
          <button type="button" role="menuitem" className="overflow-menu-item" onClick={exportBackup}>
            <Download size={18} />
            Backup data (.json)
          </button>
          <button type="button" role="menuitem" className="overflow-menu-item" onClick={requestRestore}>
            <Upload size={18} />
            Restore dari backup
          </button>
          <div className="overflow-menu-divider" />
          <button type="button" role="menuitem" className="overflow-menu-item overflow-menu-item-danger" onClick={openResetDialog}>
            <RotateCcw size={18} />
            Reset turnamen…
          </button>
        </div>
      )}

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="overflow-file-input"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          importBackup(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <dialog ref={dialogRef} className="confirm-dialog" onClose={() => setConfirmOpen(false)}>
        <div className="confirm-dialog-body">
          <p className="confirm-dialog-title">Reset turnamen?</p>
          <p className="confirm-dialog-text">Semua peserta, tim, dan skor akan dihapus. Backup dulu kalau masih perlu.</p>
          <div className="confirm-dialog-actions">
            <button ref={cancelButtonRef} type="button" className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>
              Batal
            </button>
            <button type="button" className="btn btn-danger-filled" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      </dialog>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
