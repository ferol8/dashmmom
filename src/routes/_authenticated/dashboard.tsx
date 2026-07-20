import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBootstrap, refreshAll } from "@/lib/dashboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HealthBadge, formatNumber } from "@/components/dashboard/health-badge";
import { TabResumen } from "@/components/dashboard/tab-resumen";
import { TabTendencia } from "@/components/dashboard/tab-tendencia";
import { TabAudiencia } from "@/components/dashboard/tab-audiencia";
import { TabPosts } from "@/components/dashboard/tab-posts";
import { TabSchedule } from "@/components/dashboard/tab-schedule";
import { TabFrecuencia } from "@/components/dashboard/tab-frecuencia";
import { TabIdeas } from "@/components/dashboard/tab-ideas";
import { RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
const perfilAsset = { url: "https://mueblemom.com/wp-content/uploads/2026/07/1784556013-23a946b107e236e616e659b81a3d0c02.jpg" };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · @mueblemom" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bootFn = useServerFn(getBootstrap);
  const refreshFn = useServerFn(refreshAll);

  const { data } = useQuery({ queryKey: ["bootstrap"], queryFn: () => bootFn() });

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
    navigate({ to: "/auth" });
  };

  const snap = data?.snapshot;
  const health = data?.health;
  const lastRefresh = data?.lastRefresh;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <img src={perfilAsset.url} alt="@mueblemom" className="w-12 h-12 rounded-full" />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl leading-none">@mueblemom</h1>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span>{formatNumber(snap?.followers_count)} seguidores</span>
              <span>{snap?.media_count ?? 0} posts</span>
              <HealthBadge status={health?.status} />
              {lastRefresh?.finished_at ? (
                <span>Actualizado: {new Date(lastRefresh.finished_at).toLocaleString("es-MX")}</span>
              ) : (
                <span>Sin datos aún</span>
              )}
            </div>
          </div>
          <Button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            variant="default"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refresh.isPending ? "animate-spin" : ""}`} />
            {refresh.isPending ? "Refrescando…" : "Refrescar datos"}
          </Button>
          <Button onClick={signOut} variant="ghost" size="icon" title="Salir">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="resumen">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="tendencia">Tendencia</TabsTrigger>
            <TabsTrigger value="audiencia">Audiencia</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="schedule">Mejor hora</TabsTrigger>
            <TabsTrigger value="frecuencia">Frecuencia</TabsTrigger>
          </TabsList>
          <TabsContent value="resumen"><TabResumen /></TabsContent>
          <TabsContent value="tendencia"><TabTendencia /></TabsContent>
          <TabsContent value="audiencia"><TabAudiencia /></TabsContent>
          <TabsContent value="posts"><TabPosts /></TabsContent>
          <TabsContent value="schedule"><TabSchedule /></TabsContent>
          <TabsContent value="frecuencia"><TabFrecuencia /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}