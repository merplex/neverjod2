import { useMemo } from "react";
import { t, getLang } from "../utils/i18n";

export function useT() {
  const lang = useMemo(() => getLang(), []);
  // re-export t with lang already resolved at mount time
  return useMemo(() => (key: string, vars?: Record<string, string | number>) => t(key, vars), [lang]);
}
