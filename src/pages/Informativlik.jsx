import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { apiClient } from "../api/client";
import LazyRender from "../components/LazyRender";

const Plot = createPlotlyComponent(Plotly);

// Backend: app_informativlik/api_views.py
async function fetchOptions() {
  const { data } = await apiClient.get("/informativlik/api/options/");
  return data;
}
async function postAnalyze(payload) {
  const { data } = await apiClient.post("/informativlik/api/analyze/", payload);
  return data;
}

export default function Informativlik() {
  const options = useQuery({ queryKey: ["inf-options"], queryFn: fetchOptions });

  const [wells, setWells] = useState([]);
  const [params, setParams] = useState([]);
  const [settings, setSettings] = useState({
    window_years: 5, anomaly_duration: 5, std_factor: 2.0,
    timedelta_before: 30, timedelta_after: 10,
    min_mag: 4.0, min_mlgr: 2.5,
    start_date: "", end_date: "", median_window: "",
  });
  const [exporting, setExporting] = useState(false);

  const analysis = useMutation({ mutationFn: postAnalyze });
  const result = analysis.data;

  function toggle(list, setList, item) {
    setList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  function run() {
    analysis.mutate({
      wells, params,
      window_years: Number(settings.window_years),
      anomaly_duration: Number(settings.anomaly_duration),
      std_factor: Number(settings.std_factor),
      timedelta_before: Number(settings.timedelta_before),
      timedelta_after: Number(settings.timedelta_after),
      min_mag: Number(settings.min_mag),
      min_mlgr: Number(settings.min_mlgr),
      start_date: settings.start_date || null,
      end_date: settings.end_date || null,
      median_window: settings.median_window ? Number(settings.median_window) : null,
    });
  }

  // Excel eksport: natijalarni backend'ga yuborib, fayl olamiz
  async function exportExcel() {
    if (!result?.results) return;
    setExporting(true);
    try {
      const res = await apiClient.post(
        "/informativlik/api/export/",
        { results: result.results },
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "informativlik.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Informativlik tahlili</h1>
        <p className="text-sm text-muted mt-1">
          Parametrlarning zilzila oldi anomaliyalarini ko'rsatish qobiliyatini baholash
        </p>
      </div>

      {options.isLoading && <p className="text-sm text-muted">Yuklanmoqda...</p>}
      {options.isError && (
        <p className="text-sm text-danger">Boshlang'ich ma'lumotlarni yuklab bo'lmadi.</p>
      )}

      {options.data && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Tanlash paneli */}
          <div className="space-y-4 xl:col-span-1">
            <div className="card">
              <p className="label mb-2">Skvajinalar ({wells.length})</p>
              <label className="flex items-center gap-2 text-sm py-1 px-1.5 mb-1 border-b border-border cursor-pointer font-medium">
                <input type="checkbox" className="accent-teal shrink-0"
                  checked={options.data.wells.length > 0 && wells.length === options.data.wells.length}
                  onChange={(e) => setWells(e.target.checked ? [...options.data.wells] : [])} />
                Hammasini tanlash
              </label>
              <div className="max-h-44 overflow-y-auto space-y-1">
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
              <Num label="Oyna (yil)" v={settings.window_years} set={(v) => setSettings({ ...settings, window_years: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Num label="Anom. davomiyligi" v={settings.anomaly_duration} set={(v) => setSettings({ ...settings, anomaly_duration: v })} />
                <Num label="Std faktor (σ)" step="0.1" v={settings.std_factor} set={(v) => setSettings({ ...settings, std_factor: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Num label="Oldin (kun)" v={settings.timedelta_before} set={(v) => setSettings({ ...settings, timedelta_before: v })} />
                <Num label="Keyin (kun)" v={settings.timedelta_after} set={(v) => setSettings({ ...settings, timedelta_after: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Num label="Min Mb" step="0.1" v={settings.min_mag} set={(v) => setSettings({ ...settings, min_mag: v })} />
                <Num label="Min M/lgR" step="0.1" v={settings.min_mlgr} set={(v) => setSettings({ ...settings, min_mlgr: v })} />
              </div>
              <div>
                <label className="label">Median oynasi (ixtiyoriy)</label>
                <input type="number" min="1" className="input-field" placeholder="Bo'sh — median yo'q"
                  value={settings.median_window}
                  onChange={(e) => setSettings({ ...settings, median_window: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <button className="btn-primary w-full"
                disabled={wells.length === 0 || params.length === 0 || analysis.isPending}
                onClick={run}>
                {analysis.isPending ? "Hisoblanmoqda..." : "Tahlilni boshlash"}
              </button>
              {analysis.isError && (
                <p className="text-danger text-sm">
                  {analysis.error?.response?.data?.error || "Tahlilda xatolik yuz berdi"}
                </p>
              )}
            </div>
          </div>

          {/* Natijalar */}
          <div className="xl:col-span-3 space-y-6">
            {result && (
              <>
                <div className="card p-0 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-ink-50">
                      Natijalar jadvali <span className="text-muted font-normal">(q bo'yicha saralangan)</span>
                    </p>
                    <button className="btn-secondary text-xs py-1.5" onClick={exportExcel} disabled={exporting}>
                      {exporting ? "Tayyorlanmoqda..." : "Excel yuklab olish"}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted">
                          {["№", "Skvajina", "Parametr", "T", "t", "n", "m", "t/T", "m/n", "Φ(ξ)", "q", "Ishonchlilik", "Informativlik"].map((h) => (
                            <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.map((r, i) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                            <td className="px-3 py-2.5">{r.skvajina}</td>
                            <td className="px-3 py-2.5 font-mono text-teal">{r.parametr}</td>
                            <td className="px-3 py-2.5 font-mono">{r.T}</td>
                            <td className="px-3 py-2.5 font-mono">{r.t}</td>
                            <td className="px-3 py-2.5 font-mono">{r.n}</td>
                            <td className="px-3 py-2.5 font-mono">{r.m}</td>
                            <td className="px-3 py-2.5 font-mono text-muted">{r.t_T}</td>
                            <td className="px-3 py-2.5 font-mono text-muted">{r.m_n}</td>
                            <td className="px-3 py-2.5 font-mono">{r.phi_xi}</td>
                            <td className="px-3 py-2.5 font-mono text-amber font-semibold">{r.q}</td>
                            <td className="px-3 py-2.5 text-muted">{r.reliability}</td>
                            <td className="px-3 py-2.5">{r.informativity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {result.series.map((s) => (
                  <LazyRender key={`${s.key}-${s.param}`} height={430}>
                    <InfChart series={s} />
                  </LazyRender>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Num({ label, v, set, step = "1" }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" step={step} className="input-field" value={v}
        onChange={(e) => set(e.target.value)} />
    </div>
  );
}

/* Grafik (Plotly, zoom bilan): qiymatlar + sigma chegaralari + zilzilalar
   (tutilganlari ko'k, tutilmaganlari kulrang vertikal chiziqlar) */
function InfChart({ series }) {
  const { shapes, annotations } = useMemo(() => {
    const shapes = [], annotations = [];
    const first = series.dates[0];
    const last = series.dates[series.dates.length - 1];
    for (const eq of series.earthquakes) {
      if (eq.date < first || eq.date > last) continue;
      const color = eq.captured ? "#0d6efd" : "#adb5bd";
      shapes.push({
        type: "line", x0: eq.date, x1: eq.date, yref: "paper", y0: 0, y1: 1,
        line: { color, width: eq.captured ? 1.5 : 1 },
        opacity: eq.captured ? 0.85 : 0.45,
      });
      annotations.push({
        x: eq.date, yref: "paper", y: 1.02, showarrow: false,
        text: `M${eq.mb}`, font: { size: 9, color },
      });
    }
    return { shapes, annotations };
  }, [series]);

  const xr = [series.dates[0], series.dates[series.dates.length - 1]];
  const capturedCount = series.earthquakes.filter((e) => e.captured).length;

  const data = [
    {
      x: series.dates, y: series.values, type: "scatter", mode: "lines",
      name: series.param, line: { color: "#198754", width: 1.3 },
      hovertemplate: "%{x}<br>Qiymat: %{y}<extra></extra>",
    },
    { x: xr, y: [series.mean, series.mean], type: "scatter", mode: "lines",
      name: "O'rtacha", line: { color: "#6c757d", dash: "dash", width: 1 }, hoverinfo: "skip" },
    { x: xr, y: [series.mean + series.sigma, series.mean + series.sigma],
      type: "scatter", mode: "lines", name: "+σ",
      line: { color: "#fd7e14", dash: "dot", width: 1 }, hoverinfo: "skip" },
    { x: xr, y: [series.mean - series.sigma, series.mean - series.sigma],
      type: "scatter", mode: "lines", name: "−σ",
      line: { color: "#fd7e14", dash: "dot", width: 1 }, hoverinfo: "skip" },
  ];

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-base">
          {series.key} — <span className="text-teal font-mono">{series.param}</span>
        </h3>
        <p className="text-xs text-muted font-mono">
          q=<span className="text-amber">{series.q}</span> · {capturedCount}/{series.earthquakes.length} zilzila tutildi
        </p>
      </div>
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
      <p className="text-xs text-muted mt-1">
        <span className="text-teal">Ko'k chiziq</span> — anomaliya tomonidan "tutilgan" zilzila ·{" "}
        <span style={{ color: "#adb5bd" }}>Kulrang</span> — tutilmagan
      </p>
    </div>
  );
}
