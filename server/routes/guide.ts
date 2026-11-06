import { Router } from "express";

const router = Router();

const BASE = process.env.APP_URL || "https://neverjod.com";

// Localized guide slides served from public/guide/<lang>/.
// Must be absolute URLs: relative paths would resolve to the APK's bundled assets.
const NAMES = ["guide-voice", "guide-summary", "guide-backup", "guide-premium"];
const LANGS = ["th", "zh", "en"] as const;
type Lang = (typeof LANGS)[number];
const localized = (lang: Lang) => NAMES.map((n) => `${BASE}/guide/${lang}/${n}.jpg`);

// GUIDE_SLIDES (comma-separated URLs) overrides the localized set for every language.
const override = (() => {
  const env = process.env.GUIDE_SLIDES;
  const list = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return list.length > 0 ? list : null;
})();

// Pick the first supported language from Accept-Language (sent by the WebView from the device locale).
function pickLang(header: string | undefined): Lang {
  if (!header) return "en";
  const prefs = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { base: tag.split("-")[0], q: q ? parseFloat(q.trim().slice(2)) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { base } of prefs) {
    if ((LANGS as readonly string[]).includes(base)) return base as Lang;
  }
  return "en";
}

router.get("/slides", (req, res) => {
  res.set("Vary", "Accept-Language");
  const lang = typeof req.query.lang === "string" && (LANGS as readonly string[]).includes(req.query.lang)
    ? (req.query.lang as Lang)
    : pickLang(req.headers["accept-language"]);
  res.json({ slides: override ?? localized(lang), lang });
});

export default router;
