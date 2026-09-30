import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { ru, en } from "./translations";

// Uch tilli interfeys uchun kontekst (o'zbek / rus / ingliz).
//
// Ishlash tamoyili: kalit sifatida ASL O'ZBEKCHA MATN ishlatiladi (yangi
// nom o'ylab topish shart emas — 1000+ matn uchun bu ancha tezroq va
// xatoga kamroq moyil). t("Chiqish") uz rejimida "Chiqish" ni qaytaradi,
// ru rejimida translations.js dagi `ru` lug'atidan, en rejimida esa `en`
// lug'atidan mos tarjimani qidiradi. Agar tarjima hali qo'shilmagan
// bo'lsa — asl o'zbekcha matn qaytadi (sahifa hech qachon bo'sh yoki
// "undefined" ko'rsatmaydi).

const LanguageContext = createContext(null);

const STORAGE_KEY = "seismo_lang";
const LANGS = ["uz", "ru", "en"];
const DICTS = { ru, en };

function normalizeLang(value) {
  return LANGS.includes(value) ? value : "uz";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return normalizeLang(localStorage.getItem(STORAGE_KEY));
    } catch {
      return "uz";
    }
  });

  const setLang = useCallback((newLang) => {
    const normalized = normalizeLang(newLang);
    setLangState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // localStorage yopiq bo'lishi mumkin (xususiy rejim) — muammo emas,
      // shu sessiya davomida tanlov useState ichida saqlanadi
    }
  }, []);

  const toggleLang = useCallback(() => {
    const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
    setLang(next);
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // vars — ixtiyoriy: dinamik qiymatli matnlar uchun. Kalitning o'zi
  // "{nom}" ko'rinishidagi joy egalari bilan yoziladi, masalan:
  //   t("{count} ta natija topildi", { count: 5 })
  // Tarjima ham xuddi shu joy egalari bilan yoziladi — so'z tartibi
  // tillar orasida farq qilishi mumkin bo'lgani uchun bu muhim.
  const t = useCallback(
    (uzText, vars) => {
      const dict = DICTS[lang];
      const raw = dict ? dict[uzText] ?? uzText : uzText;
      if (!vars) return raw;
      return Object.keys(vars).reduce(
        (s, k) => s.replaceAll(`{${k}}`, vars[k]),
        raw
      );
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, langs: LANGS, t }),
    [lang, setLang, toggleLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage LanguageProvider ichida ishlatilishi kerak");
  }
  return ctx;
}
