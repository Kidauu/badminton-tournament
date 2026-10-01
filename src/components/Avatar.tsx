function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Avatar({ name, size = 36 }: { name: string; size?: 36 | 34 }) {
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}

export function AvatarStack({ names }: { names: string[] }) {
  return (
    <span className="avatar-stack">
      {names.map((name, i) => (
        <Avatar key={i} name={name} size={34} />
      ))}
    </span>
  );
}
