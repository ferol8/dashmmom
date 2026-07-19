import { cn } from "@/lib/utils";

interface Props {
  status?: string | null;
  label?: string | null;
}

export function HealthBadge({ status, label }: Props) {
  const s = (status ?? "").toLowerCase();
  const kind =
    s.includes("green") || s.includes("healthy") || s.includes("good") || s.includes("saludable")
      ? "good"
      : s.includes("yellow") || s.includes("warning") || s.includes("warn") || s.includes("medio")
        ? "warn"
        : s === ""
          ? "unknown"
          : "bad";
  const dot =
    kind === "good"
      ? "bg-emerald-500"
      : kind === "warn"
        ? "bg-amber-500"
        : kind === "bad"
          ? "bg-rose-500"
          : "bg-muted-foreground";
  const text =
    kind === "good"
      ? "Saludable"
      : kind === "warn"
        ? "Con avisos"
        : kind === "bad"
          ? "Problema"
          : "—";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground")}>
      <span className={cn("w-2 h-2 rounded-full", dot)} />
      {label ?? text}
    </span>
  );
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1000) {
    return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  }
  return String(n);
}