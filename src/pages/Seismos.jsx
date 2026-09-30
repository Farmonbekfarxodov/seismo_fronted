import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup,
  Tooltip as LTooltip, GeoJSON, LayersControl, useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { apiClient } from "../api/client";
import LazyRender from "../components/LazyRender";
import { useLanguage } from "../i18n/LanguageContext";
import { formatParam } from "../utils/chemFormat";

const Plot = createPlotlyComponent(Plotly);

function FullscreenInvalidate({ trigger }) {
  const map = useMap();
  useEffect(() => {
    // Animatsiya paytida va tugagach xaritani bir necha marta yangilaymiz
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [trigger, map]);
  return null;
}

/* XATO TUZATISH: zilzila doiralari ilgari `pane="markerPane"`da chizilardi —
   xuddi skvajina belgilari bilan bir xil qatlamda. `preferCanvas={true}`
   sabab, zilzilalar BITTA <canvas> elementiga chiziladi va bu canvas butun
   xarita ko'rinish maydonini egallaydi (faqat doira chizilgan joylarda emas,
   HAMMA YERDA sichqoncha voqealarini ushlab qoladi). Tahlil natijasi
   kelgach zilzilalar SKVAJINALARDAN KEYIN xaritaga qo'shilgani uchun bu
   canvas ularning ustiga chiqib, skvajina belgilariga bosish/hover qilishni
   butunlay to'sib qo'yardi ("faqat zilzila ma'lumotlari ko'rinadi" xatosi).
   Yechim: zilzilalar uchun ALOHIDA pane — u yer yoriqlari/seysmogen
   zonalardan (overlayPane, z=400) YUQORI, lekin skvajina belgilaridan
   (markerPane, z=600) PAST turadi. */
function EarthquakePaneSetup() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("eqPane")) {
      const pane = map.createPane("eqPane");
      pane.style.zIndex = 450;
    }
  }, [map]);
  return null;
}

// Backend: seismos_app/api_views.py
async function fetchOptions() {
  const { data } = await apiClient.get("/seismos/api/options/");
  return data;
}
async function fetchLayers() {
  const { data } = await apiClient.get("/seismos/api/layers/");
  return data;
}
async function postSeries(payload) {
  const { data } = await apiClient.post("/seismos/api/series/", payload);
  return data;
}

/* Eski xaritadagi zilzila rang sxemasi (aynan nusxa) */
function eqStyle(mb, filterMode) {
  if (filterMode === "mb") {
    if (mb >= 2.8) return { color: "red", radius: mb * 2.5 };
    if (mb >= 2.0) return { color: "orange", radius: mb * 2 };
    return { color: "yellow", radius: mb * 1.5 };
  }
  if (mb >= 6) return { color: "darkred", radius: mb * 3 };
  if (mb >= 5) return { color: "red", radius: mb * 2.5 };
  if (mb >= 4) return { color: "orange", radius: mb * 2 };
  return { color: "yellow", radius: mb * 1.5 };
}

