import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { apiClient } from "../api/client";
import LazyRender from "../components/LazyRender";
import { useLanguage } from "../i18n/LanguageContext";

const Plot = createPlotlyComponent(Plotly);

async function fetchOptions() {
  const { data } = await apiClient.get("/seismos/api/options/");
  return data;
}

async function postEpoch(payload) {
  const { data } = await apiClient.post("/seismos/api/epoch-analysis/", payload);
  return data;
}

export default function EpochAnalysis() {
  const { t } = useLanguage();
  const options = useQuery({ queryKey: ["seismos-options"], queryFn: fetchOptions });

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [selectedParams, setSelectedParams] = useState([]);
    const [settings, setSettings] = useState({
    min_mag: 4.0, min_mlgr: 2.5,
    days_before: 30, days_after: 10,
    start_date: "", end_date: "",
    sigma: 1.0,
  });
  // Sigma chiziqlarini ko'rsatish — formada ham, natijadan keyin ham
  // yoqib-o'chirish mumkin
  const [showSigma, setShowSigma] = useState(true);

  const analysis = useMutation({ mutationFn: postEpoch });

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
      min_mlgr: Number(settings.min_mlgr),
      days_before: Number(settings.days_before),
      days_after: Number(settings.days_after),
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
          <h1 className="text-2xl md:text-3xl text-center tracking-wide mb-2 mt-4">
            {t("ZILZILA TAHLILI")}
          </h1>
          <p className="text-sm text-muted text-center mb-6">
            {t("Har bir topilgan zilzila uchun alohida grafik: zilzila kuni — 0, chapda undan oldingi, o'ngda keyingi kunlar")}
          </p>

          <div className="card border-l-4 border-l-teal max-w-4xl mx-auto mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Skvajinalar */}
              <details className="border border-border rounded-md">
                <summary className="px-3 py-2.5 cursor-pointer font-semibold text-sm">
                  {t("Skvajinalar")}{" "}
                  <span className="bg-teal text-white text-xs rounded px-1.5 py-0.5">
                    {selectedKeys.length}
                  </span>
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

              {/* Parametrlar */}
              <details className="border border-border rounded-md">
                <summary className="px-3 py-2.5 cursor-pointer font-semibold text-sm">
                  {t("Parametrlar")}{" "}
                  <span className="bg-teal text-white text-xs rounded px-1.5 py-0.5">
                    {selectedParams.length}
                  </span>
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
                          <span className="font-mono">{p}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </details>

              <div>
                <label className="label">{t("Min Magnituda")}</label>
                <input type="number" step="0.1" className="input-field"
                  value={settings.min_mag}
                  onChange={(e) => setSettings({ ...settings, min_mag: e.target.value })} />
              </div>
              <div>
                <label className="label">Min M/lgR</label>
                <input type="number" step="0.1" className="input-field"
                  value={settings.min_mlgr}
                  onChange={(e) => setSettings({ ...settings, min_mlgr: e.target.value })} />
              </div>

              <div>
                <label className="label">{t("Zilziladan necha kun oldin")}</label>
                <input type="number" min="1" max="365" className="input-field"
                  value={settings.days_before}
                  onChange={(e) => setSettings({ ...settings, days_before: e.target.value })} />
              </div>
              <div>
                <label className="label">{t("Zilziladan necha kun keyin")}</label>
                <input type="number" min="1" max="365" className="input-field"
                  value={settings.days_after}
                  onChange={(e) => setSettings({ ...settings, days_after: e.target.value })} />
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
            </div>
            <div>
                <label className="label">{t("Sigma (σ) ko'paytuvchisi")}</label>
                <input type="number" step="0.1" min="0.1" className="input-field"
                  value={settings.sigma}
                  onChange={(e) => setSettings({ ...settings, sigma: e.target.value })} />
            </div>
            <div>
                <label className="label">{t("Sigma chiziqlari")}</label>
                <label className="flex items-center gap-2 text-sm border border-border rounded-md px-3 py-2 cursor-pointer">
                  <input type="checkbox" className="accent-teal" checked={showSigma}
                    onChange={(e) => setShowSigma(e.target.checked)} />
                  {t("Grafiklarda ko'rsatilsin")}
                </label>
            </div>

            <p className="text-xs text-muted mt-3">
              {t("Sanalar oralig'i qidiriladigan zilzilalarni cheklaydi. Har bir grafik oynasi esa yuqoridagi kun sonlari bo'yicha chiziladi.")}
            </p>

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

          {result && (
            <div className="space-y-6">
              <div className="max-w-4xl mx-auto rounded-md px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-3"
                style={{ background: "#cff4fc", color: "#055160" }}>
                <span>
                  {t("Topildi:")} <b>{result.meta.count}</b> {t("ta grafik")}
                  {result.meta.truncated && " " + t("(chegara: 200 ta, qolganini ko'rish uchun tanlovni toraytiring)")}
                </span>
                <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" className="accent-teal" checked={showSigma}
                    onChange={(e) => setShowSigma(e.target.checked)} />
                  {t("Sigma chiziqlari")}
                </label>
              </div>

              {result.charts.length === 0 && (
                <div className="card">
                  <p className="text-sm text-muted">
                    {t("Tanlangan shartlarga mos zilzila topilmadi. Magnituda yoki M/lgR chegarasini pasaytirib ko'ring.")}
                  </p>
                </div>
              )}

              {result.charts.map((c, i) => (
                <LazyRender key={`${c.key}-${c.param}-${c.earthquake.datetime}-${i}`} height={420}>
                  <EpochChart chart={c} showSigma={showSigma}
                    sigmaFactor={Number(settings.sigma) || 1} />
                </LazyRender>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Bitta zilzila oynasi grafigi: X — nisbiy kun, 0-da zilzila chizig'i */
function EpochChart({ chart, showSigma, sigmaFactor }) {
  const { t } = useLanguage();
  const chartId = `epoch-${chart.key}-${chart.param}-${chart.earthquake.datetime}`
    .replace(/[^a-zA-Z0-9-]/g, "_");

  const eqDate = chart.earthquake.datetime.replace("T", " ");

    const data = useMemo(() => {
    // Faqat haqiqiy (null bo'lmagan) nuqtalar — punktir chiziq shular
    // orasidagi bo'shliqlarni bog'laydi
    const realX = [], realY = [], realDates = [];
    chart.offsets.forEach((off, i) => {
      if (chart.values[i] !== null && chart.values[i] !== undefined) {
        realX.push(off);
        realY.push(chart.values[i]);
        realDates.push(chart.dates?.[i]);
      }
    });

    return [
      // 1-qatlam: punktir — bo'shliqlar ustidan o'tadi (taxminiy bog'lanish)
      {
        x: realX, y: realY,
        type: "scatter", mode: "lines",
        name: t("Taxminiy (ma'lumot yo'q)"),
        line: { color: "#9db8e8", width: 1.4, dash: "dot" },
        connectgaps: true,
        hoverinfo: "skip",
        showlegend: true,
      },
      // 2-qatlam: to'liq chiziq — faqat ketma-ket haqiqiy o'lchovlar orasida
      {
        x: chart.offsets, y: chart.values,
        type: "scatter", mode: "lines",
        name: t("Haqiqiy o'lchov"),
        line: { color: "#0d6efd", width: 1.8 },
        connectgaps: false,
        hoverinfo: "skip",
        showlegend: true,
      },
      // 3-qatlam: nuqtalar (hover ma'lumoti shu yerda)
      {
        x: realX, y: realY,
        type: "scatter", mode: "markers",
        name: chart.param,
        marker: { size: 5, color: "#0d6efd" },
        customdata: realDates,
        hovertemplate:
          "<b>%{customdata}</b><br>" +
          `${t("Zilziladan:")} %{x} ${t("kun")}<br>` +
          `${chart.param}: %{y}<extra></extra>`,
        showlegend: false,
      },
      // 4-qatlam: sigma chiziqlari (butun tarix bo'yicha hisoblangan)
      ...(showSigma && chart.stats ? (() => {
        const xr = [chart.offsets[0], chart.offsets[chart.offsets.length - 1]];
        const m = chart.stats.mean;
        const s = chart.stats.std * sigmaFactor;
        return [
          { x: xr, y: [m, m], type: "scatter", mode: "lines", name: t("O'rtacha"),
            line: { color: "#6c757d", dash: "dash", width: 1 }, hoverinfo: "skip" },
          { x: xr, y: [m + s, m + s], type: "scatter", mode: "lines", name: `+${sigmaFactor}σ`,
            line: { color: "#fd7e14", dash: "dot", width: 1 }, hoverinfo: "skip" },
          { x: xr, y: [m - s, m - s], type: "scatter", mode: "lines", name: `−${sigmaFactor}σ`,
            line: { color: "#fd7e14", dash: "dot", width: 1 }, hoverinfo: "skip" },
        ];
      })() : []),
    ];
  }, [chart, showSigma, sigmaFactor]);

  function downloadPng() {
    const el = document.getElementById(chartId)?.querySelector(".js-plotly-plot");
    if (el) {
      Plotly.downloadImage(el, {
        format: "png", width: 1200, height: 500,
        filename: `${chart.skvajina}_${chart.param}_${chart.earthquake.datetime.slice(0, 10)}`,
      });
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-teal">
            {chart.key} — {chart.param}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {t("Zilzila:")} {eqDate} · Mb {chart.earthquake.mb}
            {chart.earthquake.r_km != null && ` · ${t("Masofa")} ${chart.earthquake.r_km} km`}
            {chart.earthquake.mlgr != null && ` · M/lgR ${chart.earthquake.mlgr}`}
            {" · "}{t("Ma'lumotli kunlar:")} {chart.points_count}/{chart.offsets.length}
          </p>
        </div>
        <button onClick={downloadPng}
          className="px-3 py-1.5 text-sm rounded-md border border-teal text-teal hover:bg-blue-50 transition-colors">
          {t("Grafikni yuklash (PNG)")}
        </button>
      </div>
      <div className="p-2" id={chartId}>
        <Plot
          data={data}
          layout={{
            height: 420,
            margin: { l: 60, r: 30, t: 30, b: 70 },
            xaxis: {
              title: { text: t("Zilziladan kunlar (0 — zilzila kuni)") },
              gridcolor: "#DEE2E6", zeroline: false,
            },
            yaxis: { title: { text: t("{param} qiymati", { param: chart.param }) }, gridcolor: "#DEE2E6", automargin: true },
            shapes: [{
              type: "line", x0: 0, x1: 0, yref: "paper", y0: 0, y1: 1,
              line: { color: "#212529", width: 2.5 },
            }],
            annotations: [{
              x: 0, yref: "paper", y: 1.03, showarrow: false,
              text: `<b>M=${chart.earthquake.mb}</b>`,
              font: { size: 17, color: "#212529" },
              xanchor: "left", xshift: 6,
              bgcolor: "rgba(255,255,255,0.85)",
            }],
            plot_bgcolor: "#FFFFFF", paper_bgcolor: "#FFFFFF",
            font: { size: 17, color: "#212529" },
            hovermode: "closest",
            showlegend: true,
            legend: { orientation: "h", y: -0.22, font: { size: 10 } },
          }}
          config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] }}
          style={{ width: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}