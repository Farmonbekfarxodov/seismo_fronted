# Seysmologiya — Frontend (React + Vite)

`seismo_backend` Django API'si uchun React SPA frontend.

## Ishga tushirish (development)

```bash
npm install
npm run dev
```

Vite dev-server `http://localhost:5173` da ishga tushadi va API so'rovlarini
(`/api`, `/seismos`, `/magnitka`, `/anomaly`, `/informativlik`, `/catalog-list`,
`/upload`, `/media`, `/static`) `http://127.0.0.1:8000` dagi Django serverga
proxy qiladi (`vite.config.js`). Django ham parallel ishlab turishi kerak:
`python manage.py runserver`.

## Production (Docker)

Frontend Nginx orqali beriladi va API so'rovlarini `backend` konteyneriga
proxy qiladi (`nginx.conf`). Backend repo'sidagi `docker-compose.yml` ikkala
xizmatni birga ko'taradi:

```bash
npm run build          # dist/ hosil bo'ladi (Docker ichida avtomatik bajariladi)
docker compose up -d --build frontend
```

**Muhim:** `nginx.conf` dagi proxy ro'yxatida `admin` ham bo'lishi shart,
aks holda Django admin paneli (`/admin/`) ochilmaydi.

## Texnologiyalar

- **React 18 + Vite** — asosiy freymvork va build tool
- **React Router** — sahifalar aro navigatsiya
- **TanStack Query** — server holati (keshlash, loading/error)
- **Zustand** — autentifikatsiya holati
- **Axios** — JWT access/refresh avtomatik yangilanadigan interceptor
- **Tailwind CSS** — dizayn tizimi
- **React-Leaflet** — xaritalar
- **Plotly** — barcha grafiklar (zoom, pan, PNG yuklash)

## Sahifalar

| Sahifa | Yo'l | Backend endpoint |
| --- | --- | --- |
| Login | `/login` | `POST /api/token/`, `/api/token/refresh/` |
| Bosh sahifa | `/` | — |
| Seysmik tahlil | `/seismos` | `GET /seismos/api/options/`, `/api/layers/`, `/api/well-info/`, `POST /seismos/api/series/` |
| Zilzila tahlili | `/epoch` | `POST /seismos/api/epoch-analysis/` |
| Magnitka | `/magnitka` | `GET /magnitka/api/stations/`, `/api/measurements/`, `/api/earthquakes/`, `/api/outliers/`, `POST /magnitka/api/measurements/edit/` |
| Anomaliya | `/anomaly` | `GET /anomaly/api/options/`, `/anomaly/history/`, `POST /anomaly/api/analyze/` |
| Informativlik | `/informativlik` | `GET /informativlik/api/options/`, `POST /api/analyze/`, `/api/export/` |
| Katalog | `/catalog` | `GET /catalog-list/` |
| Baza yuklash | `/download-base` | `POST /upload/api/`, `/upload/excel/`, `/upload/transfer/`, `/upload/magnitka/`, `/upload/spm/files/`, `/upload/spm/folder/` |

## Asosiy imkoniyatlar

### Seysmik tahlil (`/seismos`)
- Skvajina va parametr tanlash (akkordeon, "hammasini tanlash")
- Min Magnituda, Sigma (σ), Yillik sigma davri, M/lgR yoki Mb rejimi,
  sana oralig'i, mediana oynasi
- **Xarita**: 4 xil fon (OSM / Terrain / Light / Satellite), yer yoriqlari va
  seysmogen zonalar (shapefile → GeoJSON), skvajinalar (har biri o'z rangida,
  uchburchak marker), zilzilalar (magnituda bo'yicha rangli), to'liq ekran rejimi
- Skvajina popup'ida: quduq turi, chuqurlik, seysmotektonik holat, strategrafik
  taqsimot, litologik tarkib, mineralizatsiya rasmi, va M=5/6/7 halqalarini
  yoqish tugmasi
- **Grafiklar**: ikki o'qli (chapda parametr, o'ngda Mb), zilzilalar belgi
  sifatida — bosilganda ma'lumot ochiladi (qayta bosilsa yopiladi, bir nechtasi
  bir vaqtda ochiq tura oladi), yillik sigma segmentlari, PNG yuklash

### Zilzila tahlili (`/epoch`)
Har bir topilgan zilzila uchun alohida "oyna" grafigi: zilzila kuni — 0-nuqta,
X o'qi nisbiy kunlarda (masalan −30 … 0 … +10).
- Kun oldin / kun keyin sozlanadi
- Ma'lumot yo'q kunlar: haqiqiy o'lchovlar **to'liq** ko'k chiziq, bo'shliqlar
  esa **punktir** chiziq bilan bog'lanadi (qayerda haqiqiy, qayerda taxminiy —
  ko'rinib turadi)
- Sigma chiziqlari (butun tarix bo'yicha hisoblanadi), yoqib-o'chirish mumkin
- Nuqta ustiga borilganda: haqiqiy sana, zilziladan necha kun, qiymat

### Magnitka (`/magnitka`)
- **Yangibozor** — baza stansiya: 1-minutlik ma'lumoti avval 10-minutlik
  o'rtachaga keltiriladi, so'ng barcha nuqtalar **kunlik o'rtacha**ga
  aylantiriladi (mavjud nuqtalar soniga bo'linadi — 144 yoki kamroq)
- Boshqa stansiyalar: Δ = qiymat − Yangibozor (bir xil vaqtda)
- Har stansiyaga alohida grafik, sana oralig'i, zilzila belgilari
- **Xato ma'lumotlarni tuzatish**: shubhali qiymatlar median + MAD usuli bilan
  avtomatik topiladi; har birini to'g'irlash yoki "bu to'g'ri" deb tasdiqlash
  mumkin (barcha o'zgarishlar audit jurnaliga yoziladi)

## Loyiha tuzilishi

## Loyiha tuzilishi

```
src/
  api/client.js        — Axios instance + JWT interceptor
  store/authStore.js   — autentifikatsiya holati (Zustand)
  components/          — Layout, ProtectedRoute, umumiy UI qismlari
  pages/                — har bir Django app'ga mos sahifa
```
