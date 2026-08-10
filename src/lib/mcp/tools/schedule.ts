import { defineTool } from "@lovable.dev/mcp-js";
import { jsonResult, requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_posting_schedule",
  title: "Mejor hora y frecuencia",
  description:
    "Devuelve el mapa de mejores horas para publicar, el rendimiento por frecuencia de publicación semanal y la curva de decaimiento del contenido.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const userId = requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const [bestTime, frequency, decay] = await Promise.all([
      supabase.from("best_time").select("*").eq("user_id", userId),
      supabase
        .from("posting_frequency")
        .select("*")
        .eq("user_id", userId)
        .order("posts_per_week"),
      supabase.from("content_decay").select("*").eq("user_id", userId).order("bucket_order"),
    ]);
    return jsonResult({
      best_time: bestTime.data ?? [],
      posting_frequency: frequency.data ?? [],
      content_decay: decay.data ?? [],
      timezone_note: "Las horas de best_time están en UTC.",
    });
  },
});