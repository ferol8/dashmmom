import { createFileRoute } from "@tanstack/react-router";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Analíticas de Instagram · @mueblemom" },
      { name: "description", content: "Acceso al panel privado de rendimiento, audiencia, contenido e ingresos de @mueblemom." },
      { property: "og:title", content: "Analíticas de Instagram · @mueblemom" },
      { property: "og:description", content: "Panel privado de rendimiento, audiencia, contenido e ingresos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
