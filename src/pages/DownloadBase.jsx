import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";

/*
 * Eski /upload/ sahifasining aynan nusxasi — 4 ta bo'lim:
 *   1) Saytdan (API) avtomatik yuklab bazaga yozish   -> POST /upload/api/
 *   2) Excel faylni o'qib bazaga yozish               -> POST /upload/excel/
 *   3) Ma'lumotlarni geoseysmoga yuklash (transfer)   -> POST /upload/transfer/
 *   4) Magnitka ma'lumotlarini bazaga yuklash         -> POST /upload/magnitka/
 *
 * Stansiya/quduq ro'yxatlari:
 *   1,3-bo'lim: GET /upload/stations-wells/  (STATIONS_AND_WELLS)
 *   4-bo'lim:   GET /upload/get-stations/    (DB'dagi stations jadvali)
 */

// Eski JS'dagi formatDateToDDMMYYYY bilan bir xil
function toDDMMYYYY(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

async function fetchStationsWells() {
  const { data } = await apiClient.get("/upload/stations-wells/");
  return data.data; // { CODE: {name, wells:[{api_well, db_well}]}, ... }
}

async function fetchMagnitkaStations() {
  const { data } = await apiClient.get("/upload/get-stations/");
  return data.data; // [{id, code, name, ...}]
}

export default function DownloadBase() {
  const stationsWells = useQuery({
    queryKey: ["stations-wells"],
    queryFn: fetchStationsWells,
  });
  const magnitkaStations = useQuery({
    queryKey: ["magnitka-db-stations"],
    queryFn: fetchMagnitkaStations,
  });

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl text-center mb-6">Ma'lumotlarni bazaga yuklash</h1>

      <div className="space-y-6">
        <ApiSection stations={stationsWells.data} />
        <ExcelSection />
        <TransferSection stations={stationsWells.data} />
        <MagnitkaSection stations={magnitkaStations.data} />
      </div>
    </div>
  );
}

function Msg({ result }) {
  if (!result) return null;
  return (
    <p className={`mt-3 text-center font-bold text-sm ${result.success ? "text-green-600" : "text-danger"}`}>
      {result.message}
    </p>
  );
}

