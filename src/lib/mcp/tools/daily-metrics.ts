import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { jsonResult, requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_daily_metrics",
  title: "Métricas diarias",
  description:
    "Serie diaria de alcance, vistas, likes, comentarios, guardados, compartidos e interacciones, junto con el histórico de seguidores.",
  inputSchema: {
    days: z
      .number()
      .int()
      .min(1)
      .max(365)
      .default(90)
      .describe("Cuántos días hacia atrás incluir (por defecto 90)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    const userId = requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const since = new Date();
    since.setDate(since.getDate() - (days ?? 90));
    const isoDate = since.toISOString().slice(0, 10);
    const [daily, followers] = await Promise.all([
      supabase
        .from("daily_metrics")
        .select(
          "date, reach, views, likes, comments_count, saves, shares, interactions, engaged",
        )
        .eq("user_id", userId)
        .gte("date", isoDate)
        .order("date"),
      supabase
        .from("follower_history")
        .select("date, followers_count")
        .eq("user_id", userId)
        .gte("date", isoDate)
        .order("date"),
    ]);
    return jsonResult({
      since: isoDate,
      daily: daily.data ?? [],
      followers: followers.data ?? [],
    });
  },
});