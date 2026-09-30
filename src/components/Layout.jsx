import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useLanguage } from "../i18n/LanguageContext";


export default function Layout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { lang, setLang, langs, t } = useLanguage();
  const LANG_LABELS = { uz: "UZ", ru: "RU", en: "EN" };

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navy logotipli panel (ichki sahifalar dizayni) */}
      <header
        className="border-b-[3px] border-navy-border"
        style={{ background: "linear-gradient(90deg, #003366, #001a33)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <a href="/" className="shrink-0">
            <img src="/static/images/logo6.png" alt="Logo"
              className="h-[52px] w-auto max-w-[180px] object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </a>
          <a href="/" className="shrink-0 hidden md:block">
            <img src="/static/images/logo5.png" alt="Right Logo"
              className="h-[52px] w-auto max-w-[180px] object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </a>
        </div>
      </header>

      {/* Oq navbar — bosh sahifadagi (index.html) dizayn */}
      <nav className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            <NavLink to="/" className="text-xl font-bold text-teal">Seismo.uz</NavLink>
            {[
              { to: "/", label: t("Umumiy"), end: true },
              { to: "/magnitka", label: t("Magnitka") },
              { to: "/anomaly", label: t("Anomaliya") },
              { to: "/informativlik", label: t("Informativlik") },
              { to: "/catalog", label: t("Katalog") },
              { to: "/epoch", label: t("Zilzila tahlili") },
            ].map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? "text-danger" : "text-ink-100 hover:text-danger"
                  }`
                }>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/* Til tanlash — barcha sahifalarda bitta joyda, chunki
                Layout barcha ichki sahifalarni o'rab turadi. Uchta til
                (uz/ru/en) bo'lgani uchun oddiy toggle tugmasi o'rniga
                segmentli tanlov ishlatiladi — joriy til doim ko'rinib
                turadi, qolgan ikkitasidan birini bosib o'tish mumkin. */}
            <div title="Til / Язык / Language"
              className="flex items-center rounded-md border border-ink-100 overflow-hidden">
              {langs.map((code) => (
                <button key={code} onClick={() => setLang(code)}
                  className={`px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                    lang === code
                      ? "bg-teal text-white"
                      : "text-ink-100 hover:bg-ink-900"
                  }`}>
                  {LANG_LABELS[code]}
                </button>
              ))}
            </div>
            <NavLink to="/download-base"
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-green-600 text-green-700 hover:bg-green-50 transition-colors">
              {t("Bazaga yuklash")}
            </NavLink>
            <NavLink to="/seismos"
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-teal text-teal hover:bg-blue-50 transition-colors">
              {t("GGS tahlili")}
            </NavLink>
            <button onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-ink-100 text-ink-100 hover:bg-ink-900 transition-colors">
              {t("Chiqish")}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
