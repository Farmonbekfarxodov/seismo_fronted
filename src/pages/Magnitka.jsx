import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import { apiClient } from "../api/client";
import LazyRender from "../components/LazyRender";

const Plot = createPlotlyComponent(Plotly);

// Backend: app_magnitka/urls.py
async function fetchStations() {
  const { data } = await apiClient.get("/magnitka/api/stations/");
  return data.stations;
}
async function fetchMeasurements(stationIds, startDate, endDate) {
  if (stationIds.length === 0) return { series: [], base: "Yangibozor" };
  const params = { station_ids: stationIds.join(",") };
  // Sanalar tanlanmasa — parametr yuborilmaydi, backend BARCHA ma'lumotni qaytaradi
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  const { data } = await apiClient.get("/magnitka/api/measurements/", { params });
  return { series: data.data, base: data.base_station };
}
async function fetchEarthquakes(minMag) {
  const { data } = await apiClient.get("/magnitka/api/earthquakes/", {
    params: { min_magnitude: minMag },
  });
  return data.data;
}

const LINE_COLORS = ["#0d6efd", "#198754", "#fd7e14", "#dc3545", "#6f42c1"];

export default function Magnitka() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [dates, setDates] = useState({ start: "", end: "" });
  // Eski sahifadagi "Magnitudalarni ko'rsatish" opsiyasi
  const [showMag, setShowMag] = useState(false);
  const [minMag, setMinMag] = useState(4.0);

  const stationsQuery = useQuery({
    queryKey: ["magnitka-stations"],
    queryFn: fetchStations,
  });

  const measurementsQuery = useQuery({
    queryKey: ["magnitka-measurements", selectedIds, dates.start, dates.end],
    queryFn: () => fetchMeasurements(selectedIds, dates.start, dates.end),
    enabled: selectedIds.length > 0,
  });

  const earthquakesQuery = useQuery({
    queryKey: ["magnitka-earthquakes", minMag],
    queryFn: () => fetchEarthquakes(minMag),
    enabled: showMag,
  });

  function toggleStation(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const series = measurementsQuery.data?.series || [];
  const earthquakes = showMag ? earthquakesQuery.data || [] : [];

  // Grafik davri ichiga tushadigan zilzilalar
  const eqInRange = useMemo(() => {
    if (!series.length || !earthquakes.length) return [];
    let min = null, max = null;
    for (const st of series) {
      for (const d of st.dates) {
        if (min === null || d < min) min = d;
        if (max === null || d > max) max = d;
      }
    }
    return earthquakes.filter((eq) => {
      const day = eq.datetime.slice(0, 10);
      return day >= min && day <= max;
    });
  }, [series, earthquakes]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl">Magnitka o'lchovlari</h1>
        <p className="text-sm text-muted mt-1">
          Stansiyalarni tanlang va o'lchov dinamikasini solishtiring
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card lg:col-span-1 h-fit">
          <p className="label mb-3">Stansiyalar</p>

          {stationsQuery.isLoading && (
            <p className="text-sm text-muted">Yuklanmoqda...</p>
          )}
          {stationsQuery.isError && (
            <p className="text-sm text-danger">
              Stansiyalarni yuklab bo'lmadi. Backend ishga tushirilganini tekshiring.
            </p>
          )}

          {stationsQuery.data && (
            <label className="flex items-center gap-2.5 text-sm py-1.5 px-2 mb-1 border-b border-border cursor-pointer font-medium">
              <input type="checkbox" className="accent-teal"
                checked={stationsQuery.data.length > 0 && selectedIds.length === stationsQuery.data.length}
                onChange={(e) =>
                  setSelectedIds(e.target.checked ? stationsQuery.data.map((s) => s.id) : [])
                } />
              Hammasini tanlash
            </label>
          )}

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {stationsQuery.data?.map((station) => (
              <label key={station.id}
                className="flex items-center gap-2.5 text-sm py-1.5 px-2 rounded-md hover:bg-ink-900 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(station.id)}
                  onChange={() => toggleStation(station.id)} className="accent-teal" />
                <span>{station.name}</span>
                <span className="text-muted text-xs ml-auto font-mono">{station.code}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div>
              <label className="label">Boshlanish sanasi</label>
              <input type="date" className="input-field" value={dates.start}
                onChange={(e) => setDates({ ...dates, start: e.target.value })} />
            </div>
            <div>
              <label className="label">Tugash sanasi</label>
              <input type="date" className="input-field" value={dates.end}
                onChange={(e) => setDates({ ...dates, end: e.target.value })} />
            </div>
            <p className="text-xs text-muted">
              Sanalar tanlanmasa, stantsiyaning barcha ma'lumotlari ko'rsatiladi
            </p>

            {/* Eski sahifadagi zilzila opsiyalari */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-teal" checked={showMag}
                onChange={(e) => setShowMag(e.target.checked)} />
              Magnitudalarni ko'rsatish
            </label>
            {showMag && (
              <div>
                <label className="label">Min magnituda</label>
                <input type="number" step="0.1" className="input-field" value={minMag}
                  onChange={(e) => setMinMag(Number(e.target.value))} />
              </div>
            )}
          </div>
        </div>

        <div className="card lg:col-span-3">
          {selectedIds.length === 0 && (
            <p className="text-sm text-muted py-16 text-center">
              Grafikni ko'rish uchun kamida bitta stansiya tanlang
            </p>
          )}

          {measurementsQuery.isFetching && selectedIds.length > 0 && (
            <p className="text-sm text-muted">Ma'lumot yuklanmoqda...</p>
          )}

          {showMag && eqInRange.length > 0 && (
            <p className="text-sm text-muted mb-2">
              🌋 Magnitudalar ko'rsatilmoqda (≥ M{minMag}, {eqInRange.length} ta zilzila)
            </p>
          )}

          {series.map((st, i) => (
            <LazyRender key={st.station_id} height={400}>
              <StationChart st={st} color={LINE_COLORS[i % LINE_COLORS.length]}
                earthquakes={eqInRange} baseStation={measurementsQuery.data?.base ?? "Yangibozor"} />
            </LazyRender>
          ))}
        </div>
      </div>
    </div>
  );
}


/* Bitta stantsiya grafigi — eski results_view'dagi build_chart'ning React nusxasi.
   Yangibozor: 10-minutlik o'rtacha qiymatlar (deltasiz).
   Boshqalar: Δ = qiymat − Yangibozor (bir xil vaqtda). */
function StationChart({ st, color, earthquakes, baseStation }) {
  const chartId = `mag-chart-${st.station_id}`;

  if (st.no_match) {
    return (
      <div className="card">
        <h3 className="text-base font-semibold text-teal mb-2">{st.station_name}</h3>
        <p className="text-sm text-muted">
          {baseStation} bilan mos vaqtli o'lchov topilmadi — grafik chizilmadi.
        </p>
      </div>
    );
  }

  const shapes = earthquakes.map((eq) => ({
    type: "line", x0: eq.datetime, x1: eq.datetime,
    yref: "paper", y0: 0, y1: 1,
    line: { color: "rgba(220,53,69,0.5)", width: 1.2 },
  }));
  const annotations = earthquakes.map((eq) => ({
    x: eq.datetime, yref: "paper", y: 1.02, showarrow: false,
    text: `M${eq.magnitude}`, font: { size: 9, color: "#dc3545" },
  }));

  const yTitle = st.is_delta ? `Δ (farq, ${baseStation} ga nisbatan)` : "Qiymat";

  function downloadPng() {
    const el = document.getElementById(chartId)?.querySelector(".js-plotly-plot");
    if (el) {
      Plotly.downloadImage(el, {
        format: "png", width: 1400, height: 500,
        filename: `Magnitka_${st.station_name}`,
      });
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-base font-semibold" style={{ color }}>
          {st.station_name}
          {st.is_base && (
            <span className="ml-2 text-xs font-normal text-muted">
              (baza stantsiya — 10 minutlik o'rtacha)
            </span>
          )}
          {st.is_delta && (
            <span className="ml-2 text-xs font-normal text-muted">
              (Δ — {baseStation} ga nisbatan)
            </span>
          )}
        </h3>
        <button onClick={downloadPng}
          className="px-3 py-1.5 text-sm rounded-md border border-teal text-teal hover:bg-blue-50 transition-colors">
          Grafikni yuklash (PNG)
        </button>
      </div>
      <div className="p-2" id={chartId}>
        <Plot
          data={[{
            x: st.dates, y: st.values,
            type: "scatter", mode: "lines",
            name: st.station_name,
            line: { color, width: 1.4 },
            hovertemplate: `%{x}<br>${st.is_delta ? "Δ" : "Qiymat"}: %{y}<extra></extra>`,
          }]}
          layout={{
            height: 360,
            margin: { l: 60, r: 15, t: 30, b: 40 },
            shapes, annotations,
            xaxis: { gridcolor: "#DEE2E6" },
            yaxis: { title: { text: yTitle }, gridcolor: "#DEE2E6" },
            plot_bgcolor: "#FFFFFF", paper_bgcolor: "#FFFFFF",
            font: { size: 11, color: "#212529" },
            hovermode: "closest",
            showlegend: false,
          }}
          config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] }}
          style={{ width: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
