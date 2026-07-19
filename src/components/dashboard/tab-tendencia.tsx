import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTrendData } from "@/lib/dashboard.functions";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Toggle } from "@/components/ui/toggle";

const METRICS = [
  { key: "reach", label: "Alcance", color: "var(--chart-1)" },
  { key: "views", label: "Vistas", color: "var(--chart-2)" },
  { key: "likes", label: "Likes", color: "var(--chart-4)" },
  { key: "comments_count", label: "Coments.", color: "var(--chart-3)" },
  { key: "interactions", label: "Interac.", color: "var(--chart-5)" },
] as const;

export function TabTendencia() {
  const fn = useServerFn(getTrendData);
  const { data, isLoading } = useQuery({ queryKey: ["trend"], queryFn: () => fn() });
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    reach: true, views: true, likes: false, comments_count: false, interactions: false,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Métricas día a día</h3>
            <p className="text-xs text-muted-foreground">Últimos 90 días</p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {METRICS.map((m) => (
              <Toggle
                key={m.key}
                size="sm"
                pressed={enabled[m.key]}
                onPressedChange={(v) => setEnabled((p) => ({ ...p, [m.key]: v }))}
              >
                {m.label}
              </Toggle>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={data?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {METRICS.filter((m) => enabled[m.key]).map((m) => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={false}
                  name={m.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium">Crecimiento de seguidores</h3>
        <div className="h-56 mt-3">
          <ResponsiveContainer>
            <LineChart data={data?.followers ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="followers_count"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                name="Seguidores"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
*** End Patch