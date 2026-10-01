export function StatusChip({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <span className="status-chip">
      <span className="status-chip-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
