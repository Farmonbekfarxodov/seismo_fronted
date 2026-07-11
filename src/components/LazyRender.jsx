import { useEffect, useRef, useState } from "react";

/**
 * Bolalarni faqat ekranga (yoki unga 400px yaqin) kelganda render qiladi.
 * Og'ir plotly grafiklar sahifa ochilishida brauzerni qotirmasligi uchun.
 */
export default function LazyRender({ height = 480, children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

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
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={{ minHeight: visible ? undefined : height }}>
      {visible ? children : (
        <div className="card flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted">Grafik tayyorlanmoqda...</p>
        </div>
      )}
    </div>
  );
}
