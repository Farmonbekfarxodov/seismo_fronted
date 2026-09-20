import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapContainer, TileLayer, Marker, Popup, GeoJSON,
  LayersControl, LayerGroup, Tooltip as LTooltip, useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { apiClient } from "../api/client";
import LazyRender from "../components/LazyRender";

const Plot = createPlotlyComponent(Plotly);

// Backend: app_anomaly/api_views.py
async function fetchOptions() {
  const { data } = await apiClient.get("/anomaly/api/options/");
  return data;
}
async function postAnalyze(payload) {
  const { data } = await apiClient.post("/anomaly/api/analyze/", payload);
  return data;
}
async function fetchHistory() {
  const { data } = await apiClient.get("/anomaly/history/");
  return data;
}
// Xarita qatlamlari (yer yoriqlari, seysmogen zonalar) — seismos_app bilan umumiy
async function fetchLayers() {
  const { data } = await apiClient.get("/seismos/api/layers/");
  return data;
}

export default function Anomaly() {
  const [tab, setTab] = useState("analysis");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Anomaliya tahlili</h1>
        <p className="text-sm text-muted mt-1">
          Sigma chegarasidan chetlashgan ketma-ket qiymatlarni aniqlash
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border">
        {[
          { id: "analysis", label: "Tahlil" },
          { id: "history", label: "Tarix" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-amber text-amber"
                : "border-transparent text-muted hover:text-ink-100"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "analysis" ? <AnalysisTab /> : <HistoryTab />}
    </div>
  );
}

/* ================= TAHLIL ================= */
function AnalysisTab() {
  const queryClient = useQueryClient();
  const options = useQuery({ queryKey: ["anomaly-options"], queryFn: fetchOptions });
  // Qatlamlar og'ir (~1MB) — 24 soat keshlanadi, sahifa bilan birga yuklanadi
  const layers = useQuery({
    queryKey: ["map-layers"],
    queryFn: fetchLayers,
    staleTime: Infinity,
  });

  const [wells, setWells] = useState([]);
  const [params, setParams] = useState([]);
  const [settings, setSettings] = useState({
    time_period: 6, anomaly_duration: 3, recent_days: 7, sigma: 2.0, magnitude: "",
  });

  // Xaritada anomal skvajina bosilganda — uning grafiklari ro'yxat boshiga chiqadi
  const [focusedWell, setFocusedWell] = useState(null);
  const chartsRef = useRef(null);

  const analysis = useMutation({
    mutationFn: postAnalyze,
    onSuccess: () => {
      setFocusedWell(null);
      queryClient.invalidateQueries({ queryKey: ["anomaly-history"] });
    },
  });

  function toggle(list, setList, item) {
    setList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  function run() {
    analysis.mutate({
      wells, parameters: params,
      time_period: Number(settings.time_period),
      anomaly_duration: Number(settings.anomaly_duration),
      recent_days: Number(settings.recent_days),
      sigma: Number(settings.sigma),
      magnitude: settings.magnitude === "" ? null : Number(settings.magnitude),
    });
  }

  const result = analysis.data;

  // Tanlangan skvajina grafiklari boshda, qolganlari asl tartibida
  const orderedResults = useMemo(() => {
    const list = result?.results ?? [];
    if (!focusedWell) return list;
    const first = list.filter((r) => r.skvajina === focusedWell);
    const rest = list.filter((r) => r.skvajina !== focusedWell);
    return [...first, ...rest];
  }, [result, focusedWell]);

  const focusedCount = useMemo(
    () => (result?.results ?? []).filter((r) => r.skvajina === focusedWell).length,
    [result, focusedWell]
  );

  // Markerga bosilsa — faqat tartib o'zgaradi (xarita joyida qoladi,
  // popup ham ochiq turadi). Sahifani siljitish popup'dagi tugma orqali.
  function handleWellClick(name) {
    // Xuddi shu markerga qayta bosilsa — tartib asl holiga qaytadi
    setFocusedWell((prev) => (prev === name ? null : name));
  }

  function handleGoToChart(name) {
    setFocusedWell(name);
    requestAnimationFrame(() => {
      chartsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Tanlash paneli */}
      <div className="space-y-4 xl:col-span-1">
        {options.isLoading && <p className="text-sm text-muted">Yuklanmoqda...</p>}
        {options.isError && (
          <p className="text-sm text-danger">Boshlang'ich ma'lumotlarni yuklab bo'lmadi.</p>
        )}

        {options.data && (
          <>
            <div className="card">
              <p className="label mb-2">Quduqlar ({wells.length})</p>
              <label className="flex items-center gap-2 text-sm py-1 px-1.5 mb-1 border-b border-border cursor-pointer font-medium">
                <input type="checkbox" className="accent-teal shrink-0"
                  checked={options.data.wells.length > 0 && wells.length === options.data.wells.length}
                  onChange={(e) => setWells(e.target.checked ? [...options.data.wells] : [])} />
                Hammasini tanlash
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {options.data.wells.map((w) => (
                  <label key={w} className="flex items-center gap-2 text-sm py-1 px-1.5 rounded hover:bg-ink-900 cursor-pointer">
                    <input type="checkbox" className="accent-amber shrink-0"
                      checked={wells.includes(w)} onChange={() => toggle(wells, setWells, w)} />
                    <span className="truncate">{w}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card">
              <p className="label mb-2">Parametrlar ({params.length})</p>
              <label className="flex items-center gap-2 text-sm py-1 px-1.5 mb-2 border-b border-border cursor-pointer font-medium">
                <input type="checkbox" className="accent-teal shrink-0"
                  checked={options.data.params.length > 0 && params.length === options.data.params.length}
                  onChange={(e) => setParams(e.target.checked ? [...options.data.params] : [])} />
                Hammasini tanlash
              </label>
              <div className="flex flex-wrap gap-1.5">
                {options.data.params.map((p) => (
                  <button key={p} type="button" onClick={() => toggle(params, setParams, p)}
                    className={`text-xs font-mono px-2 py-1 rounded-md border transition-colors ${
                      params.includes(p)
                        ? "border-teal text-teal bg-teal/10"
                        : "border-border text-muted hover:text-ink-100"
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="card space-y-3">
              <p className="label">Sozlamalar</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Davr (oy)</label>
                  <select className="input-field" value={settings.time_period}
                    onChange={(e) => setSettings({ ...settings, time_period: e.target.value })}>
                    {options.data.time_periods.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Min ketma-ketlik</label>
                  <select className="input-field" value={settings.anomaly_duration}
                    onChange={(e) => setSettings({ ...settings, anomaly_duration: e.target.value })}>
                    {options.data.durations.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Sigma (σ)</label>
                  <input type="number" step="0.1" className="input-field" value={settings.sigma}
                    onChange={(e) => setSettings({ ...settings, sigma: e.target.value })} />
                </div>
                <div>
                  <label className="label">Oxirgi kunlar</label>
                  <input type="number" min="1" className="input-field" value={settings.recent_days}
                    onChange={(e) => setSettings({ ...settings, recent_days: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Min magnituda (ixtiyoriy)</label>
                <input type="number" step="0.1" className="input-field"
                  placeholder="Bo'sh — zilzilalar ko'rsatilmaydi"
                  value={settings.magnitude}
                  onChange={(e) => setSettings({ ...settings, magnitude: e.target.value })} />
              </div>
              <button className="btn-primary w-full"
                disabled={wells.length === 0 || params.length === 0 || analysis.isPending}
                onClick={run}>
                {analysis.isPending ? "Tahlil qilinmoqda..." : "Tahlilni boshlash"}
              </button>
              {analysis.isError && (
                <p className="text-danger text-sm">
                  {analysis.error?.response?.data?.error || "Tahlilda xatolik yuz berdi"}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Natijalar */}
      <div className="xl:col-span-3 space-y-6">
        {result && (
          <div className="card">
            <p className="text-sm">
              <span className="text-amber font-semibold">{result.anomalous_wells_count}</span>{" "}
              ta skvajinada anomaliya topildi ·{" "}
              <span className="text-muted">{result.results.length} ta grafik</span>
            </p>
          </div>
        )}

        {result && (
          <AnomalyMap map={result.map} layers={layers.data}
            focusedWell={focusedWell} onWellClick={handleWellClick}
            onGoToChart={handleGoToChart} />
        )}

        {result?.results?.length === 0 && (
          <div className="card">
            <p className="text-sm text-muted">
              Tanlangan mezonlar bo'yicha so'nggi {result.meta.recent_days} kunda anomaliya topilmadi.
            </p>
          </div>
        )}

        <div ref={chartsRef} className="space-y-6 scroll-mt-4">
          {focusedWell && (
            <div className="card border-amber/40 bg-amber/5 flex items-center justify-between gap-4">
              <p className="text-sm">
                <span className="font-semibold text-amber">{focusedWell}</span>{" "}
                {focusedCount > 0
                  ? `grafiklari birinchi o'ringa chiqarildi (${focusedCount} ta)`
                  : "uchun grafik yo'q — bu skvajinada anomaliya topilmagan"}
              </p>
              <button onClick={() => setFocusedWell(null)}
                className="text-xs font-medium px-2.5 py-1 rounded-md border border-border text-muted hover:text-ink-100 shrink-0">
                Tartibni tiklash
              </button>
            </div>
          )}

          {orderedResults.map((r) => (
            <LazyRender key={`${r.well}-${r.param}`} height={540}>
              <AnomalyChart result={r} sigma={result.meta.sigma}
                focused={r.skvajina === focusedWell} />
            </LazyRender>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   XARITA — eski create_anomaly_map_detailed bilan bir xil:
   fon xaritalari, yer yoriqlari va seysmogen zonalar qatlamlari,
   anomal/normal skvajina guruhlari, to'liq quduq popup'i,
   to'liq ekran tugmasi va shartli belgilar.
   ============================================================ */

function FullscreenInvalidate({ trigger }) {
  const map = useMap();
  useEffect(() => {
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

/* Normal skvajina — ko'k uchburchak (eski DivIcon bilan bir xil) */
function normalIcon(size = 6) {
  return L.divIcon({
    className: "",
    html: `<div style="width:0;height:0;border-left:${size}px solid transparent;border-right:${size}px solid transparent;border-bottom:${size * 2}px solid #3388ff;"></div>`,
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
  });
}

/* Anomal skvajina — qizil uchburchak + pulsatsiyalanuvchi halqa.
   `focused` bo'lsa (grafigi birinchi o'ringa chiqarilgan) sariq gardish qo'shiladi. */
function anomalousIcon(focused = false) {
  const ring = focused
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:30px;height:30px;border:3px solid #f59e0b;border-radius:50%;box-shadow:0 0 6px rgba(245,158,11,0.9);"></div>`
    : "";
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;cursor:pointer;">
        ${ring}
        <div class="anomaly-pulse" style="width:20px;height:20px;background-color:rgba(255,0,0,0.6);border-radius:50%;"></div>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:16px solid red;"></div>
      </div>`,
    // v1 folium DivIcon bilan bir xil o'lcham/langar — gardish tashqariga
    // chiqib turadi, marker esa joyidan siljimaydi
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const PULSE_CSS = `
@keyframes anomalyPulse {
  0%   { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}
.anomaly-pulse { animation: anomalyPulse 1.5s infinite; }
.zone-label { background: transparent; border: none; box-shadow: none; font-weight: 600; }
`;

function AnomalyMap({ map, layers, focusedWell, onWellClick, onGoToChart }) {
  const wrapRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  function toggleFullscreen() {
    const el = wrapRef.current;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (el?.requestFullscreen) el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  const wells = map?.wells ?? [];
  const anomalous = useMemo(() => wells.filter((w) => w.anomalous), [wells]);
  const normal = useMemo(() => wells.filter((w) => !w.anomalous), [wells]);

  // Markaz: anomal quduqlar o'rtachasi, bo'lmasa Toshkent (eski mantiq)
  const center = useMemo(() => {
    if (!anomalous.length) return [41.2995, 69.2401];
    return [
      anomalous.reduce((s, w) => s + w.lat, 0) / anomalous.length,
      anomalous.reduce((s, w) => s + w.lon, 0) / anomalous.length,
    ];
  }, [anomalous]);

  return (
    <div className="card p-0 overflow-hidden relative flex flex-col"
      ref={wrapRef}
      style={{ height: isFullscreen ? "100vh" : 520 }}>
      <style>{PULSE_CSS}</style>

      <button onClick={toggleFullscreen}
        className="absolute z-[1000] bg-white border border-border rounded px-2 py-1 text-xs shadow hover:bg-ink-900"
        style={{ top: 80, left: 10 }}
        title="To'liq ekran">
        ⛶
      </button>

      <MapContainer
        // Qatlamlar tarmoqdan keyin keladi — key o'zgarishi xaritani qayta
        // yaratadi va overlaylar boshidanoq joyida bo'ladi (Seismos bilan bir xil)
        key={layers ? "anomaly-map-with-layers" : "anomaly-map-without-layers"}
        center={center} zoom={7}
        style={{ height: "100%", width: "100%", flexGrow: 1 }}
        preferCanvas={true}>
        <FullscreenInvalidate trigger={isFullscreen} />

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenTopoMap" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Light Map">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri" />
          </LayersControl.BaseLayer>

          {layers?.cracks && (
            <LayersControl.Overlay checked name="🌍 Yer yoriqlari">
              <GeoJSON data={layers.cracks}
                style={{ color: "#8B0000", weight: 1, opacity: 0.7 }}
                onEachFeature={(f, l) => {
                  if (f.properties?.NAME) l.bindTooltip(`Yoriq: ${f.properties.NAME}`);
                }} />
            </LayersControl.Overlay>
          )}

          {layers?.zones && (
            <LayersControl.Overlay checked name="🔴 Seysmogen zonalar">
              <GeoJSON data={layers.zones}
                style={{ color: "#e75480", weight: 2, fillColor: "#ffb6c1", fillOpacity: 0.35 }}
                onEachFeature={(f, l) => {
                  const p = f.properties || {};
                  const name = p.seysmogen_ || p.hududiy_ma || "Seysmogen zona";
                  l.bindPopup(`<b>${name}</b>${p.seysmogen1 ? "<br>" + p.seysmogen1 : ""}`);
                  if (name) {
                    l.bindTooltip(String(name), {
                      permanent: true, direction: "center", className: "zone-label",
                    });
                  }
                }} />
            </LayersControl.Overlay>
          )}

          {/* Normal birinchi, anomal ustida tursin — eski qatlam tartibi */}
          <LayersControl.Overlay checked name="✅ Normal skvajinalar">
            <LayerGroup>
              {normal.map((w) => (
                <Marker key={w.name} position={[w.lat, w.lon]} icon={normalIcon()}>
                  <LTooltip>
                    <b>{w.name}</b><br />
                    <span style={{ color: "green" }}>Normal</span>
                  </LTooltip>
                  <Popup maxWidth={480}>
                    <WellInfoPopup well={w} />
                  </Popup>
                </Marker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="⚠️ Anomal skvajinalar">
            <LayerGroup>
              {anomalous.map((w) => (
                <Marker key={w.name} position={[w.lat, w.lon]}
                  icon={anomalousIcon(w.name === focusedWell)}
                  eventHandlers={{ click: () => onWellClick?.(w.name) }}>
                  <LTooltip>
                    <b>{w.name}</b><br />
                    <span style={{ color: "red" }}>⚠️ Anomaliya: {w.params.join(", ")}</span><br />
                    <span style={{ color: "#6c757d" }}>Grafigini birinchi o'ringa chiqarish uchun bosing</span>
                  </LTooltip>
                  <Popup maxWidth={480}>
                    <WellInfoPopup well={w} onGoToChart={onGoToChart} />
                  </Popup>
                </Marker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>

      {/* Shartli belgilar — eski legend_html bilan bir xil */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 border border-border rounded-md shadow px-3 py-2 text-xs"
        style={{ minWidth: 190 }}>
        <b>Shartli belgilar:</b>
        <div className="mt-1 space-y-0.5">
          <div><Tri c="red" /> Anomal skvajina</div>
          <div><Tri c="#3388ff" /> Normal skvajina</div>
          <div className="flex items-center gap-1.5 py-0.5">
            <div className="w-4 h-[3px] bg-[#8B0000] shrink-0"></div>
            <span>Yer yorig'i</span>
          </div>
          <div className="flex items-center gap-1.5 py-0.5">
            <div className="w-4 h-3 bg-[#e75480] border border-[#d23b66] opacity-60 shrink-0"></div>
            <span>Seysmogen zona</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tri({ c }) {
  return <span className="inline-block align-middle mr-0.5"
    style={{ width: 0, height: 0, borderLeft: "5px solid transparent",
             borderRight: "5px solid transparent", borderBottom: `10px solid ${c}` }} />;
}

/* Popup ochilganda skvajina ma'lumotini yuklaydi (well-info endpoint) —
   eski folium popup'idagi jadvalning aynan o'zi, mineralizatsiya rasmi bilan. */
function WellInfoPopup({ well, onGoToChart }) {
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
    ["Nomi", info.nomi || well.name],
    ["Quduq turi", info.quduq_turi],
    ["Chuqurlik", info.chuqurlik != null && info.chuqurlik !== "Ma'lumot yo'q" ? `${info.chuqurlik} m` : info.chuqurlik],
    ["Seysmotektonik holat", info.seysmotektonik_holat],
    ["Strategrafik taqsimoti", info.strategrafik_taqsimoti],
    ["Litologik tarkibi", info.litologik_tarkibi],
  ];

  return (
    <div style={{ width: 420, fontFamily: "Arial", fontSize: 12 }}>
      <h4 style={{ color: "#2c3e50", marginBottom: 8 }}>Skvajina ma'lumotlari</h4>

      {well.anomalous && onGoToChart && (
        <button onClick={() => onGoToChart(well.name)}
          style={{
            marginBottom: 8, padding: "5px 10px", cursor: "pointer",
            border: "1px solid #fd7e14", borderRadius: 5,
            background: "#fd7e14", color: "white",
            fontWeight: "bold", fontSize: 12,
          }}>
          ↓ Grafigiga o'tish
        </button>
      )}

      {isLoading && <p>Yuklanmoqda...</p>}
      {isError && <p style={{ color: "#dc3545" }}>Ma'lumotni yuklab bo'lmadi</p>}
      {!isLoading && !isError && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {rows.map(([label, value], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? "#f8f9fa" : "white" }}>
                  <td style={{ padding: 5, border: "1px solid #dee2e6", fontWeight: "bold" }}>{label}:</td>
                  <td style={{ padding: 5, border: "1px solid #dee2e6" }}>{value || "Ma'lumot yo'q"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {info.mineralizatsiya_base64 && (
            <div style={{ marginTop: 8, textAlign: "center" }}>
              <b>Mineralizatsiya:</b><br />
              <img src={info.mineralizatsiya_base64} alt="Mineralizatsiya"
                style={{ maxWidth: 400, maxHeight: 300, marginTop: 5, borderRadius: 5 }} />
            </div>
          )}
          {well.anomalous ? (
            <p style={{ marginTop: 8, color: "#dc3545", fontWeight: "bold" }}>
              ⚠️ Anomaliya: {well.params.join(", ")}
            </p>
          ) : (
            <p style={{ marginTop: 8, color: "#198754", fontStyle: "italic" }}>
              Anomaliya topilmadi
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   GRAFIK — eski create_anomaly_chart bilan bir xil ko'rinish:
   ko'k asosiy chiziq, UB (yashil) / Mean (magenta) / LB (ko'k)
   punktir chegaralari, chegaradan chiqqan bo'laklar QALIN QIZIL
   CHIZIQ (chetlari interpolatsiya bilan aniq kesishish nuqtasida),
   o'ng o'qda zilzila ustunlari (masofa bilan), x o'qida ±10 kun.
   ============================================================ */
function AnomalyChart({ result, sigma, focused = false }) {
  const sigmaLabel = Number(sigma ?? 2).toString();

  // Zilzila ustunlari (stem): har biri 0 dan Mb gacha, orasida null bilan uziladi
  const eqTrace = useMemo(() => {
    const eqs = result.earthquakes || [];
    if (!eqs.length) return null;
    const x = [], y = [], text = [];
    for (const eq of eqs) {
      x.push(eq.datetime, eq.datetime, null);
      y.push(0, eq.mb, null);
      text.push("", `M: ${eq.mb.toFixed(2)}, D: ${eq.distance.toFixed(1)} km`, "");
    }
    return {
      x, y, text,
      type: "scatter", mode: "lines",
      line: { color: "darkred", width: 2 },
      name: "Zilzilalar",
      hoverinfo: "text",
      yaxis: "y2",
    };
  }, [result.earthquakes]);

  const data = useMemo(() => {
    // Chegara chiziqlari eski grafikdagidek faqat MA'LUMOT oralig'ida chiziladi
    // (x o'qidagi ±10 kunlik bo'sh joyga cho'zilmaydi)
    const xr = [result.dates[0], result.dates[result.dates.length - 1]];
    const traces = [
      // 1. Asosiy chiziq (ko'k)
      {
        x: result.dates, y: result.values,
        type: "scatter", mode: "lines",
        name: result.param,
        line: { color: "blue", width: 1.5 },
        hovertemplate: "<b>Sana:</b> %{x|%d.%m.%Y}<br><b>Qiymat:</b> %{y:.3f}<extra></extra>",
      },
      // 2. Chegaralar: UB yashil, Mean magenta, LB ko'k
      {
        x: xr, y: [result.upper, result.upper],
        type: "scatter", mode: "lines",
        name: `UB (+${sigmaLabel}σ)`,
        line: { color: "green", width: 1.5, dash: "dash" },
        hoverinfo: "skip",
      },
      {
        x: xr, y: [result.mean, result.mean],
        type: "scatter", mode: "lines",
        name: "Mean",
        line: { color: "magenta", width: 1.5, dash: "dash" },
        hoverinfo: "skip",
      },
      {
        x: xr, y: [result.lower, result.lower],
        type: "scatter", mode: "lines",
        name: `LB (-${sigmaLabel}σ)`,
        line: { color: "blue", width: 1.5, dash: "dash" },
        hoverinfo: "skip",
      },
    ];

    // 3. Anomaliya segmentlari — qalin qizil chiziq, afsonada ko'rsatilmaydi
    for (const seg of result.segments || []) {
      traces.push({
        x: seg.dates, y: seg.values,
        type: "scatter", mode: "lines",
        line: { color: "red", width: 3 },
        showlegend: false,
        hoverinfo: "skip",
      });
    }

    // 4. Zilzilalar (o'ng o'q)
    if (eqTrace) traces.push(eqTrace);

    return traces;
  }, [result, sigmaLabel, eqTrace]);

  const layout = useMemo(() => {
    const l = {
      title: { text: `<b>${result.well} - ${result.param}</b>` },
      xaxis: { title: { text: "Sana" }, range: result.x_range, gridcolor: "#DEE2E6" },
      yaxis: { gridcolor: "#DEE2E6" },
      hovermode: "x unified",
      height: 500,
      // plotly.js'da "plotly_white" nomli shablon yo'q (u plotly.py niki) —
      // o'sha ko'rinish oq fon + kulrang to'r bilan qo'lda berilgan
      margin: { l: 60, r: 70, t: 50, b: 45 },
      plot_bgcolor: "#FFFFFF",
      paper_bgcolor: "#FFFFFF",
      font: { size: 11, color: "#212529" },
    };
    if (eqTrace) {
      l.yaxis2 = {
        title: { text: "Magnituda (Mb)" },
        overlaying: "y",
        side: "right",
        range: [0, result.eq_axis_max],
        showgrid: false,
      };
    }
    return l;
  }, [result, eqTrace]);

  return (
    <div className={`card ${focused ? "ring-2 ring-amber border-amber/50" : ""}`}>
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-base">
          {focused && <span className="text-amber mr-1.5" title="Xaritada tanlangan">●</span>}
          {result.well} — <span className="text-teal font-mono">{result.param}</span>
        </h3>
        <p className="text-xs text-amber font-mono">{result.anomalies.length} ta anomaliya</p>
      </div>
      <p className="text-xs text-muted font-mono mb-2">
        {result.anomalies.map((a, i) => (
          <span key={i} className="mr-3">
            {a.start_date} — {a.end_date} ({a.count} ta)
          </span>
        ))}
      </p>
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] }}
        style={{ width: "100%" }}
        useResizeHandler
      />
    </div>
  );
}

/* ================= TARIX ================= */
function HistoryTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["anomaly-history"],
    queryFn: fetchHistory,
  });

  return (
    <div className="card overflow-hidden p-0">
      {isLoading && <p className="text-sm text-muted p-4">Yuklanmoqda...</p>}
      {isError && <p className="text-sm text-danger p-4">Tarixni yuklab bo'lmadi.</p>}
      {data?.records?.length === 0 && (
        <p className="text-sm text-muted p-4">Hozircha yozuvlar yo'q.</p>
      )}
      {data?.records?.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">Sana</th>
              <th className="px-4 py-3 font-medium">Skvajina</th>
              <th className="px-4 py-3 font-medium">Parametr</th>
              <th className="px-4 py-3 font-medium">Davr</th>
              <th className="px-4 py-3 font-medium">Aniqlangan</th>
              <th className="px-4 py-3 font-medium">Oraliq</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-muted">{r.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">{r.skvajina}</td>
                <td className="px-4 py-3 font-mono text-teal">{r.parameter}</td>
                <td className="px-4 py-3 text-muted">{r.time_period_label}</td>
                <td className="px-4 py-3 text-amber font-mono">{r.detected_anomalies_count}</td>
                <td className="px-4 py-3 font-mono text-muted">
                  {r.anomaly_start_date && r.anomaly_end_date
                    ? `${r.anomaly_start_date} — ${r.anomaly_end_date}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
