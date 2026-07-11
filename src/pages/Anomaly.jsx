import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
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

  const [wells, setWells] = useState([]);
  const [params, setParams] = useState([]);
  const [settings, setSettings] = useState({
    time_period: 6, anomaly_duration: 3, recent_days: 7, sigma: 2.0, magnitude: "",
  });

  const analysis = useMutation({
    mutationFn: postAnalyze,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["anomaly-history"] }),
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

        {result && <AnomalyMap map={result.map} />}

        {result?.results?.length === 0 && (
          <div className="card">
            <p className="text-sm text-muted">
              Tanlangan mezonlar bo'yicha so'nggi {result.meta.recent_days} kunda anomaliya topilmadi.
            </p>
          </div>
        )}

        {result?.results?.map((r) => (
          <LazyRender key={`${r.well}-${r.param}`} height={430}>
            <AnomalyChart result={r} earthquakes={result.map.earthquakes} />
          </LazyRender>
        ))}
      </div>
    </div>
  );
}

function AnomalyMap({ map }) {
  const center = map.wells.length ? [map.wells[0].lat, map.wells[0].lon] : [41.3, 69.2];

  return (
    <div className="card p-0 overflow-hidden">
      <MapContainer center={center} zoom={6} style={{ height: 380, width: "100%" }} preferCanvas={true}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap" />
        {map.wells.map((w) => (
          <CircleMarker key={w.name} center={[w.lat, w.lon]}
            radius={w.anomalous ? 9 : 5}
            pathOptions={{
              color: w.anomalous ? "#dc3545" : "#0d6efd",
              fillColor: w.anomalous ? "#dc3545" : "#0d6efd",
              fillOpacity: 0.85,
            }}>
            <Popup>
              <b>{w.name}</b><br />
              {w.anomalous
                ? `Anomaliya: ${w.params.join(", ")}`
                : "Anomaliya topilmadi"}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="flex gap-5 px-4 py-2.5 text-xs text-muted border-t border-border">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-danger mr-1.5" />Anomaliyali quduq</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-teal mr-1.5" />Normal quduq</span>
      </div>
    </div>
  );
}

/* Grafik (Plotly, zoom bilan): qiymatlar + sigma chegaralari +
   anomal nuqtalar (qizil markerlar) + zilzila vertikal chiziqlari */
function AnomalyChart({ result, earthquakes }) {
  const anomalyPoints = useMemo(() => {
    const xs = [], ys = [];
    result.anomalies.forEach((a) => {
      a.dates.forEach((d, i) => { xs.push(d); ys.push(a.values[i]); });
    });
    return { xs, ys };
  }, [result]);

  const { shapes, annotations } = useMemo(() => {
    const shapes = [], annotations = [];
    const first = result.dates[0];
    const last = result.dates[result.dates.length - 1];
    for (const eq of earthquakes || []) {
      const day = eq.datetime.slice(0, 10);
      if (day < first || day > last) continue;
      shapes.push({
        type: "line", x0: day, x1: day, yref: "paper", y0: 0, y1: 1,
        line: { color: "rgba(108,117,125,0.5)", width: 1 },
      });
      annotations.push({
        x: day, yref: "paper", y: 1.02, showarrow: false,
        text: `M${eq.mb}`, font: { size: 9, color: "#6c757d" },
      });
    }
    return { shapes, annotations };
  }, [earthquakes, result.dates]);

  const xr = [result.dates[0], result.dates[result.dates.length - 1]];

  const data = [
    {
      x: result.dates, y: result.values, type: "scatter", mode: "lines",
      name: result.param, line: { color: "#0d6efd", width: 1.5 },
      hovertemplate: "%{x}<br>Qiymat: %{y}<extra></extra>",
    },
    { x: xr, y: [result.mean, result.mean], type: "scatter", mode: "lines",
      name: "O'rtacha", line: { color: "#6c757d", dash: "dash", width: 1 }, hoverinfo: "skip" },
    { x: xr, y: [result.upper, result.upper], type: "scatter", mode: "lines",
      name: "+σ chegara", line: { color: "#fd7e14", dash: "dot", width: 1 }, hoverinfo: "skip" },
    { x: xr, y: [result.lower, result.lower], type: "scatter", mode: "lines",
      name: "−σ chegara", line: { color: "#fd7e14", dash: "dot", width: 1 }, hoverinfo: "skip" },
    {
      x: anomalyPoints.xs, y: anomalyPoints.ys, type: "scatter", mode: "markers",
      name: "Anomaliya", marker: { color: "#dc3545", size: 7 },
      hovertemplate: "%{x}<br>Anomal qiymat: %{y}<extra></extra>",
    },
  ];

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-base">
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
        layout={{
          height: 320,
          margin: { l: 55, r: 15, t: 30, b: 40 },
          shapes, annotations,
          xaxis: { rangeslider: { visible: true, thickness: 0.08 }, gridcolor: "#DEE2E6" },
          yaxis: { gridcolor: "#DEE2E6" },
          plot_bgcolor: "#FFFFFF", paper_bgcolor: "#FFFFFF",
          legend: { orientation: "h", y: -0.35 },
          font: { size: 11, color: "#212529" },
          hovermode: "closest",
        }}
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
