// Server-only pre-filters for comments and DMs.
// Copied verbatim from the project spec (do not modify pattern lists here —
// extend BOT_PATTERNS with brand-specific names in a separate step).

export const ADORATION_PATTERNS: RegExp[] = [
  /\bte amo+\b/i, /\bte adoro\b/i, /\bte admiro\b/i,
  /\beres mi (?:[íi]dola|[íi]dolo|favorita?)\b/i,
  /\beres (?:mi |la |un |una )?(?:diosa?|reina?|reinota|favorita?|m[aá]xima?|crack|grande|inspiraci[óo]n)\b/i,
  /\bdios[ae]\b/i, /\breina\b/i, /\breinota\b/i,
  /\bpreciosa\b/i, /\bhermosa\b/i, /\blinda+\b/i, /\blindo+\b/i,
  /\bbonita\b/i, /\bbonito\b/i, /\bbella\b/i, /\bdivina\b/i,
  /\bbrutal\b/i, /\bespectacular\b/i, /\bfabulosa?\b/i,
  /\bgenial\b/i, /\bincre[ií]ble\b/i, /\bperfecta?\b/i,
  /\bmaravillosa?\b/i, /\bbuen[íi]sim[ao]\b/i, /\bbrav[oa]\b/i,
  /\bfelicit\w*\b/i, /\bfelicidades\b/i, /\bgracias\b/i,
  /\bque (?:linda|lindo|hermosa|preciosa|bella|bonita|chimba|chimbita|genia)\b/i,
  /\bqu[eé] (?:linda|lindo|hermosa|preciosa|bella|bonita|chimba|chimbita|genia)\b/i,
  /\bla (?:mejor|m[aá]xima|m[aá]s|number one)\b/i,
  /\beres la mejor\b/i, /\bsublim\w*\b/i, /\bidola\b/i,
  /\b[íi]dola\b/i, /\b[íi]dolo\b/i, /\bbb+\b/i,
  /\b(?:hola|holi|holaa+)\b/i,
  /\bi love (?:it|you|this)\b/i, /\blove (?:it|you|this)\b/i,
  /\bamazing\b/i, /\bgorgeous\b/i, /\bbeautiful\b/i,
  /\bawesome\b/i, /\bperfect\b/i, /\bqueen\b/i,
  /\bstunning\b/i, /\bso cute\b/i, /\byes\b/i, /\bwow\b/i, /\bomg\b/i,
  /\bjajaja+\b/i, /\bjeje+\b/i, /\bjiji+\b/i, /\bguau+\b/i,
  /\bayyy+\b/i, /\baaa+\b/i, /\bsii+\b/i, /\bs[íi]\b/i,
  /\bclaro\b/i, /\bok+\b/i, /\bcierto\b/i, /\btotal\b/i,
  /\beso es\b/i, /\bmuy bien\b/i, /\bsuper\b/i, /\bs[uú]per\b/i,
  /\btal cual\b/i, /\bexacto\b/i,
];

export const BOT_PATTERNS: RegExp[] = [
  /\bhaz cl[ií]ck? aqu[ií]\b/i,
  /\bhaz clic aqu[ií]\b/i,
  /\bd[eé]jame contarte\b/i,
  /\bte prepar[eé]\b/i,
  /\bnunca hab[ií]a compartido\b/i,
  /\bes mi programa m[aá]s\b/i,
  /\bmi programa m[aá]s completo\b/i,
  /\bes mi curso m[aá]s\b/i,
  /\baprende(?:r[aá]s|s) (?:todo|de cero)\b/i,
  /\bcuando quieras acceder\b/i,
  /\baccede al curso\b/i,
  /\bcurso gratuito\b/i,
  /\bnos vemos ah[ií]\b/i,
  /\bestoy por aqu[ií]\b/i,
  /\bsolo me quiero asegurar\b/i,
  /\bme quiero asegurar de que\b/i,
  /\bperfecto!? para tener acceso\b/i,
  /\bperfecto!? ahora s[oó]?lo voy a necesitar\b/i,
  /\bahora s[oó]lo voy a necesitar\b/i,
  /\bveo en mi sistema\b/i,
  /\bya tengo tu (?:correo|email|nombre)\b/i,
  /\best[aá]s en l[ií]nea\b/i,
  /\bescr[ií]belo abajo\b/i,
  /\bconsiste en \d+ correos?\b/i,
  /\bcada correo est[aá] dise[ñn]ado\b/i,
  /\bes la misma estrategia que us[eé]\b/i,
  /\bun gusto tenerte por aqu[ií]\b/i,
  /\bya eres de la casa\b/i,
  /\baqu[ií] lo tienes+\b/i,
  /\bs[ií]i+ por aqu[ií]\b/i,
  /\bun gusto saludarte+\b/i,
  /\bqu[eé] lindo verte\b/i,
  /\bsi quieres acceso\b/i,
  /\bdale clic\b/i,
  /\bhaz clic\b/i,
];

export const URL_RE = /https?:\/\/\S+/;
export const EMAIL_ONLY_RE = /^\s*[\w.+-]+@[\w-]+\.[\w.-]+\s*$/;

const EMOJI_ONLY_RE = /^[\s\p{P}\p{S}\p{Emoji_Presentation}\p{Extended_Pictographic}]*$/u;

function stripAdoration(text: string): string {
  let out = text;
  for (const re of ADORATION_PATTERNS) out = out.replace(re, " ");
  return out.replace(/\s+/g, " ").trim();
}

export function isLikelyBotMessage(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (EMAIL_ONLY_RE.test(t)) return true;
  const urlMatch = t.match(URL_RE);
  if (urlMatch) {
    const withoutUrl = t.replace(URL_RE, "").trim();
    if (withoutUrl.length < 20) return true;
  }
  for (const re of BOT_PATTERNS) if (re.test(t)) return true;
  return false;
}

export function isSubstantiveComment(text: string, minLen = 20): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length === 0) return false;
  if (EMOJI_ONLY_RE.test(t)) return false;
  if (t.includes("?") || t.includes("¿")) return true;
  const stripped = stripAdoration(t);
  return stripped.length >= 15 && t.length >= minLen;
}

export function isSubstantiveDm(text: string, minLen = 15): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length === 0) return false;
  if (EMOJI_ONLY_RE.test(t)) return false;
  if (isLikelyBotMessage(t)) return false;
  if (t.includes("?") || t.includes("¿")) return true;
  const stripped = stripAdoration(t);
  return stripped.length >= 12 && t.length >= minLen;
}