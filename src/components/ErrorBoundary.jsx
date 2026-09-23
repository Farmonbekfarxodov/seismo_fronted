import { Component } from "react";
import { ru } from "../i18n/translations";

// Klass komponent bo'lgani uchun useLanguage() hook ishlatib bo'lmaydi —
// tilni to'g'ridan-to'g'ri localStorage'dan o'qiymiz (LanguageContext
// bilan bir xil kalit, STORAGE_KEY = "seismo_lang")
function readLang() {
  try {
    return localStorage.getItem("seismo_lang") === "ru" ? "ru" : "uz";
  } catch {
    return "uz";
  }
}
function tt(uzText) {
  return readLang() === "ru" ? (ru[uzText] ?? uzText) : uzText;
}

/**
 * Xato chegarasi: biror sahifada kutilmagan JS xatosi yuz bersa,
 * butun ilova "oq ekran" bo'lib qolmaydi — xato xabari va
 * qayta yuklash tugmasi ko'rsatiladi.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Sahifa xatosi:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-lg mx-auto mt-16 card text-center">
          <h2 className="text-lg mb-2">{tt("Kutilmagan xatolik yuz berdi")}</h2>
          <p className="text-sm text-muted mb-4">
            {tt("Sahifani qayta yuklab ko'ring. Muammo takrorlansa, qaysi amalda chiqqanini eslab qoling — bu tuzatishga yordam beradi.")}
          </p>
          <p className="text-xs text-danger font-mono mb-4 break-all">
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            {tt("Sahifani qayta yuklash")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
