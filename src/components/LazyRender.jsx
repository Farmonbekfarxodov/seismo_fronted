import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Bolalarni faqat ekranga (yoki unga 400px yaqin) kelganda render qiladi.
 * Og'ir plotly grafiklar sahifa ochilishida brauzerni qotirmasligi uchun.
 */
export default function LazyRender({ height = 480, children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      // 400px o'rniga 1000px: sahifa hisobot uchun skrinshot olinganda yoki
      // pastga tez aylantirilganda ko'proq grafik OLDINDAN (ekranga
      // kelmasdan turib) tayyor bo'lib qoladi — "tayyorlanmoqda" holati
      // kamroq ko'rinadi.
      { rootMargin: "1000px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={{ minHeight: visible ? undefined : height }}>
      {visible ? children : (
        <div className="card flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted">{t("Grafik tayyorlanmoqda...")}</p>
        </div>
      )}
    </div>
  );
}
