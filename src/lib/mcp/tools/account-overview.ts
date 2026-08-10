import { defineTool } from "@lovable.dev/mcp-js";
import { jsonResult, requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_account_overview",
  title: "Resumen de la cuenta",
  description:
    "Devuelve el snapshot de la cuenta de Instagram (seguidores, posts), su estado de salud, las métricas de los últimos 30 días y la fecha de la última actualización de datos.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const userId = requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const [snapshot, health, insights, lastRefresh] = await Promise.all([
      supabase.from("account_snapshot").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("account_health").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("account_insights_30d").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("refresh_log")
        .select("started_at, finished_at, status")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return jsonResult({
      snapshot: snapshot.data,
      health: health.data,
      insights_30d: insights.data,
      last_refresh: lastRefresh.data,
    });
  },
});