import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { ru } from "./translations";

// Ikki tilli interfeys uchun kontekst.
//
// Ishlash tamoyili: kalit sifatida ASL O'ZBEKCHA MATN ishlatiladi (yangi
// nom o'ylab topish shart emas — 1000+ matn uchun bu ancha tezroq va
// xatoga kamroq moyil). t("Chiqish") uz rejimida "Chiqish" ni qaytaradi,
// ru rejimida esa translations.js dagi `ru` lug'atidan mos tarjimani
// qidiradi. Agar tarjima hali qo'shilmagan bo'lsa — asl o'zbekcha matn
// qaytadi (sahifa hech qachon bo'sh yoki "undefined" ko'rsatmaydi).

const LanguageContext = createContext(null);

const STORAGE_KEY = "seismo_lang";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "ru" ? "ru" : "uz";
    } catch {
      return "uz";
    }
  });

  const setLang = useCallback((newLang) => {
    setLangState(newLang === "ru" ? "ru" : "uz");
    try {
      localStorage.setItem(STORAGE_KEY, newLang === "ru" ? "ru" : "uz");
    } catch {
      // localStorage yopiq bo'lishi mumkin (xususiy rejim) — muammo emas,
      // shu sessiya davomida tanlov useState ichida saqlanadi
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "uz" ? "ru" : "uz");
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
      const raw = lang !== "ru" ? uzText : ru[uzText] ?? uzText;
      if (!vars) return raw;
      return Object.keys(vars).reduce(
        (s, k) => s.replaceAll(`{${k}}`, vars[k]),
        raw
      );
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t }),
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
