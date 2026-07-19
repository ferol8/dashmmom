import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getScheduleData } from "@/lib/dashboard.functions";
import { Card } from "@/components/ui/card";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area,
} from "recharts";

export function TabFrecuencia() {
  const fn = useServerFn(getScheduleData);
  const { data, isLoading } = useQuery({ queryKey: ["schedule"], queryFn: () => fn() });
  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-5">
        <h3 className="font-medium">Frecuencia de publicación vs Engagement</h3>
        <div className="h-64 mt-3">
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="posts_per_week" name="Posts/semana" tick={{ fontSize: 11 }} />
              <YAxis dataKey="avg_engagement" name="Engagement" tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={data?.frequency ?? []} fill="var(--chart-1)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium">Curva de acumulación de engagement</h3>
        <div className="h-64 mt-3">
          <ResponsiveContainer>
            <AreaChart data={data?.decay ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="bucket_label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="cumulative_pct"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
*** End Patch