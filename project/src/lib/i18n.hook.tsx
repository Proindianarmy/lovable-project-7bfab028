/**
 * i18n.hook.tsx — React hook for translations
 * Separated from i18n.ts so the hook (which uses JSX/React APIs)
 * lives in a .tsx file, avoiding TS/JSX parse errors.
 */
import { useContext } from "react";
import { LangContext } from "./LangContext";
import { type TKey, translate } from "./i18n";

export function useT() {
  const { lang } = useContext(LangContext);
  return (key: TKey) => translate(key, lang);
}
