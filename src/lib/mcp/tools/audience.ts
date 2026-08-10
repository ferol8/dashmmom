import { defineTool } from "@lovable.dev/mcp-js";
import { jsonResult, requireUser, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_audience_demographics",
  title: "Demografía de la audiencia",
  description:
    "Distribución de la audiencia por edad, género, país y ciudad.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const userId = requireUser(ctx);
    const supabase = supabaseForUser(ctx);
    const [age, gender, country, city] = await Promise.all([
      supabase.from("demographics_age").select("*").eq("user_id", userId),
      supabase.from("demographics_gender").select("*").eq("user_id", userId),
      supabase
        .from("demographics_country")
        .select("*")
        .eq("user_id", userId)
        .order("percentage", { ascending: false, nullsFirst: false }),
      supabase
        .from("demographics_city")
        .select("*")
        .eq("user_id", userId)
        .order("percentage", { ascending: false, nullsFirst: false }),
    ]);
    return jsonResult({
      age: age.data ?? [],
      gender: gender.data ?? [],
      country: country.data ?? [],
      city: city.data ?? [],
    });
  },
});