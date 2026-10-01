import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBootstrap, getDashboardPreferences, refreshAll } from "@/lib/dashboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { HealthBadge, formatNumber } from "@/components/dashboard/health-badge";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";
import { TabAudiencia } from "@/components/dashboard/tab-audiencia";
import { TabPosts } from "@/components/dashboard/tab-posts";
import { TabEngagement } from "@/components/dashboard/tab-engagement";
import { TabRevenue } from "@/components/dashboard/tab-revenue";
import { TabReports } from "@/components/dashboard/tab-reports";
import { TabSettings } from "@/components/dashboard/tab-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, CalendarDays, FileBarChart, Heart, Home, Image, LogOut, Menu, RefreshCw, Settings, Users, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
const perfilAsset = { url: "https://mueblemom.com/wp-content/uploads/2026/07/1784556013-23a946b107e236e616e659b81a3d0c02.jpg" };

type Section = "resumen" | "contenido" | "audiencia" | "engagement" | "ingresos" | "reportes" | "ajustes";
type Period = 7 | 28 | 90;

const NAV_ITEMS = [
  { id: "resumen", label: "Resumen", icon: Home },
  { id: "contenido", label: "Contenido", icon: Image },
  { id: "audiencia", label: "Audiencia", icon: Users },
  { id: "engagement", label: "Engagement", icon: Heart },
  { id: "ingresos", label: "Ingresos", icon: WalletCards },
  { id: "reportes", label: "Reportes", icon: FileBarChart },
  { id: "ajustes", label: "Ajustes", icon: Settings },
] as const;

const SECTION_COPY: Record<Section, { title: string; description: string }> = {
  resumen: { title: "Resumen", description: "Rendimiento general de tu cuenta" },
  contenido: { title: "Contenido", description: "Rendimiento de tus publicaciones" },
  audiencia: { title: "Audiencia", description: "Conoce mejor a tu comunidad" },
  engagement: { title: "Engagement", description: "Tendencias, horarios y frecuencia" },
  ingresos: { title: "Ingresos", description: "Control de colaboraciones y ventas" },
  reportes: { title: "Reportes", description: "Descarga tus datos para analizarlos" },
  ajustes: { title: "Ajustes", description: "Preferencias y estado de la cuenta" },
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · @mueblemom" },
      { name: "description", content: "Panel privado de análisis de contenido de @mueblemom." },
      { property: "og:title", content: "Dashboard · @mueblemom" },
      { property: "og:description", content: "Panel privado de análisis de contenido de @mueblemom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bootFn = useServerFn(getBootstrap);
  const preferencesFn = useServerFn(getDashboardPreferences);
  const refreshFn = useServerFn(refreshAll);
  const [section, setSection] = useState<Section>("resumen");
  const [days, setDays] = useState<Period>(28);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["bootstrap"], queryFn: () => bootFn() });
  const { data: preferencesData } = useQuery({ queryKey: ["dashboard-preferences"], queryFn: () => preferencesFn() });
  useEffect(() => {
    const preferred = preferencesData?.preferences.default_period;
    if (preferred === 7 || preferred === 28 || preferred === 90) setDays(preferred);
  }, [preferencesData]);

  const refresh = useMutation({
    mutationFn: () => refreshFn(),
    onSuccess: () => {
      toast.success("Datos actualizados");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined } });
  };

  const snap = data?.snapshot;
  const health = data?.health;
  const lastRefresh = data?.lastRefresh;
  const current = SECTION_COPY[section];
  const currency = preferencesData?.preferences.currency ?? "MXN";

  const chooseSection = (next: Section) => { setSection(next); setMobileOpen(false); };

  const sectionContent = () => {
    if (section === "resumen") return <OverviewDashboard days={days} />;
    if (section === "contenido") return <TabPosts />;
    if (section === "audiencia") return <TabAudiencia />;
    if (section === "engagement") return <TabEngagement />;
    if (section === "ingresos") return <TabRevenue currency={currency} />;
    if (section === "reportes") return <TabReports days={days} />;
    return <TabSettings />;
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[220px_1fr]">
      <aside className={`${mobileOpen ? "flex" : "hidden"} fixed inset-0 z-40 flex-col border-r bg-sidebar p-3 lg:sticky lg:top-0 lg:flex lg:h-screen`}>
        <div className="flex h-16 items-center justify-between px-2">
          <div className="flex items-center gap-3"><img src={perfilAsset.url} alt="@mueblemom" className="size-10 rounded-lg object-cover" /><div><p className="font-semibold">@mueblemom</p><p className="text-[11px] text-muted-foreground">{formatNumber(snap?.followers_count)} seguidores</p></div></div>
          <Button className="lg:hidden" variant="ghost" size="icon" title="Cerrar menú" onClick={() => setMobileOpen(false)}><X className="size-5" /></Button>
        </div>
        <nav className="mt-5 space-y-1" aria-label="Secciones del panel">
          {NAV_ITEMS.map((item) => { const Icon = item.icon; const active = section === item.id; return <Button key={item.id} variant="ghost" className={`w-full justify-start gap-3 ${active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-muted-foreground"}`} onClick={() => chooseSection(item.id)}><Icon className="size-[18px]" /> {item.label}</Button>; })}
        </nav>
        <div className="mt-auto border-t pt-4">
          <div className="mb-3 flex items-center justify-between px-2 text-xs text-muted-foreground"><span>{snap?.media_count ?? 0} posts</span><HealthBadge status={health?.status} /></div>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}><LogOut className="size-[18px]" /> Cerrar sesión</Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
          <div className="flex min-h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button className="lg:hidden" variant="ghost" size="icon" title="Abrir menú" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></Button>
            <div className="hidden min-w-0 flex-1 sm:block"><h1 className="truncate text-2xl font-semibold tracking-normal">{current.title}</h1><p className="mt-0.5 truncate text-sm text-muted-foreground">{current.description}</p></div>
            {section === "resumen" || section === "reportes" ? <Select value={String(days)} onValueChange={(value) => setDays(Number(value) as Period)}><SelectTrigger className="ml-auto w-[154px] sm:ml-0"><CalendarDays className="size-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Últimos 7 días</SelectItem><SelectItem value="28">Últimos 28 días</SelectItem><SelectItem value="90">Últimos 90 días</SelectItem></SelectContent></Select> : <div className="flex-1 sm:hidden"><h1 className="truncate text-lg font-semibold tracking-normal">{current.title}</h1></div>}
            <Button variant="outline" size="icon" title="Refrescar datos" onClick={() => refresh.mutate()} disabled={refresh.isPending}><RefreshCw className={`size-4 ${refresh.isPending ? "animate-spin" : ""}`} /></Button>
          </div>
          <div className="px-4 pb-2 text-[11px] text-muted-foreground sm:px-6 lg:px-8">{lastRefresh?.finished_at ? `Actualizado ${new Date(lastRefresh.finished_at).toLocaleString("es-MX")}` : "Aún sin actualización"}</div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{sectionContent()}</main>
      </div>
    </div>
  );
}