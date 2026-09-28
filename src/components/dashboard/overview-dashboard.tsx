import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardOverview } from "@/lib/dashboard.functions";
import { Card } from "@/components/ui/card";
import { Eye, Heart, MessageCircle, MousePointer2, Users, Activity, Play } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "./health-badge";

type Period = 7 | 28 | 90;

const METRICS = [
  { key: "views", label: "Vistas", icon: Eye, accent: "text-chart-1", bg: "bg-chart-1/10" },
  { key: "likes", label: "Likes", icon: Heart, accent: "text-destructive", bg: "bg-destructive/10" },
  { key: "comments_count", label: "Comentarios", icon: MessageCircle, accent: "text-chart-3", bg: "bg-chart-3/10" },
  { key: "shares", label: "Compartidos", icon: MousePointer2, accent: "text-chart-4", bg: "bg-chart-4/10" },
  { key: "reach", label: "Alcance", icon: Users, accent: "text-chart-2", bg: "bg-chart-2/10" },
] as const;

function change(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function OverviewDashboard({ days }: { days: Period }) {
  const overviewFn = useServerFn(getDashboardOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview", days],
    queryFn: () => overviewFn({ data: { days } }),
  });

  if (isLoading) return <OverviewSkeleton />;
  if (!data) return <Card className="p-8 text-center text-muted-foreground">No fue posible cargar el resumen.</Card>;

  const engagementChange = change(data.engagement, data.previousEngagement);
  const chartRows = data.daily.map((row) => ({
    ...row,
    engagement: Number(row.reach ?? 0) > 0 ? (Number(row.interactions ?? 0) / Number(row.reach)) * 100 : 0,
    label: new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${row.date}T00:00:00Z`)),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {METRICS.map((metric) => {
          const value = Number(data.totals[metric.key] ?? 0);
          const delta = change(value, Number(data.previousTotals[metric.key] ?? 0));
          const Icon = metric.icon;
          return (
            <Card key={metric.key} className="min-h-28 p-4 shadow-none">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className={`grid size-7 place-items-center rounded-md ${metric.bg}`}><Icon className={`size-4 ${metric.accent}`} /></span>
                {metric.label}
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <strong className="text-2xl font-semibold tracking-normal">{formatNumber(value)}</strong>
                {delta !== null ? <Delta value={delta} /> : null}
              </div>
            </Card>
          );
        })}
        <Card className="min-h-28 p-4 shadow-none">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="grid size-7 place-items-center rounded-md bg-primary/10"><Activity className="size-4 text-primary" /></span>
            Engagement
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            <strong className="text-2xl font-semibold tracking-normal">{data.engagement.toFixed(1)}%</strong>
            {engagementChange !== null ? <Delta value={engagementChange} /> : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-5 shadow-none">
          <h2 className="font-semibold">Rendimiento</h2>
          <p className="mt-1 text-xs text-muted-foreground">Actividad diaria del periodo seleccionado</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartRows}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" name="Vistas" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="reach" name="Alcance" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="interactions" name="Interacciones" stroke="var(--chart-4)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5 shadow-none">
          <h2 className="font-semibold">Evolución del engagement</h2>
          <p className="mt-1 text-xs text-muted-foreground">Interacciones sobre alcance por día</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRows}>
                <defs><linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis unit="%" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "Engagement"]} />
                <Area type="monotone" dataKey="engagement" stroke="var(--chart-4)" strokeWidth={2.5} fill="url(#engagementFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 shadow-none">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><h2 className="font-semibold">Contenido destacado</h2><p className="mt-1 text-xs text-muted-foreground">Los posts con más interacciones</p></div>
        </div>
        {data.featured.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.featured.map((post) => (
              <a key={post.id} href={post.permalink ?? undefined} target="_blank" rel="noreferrer" className="group relative aspect-[4/5] overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {post.thumbnail_url || post.media_url ? <img src={post.thumbnail_url ?? post.media_url ?? ""} alt={post.caption?.slice(0, 80) ?? "Publicación destacada"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-xs text-muted-foreground">Sin miniatura</div>}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-featured-overlay px-3 py-2 text-featured-foreground">
                  <span className="flex items-center gap-1 text-sm font-semibold"><Play className="size-3 fill-current" /> {formatNumber(post.views ?? post.reach)}</span>
                  <span className="text-[10px] uppercase">{post.post_type ?? "post"}</span>
                </div>
              </a>
            ))}
          </div>
        ) : <div className="py-10 text-center text-sm text-muted-foreground">Refresca los datos para mostrar tus publicaciones destacadas.</div>}
      </Card>
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  return <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{positive ? "↑" : "↓"} {Math.abs(value).toFixed(0)}%</span>;
}

function OverviewSkeleton() {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-md bg-muted" />)}</div>;
}