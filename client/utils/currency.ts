import { lk } from "./ledgerStorage";

// Currency options — order mirrors VOICE_LANG_OPTIONS in Settings.tsx
export const CURRENCY_OPTIONS = [
  { lang: "th-TH", symbol: "฿",  label: "฿  Thai Baht" },
  { lang: "en-US", symbol: "$",  label: "$  US Dollar" },
  { lang: "zh-CN", symbol: "¥",  label: "¥  Chinese Yuan" },
  { lang: "ja-JP", symbol: "¥",  label: "¥  Japanese Yen" },
  { lang: "ko-KR", symbol: "₩",  label: "₩  Korean Won" },
  { lang: "fr-FR", symbol: "€",  label: "€  Euro (FR)" },
  { lang: "de-DE", symbol: "€",  label: "€  Euro (DE)" },
  { lang: "es-ES", symbol: "€",  label: "€  Euro (ES)" },
  { lang: "pt-BR", symbol: "R$", label: "R$  Brazilian Real" },
  { lang: "vi-VN", symbol: "₫",  label: "₫  Vietnamese Dong" },
  { lang: "ms-MY", symbol: "RM", label: "RM  Malaysian Ringgit" },
];

export function getCurrencySymbol(): string {
  try {
    const s = JSON.parse(localStorage.getItem(lk("app_settings")) || "{}");
    return typeof s.currencySymbol === "string" && s.currencySymbol.length > 0
      ? s.currencySymbol
      : "฿";
  } catch { return "฿"; }
}

export function getAccountCurrency(accountId: string): { currency: string; exchangeRate: number } {
  try {
    const accounts = JSON.parse(localStorage.getItem(lk("app_accounts")) || "[]");
    const acc = accounts.find((a: any) => a.id === accountId);
    if (acc && acc.currency && typeof acc.exchangeRate === "number" && acc.exchangeRate > 0) {
      return { currency: acc.currency, exchangeRate: acc.exchangeRate };
    }
  } catch {}
  return { currency: "", exchangeRate: 1 };
}

export function isForeignCurrency(accountId: string): boolean {
  return getAccountCurrency(accountId).currency !== "";
}
