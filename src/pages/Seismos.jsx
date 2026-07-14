import { memo, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup,
  Tooltip as LTooltip, GeoJSON, LayersControl,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { apiClient } from "../api/client";
import LazyRender from "../components/LazyRender";

const Plot = createPlotlyComponent(Plotly);

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
      {options.isLoading && <p className="text-sm text-muted">Yuklanmoqda...</p>}
      {options.isError && (
        <p className="text-sm text-danger">
          Boshlang'ich ma'lumotlarni yuklab bo'lmadi. Backend ishga tushirilganini tekshiring.
        </p>
      )}

      {options.data && (
        <>
        <h1 className="text-2xl md:text-3xl text-center tracking-wide mb-6 mt-4">
          SEYSMOPROGNOSTIK TAHLIL
        </h1>

        {/* 2-rasmdagi forma: chap ko'k hoshiyali karta */}
        <div className="card border-l-4 border-l-teal max-w-4xl mx-auto mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <details className="border border-border rounded-md">
              <summary className="px-3 py-2.5 cursor-pointer font-semibold text-sm">
                Skvajinalar{" "}
                <span className="bg-teal text-white text-xs rounded px-1.5 py-0.5">{selectedKeys.length}</span>
              </summary>
              <div className="px-3 pb-3 max-h-56 overflow-y-auto">
                <label className="flex items-center gap-2 text-sm py-1 border-b border-border cursor-pointer font-medium">
                  <input type="checkbox" className="accent-teal shrink-0"
                    checked={options.data.wells.length > 0 && selectedKeys.length === options.data.wells.length}
                    onChange={(e) => setSelectedKeys(e.target.checked ? [...options.data.wells] : [])} />
                  Hammasini tanlash
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
                Parametrlar{" "}
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
                  Hammasini tanlash
                </label>
                {Object.entries(options.data.param_groups).map(([group, params]) => (
                  <div key={group} className="mt-1">
                    <p className="text-xs text-muted uppercase">{group}</p>
                    {params.map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                        <input type="checkbox" className="accent-teal shrink-0"
                          checked={selectedParams.includes(p)}
                          onChange={() => toggle(selectedParams, setSelectedParams, p)} />
                        <span className="font-mono">{p}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </details>

            <div>
              <label className="label">Min Magnituda</label>
              <input type="number" step="0.1" placeholder="Magnituda" className="input-field"
                value={settings.min_mag}
                onChange={(e) => setSettings({ ...settings, min_mag: e.target.value })} />
            </div>
            <div>
              <label className="label">Sigma (σ)</label>
              <input type="number" step="0.1" placeholder="Sigma" className="input-field"
                value={settings.sigma}
                onChange={(e) => setSettings({ ...settings, sigma: e.target.value })} />
            </div>

            <div>
              <label className="label">Yillik Sigma davri (ixtiyoriy):</label>
              <input type="number" min="1" placeholder="Yillar soni (masalan: 2)" className="input-field"
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
                  <span className="text-teal">M/lgR bo'yicha</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap">
                  <input type="radio" name="filter_mode" className="accent-teal"
                    checked={settings.filter_mode === "mb"}
                    onChange={() => setSettings({ ...settings, filter_mode: "mb" })} />
                  <span className="text-teal">Mb bo'yicha</span>
                </label>
                <input type="number" step="0.1" placeholder="M/lgR"
                  className="input-field !w-24 ml-auto"
                  disabled={settings.filter_mode === "mb"}
                  value={settings.min_mlgr}
                  onChange={(e) => setSettings({ ...settings, min_mlgr: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">Boshlanish</label>
              <input type="date" className="input-field" value={settings.start_date}
                onChange={(e) => setSettings({ ...settings, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">Tugash</label>
              <input type="date" className="input-field" value={settings.end_date}
                onChange={(e) => setSettings({ ...settings, end_date: e.target.value })} />
            </div>

            <div>
              <label className="label">Mediana</label>
              <select className="input-field" value={settings.median_window}
                onChange={(e) => setSettings({ ...settings, median_window: e.target.value })}>
                <option value="">Tanlanmagan</option>
                {options.data.median_values.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ko'rsatish nazorati</label>
              <div className="flex gap-2 flex-wrap">
                <label className="flex items-center gap-2 text-sm border border-border rounded-full px-3.5 py-2 cursor-pointer">
                  <input type="checkbox" className="accent-teal" checked={showMap}
                    onChange={(e) => setShowMap(e.target.checked)} />
                  Xarita ko'rsatilsin
                </label>
                <label className="flex items-center gap-2 text-sm border border-border rounded-full px-3.5 py-2 cursor-pointer">
                  <input type="checkbox" className="accent-teal" checked={showGraphs}
                    onChange={(e) => setShowGraphs(e.target.checked)} />
                  Grafiklar ko'rsatilsin
                </label>
              </div>
            </div>
          </div>

          <button className="btn-primary w-full mt-4 py-2.5"
            disabled={selectedKeys.length === 0 || analysis.isPending}
            onClick={runAnalysis}>
            {analysis.isPending ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
          </button>
          {analysis.isError && (
            <p className="text-danger text-sm mt-2">
              {analysis.error?.response?.data?.error || "Tahlilda xatolik yuz berdi"}
            </p>
          )}
        </div>

        {/* Mavjud ma'lumotlar oralig'i banneri (eski sahifadagidek) */}
        <div className="max-w-4xl mx-auto mb-6 rounded-md px-4 py-3 text-sm"
          style={{ background: "#cff4fc", color: "#055160" }}>
          Mavjud ma'lumotlar oralig'i:{" "}
          {options.data.data_min_date ? (
            <>
              <b>{options.data.data_min_date}</b> dan <b>{options.data.data_max_date}</b> gacha
            </>
          ) : (
            "Ma'lumot topilmadi."
          )}
        </div>

        <div className="space-y-6">
          {showMap && (
            <>
              <h2 className="text-xl mt-2">Barcha skvajinalar xaritasi</h2>
              {layers.isLoading && (
                <p className="text-sm text-muted">
                  Xarita qatlamlari (yoriqlar, seysmogen zonalar) yuklanmoqda...
                </p>
              )}
              {layers.isError && (
                <div className="rounded-md px-4 py-3 text-sm"
                  style={{ background: "#f8d7da", color: "#842029" }}>
                  Yoriqlar va seysmogen zonalarni yuklab bo'lmadi
                  {layers.error?.response?.status
                    ? ` (server xatosi: ${layers.error.response.status})`
                    : " (serverga ulanib bo'lmadi)"}
                  . Django terminalidagi xatoni tekshiring — ko'pincha sababi
                  Redis ishlamayotgani yoki shapefile'lar yo'qligi bo'ladi.
                </div>
              )}
              <ResultsMap options={options.data} result={result} layers={layers.data}
                filterMode={settings.filter_mode} minMlgr={Number(settings.min_mlgr) || 2.5} />
            </>
          )}

          {result?.series?.length === 0 && (
            <div className="card">
              <p className="text-sm text-muted">
                Tanlangan quduq va parametrlar uchun ma'lumot topilmadi.
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

const ResultsMap = memo(function ResultsMap({ options, result, layers, filterMode, minMlgr }) {
  const wrapRef = useRef(null);

  const allWells = result?.map?.wells
    ?? Object.entries(options.well_coords).map(([name, c]) => ({
      name, lat: c.lat, lon: c.lon, selected: false,
    }));
  const earthquakes = result?.map?.earthquakes ?? [];

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
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  const RING_MS = [5, 6, 7];
  // Halqa radiusi foydalanuvchi kiritgan Min M/lgR bo'yicha (asl views.py:
  // R_km = 10 ** (M / mlgr_val)). 0 yoki bo'sh bo'lsa 2.5 ga tushadi.
  const MLGR_VAL = minMlgr && minMlgr > 0 ? minMlgr : 2.5;

  function ringsFor(w, color) {
    if (!ringsOn(w)) return null;
    return RING_MS.map((M) => {
      const rKm = Math.pow(10, M / MLGR_VAL);
      return (
        <Circle key={`${w.name}-M${M}`} center={[w.lat, w.lon]}
          radius={rKm * 1000}
          pathOptions={{ color: hexToRgba(color, 0.9), weight: 2, fill: false, opacity: 0.7 }}>
          <LTooltip>{`M=${M}, R=${rKm.toFixed(1)} km (M/lgR=${MLGR_VAL})`}</LTooltip>
        </Circle>
      );
    });
  }

  return (
    <div className="card p-0 overflow-hidden relative" ref={wrapRef}>
      {/* To'liq ekran — eski xaritadagidek chap yuqorida (zoom ostida) */}
      <button onClick={toggleFullscreen}
        className="absolute z-[1000] bg-white border border-border rounded px-2 py-1 text-xs shadow hover:bg-ink-900"
        style={{ top: 80, left: 10 }}
        title="To'liq ekran">
        ⛶
      </button>

      <MapContainer
        // MUHIM: qatlamlar (yoriqlar/zonalar) tarmoqdan xarita yaratilgandan
        // KEYIN keladi; react-leaflet LayersControl esa keyin qo'shilgan
        // overlaylarni xaritaga ulamaydi. key o'zgarishi xaritani qayta
        // yaratadi va barcha qatlamlar boshidanoq joyida bo'ladi.
        key={layers ? "map-with-layers" : "map-without-layers"}
        center={center} zoom={8} style={{ height: 520, width: "100%" }}
        preferCanvas={true}>
        <LayersControl position="topright">
          {/* Fon xaritalari — eski faylga mos 4 xil */}
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
            <LayersControl.Overlay checked name="Yer yoriqlari">
              <GeoJSON data={layers.cracks}
                style={{ color: "#8B0000", weight: 1, opacity: 0.7 }}
                onEachFeature={(f, l) => {
                  if (f.properties?.NAME) l.bindTooltip(`Yoriq: ${f.properties.NAME}`);
                }} />
            </LayersControl.Overlay>
          )}

          {layers?.zones && (
            <LayersControl.Overlay checked name="Seysmogen zonalar">
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

        </LayersControl>

        {/* Zilzilalar — DOIMIY qatlam: qatlam boshqaruvi ro'yxatidan olib
            tashlandi (foydalanuvchi o'chira olmaydi), har doim ko'rinadi */}
        <>
          {earthquakes.map((eq, i) => {
            const st = eqStyle(eq.mb, filterMode);
            return (
              <CircleMarker key={i} center={[eq.lat, eq.lon]}
                radius={Math.max(st.radius, 6)}
                pane="markerPane"
                pathOptions={{ color: "#111", fillColor: st.color, fillOpacity: 0.85, weight: 1.5 }}>
                <LTooltip>
                  <div>
                    <b>Zilzila</b><br />
                    Sana: {eq.datetime?.replace("T", " ")}<br />
                    Magnituda (Mb): {eq.mb}<br />
                    Chuqurlik (km): {eq.depth ?? "—"}<br />
                    {eq.r_km != null && <>Masofa (km): {eq.r_km}<br /></>}
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

      {/* Legenda — xarita ichida suzuvchi quti */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 border border-border rounded-md shadow px-3 py-2 text-xs max-h-48 overflow-y-auto"
        style={{ minWidth: 190 }}>
        <b>Xarita elementlari:</b>
        <div className="mt-1 space-y-0.5">
          {filterMode === "mb" ? (
            <>
              <div><Dot c="red" /> Zilzila Mb &gt; 2.8</div>
              <div><Dot c="orange" /> Zilzila Mb 2.0–2.8</div>
              <div><Dot c="gold" /> Zilzila Mb &lt; 2.0</div>
            </>
          ) : (
            <>
              <div><Dot c="darkred" /> Zilzila Mb ≥ 6.0</div>
              <div><Dot c="red" /> Zilzila Mb 5.0–5.9</div>
              <div><Dot c="orange" /> Zilzila Mb 4.0–4.9</div>
              <div><Dot c="gold" /> Zilzila Mb &lt; 4.0</div>
            </>
          )}
          <div>
            <Tri c="#0000FF" /><Tri c="#FF00FF" /><Tri c="#FFA500" />{" "}
            Tanlangan skvajinalar (har biri o'z rangida)
          </div>
          <div><Tri c="#ADD8E6" /> Tanlanmagan skvajinalar</div>
          <div><Dot c="#8B0000" /> Yer yoriqlari</div>
          <div><Dot c="#e75480" /> Seysmogen zonalar</div>
          <div className="text-muted italic pt-0.5">
            Skvajina belgisi bosilsa M=5/6/7 halqalari yoqiladi/o'chiriladi
          </div>
        </div>
      </div>
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
          {ringsOn ? "◉ Halqalarni o'chirish" : "◯ M=5/6/7 halqalarini ko'rsatish"}
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
          {well.selected ? (
            <p style={{ marginTop: 8, color: color || "#0B43FA", fontWeight: "bold" }}>
              ✓ Tanlangan skvajina
            </p>
          ) : (
            <p style={{ marginTop: 8, color: "#6c757d", fontStyle: "italic" }}>
              Tanlanmagan skvajina
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
  const chartId = `chart-${series.key}-${series.param}`.replace(/[^a-zA-Z0-9-]/g, "_");

  const data = useMemo(() => {
    const traces = [
      {
        x: series.dates, y: series.values,
        type: "scatter", mode: "lines", name: series.param,
        line: { color: "#0d6efd", width: 1.4 },
        hovertemplate: "%{x}<br>Qiymat: %{y}<extra></extra>",
      },
    ];

    const xr = [series.dates[0], series.dates[series.dates.length - 1]];
    const upper = series.upper ?? series.mean + series.sigma;
    const lower = series.lower ?? series.mean - series.sigma;
    traces.push(
      { x: xr, y: [series.mean, series.mean], type: "scatter", mode: "lines",
        name: "O'rtacha", line: { color: "#6c757d", dash: "dash", width: 1 }, hoverinfo: "skip" },
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
        { x: ubx, y: uby, type: "scatter", mode: "lines", name: "Yillik UB",
          line: { color: "#198754", width: 1.5 }, hoverinfo: "skip", connectgaps: false },
        { x: lbx, y: lby, type: "scatter", mode: "lines", name: "Yillik LB",
          line: { color: "#198754", width: 1.5, dash: "dash" }, hoverinfo: "skip", connectgaps: false },
      );
    }

    // Zilzilalar — o'ng (Mb) o'qda ustunlar (3-rasmdagidek)
    if (series.earthquakes?.length) {
      traces.push({
        x: series.earthquakes.map((eq) => eq.datetime.slice(0, 10)),
        y: series.earthquakes.map((eq) => eq.mb),
        type: "bar", name: "Zilzila (Mb)", yaxis: "y2",
        width: 1000 * 60 * 60 * 24 * 12, // ~12 kunlik ingichka ustun
        marker: {
          color: series.earthquakes.map((eq) => (eq.mb >= 6 ? "#dc3545" : "#4B0082")),
        },
        customdata: series.earthquakes.map((eq) => [eq.r_km, eq.mlgr]),
        hovertemplate:
          "Zilzila: %{x}<br>Mb: %{y}<br>Masofa: %{customdata[0]} km<br>M/lgR: %{customdata[1]}<extra></extra>",
      });
    }

    return traces;
  }, [series]);

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
          {series.key} - {series.param}
        </h3>
        <button onClick={downloadPng}
          className="px-3 py-1.5 text-sm rounded-md border border-teal text-teal hover:bg-blue-50 transition-colors">
          Grafikni yuklash (PNG)
        </button>
      </div>
      <div className="p-2" id={chartId}>
        <Plot
          data={data}
          layout={{
            title: { text: `${series.key} - ${series.param}`, font: { size: 13 } },
            height: 420,
            margin: { l: 60, r: 60, t: 45, b: 40 },
            xaxis: { gridcolor: "#DEE2E6" },
            yaxis: { title: { text: `${series.param} Qiymati` }, gridcolor: "#DEE2E6" },
            yaxis2: {
              title: { text: "Magnituda (Mb)" },
              overlaying: "y", side: "right",
              range: [0, Math.max(7, ...(series.earthquakes?.map((e) => e.mb) || [7])) + 0.5],
              showgrid: false,
            },
            plot_bgcolor: "#FFFFFF", paper_bgcolor: "#FFFFFF",
            legend: { orientation: "h", y: -0.32 },
            font: { size: 11, color: "#212529" },
            hovermode: "closest",
            bargap: 0,
          }}
          config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] }}
          style={{ width: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
