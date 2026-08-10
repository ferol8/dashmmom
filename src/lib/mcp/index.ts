import { auth, defineMcp } from "@lovable.dev/mcp-js";
import accountOverviewTool from "./tools/account-overview";
import dailyMetricsTool from "./tools/daily-metrics";
import topPostsTool from "./tools/top-posts";
import postCommentsTool from "./tools/post-comments";
import audienceTool from "./tools/audience";
import scheduleTool from "./tools/schedule";

const projectRef =
  import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "insightful-creator",
  title: "Insightful Creator",
  version: "0.1.0",
  instructions:
    "Herramientas de solo lectura sobre las analíticas de Instagram de @mueblemom. Usa get_account_overview para el estado general, get_daily_metrics para tendencias, get_top_posts y get_post_comments para contenido, get_audience_demographics para la audiencia y get_posting_schedule para saber cuándo publicar.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    accountOverviewTool,
    dailyMetricsTool,
    topPostsTool,
    postCommentsTool,
    audienceTool,
    scheduleTool,
  ],
});