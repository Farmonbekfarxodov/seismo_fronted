import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";

const BASE = "/catalog-list";

// fetchCatalog endi parametrlarni oladi
//
// MUHIM: backend (`upload_catalog_app/views.py`, `catalog_list`) query
// parametrlarni `start_date`/`end_date` nomi bilan kutadi, frontend state
// esa `start`/`end` deb ataladi. Ilgari bu ikkisi to'g'ridan-to'g'ri
// yuborilardi — backend ularni tanimay har doim filtrsiz "so'nggi 20 ta"
// qaytarardi (so'rov 200 bilan qaytardi, lekin jadval o'zgarmasdi).
async function fetchCatalog({ queryKey }) {
  const [_key, searchParams] = queryKey;
  const params = {};
  if (searchParams?.start) params.start_date = searchParams.start;
  if (searchParams?.end) params.end_date = searchParams.end;
  const { data } = await apiClient.get(`${BASE}/`, { params });
  return data;
}

export default function Catalog() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [manualForm, setManualForm] = useState({
    event_date: "", event_time: "", latitude: "", longitude: "",
    depth: "", magnitude: "", epicenter: "",
  });

  // Qidiruv sanalari uchun state
  const [searchDates, setSearchDates] = useState({ start: "", end: "" });

  // Haqiqiy qidiruvga yuboriladigan sanalar (Tugma bosilganda o'zgaradi)
  const [activeSearch, setActiveSearch] = useState({ start: "", end: "" });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog", activeSearch],
    queryFn: fetchCatalog,
  });

  function handleSearch(e) {
    e.preventDefault();
    setActiveSearch(searchDates);
  }

  function handleClearSearch() {
    setSearchDates({ start: "", end: "" });
    setActiveSearch({ start: "", end: "" });
  }
  async function handleFetchFromApi() {
    setBusy("api");
    setFeedback(null);
    try {
      const { data } = await apiClient.post(`${BASE}/upload-catalog/`);
      setFeedback({ ok: true, text: data.message });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
    } catch (err) {
      setFeedback({ ok: false, text: err.response?.data?.message || t("Xatolik yuz berdi") });
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
        text: t("{added} ta qo'shildi{errors}", {
          added: data.added,
          errors: data.error_count ? t(", {count} ta xato", { count: data.error_count }) : "",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
    } catch (err) {
      setFeedback({ ok: false, text: err.response?.data?.message || t("Xatolik yuz berdi") });
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
        text: errors ? Object.values(errors).flat().join(", ") : t("Xatolik yuz berdi"),
      });
    } finally {
      setBusy(null);
    }
  }

return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("Zilzilalar katalogi")}</h1>
          <p className="text-sm text-muted mt-1">
            {t("Umumiy baza:")} {data && t("{start} dan {end} gacha", {
              start: data.start_date ?? "—",
              end: data.end_date ?? "—",
            })}
          </p>
        </div>

        {/* Yuqoridagi tugmalar (API'dan yangilash, Fayldan yuklash) */}
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleFetchFromApi} disabled={busy === "api"}>
            {busy === "api" ? t("Yuklanmoqda...") : t("API'dan yangilash")}
          </button>
          <label className="btn-primary cursor-pointer">
            {busy === "file" ? t("Yuklanmoqda...") : t("Fayldan yuklash")}
            <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleFileUpload} disabled={busy === "file"} />
          </label>
        </div>
      </div>

      {/* Qidiruv paneli */}
      <div className="card mb-6 p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="label">{t("Boshlanish sanasi")}</label>
            <input type="date" className="input-field" value={searchDates.start}
              onChange={(e) => setSearchDates({ ...searchDates, start: e.target.value })} />
          </div>
          <div className="flex-1 w-full">
            <label className="label">{t("Tugash sanasi")}</label>
            <input type="date" className="input-field" value={searchDates.end}
              onChange={(e) => setSearchDates({ ...searchDates, end: e.target.value })} />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="submit" className="btn-primary flex-1 sm:flex-none">
              {t("Qidirish")}
            </button>
            {(activeSearch.start || activeSearch.end) && (
              <button type="button" onClick={handleClearSearch} className="btn-secondary flex-1 sm:flex-none">
                {t("Tozalash")}
              </button>
            )}
          </div>
        </form>
      </div>

      {feedback && (
        <p className={`text-sm mb-4 ${feedback.ok ? "text-teal" : "text-danger"}`}>{feedback.text}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 p-0 overflow-hidden">
          {/* Sarlavha: agar filter qilingan bo'lsa natijalar soni ko'rinadi */}
          <div className="px-4 py-3 border-b border-border bg-ink-900 flex justify-between items-center">
            <h3 className="text-sm font-semibold">
              {data?.filtered
                ? t("Qidiruv natijalari ({count} ta)", { count: data.count })
                : t("So'nggi 20 ta yozuv")}
            </h3>
          </div>

          {isLoading && <p className="text-sm text-muted p-4">{t("Yuklanmoqda...")}</p>}
          {isError && <p className="text-sm text-danger p-4">{t("Ma'lumotni yuklab bo'lmadi")}</p>}

          {data?.records?.length === 0 && !isLoading && (
             <p className="text-sm text-muted p-4">{t("Berilgan sanalar oralig'ida zilzilalar topilmadi.")}</p>
          )}

          {data?.records?.length > 0 && (
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-4 py-3 font-medium">{t("Sana")}</th>
                    <th className="px-4 py-3 font-medium">{t("Vaqt")}</th>
                    <th className="px-4 py-3 font-medium">{t("Kenglik/Uzunlik")}</th>
                    <th className="px-4 py-3 font-medium">{t("Chuqurlik")}</th>
                    <th className="px-4 py-3 font-medium">Mb</th>
                    <th className="px-4 py-3 font-medium">{t("Epitsentr")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-ink-900">
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
            </div>
          )}
        </div>

        {/* Qo'lda kiritish formasi (o'z holicha) */}
        <form onSubmit={handleManualSubmit} className="card space-y-3 h-fit">
          <p className="label">{t("Qo'lda kiritish")}</p>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" required className="input-field" value={manualForm.event_date}
              onChange={(e) => setManualForm({ ...manualForm, event_date: e.target.value })} />
            <input type="time" step="1" required className="input-field" value={manualForm.event_time}
              onChange={(e) => setManualForm({ ...manualForm, event_time: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="any" required placeholder={t("Kenglik")} className="input-field" value={manualForm.latitude}
              onChange={(e) => setManualForm({ ...manualForm, latitude: e.target.value })} />
            <input type="number" step="any" required placeholder={t("Uzunlik")} className="input-field" value={manualForm.longitude}
              onChange={(e) => setManualForm({ ...manualForm, longitude: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="any" required placeholder={t("Chuqurlik (km)")} className="input-field" value={manualForm.depth}
              onChange={(e) => setManualForm({ ...manualForm, depth: e.target.value })} />
            <input type="number" step="any" required placeholder={t("Magnitud")} className="input-field" value={manualForm.magnitude}
              onChange={(e) => setManualForm({ ...manualForm, magnitude: e.target.value })} />
          </div>
          <input placeholder={t("Epitsentr")} className="input-field" value={manualForm.epicenter}
            onChange={(e) => setManualForm({ ...manualForm, epicenter: e.target.value })} />
          <button type="submit" className="btn-primary w-full" disabled={busy === "manual"}>
            {busy === "manual" ? t("Saqlanmoqda...") : t("Qo'shish")}
          </button>
        </form>
      </div>
    </div>
  );
}
