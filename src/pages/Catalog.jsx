import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";

// Backend: upload_catalog_app (endi to'liq JSON API)
// Root urls.py: path('catalog-list/', include('upload_catalog_app.urls'))
const BASE = "/catalog-list";

async function fetchCatalog() {
  const { data } = await apiClient.get(`${BASE}/`);
  return data;
}

export default function Catalog() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [manualForm, setManualForm] = useState({
    event_date: "", event_time: "", latitude: "", longitude: "",
    depth: "", magnitude: "", epicenter: "",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog"],
    queryFn: fetchCatalog,
  });

  async function handleFetchFromApi() {
    setBusy("api");
    setFeedback(null);
    try {
      const { data } = await apiClient.post(`${BASE}/upload-catalog/`);
      setFeedback({ ok: true, text: data.message });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
    } catch (err) {
      setFeedback({ ok: false, text: err.response?.data?.message || "Xatolik yuz berdi" });
    } finally {
      setBusy(null);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("file");
    setFeedback(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await apiClient.post(`${BASE}/upload-file/`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFeedback({
        ok: data.success,
        text: `${data.added} ta qo'shildi${data.error_count ? `, ${data.error_count} ta xato` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
    } catch (err) {
      setFeedback({ ok: false, text: err.response?.data?.message || "Xatolik yuz berdi" });
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    setBusy("manual");
    setFeedback(null);
    try {
      const { data } = await apiClient.post(`${BASE}/manual-entry/`, manualForm);
      setFeedback({ ok: true, text: data.message });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      setManualForm({ event_date: "", event_time: "", latitude: "", longitude: "", depth: "", magnitude: "", epicenter: "" });
    } catch (err) {
      const errors = err.response?.data?.errors;
      setFeedback({
        ok: false,
        text: errors ? Object.values(errors).flat().join(", ") : "Xatolik yuz berdi",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Zilzilalar katalogi</h1>
          <p className="text-sm text-muted mt-1">
            {data && `${data.start_date ?? "—"} dan ${data.end_date ?? "—"} gacha`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleFetchFromApi} disabled={busy === "api"}>
            {busy === "api" ? "Yuklanmoqda..." : "API'dan yangilash"}
          </button>
          <label className="btn-primary cursor-pointer">
            {busy === "file" ? "Yuklanmoqda..." : "Fayldan yuklash"}
            <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleFileUpload} disabled={busy === "file"} />
          </label>
        </div>
      </div>

      {feedback && (
        <p className={`text-sm mb-4 ${feedback.ok ? "text-teal" : "text-danger"}`}>{feedback.text}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 p-0 overflow-hidden">
          {isLoading && <p className="text-sm text-muted p-4">Yuklanmoqda...</p>}
          {isError && <p className="text-sm text-danger p-4">Ma'lumotni yuklab bo'lmadi</p>}
          {data?.records?.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-3 font-medium">Sana</th>
                  <th className="px-4 py-3 font-medium">Vaqt</th>
                  <th className="px-4 py-3 font-medium">Kенglik/Uzunlik</th>
                  <th className="px-4 py-3 font-medium">Chuqurlik</th>
                  <th className="px-4 py-3 font-medium">Mb</th>
                  <th className="px-4 py-3 font-medium">Epitsentr</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-muted">{r.Event_date}</td>
                    <td className="px-4 py-3 font-mono text-muted">{r.Event_time}</td>
                    <td className="px-4 py-3 font-mono">{r.Latitude}, {r.Longitude}</td>
                    <td className="px-4 py-3">{r.Depth} km</td>
                    <td className="px-4 py-3 text-amber font-mono">{r.Mb}</td>
                    <td className="px-4 py-3">{r.Epicenter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form onSubmit={handleManualSubmit} className="card space-y-3">
          <p className="label">Qo'lda kiritish</p>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" required className="input-field" value={manualForm.event_date}
              onChange={(e) => setManualForm({ ...manualForm, event_date: e.target.value })} />
            <input type="time" step="1" required className="input-field" value={manualForm.event_time}
              onChange={(e) => setManualForm({ ...manualForm, event_time: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="any" required placeholder="Kenglik" className="input-field" value={manualForm.latitude}
              onChange={(e) => setManualForm({ ...manualForm, latitude: e.target.value })} />
            <input type="number" step="any" required placeholder="Uzunlik" className="input-field" value={manualForm.longitude}
              onChange={(e) => setManualForm({ ...manualForm, longitude: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="any" required placeholder="Chuqurlik (km)" className="input-field" value={manualForm.depth}
              onChange={(e) => setManualForm({ ...manualForm, depth: e.target.value })} />
            <input type="number" step="any" required placeholder="Magnitud" className="input-field" value={manualForm.magnitude}
              onChange={(e) => setManualForm({ ...manualForm, magnitude: e.target.value })} />
          </div>
          <input placeholder="Epitsentr" className="input-field" value={manualForm.epicenter}
            onChange={(e) => setManualForm({ ...manualForm, epicenter: e.target.value })} />
          <button type="submit" className="btn-primary w-full" disabled={busy === "manual"}>
            {busy === "manual" ? "Saqlanmoqda..." : "Qo'shish"}
          </button>
        </form>
      </div>
    </div>
  );
}
