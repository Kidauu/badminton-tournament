export function ResultChip({ text, tone, rowFit }: { text: string; tone: "win" | "neutral"; rowFit?: boolean }) {
  const classes = ["result-chip", tone === "win" ? "result-chip-win" : "result-chip-neutral"];
  if (rowFit) classes.push("result-chip-row");
  return <span className={classes.join(" ")}>{text}</span>;
}
