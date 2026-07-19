import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAudienceData } from "@/lib/dashboard.functions";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function DemoChart({ title, data }: { title: string; data: Array<{ bucket: string; percentage: number | null }> }) {
  return (
    <Card className="p-5">
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data.slice(0, 15)}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="percentage" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function TabAudiencia() {
  const fn = useServerFn(getAudienceData);
  const { data, isLoading } = useQuery({ queryKey: ["audience"], queryFn: () => fn() });
  if (isLoading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <DemoChart title="Edad" data={data?.age ?? []} />
      <DemoChart title="Género" data={data?.gender ?? []} />
      <DemoChart title="País" data={data?.country ?? []} />
      <DemoChart title="Ciudad" data={data?.city ?? []} />
    </div>
  );
}