export default function Seismos() {
  const { t } = useLanguage();
  const options = useQuery({ queryKey: ["seismos-options"], queryFn: fetchOptions });
  const layers = useQuery({
    queryKey: ["seismos-layers"],
    queryFn: fetchLayers,
    staleTime: Infinity,
  });

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedParams, setSelectedParams] = useState([]);
  const [settings, setSettings] = useState({
    min_mag: 4.0, sigma: 1.0, segment_years: "", min_mlgr: 2.5,
    filter_mode: "mlgr", median_window: "", start_date: "", end_date: "",
  });
  // Eski sahifadagi "Ko'rsatish nazorati"
  const [showMap, setShowMap] = useState(true);
  const [showGraphs, setShowGraphs] = useState(true);

  const analysis = useMutation({ mutationFn: postSeries });

  function toggle(list, setList, item) {
    setList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  function runAnalysis() {
    analysis.mutate({
      selected_keys: selectedKeys,
      selected_params: selectedParams,
      min_mag: Number(settings.min_mag),
      sigma: Number(settings.sigma) || 1.0,
      segment_years: settings.segment_years ? Number(settings.segment_years) : null,
      min_mlgr: Number(settings.min_mlgr),
      filter_mode: settings.filter_mode,
      median_window: settings.median_window ? Number(settings.median_window) : null,
      start_date: settings.start_date || null,
      end_date: settings.end_date || null,
    });
  }

  const result = analysis.data;

  return (
    <div>
      {options.isLoading && <p className="text-sm text-muted">{t("Yuklanmoqda...")}</p>}
      {options.isError && (
        <p className="text-sm text-danger">
          {t("Boshlang'ich ma'lumotlarni yuklab bo'lmadi. Backend ishga tushirilganini tekshiring.")}
        </p>
      )}

      {options.data && (
        <>
        <h1 className="text-2xl md:text-3xl text-center tracking-wide mb-6 mt-4">
          {t("SEYSMOPROGNOSTIK TAHLIL")}
        </h1>

        {/* 2-rasmdagi forma: chap ko'k hoshiyali karta */}
        <div className="card border-l-4 border-l-teal max-w-4xl mx-auto mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <details className="border border-border rounded-md">
              <summary className="px-3 py-2.5 cursor-pointer font-semibold text-sm">
                {t("Skvajinalar")}{" "}
                <span className="bg-teal text-white text-xs rounded px-1.5 py-0.5">{selectedKeys.length}</span>
              </summary>
              <div className="px-3 pb-3 max-h-56 overflow-y-auto">
                <label className="flex items-center gap-2 text-sm py-1 border-b border-border cursor-pointer font-medium">
                  <input type="checkbox" className="accent-teal shrink-0"
                    checked={options.data.wells.length > 0 && selectedKeys.length === options.data.wells.length}
                    onChange={(e) => setSelectedKeys(e.target.checked ? [...options.data.wells] : [])} />
                  {t("Hammasini tanlash")}
                </label>
                {options.data.wells.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                    <input type="checkbox" className="accent-teal shrink-0"
                      checked={selectedKeys.includes(key)}
                      onChange={() => toggle(selectedKeys, setSelectedKeys, key)} />
                    <span className="truncate">{key}</span>
                  </label>
                ))}
              </div>
            </details>

            <details className="border border-border rounded-md">
              <summary className="px-3 py-2.5 cursor-pointer font-semibold text-sm">
                {t("Parametrlar")}{" "}
                <span className="bg-teal text-white text-xs rounded px-1.5 py-0.5">{selectedParams.length}</span>
              </summary>
              <div className="px-3 pb-3 max-h-56 overflow-y-auto">
                <label className="flex items-center gap-2 text-sm py-1 border-b border-border cursor-pointer font-medium">
                  <input type="checkbox" className="accent-teal shrink-0"
                    checked={(() => {
                      const all = [...new Set(Object.values(options.data.param_groups).flat())];
                      return all.length > 0 && selectedParams.length === all.length;
                    })()}
                    onChange={(e) => {
                      const all = [...new Set(Object.values(options.data.param_groups).flat())];
                      setSelectedParams(e.target.checked ? all : []);
                    }} />
                  {t("Hammasini tanlash")}
                </label>
                {Object.entries(options.data.param_groups).map(([group, params]) => (
                  <div key={group} className="mt-1">
                    <p className="text-xs text-muted uppercase">{group}</p>
                    {params.map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                        <input type="checkbox" className="accent-teal shrink-0"
                          checked={selectedParams.includes(p)}
                          onChange={() => toggle(selectedParams, setSelectedParams, p)} />
                        <span className="font-mono">{formatParam(p)}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </details>

            <div>
              <label className="label">{t("Min Magnituda")}</label>
              <input type="number" step="0.1" placeholder={t("Magnituda")} className="input-field"
                value={settings.min_mag}
                onChange={(e) => setSettings({ ...settings, min_mag: e.target.value })} />
            </div>
            <div>
              <label className="label">{t("Sigma (σ)")}</label>
              <input type="number" step="0.1" placeholder={t("Sigma")} className="input-field"
                value={settings.sigma}
                onChange={(e) => setSettings({ ...settings, sigma: e.target.value })} />
            </div>

            <div>
              <label className="label">{t("Yillik Sigma davri (ixtiyoriy):")}</label>
              <input type="number" min="1" placeholder={t("Yillar soni (masalan: 2)")} className="input-field"
                value={settings.segment_years}
                onChange={(e) => setSettings({ ...settings, segment_years: e.target.value })} />
            </div>
            <div>
              <label className="label">Min M/lgR</label>
              <div className="flex items-center gap-3 border border-border rounded-md px-3 py-1.5 flex-wrap">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap">
                  <input type="radio" name="filter_mode" className="accent-teal"
                    checked={settings.filter_mode === "mlgr"}
                    onChange={() => setSettings({ ...settings, filter_mode: "mlgr" })} />
                  <span className="text-teal">{t("M/lgR bo'yicha")}</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap">
                  <input type="radio" name="filter_mode" className="accent-teal"
                    checked={settings.filter_mode === "mb"}
                    onChange={() => setSettings({ ...settings, filter_mode: "mb" })} />
                  <span className="text-teal">{t("Mb bo'yicha")}</span>
                </label>
                <input type="number" step="0.1" placeholder="M/lgR"
                  className="input-field !w-24 ml-auto"
                  disabled={settings.filter_mode === "mb"}
                  value={settings.min_mlgr}
                  onChange={(e) => setSettings({ ...settings, min_mlgr: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">{t("Boshlanish")}</label>
              <input type="date" className="input-field" value={settings.start_date}
                onChange={(e) => setSettings({ ...settings, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">{t("Tugash")}</label>
              <input type="date" className="input-field" value={settings.end_date}
                onChange={(e) => setSettings({ ...settings, end_date: e.target.value })} />
            </div>

            <div>
              <label className="label">{t("Mediana")}</label>
              <select className="input-field" value={settings.median_window}
                onChange={(e) => setSettings({ ...settings, median_window: e.target.value })}>
                <option value="">{t("Tanlanmagan")}</option>
                {options.data.median_values.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("Ko'rsatish nazorati")}</label>
              <div className="flex gap-2 flex-wrap">
                <label className="flex items-center gap-2 text-sm border border-border rounded-full px-3.5 py-2 cursor-pointer">
                  <input type="checkbox" className="accent-teal" checked={showMap}
                    onChange={(e) => setShowMap(e.target.checked)} />
                  {t("Xarita ko'rsatilsin")}
                </label>
                <label className="flex items-center gap-2 text-sm border border-border rounded-full px-3.5 py-2 cursor-pointer">
                  <input type="checkbox" className="accent-teal" checked={showGraphs}
                    onChange={(e) => setShowGraphs(e.target.checked)} />
                  {t("Grafiklar ko'rsatilsin")}
                </label>
              </div>
            </div>
          </div>

          <button className="btn-primary w-full mt-4 py-2.5"
            disabled={selectedKeys.length === 0 || analysis.isPending}
            onClick={runAnalysis}>
            {analysis.isPending ? t("Tahlil qilinmoqda...") : t("Tahlil qilish")}
          </button>
          {analysis.isError && (
            <p className="text-danger text-sm mt-2">
              {analysis.error?.response?.data?.error || t("Tahlilda xatolik yuz berdi")}
            </p>
          )}
        </div>

        {/* Mavjud ma'lumotlar oralig'i banneri (eski sahifadagidek) */}
        <div className="max-w-4xl mx-auto mb-6 rounded-md px-4 py-3 text-sm"
          style={{ background: "#cff4fc", color: "#055160" }}>
          {t("Mavjud ma'lumotlar oralig'i:")}{" "}
          {options.data.data_min_date ? (
            <>
              <b>{options.data.data_min_date}</b> {t("dan")} <b>{options.data.data_max_date}</b> {t("gacha")}
            </>
          ) : (
            t("Ma'lumot topilmadi.")
          )}
        </div>

        <div className="space-y-6">
          {showMap && (
            <>
              <h2 className="text-xl mt-2">{t("Barcha skvajinalar xaritasi")}</h2>
              {layers.isLoading && (
                <p className="text-sm text-muted">
                  {t("Xarita qatlamlari (yoriqlar, seysmogen zonalar) yuklanmoqda...")}
                </p>
              )}
              {layers.isError && (
                <div className="rounded-md px-4 py-3 text-sm"
                  style={{ background: "#f8d7da", color: "#842029" }}>
                  {t("Yoriqlar va seysmogen zonalarni yuklab bo'lmadi")}
                  {layers.error?.response?.status
                    ? ` (${t("server xatosi:")} ${layers.error.response.status})`
                    : ` (${t("serverga ulanib bo'lmadi")})`}
                  . {t("Django terminalidagi xatoni tekshiring — ko'pincha sababi Redis ishlamayotgani yoki shapefile'lar yo'qligi bo'ladi.")}
                </div>
              )}
              {/* minMlgr uzatilmaydi — halqalar qattiq 2.5 bo'yicha chiziladi.
                  Oldingi ko'rinish:
                  minMlgr={Number(settings.min_mlgr) || 2.5} */}
              <ResultsMap options={options.data} result={result} layers={layers.data}
                filterMode={settings.filter_mode} />
            </>
          )}

          {result?.series?.length === 0 && (
            <div className="card">
              <p className="text-sm text-muted">
                {t("Tanlangan quduq va parametrlar uchun ma'lumot topilmadi.")}
              </p>
            </div>
          )}

          {showGraphs && result?.series?.map((s) => (
            <LazyRender key={`${s.key}-${s.param}`} height={480}>
              <SeriesChart series={s} />
            </LazyRender>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   XARITA — yuklangan views.py'dagi folium xaritaning aynan nusxasi:
   har bir tanlangan skvajina O'Z RANGIDA (uchburchak + halqalar),
   markerga bosilganda M=5/6/7 halqalari yoqilib-o'chiriladi,
   har qanday skvajina popup'ida to'liq ma'lumot (well-info endpoint),
   4 xil fon, yoriqlar, zonalar, rangli zilzilalar, legenda.
   ============================================================ */

/* Yuklangan views.py'dagi generate_well_colors palitrasi (aynan) */
const BASE_COLORS = [
  "#0000FF", "#FF00FF", "#00FFFF", "#FFA500", "#800080", "#FFD700",
  "#FF1493", "#00CED1", "#FF4500", "#32CD32", "#BA55D3", "#20B2AA",
  "#4169E1", "#DC143C", "#7FFF00", "#FF8C00", "#9370DB",
];

function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function triangleIcon(color, size = 10) {
  return L.divIcon({
    className: "",
    html: `<div style="width:0;height:0;border-left:${size}px solid transparent;border-right:${size}px solid transparent;border-bottom:${size * 2}px solid ${color};"></div>`,
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size * 2],
  });
}

// `minMlgr` prop endi kerak emas — halqalar qattiq belgilangan 2.5 bo'yicha
// chiziladi (pastdagi MLGR_VAL izohiga qarang). Oldingi ko'rinish:
//   function ResultsMap({ options, result, layers, filterMode, minMlgr }) {
const ResultsMap = memo(function ResultsMap({ options, result, layers, filterMode }) {
  const { t } = useLanguage();
  const wrapRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      // Safari uchun webkit qo'shimchasi bilan tekshiriladi
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange); // Safari

    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  const allWells = result?.map?.wells
    ?? Object.entries(options.well_coords).map(([name, c]) => ({
      name, lat: c.lat, lon: c.lon, selected: false,
    }));
  const earthquakes = result?.map?.earthquakes ?? [];

  // O'ng tarafdagi "Seysmogen zonalar" ro'yxati uchun: xaritadagi har bir
  // rim raqami qaysi zonaga tegishli ekanini ko'rsatadi (backend har bir
  // feature'ga zone_number/roman'ni allaqachon hisoblab beradi).
  const zoneList = useMemo(() => {
    const features = layers?.zones?.features || [];
    return features
      .map((f) => {
        const p = f.properties || {};
        return {
          number: p.zone_number ?? 0,
          roman: p.roman || "",
          name: t(p.seysmogen_ || p.hududiy_ma || "Seysmogen zona"),
        };
      })
      .filter((z) => z.roman)
      .sort((a, b) => a.number - b.number);
  }, [layers?.zones, t]);

  // Har bir tanlangan skvajinaga o'z rangi (tartib bo'yicha)
  const colorMap = useMemo(() => {
    const map = {};
    let i = 0;
    for (const w of allWells) {
      if (w.selected) {
        map[w.name] = BASE_COLORS[i % BASE_COLORS.length];
        i += 1;
      }
    }
    return map;
  }, [allWells]);

  // Halqalar ko'rinishi: tanlangan -> boshida yoqiq, tanlanmagan -> o'chiq.
  // Markerga bosilganda o'zgaradi (eski xaritadagi click-toggle).
  const [ringOverrides, setRingOverrides] = useState({});
  function ringsOn(w) {
    return ringOverrides[w.name] ?? w.selected;
  }
  function toggleRings(w) {
    setRingOverrides((prev) => ({ ...prev, [w.name]: !ringsOn(w) }));
  }

  // Markaz: tanlanganlar o'rtachasi, bo'lmasa barcha quduqlar o'rtachasi (eski mantiq)
  const center = useMemo(() => {
    const sel = allWells.filter((w) => w.selected);
    const src = sel.length ? sel : allWells;
    if (!src.length) return [41.2995, 69.2401];
    return [
      src.reduce((s, w) => s + w.lat, 0) / src.length,
      src.reduce((s, w) => s + w.lon, 0) / src.length,
    ];
  }, [allWells]);

  function toggleFullscreen() {
    const el = wrapRef.current;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (el?.requestFullscreen) el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen(); // Safari
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); // Safari
    }
  }

  const RING_MS = [5, 6, 7];
  // Halqa radiusi: R_km = 10 ** (M / MLGR_VAL).
  //
  // MLGR_VAL — QATTIQ BELGILANGAN 2.5. Chap paneldagi "Min M/lgR" maydoniga
  // BOG'LIQ EMAS: u faqat zilzilalarni filtrlash uchun ishlatiladi, halqalar
  // esa har doim bir xil masshtabda chizilishi kerak:
  //   M=5 -> 100 km,  M=6 -> 251.2 km,  M=7 -> 631 km
  //
  // v1 da ham shunday (PROJECT/Seismo/seismos_app/views.py, 1933 / 2114 /
  // 2387-qatorlar): `mlgr_val = 2.5  # Fix qiymat`.
  //
  // Oldingi (xato) ko'rinish — foydalanuvchi kiritmasiga bog'langan edi:
  //   const MLGR_VAL = minMlgr && minMlgr > 0 ? minMlgr : 2.5;
  const MLGR_VAL = 2.5;

  function ringsFor(w, color) {
    if (!ringsOn(w)) return null;
    return RING_MS.map((M) => {
      const rKm = Math.pow(10, M / MLGR_VAL);
      return (
        <Circle key={`${w.name}-M${M}`} center={[w.lat, w.lon]}
          radius={rKm * 1000}
          pathOptions={{ color: hexToRgba(color, 0.9), weight: 2, fill: false, opacity: 0.7 }}>
          <LTooltip>{t("M={m}, R={r} km (M/lgR={mlgr})", { m: M, r: rKm.toFixed(1), mlgr: MLGR_VAL })}</LTooltip>
        </Circle>
      );
    });
  }

  return (
    // MUHIM: Balandlik ota div ga biriktirildi va moslashuvchan (flex-col) qilindi
    <div
      className="card p-0 overflow-hidden relative flex flex-col"
      ref={wrapRef}
      style={{ height: isFullscreen ? "100vh" : 520 }}
    >
      {/* To'liq ekran — eski xaritadagidek chap yuqorida (zoom ostida) */}
      <button onClick={toggleFullscreen}
        className="absolute z-[1000] bg-white border border-border px-2 py-1 text-xs shadow hover:bg-ink-900"
        style={{ top: 80, left: 10 }}
        title={t("To'liq ekran")}>
        ⛶
      </button>

      <MapContainer
        // MUHIM: qatlamlar (yoriqlar/zonalar) tarmoqdan xarita yaratilgandan
        // KEYIN keladi; react-leaflet LayersControl esa keyin qo'shilgan
        // overlaylarni xaritaga ulamaydi. key o'zgarishi xaritani qayta
        // yaratadi va barcha qatlamlar boshidanoq joyida bo'ladi.
        key={layers ? "map-with-layers" : "map-without-layers"}
        center={center} zoom={8}
        // MUHIM: MapContainer endi to'liq 100% balandlik va kenglikni oladi
        style={{ height: "100%", width: "100%", flexGrow: 1 }}
        preferCanvas={true}>
        <FullscreenInvalidate trigger={isFullscreen} />
        <EarthquakePaneSetup />
        <LayersControl position="topright">
          {/* Fon xaritalari — eski faylga mos 4 xil.
              QO'SHILDI: "Без подписей" — yozuvsiz fon. Oddiy OpenStreetMap
              joy nomlarini MAHALLIY tilda chizadi, shuning uchun Xitoy
              hududida iyeroglif yozuvlar chiqadi. Dissertatsiya rasmi uchun
              yozuvsiz fon toza chiqadi va o'z belgilaringizga xalaqit
              bermaydi. Shuning uchun u birinchi va standart qilib qo'yildi.
              Eski standart OpenStreetMap edi (checked o'sha yerda turgan). */}
          <LayersControl.BaseLayer checked name={t("Yozuvsiz fon")}>
            {/* XATO TUZATISH (2026-09-30): `{s}.` subdomensiz cartocdn manzili
                ham "API KEY REQUIRED" suvbelgisi bilan chiqishda davom etdi —
                CARTO endi bu bepul raster CDN'ni butunlay kalit talab
                qiladigan qilib qo'ygan (URL formatiga bog'liq emas edi).
                Shuning uchun Esri'ning haqiqatda kalitsiz "Light Gray"
                qatlamiga o'tkazildi (pastdagi "Sputnik" qatlami bilan bir xil
                Esri xizmati, u ham kalitsiz ishlaydi). */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name={t("Relyef")}>
            <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenTopoMap" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name={t("Yorug'")}>
            {/* XATO TUZATISH: CARTO "light_all" ham kalit talab qilardi —
                Esri'ning yozuvli, ochiq rangli "World_Street_Map" qatlamiga
                almashtirildi (kalitsiz, "Sputnik"dagi bilan bir xil xizmat). */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name={t("Sputnik")}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri" />
          </LayersControl.BaseLayer>

          {layers?.cracks && (
            <LayersControl.Overlay checked name={t("Yoriqlar")}>
              <GeoJSON data={layers.cracks}
                style={{ color: "#8B0000", weight: 1, opacity: 0.7 }}
                onEachFeature={(f, l) => {
                  if (f.properties?.NAME) l.bindTooltip(t("Yoriq: {name}", { name: f.properties.NAME }));
                }} />
            </LayersControl.Overlay>
          )}

          {layers?.zones && (
            <LayersControl.Overlay checked name={t("Seysmogen zonalar")}>
              <GeoJSON data={layers.zones}
                style={{ color: "#e75480", weight: 2, fillColor: "#ffb6c1", fillOpacity: 0.35 }}
                onEachFeature={(f, l) => {
                  const p = f.properties || {};
                  const name = t(p.seysmogen_ || p.hududiy_ma || "Seysmogen zona");
                  // Xaritada endi to'liq nom o'rniga FAQAT rim raqami
                  // ko'rsatiladi (v1 folium xaritasidagi kabi) — to'liq nomlar
                  // o'ng tarafdagi "Seysmogen zonalar" ro'yxatida (pastda).
                  l.bindPopup(`<b>${p.roman ? `${p.roman} — ` : ""}${name}</b>${p.seysmogen1 ? "<br>" + p.seysmogen1 : ""}`);
                  if (p.roman) {
                    l.bindTooltip(p.roman, {
                      permanent: true, direction: "center", className: "zone-label",
                    });
                  }
                }} />
            </LayersControl.Overlay>
          )}

        </LayersControl>

        {/* Zilzilalar — DOIMIY qatlam: qatlam boshqaruvi ro'yxatidan olib
            tashlandi (foydalanuvchi o'chira olmaydi), har doim ko'rinadi */}
        <>
          {earthquakes.map((eq, i) => {
            const st = eqStyle(eq.mb, filterMode);
            return (
              <CircleMarker key={i} center={[eq.lat, eq.lon]}
                radius={Math.max(st.radius, 6)}
                pane="eqPane"
                pathOptions={{ color: "#111", fillColor: st.color, fillOpacity: 0.85, weight: 1.5 }}>
                <LTooltip>
                  <div>
                    <b>{t("Zilzila")}</b><br />
                    {t("Sana:")} {eq.datetime?.replace("T", " ")}<br />
                    {t("Magnituda (Mb):")} {eq.mb}<br />
                    {t("Chuqurlik (km):")} {eq.depth ?? "—"}<br />
                    {eq.r_km != null && <>{t("Masofa (km):")} {eq.r_km}<br /></>}
                    {eq.mlgr != null && <>M/lgR: {eq.mlgr}</>}
                  </div>
                </LTooltip>
              </CircleMarker>
            );
          })}
        </>

        {/* Skvajinalar — DOIMIY qatlam: qatlam boshqaruvi ro'yxatidan olib
            tashlandi (foydalanuvchi o'chira olmaydi), har doim ko'rinadi */}
        <>
              {allWells.map((w) => {
                const color = w.selected ? colorMap[w.name] : "lightblue";
                // Tanlanmaganlarga halqa faqat Mb rejimida (eski fayl mantig'i)
                const canHaveRings = w.selected || filterMode === "mb";
                return (
                  <span key={w.name}>
                    <Marker position={[w.lat, w.lon]}
                      icon={triangleIcon(color)}>
                      <LTooltip>{w.name}</LTooltip>
                      <Popup maxWidth={480}>
                        <WellInfoPopup well={w} color={w.selected ? color : null}
                          canHaveRings={canHaveRings}
                          ringsOn={ringsOn(w)}
                          onToggleRings={() => toggleRings(w)} />
                      </Popup>
                    </Marker>
                    {canHaveRings && ringsFor(w, w.selected ? color : "#ADD8E6")}
                  </span>
                );
              })}
            </>

      </MapContainer>

      {/* Legenda — xarita ichida suzuvchi quti.
          XATO TUZATISH: bu quti ilgari `max-h-48 overflow-y-auto` bilan
          balandligi 192px ga cheklangan edi, lekin ichidagi ro'yxat (Mb
          ranglari + skvajina uchburchaklari + yer yoriqlari/seysmogen
          zona/halqa belgilari) odatda ~9 qatordan iborat va bu chegaraga
          sig'may, pastki qatorlar (masalan "M=5/6/7 halqalari") kesilib
          qolardi — xarita kattalashtirilganda (to'liq ekran) ham xuddi
          shunday. Ro'yxat hajmi doimiy va kichik bo'lgani uchun (foydalanuvchi
          ma'lumotiga bog'liq emas, Seysmogen zonalar ro'yxatidan farqli),
          balandlik chegarasi olib tashlandi — Anomaly.jsx'dagi xuddi shu
          quti allaqachon shunday (chegarasiz) edi. */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 border border-border rounded-md shadow px-3 py-2 text-xs"
        style={{ minWidth: 190 }}>
        {/* Ilgari alohida rus tiliga qattiq tarjima qilingan edi (Условные
            обозначения:), endi umumiy t() mexanizmiga o'tkazildi — shu bilan
            ikkala tilda ham ishlaydi. Asl o'zbekcha: "Xarita elementlari:",
            keyin "Shartli belgilar:" ga almashtirilgan edi. */}
        <b>{t("Shartli belgilar:")}</b>
        <div className="mt-1 space-y-0.5">
          {filterMode === "mb" ? (
            <>
              <div><Dot c="red" /> {t("Zilzila Mb > 2.8")}</div>
              <div><Dot c="orange" /> {t("Zilzila Mb 2.0–2.8")}</div>
              <div><Dot c="gold" /> {t("Zilzila Mb < 2.0")}</div>
            </>
          ) : (
            <>
              <div><Dot c="darkred" /> {t("Zilzila Mb ≥ 6.0")}</div>
              <div><Dot c="red" /> {t("Zilzila Mb 5.0–5.9")}</div>
              <div><Dot c="orange" /> {t("Zilzila Mb 4.0–4.9")}</div>
              <div><Dot c="gold" /> {t("Zilzila Mb < 4.0")}</div>
            </>
          )}
          {/* Eski ko'rinish uchta uchburchak bilan edi:
              <Tri c="#0000FF" /><Tri c="#FF00FF" /><Tri c="#FFA500" />
              Dissertatsiya uchun faqat bittasi qoldirildi. */}
          <div>
            <Tri c="#0000FF" />{" "}
            {t("Tanlangan skvajinalar")}
          </div>
          <div><Tri c="#ADD8E6" /> {t("Tanlanmagan skvajinalar")}</div>
          <div className="flex items-center gap-1.5 py-0.5">
            <div className="w-4 h-[3px] bg-[#8B0000] shrink-0"></div>
            <span>{t("Yer yoriqlari")}</span>
          </div>
          <div className="flex items-center gap-1.5 py-0.5">
            <div className="w-4 h-3 bg-[#e75480] border border-[#d23b66] opacity-60 shrink-0"></div>
            <span>{t("Seysmogen zonalar")}</span>
          </div>
          <div className="flex items-center gap-1.5 py-0.5">
            <div className="w-3 h-3 rounded-full border border-[#0B43FA] bg-transparent shrink-0"></div>
            <span>{t("M=5/6/7 halqalari — sezgirlik zonasi")}</span>
          </div>
        </div>
      </div>

      {/* Seysmogen zonalar ro'yxati — xaritaning O'NG tomonida. Xaritadagi
          har bir zona markazida faqat rim raqami ko'rinadi (v1 folium
          xaritasidagi kabi), to'liq nomi esa shu ro'yxatda, raqami bo'yicha.
          XATO TUZATISH: ro'yxatda 30+ zona bo'lishi mumkin (I dan XXXV
          gacha) — oddiy (520px) xarita balandligida hammasi sig'maydi,
          shuning uchun u yerda ixcham `max-h-64` (scroll bilan) qoldirildi.
          Lekin xarita to'liq ekranga kattalashtirilganda (`isFullscreen`,
          balandlik 100vh) bo'sh joy yetarli — shu holatda chegara ancha
          kattalashtirildi (`85vh`), shunda deyarli barcha zonalar bir
          vaqtda, scrollsiz to'liq ko'rinadi; juda uzun ro'yxat uchun scroll
          hali ham xavfsizlik to'ri sifatida qoladi. */}
      {zoneList.length > 0 && (
        <div className={`absolute bottom-4 right-4 z-[1000] bg-white/95 border border-border rounded-md shadow px-3 py-2 text-xs overflow-y-auto ${isFullscreen ? "max-h-[85vh]" : "max-h-64"}`}
          style={{ minWidth: 200, maxWidth: 260 }}>
          <b>{t("Seysmogen zonalar:")}</b>
          <div className="mt-1 space-y-0.5">
            {zoneList.map((z) => (
              <div key={z.roman + z.name} className="flex items-baseline gap-1.5 py-0.5">
                <span className="font-semibold shrink-0" style={{ color: "#8B008B" }}>{z.roman}</span>
                <span>— {z.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

function Tri({ c }) {
  return <span className="inline-block align-middle mr-0.5"
    style={{ width: 0, height: 0, borderLeft: "5px solid transparent",
             borderRight: "5px solid transparent", borderBottom: `10px solid ${c}` }} />;
}

function Dot({ c }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle" style={{ background: c }} />;
}

/* Popup ochilganda skvajina ma'lumotini yuklaydi (well-info endpoint).
   Eski folium popup'idagi jadval bilan bir xil — tanlangan/tanlanmagan
   farqi faqat pastki yozuvda. */
function WellInfoPopup({ well, color, canHaveRings, ringsOn, onToggleRings }) {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["well-info", well.name],
    queryFn: async () => {
      const { data } = await apiClient.get("/seismos/api/well-info/", {
        params: { name: well.name },
      });
      return data?.[well.name] ?? data ?? {};
    },
    staleTime: Infinity,
  });

  const info = data || {};
  const rows = [
    [t("Nomi"), info.nomi || well.name],
    [t("Quduq turi"), info.quduq_turi],
    [t("Chuqurlik"), info.chuqurlik != null && info.chuqurlik !== "Ma'lumot yo'q" ? `${info.chuqurlik} m` : info.chuqurlik],
    [t("Seysmotektonik holat"), info.seysmotektonik_holat],
    [t("Strategrafik taqsimoti"), info.strategrafik_taqsimoti],
    [t("Litologik tarkibi"), info.litologik_tarkibi],
  ];

  return (
    <div style={{ width: 420, fontFamily: "Arial", fontSize: 12 }}>
      <h4 style={{ color: "#2c3e50", marginBottom: 8 }}>{t("Skvajina ma'lumotlari")}</h4>

      {/* M=5/6/7 halqalarini yoqish/o'chirish (avval marker bosilganda edi,
          lekin u Popup bilan konflikt qilardi — endi alohida tugma) */}
      {canHaveRings && (
        <button onClick={onToggleRings}
          style={{
            marginBottom: 8, padding: "5px 10px", cursor: "pointer",
            border: `1px solid ${color || "#0B43FA"}`, borderRadius: 5,
            background: ringsOn ? (color || "#0B43FA") : "white",
            color: ringsOn ? "white" : (color || "#0B43FA"),
            fontWeight: "bold", fontSize: 12,
          }}>
          {ringsOn ? t("◉ Halqalarni o'chirish") : t("◯ M=5/6/7 halqalarini ko'rsatish")}
        </button>
      )}

      {isLoading && <p>{t("Yuklanmoqda...")}</p>}
      {isError && <p style={{ color: "#dc3545" }}>{t("Ma'lumotni yuklab bo'lmadi")}</p>}
      {!isLoading && !isError && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {rows.map(([label, value], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? "#f8f9fa" : "white" }}>
                  <td style={{ padding: 5, border: "1px solid #dee2e6", fontWeight: "bold" }}>{label}:</td>
                  <td style={{ padding: 5, border: "1px solid #dee2e6" }}>{value || t("Ma'lumot yo'q")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {info.mineralizatsiya_base64 && (
            <div style={{ marginTop: 8, textAlign: "center" }}>
              <b>{t("Mineralizatsiya:")}</b><br />
              <img src={info.mineralizatsiya_base64} alt={t("Mineralizatsiya")}
                style={{ maxWidth: 400, maxHeight: 300, marginTop: 5, borderRadius: 5 }} />
            </div>
          )}
          {well.selected ? (
            <p style={{ marginTop: 8, color: color || "#0B43FA", fontWeight: "bold" }}>
              ✓ {t("Tanlangan skvajina")}
            </p>
          ) : (
            <p style={{ marginTop: 8, color: "#6c757d", fontStyle: "italic" }}>
              {t("Tanlanmagan skvajina")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   GRAFIK — 3-rasmdagi eski ko'rinish: ikki o'qli plotly,
   chapda parametr qiymati, o'ngda Magnituda (Mb) — zilzilalar
   ustunlar sifatida; PNG yuklash tugmasi; yillik sigma segmentlari.
   ============================================================ */
function SeriesChart({ series }) {
  const { t } = useLanguage();
  const chartId = `chart-${series.key}-${series.param}`.replace(/[^a-zA-Z0-9-]/g, "_");

  const data = useMemo(() => {
    const traces = [
      {
        x: series.dates, y: series.values,
        type: "scatter", mode: "lines", name: formatParam(series.param),
        line: { color: "#0d6efd", width: 1.4 },
        hovertemplate: `%{x}<br>${t("Qiymat")}: %{y}<extra></extra>`,
      },
    ];

    const xr = [series.dates[0], series.dates[series.dates.length - 1]];
    const upper = series.upper ?? series.mean + series.sigma;
    const lower = series.lower ?? series.mean - series.sigma;
    traces.push(
      { x: xr, y: [series.mean, series.mean], type: "scatter", mode: "lines",
        name: t("O'rtacha"), line: { color: "#6c757d", dash: "dash", width: 1 }, hoverinfo: "skip" },
      { x: xr, y: [upper, upper], type: "scatter", mode: "lines",
        name: "+σ", line: { color: "#fd7e14", dash: "dot", width: 1 }, hoverinfo: "skip" },
      { x: xr, y: [lower, lower], type: "scatter", mode: "lines",
        name: "−σ", line: { color: "#fd7e14", dash: "dot", width: 1 }, hoverinfo: "skip" },
    );

    // Yillik sigma segmentlari ("Yillik UB/LB (Ny)") — pog'onali chiziqlar
    if (series.segments?.length) {
      const ubx = [], uby = [], lbx = [], lby = [];
      for (const seg of series.segments) {
        ubx.push(seg.start, seg.end, null); uby.push(seg.ub, seg.ub, null);
        lbx.push(seg.start, seg.end, null); lby.push(seg.lb, seg.lb, null);
      }
      traces.push(
        { x: ubx, y: uby, type: "scatter", mode: "lines", name: t("Yillik UB"),
          line: { color: "#198754", width: 1.5 }, hoverinfo: "skip", connectgaps: false },
        { x: lbx, y: lby, type: "scatter", mode: "lines", name: t("Yillik LB"),
          line: { color: "#198754", width: 1.5, dash: "dash" }, hoverinfo: "skip", connectgaps: false },
      );
    }

    // Zilzilalar — o'ng (Mb) o'qda ustunlar, ingichkalashtirilgan (3 kunlik)
    if (series.earthquakes?.length) {
      traces.push({
        x: series.earthquakes.map((eq) => eq.datetime.slice(0, 10)),
        y: series.earthquakes.map((eq) => eq.mb),
        type: "bar", name: t("Zilzila (Mb)"), yaxis: "y2",
        width: 1000 * 60 * 60 * 24 * 0.5,// ~3 kunlik ingichka ustun
        marker: {
          color: series.earthquakes.map((eq) => (eq.mb >= 6 ? "#dc3545" : "#4B0082")),
        },
        customdata: series.earthquakes.map((eq) => [eq.r_km, eq.mlgr]),
        hovertemplate:
          `${t("Sana:")} %{x}<br>Mb: %{y}<br>${t("Masofa:")} %{customdata[0]} km<extra></extra>`,
      });
    }

    return traces;
  }, [series, t]);

  // Zilzila ustuniga bosilganda ochiladigan, qayta bosilsa yopiladigan
  // (toggle) belgi. Bir nechtasi bir vaqtda ochiq turishi mumkin.
  const [openedEq, setOpenedEq] = useState(() => new Set());

  function handlePlotClick(event) {
    const pt = event?.points?.[0];
    if (!pt || pt.data?.name !== t("Zilzila (Mb)")) return;
    const idx = pt.pointIndex;
    setOpenedEq((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const eqAnnotations = useMemo(() => {
    if (!series.earthquakes?.length) return [];
    return [...openedEq].map((idx) => {
      const eq = series.earthquakes[idx];
      if (!eq) return null;
      return {
        x: eq.datetime.slice(0, 10), y: eq.mb, yref: "y2",
        text:
          `Mb: ${eq.mb}${eq.depth != null ? `, ${t("Chuqurlik:")} ${eq.depth} km` : ""}<br>` +
          `${eq.r_km != null ? `${t("Masofa:")} ${eq.r_km} km` : ""}`,
        showarrow: true, arrowhead: 2, ax: 0, ay: -40,
        bgcolor: "white", bordercolor: "#4B0082", borderwidth: 1, borderpad: 4,
        font: { size: 14, color: "#212529" },
      };
    }).filter(Boolean);
  }, [openedEq, series.earthquakes, t]);

  function downloadPng() {
    const el = document.getElementById(chartId)?.querySelector(".js-plotly-plot");
    if (el) {
      Plotly.downloadImage(el, {
        format: "png", width: 1400, height: 600,
        filename: `${series.key} - ${series.param}`.replace(/[|/\\]/g, "-"),
      });
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      {/* 3-rasmdagi karta sarlavhasi: teal nom + PNG tugmasi */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-base font-semibold text-teal">
          {series.key} - {formatParam(series.param)}
        </h3>
        <button onClick={downloadPng}
          className="px-3 py-1.5 text-sm rounded-md border border-teal text-teal hover:bg-blue-50 transition-colors">
          {t("Grafikni yuklash (PNG)")}
        </button>
      </div>
      <div className="p-2" id={chartId}>
        <Plot
          data={data}
          onClick={handlePlotClick}
          layout={{
            title: { text: `${series.key} - ${formatParam(series.param)}`, font: { size: 17 } },
            height: 420,
            margin: { l: 60, r: 60, t: 45, b: 40 },
            xaxis: { gridcolor: "#DEE2E6" },
            yaxis: { title: { text: t("{param} Qiymati", { param: formatParam(series.param) }) }, gridcolor: "#DEE2E6", automargin: true },
            yaxis2: {
              title: { text: t("Magnituda (Mb)") },
              overlaying: "y", side: "right",
              range: [0, Math.max(7, ...(series.earthquakes?.map((e) => e.mb) || [7])) + 0.5],
              showgrid: false,
              automargin: true,
            },
            annotations: eqAnnotations,
            plot_bgcolor: "#FFFFFF", paper_bgcolor: "#FFFFFF",
            legend: { orientation: "h", y: -0.32 },
            font: { size: 16, color: "#212529" },
            hovermode: "closest",
            bargap: 0,
            hoverlabel: {
              font: {
                size: 16 // Shu yerdagi raqamni o'zingizga ma'qul kattalikda o'zgartiring (masalan, 18 yoki 20)
              }
            }
          }}
          config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] }}
          style={{ width: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}