/* Stansiya + quduq juft selecti (1- va 3-bo'limlarda bir xil) */
function StationWellSelects({ stations, station, setStation, well, setWell }) {
  const wells = station !== "all" && stations?.[station]?.wells
    ? stations[station].wells
    : [];

  return (
    <>
      <div>
        <label className="label">Stansiyani tanlang:</label>
        <select className="input-field" value={station}
          onChange={(e) => { setStation(e.target.value); setWell("all_wells"); }}>
          <option value="all">Hammasi</option>
          {stations && Object.keys(stations).map((code) => (
            <option key={code} value={code}>{stations[code]?.name || code}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Quduqni tanlang:</label>
        <select className="input-field" value={well} disabled={station === "all"}
          onChange={(e) => setWell(e.target.value)}>
          <option value="all_wells">Hammasi</option>
          {wells.map((w) => (
            <option key={w.db_well} value={w.api_well}>{w.db_well}</option>
          ))}
        </select>
      </div>
    </>
  );
}

/* ============ 1) API dan yuklash (yashil tugma) ============ */
function ApiSection({ stations }) {
  const [station, setStation] = useState("all");
  const [well, setWell] = useState("all_wells");
  const [dates, setDates] = useState({ start: "", end: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (new Date(dates.end) < new Date(dates.start)) {
      setResult({ success: false, message: "Yakuniy sana boshlang'ich sanadan keyin bo'lishi kerak!" });
      return;
    }
    setLoading(true);
    setResult({ success: true, message: "Yuklanmoqda..." });
    try {
      const { data } = await apiClient.post("/upload/api/", {
        station, well,
        start_date: toDDMMYYYY(dates.start),
        end_date: toDDMMYYYY(dates.end),
      });
      setResult(data);
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || "Xatolik yuz berdi" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="text-lg">1) Saytdan (API) avtomatik yuklab bazaga yozish</h2>
      <StationWellSelects stations={stations}
        station={station} setStation={setStation} well={well} setWell={setWell} />
      <div>
        <label className="label">Boshlang'ich sana:</label>
        <input type="date" required min="1960-01-01" max="2100-12-31" className="input-field"
          value={dates.start} onChange={(e) => setDates({ ...dates, start: e.target.value })} />
      </div>
      <div>
        <label className="label">Yakuniy sana:</label>
        <input type="date" required min="1960-01-01" max="2100-12-31" className="input-field"
          value={dates.end} onChange={(e) => setDates({ ...dates, end: e.target.value })} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-md bg-green-600 hover:bg-green-700 text-white font-medium py-2 transition-colors disabled:opacity-50">
        API dan Yuklash
      </button>
      <Msg result={result} />
    </form>
  );
}

/* ============ 2) Excel yuklash (ko'k tugma) ============ */
function ExcelSection() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) {
      setResult({ success: false, message: "Iltimos Excel fayl tanlang!" });
      return;
    }
    // Eski sahifadagi qoidaning aynan o'zi
    if (!file.name.startsWith("Gidrogeoseysmologiya")) {
      setResult({ success: false, message: "Fayl nomi 'Gidrogeoseysmologiya' bilan boshlanishi shart!" });
      return;
    }
    setLoading(true);
    setResult({ success: true, message: "Excel yuklanmoqda..." });
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await apiClient.post("/upload/excel/", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || "Xatolik yuz berdi" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="text-lg">2) Excel faylni o'qib bazaga yozish</h2>
      <p className="text-sm text-muted">
        Talab: fayl nomi <b className="text-ink-100">Gidrogeoseysmologiya</b> so'zi bilan
        boshlanishi shart (masalan: <i>Gidrogeoseysmologiya-SKV_2026.xlsx</i>)
      </p>
      <div>
        <label className="label">Excel fayl (.xlsx):</label>
        <input type="file" accept=".xlsx" required className="input-field"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-md bg-teal hover:bg-teal-dark text-white font-medium py-2 transition-colors disabled:opacity-50">
        Excel dan Yuklash
      </button>
      <Msg result={result} />
    </form>
  );
}

/* ============ 3) Geoseysmoga yuklash / transfer (sariq tugma) ============ */
function TransferSection({ stations }) {
  const [station, setStation] = useState("all");
  const [well, setWell] = useState("all_wells");
  const [dates, setDates] = useState({ start: "", end: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (new Date(dates.end) < new Date(dates.start)) {
      setResult({ success: false, message: "Yakuniy sana boshlang'ich sanadan keyin bo'lishi kerak!" });
      return;
    }
    setLoading(true);
    setResult({ success: true, message: "Yangi bazaga ko'chirilmoqda..." });
    try {
      const { data } = await apiClient.post("/upload/transfer/", {
        station, well,
        start_date: toDDMMYYYY(dates.start),
        end_date: toDDMMYYYY(dates.end),
      });
      setResult(data);
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || "Xatolik yuz berdi" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 border-yellow-400">
      <h2 className="text-lg">3) Ma'lumotlarni geoseysmoga yuklash</h2>
      <StationWellSelects stations={stations}
        station={station} setStation={setStation} well={well} setWell={setWell} />
      <div>
        <label className="label">Boshlang'ich sana:</label>
        <input type="date" required min="1960-01-01" max="2100-12-31" className="input-field"
          value={dates.start} onChange={(e) => setDates({ ...dates, start: e.target.value })} />
      </div>
      <div>
        <label className="label">Yakuniy sana:</label>
        <input type="date" required min="1960-01-01" max="2100-12-31" className="input-field"
          value={dates.end} onChange={(e) => setDates({ ...dates, end: e.target.value })} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-md bg-yellow-400 hover:bg-yellow-500 text-ink-50 font-semibold py-2 transition-colors disabled:opacity-50">
        Geoseysmoga yuklash
      </button>
      <Msg result={result} />
    </form>
  );
}

/* ============ 4) Magnitka (moviy/cyan tugma) ============ */
function MagnitkaSection({ stations }) {
  const [stationCode, setStationCode] = useState("");
  const [dates, setDates] = useState({ start: "", end: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (new Date(dates.end) < new Date(dates.start)) {
      setResult({ success: false, message: "Yakuniy sana boshlang'ich sanadan keyin bo'lishi kerak!" });
      return;
    }
    setLoading(true);
    setResult({ success: true, message: "Magnitka ma'lumotlari yuklanmoqda..." });
    try {
      const { data } = await apiClient.post("/upload/magnitka/", {
        date_start: dates.start,
        date_end: dates.end,
        station_code: stationCode || null,
      });
      setResult(data);
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || "Xatolik yuz berdi" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 border-cyan-300">
      <h2 className="text-lg">4) Magnitka ma'lumotlarini bazaga yuklash</h2>
      <div>
        <label className="label">Stansiyani tanlang:</label>
        <select className="input-field" value={stationCode}
          onChange={(e) => setStationCode(e.target.value)}>
          <option value="">Hammasi</option>
          {stations?.map((s) => (
            <option key={s.id} value={s.code}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Boshlang'ich sana:</label>
        <input type="date" required min="1960-01-01" max="2100-12-31" className="input-field"
          value={dates.start} onChange={(e) => setDates({ ...dates, start: e.target.value })} />
      </div>
      <div>
        <label className="label">Yakuniy sana:</label>
        <input type="date" required min="1960-01-01" max="2100-12-31" className="input-field"
          value={dates.end} onChange={(e) => setDates({ ...dates, end: e.target.value })} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full rounded-md text-ink-50 font-semibold py-2 transition-colors disabled:opacity-50"
        style={{ background: "#0dcaf0" }}>
        Magnitka ma'lumotlarini yuklash
      </button>
      <Msg result={result} />
    </form>
  );
}
