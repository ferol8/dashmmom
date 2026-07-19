import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getScheduleData } from "@/lib/dashboard.functions";
import { Card } from "@/components/ui/card";

const TIMEZONE = "America/Mexico_City";
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function convertUtcToLocal(dow: number, hourUtc: number): { dow: number; hour: number } {
  // Build a reference Sunday date in UTC and convert to TZ
  // dow: 0=Sun ... 6=Sat (assuming) — we'll normalize both to Mon-first
  const baseUtc = new Date(Date.UTC(2024, 0, 7 + dow, hourUtc, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE, weekday: "short", hour: "numeric", hour12: false,
  }).formatToParts(baseUtc);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const map: Record<string, number> = { Sun: 6, Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };
  return { dow: map[wd] ?? 0, hour: h };
}

export function TabSchedule() {
  const fn = useServerFn(getScheduleData);
  const { data, isLoading } = useQuery({ queryKey: ["schedule"], queryFn: () => fn() });
  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;

  const grid: Array<Array<number>> = Array.from({ length: 7 }, () => Array(24).fill(0));
  let max = 0;
  for (const r of data?.bestTime ?? []) {
    const { dow, hour } = convertUtcToLocal(r.day_of_week ?? 0, r.hour ?? 0);
    const v = Number(r.score ?? r.engagement ?? 0);
    if (dow >= 0 && dow < 7 && hour >= 0 && hour < 24) {
      grid[dow][hour] += v;
      if (grid[dow][hour] > max) max = grid[dow][hour];
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3">
        <h3 className="font-medium">Mejor hora para publicar</h3>
        <p className="text-xs text-muted-foreground">Zona horaria: {TIMEZONE}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th className="w-10"></th>
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="px-1 text-muted-foreground font-normal w-6 text-center">
                  {h % 3 === 0 ? h : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, dow) => (
              <tr key={dow}>
                <td className="text-muted-foreground pr-2">{DAYS[dow]}</td>
                {row.map((v, h) => {
                  const intensity = max > 0 ? v / max : 0;
                  return (
                    <td key={h} className="p-0.5">
                      <div
                        className="w-5 h-5 rounded-sm"
                        style={{
                          backgroundColor: `oklch(0.7 ${0.02 + intensity * 0.1} 145 / ${0.15 + intensity * 0.85})`,
                        }}
                        title={`${DAYS[dow]} ${h}:00 → ${v.toFixed(2)}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
