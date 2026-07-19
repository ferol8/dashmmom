# Dashboard @mueblemom — Plan de construcción

Proyecto grande. Voy a construirlo por fases, validando cada una antes de seguir. Sigo tu spec al pie de la letra (endpoints Zernio exactos, prompt de Claude verbatim, filtros literales, 3 bloques por idea, retención, RLS, todo server-side).

## Fase 0 — Prep (necesito de ti antes de tocar código)

1. Voy a activar **Lovable Cloud** (Postgres + Edge Functions + Auth + Secrets — es lo que en el spec llamas "backend de Supabase").
2. Voy a pedirte 3 secrets vía formulario seguro: `ZERNIO_API_KEY`, `ANTHROPIC_API_KEY`, y tu **zona horaria** (esta la guardo como config, no como secret).
3. Confírmame que tienes activos en Zernio los add-ons **Analytics** e **Inbox**.
4. Perfil fijo: `@mueblemom`, foto que subiste (la subo como asset del proyecto, no se refresca desde Zernio).

## Fase 1 — Auth + Schema + RLS

- Auth email/password (solo para ti, sin registro público visible pero funcional).
- Migración SQL con todas las tablas del spec (`meta`, `account_snapshot`, `account_health`, `account_insights_30d`, `daily_metrics`, `demographics_*`, `posts`, `comments`, `conversations`, `messages`, `best_time`, `posting_frequency`, `content_decay`, `follower_history`, `ideas`, `idea_discards`, `refresh_log`, `transcriptions`).
- RLS activado en todas, políticas scoped a `auth.uid()`.
- GRANTs explícitos a `authenticated` y `service_role`.

## Fase 2 — Cliente Zernio (Edge Function compartida)

- Helper único con `Authorization: Bearer`, `?platform=instagram`, retry+backoff 2/3/5/9s en 5xx y 429.
- Solo endpoints de lectura del spec. Explícitamente sin ningún endpoint de escritura.
- Función `resolveAccountId()` que llama `GET /accounts?platform=instagram`, toma el primer `_id`, lo guarda en `meta`.
- Valido cada endpoint contra tu cuenta real. Si alguno responde 402/403 → paro y te digo qué add-on activar.

## Fase 3 — Refresh orquestador

Edge Function `refresh-all` que:
- Llama a los 14 endpoints en orden, escribe/upserta en cada tabla.
- Aplica retención (comments 90d, DMs 30d, daily_metrics 180d, snapshots overwrite, follower_history acumulativo, ideas/discards acumulativos).
- Loguea en `refresh_log`.
- Primera corrida real → verifico que hay filas.

## Fase 4 — Pre-filtro de ideas (backend)

- `idea_filters.ts` con `ADORATION_PATTERNS`, `BOT_PATTERNS`, `URL_RE`, `EMAIL_ONLY_RE` **copiados literal** del spec.
- Funciones `isSubstantiveComment`, `isSubstantiveDm`, `isLikelyBotMessage`.
- Después de esto te pregunto los **nombres de tu bot/chatbot y de tus programas/cursos** para meterlos a `BOT_PATTERNS`.

## Fase 5 — Dashboard UI (7 pestañas + header)

Header fijo (foto @mueblemom, followers, salud, última actualización, botón Refrescar).
Tabs: Resumen · Tendencia · Audiencia · Posts (+drilldown modal) · Cuándo publicar (heatmap en tu TZ) · Frecuencia · Ideas.

Diseño alineado con la captura que subiste: fondo crema, acentos naranja/verde salvia, tipografía serif para números, cards limpias.

## Fase 6 — Sistema de ideas

- System prompt **copiado verbatim** del spec (asset versionado).
- Llamada a Claude con `prompt caching`: contexto grande (posts top, comentarios/DMs sustantivos, demografía, mejor hora) → bloque cacheado. Instrucción de generación + últimos 50 descartes → bloque no cacheado.
- Modelo: Claude Sonnet más reciente disponible (verifico al implementar).
- `max_tokens: 16000`, retry 2/3/5/9s en 5xx/429.
- `generateAllIdeas()` (25 ideas 10/5/10) y `generateBucket(bucket)`.
- Tarjeta con los 3 bloques obligatorios (citas verbatim, por qué buena, ángulo sugerido) + link al post + botón Descartar con modal de razones.
- Al descartar: insert en `idea_discards`, `ideas.discarded = true`, desaparece de UI.
- Limpieza defensiva de IDs en el render (3 regex del spec).

## Fase 7 — Validación end-to-end

Corro la checklist completa del spec (10 ítems) y te reporto resultado por ítem.

## Detalles técnicos

- **Stack real**: TanStack Start (lo que usa este template), no CRA/Next. Igual que React + Tailwind desde tu punto de vista.
- **Server-side**: Edge Functions vía server functions de TanStack; llaman a Zernio/Anthropic. El navegador nunca ve las API keys.
- **Costo**: te aviso el estimado (~$0.10–0.30 USD) antes de cada generación en el botón, como pediste.

## Qué necesito ahora para arrancar

1. ¿Confirmas que activo Lovable Cloud y te pido los 2 API keys + tu timezone?
2. ¿Add-ons Analytics + Inbox de Zernio activos?

En cuanto confirmes, arranco por Fase 0 → 1.
