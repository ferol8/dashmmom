import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "sage" | "neutral";
  className?: string;
}

export function KpiCard({ label, value, hint, accent = "neutral", className }: Props) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "font-serif text-3xl mt-1",
          accent === "primary" && "text-primary",
          accent === "sage" && "text-accent",
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
      ) : null}
    </Card>
  );
}