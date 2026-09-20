# Seysmologiya — Frontend (React + Vite)

`seismo_backend` Django API'si uchun React SPA frontend.
Backend faqat JSON qaytaradi, barcha sahifalar shu yerda chiziladi.

## Ishga tushirish (development)

```bash
npm install
npm run dev
```

Vite dev-server `http://localhost:5173` da ko'tariladi. `vite.config.js`
faqat API yo'llarini `http://127.0.0.1:8000` dagi Django'ga proxy qiladi:

```
/api            /seismos/api      /magnitka/api     /anomaly/api
/anomaly/history   /informativlik/api   /catalog-list   /upload
/media          /static
```

Sahifa manzillari (`/seismos`, `/anomaly`, ...) Vite'da qoladi, shuning uchun
sahifani F5 bilan yangilash ham ishlaydi. Django parallel ishlab turishi kerak:
`python manage.py runserver`.

## Production (Docker)

Frontend Nginx orqali beriladi va API so'rovlarini `backend` konteyneriga
proxy qiladi (`nginx.conf`). Backend repo'sidagi `docker-compose.yml` ikkala
xizmatni birga ko'taradi — u `../seismo_fronted` ni build konteksti sifatida
ishlatadi, ya'ni ikkala repo yonma-yon klon qilingan bo'lishi kerak:

```
<ota-papka>/
  seismo_backend/     <- docker compose shu yerdan ishga tushiriladi
  seismo_fronted/     <- shu repo (ildizida Dockerfile bor)
```

```bash
cd ../seismo_backend
docker compose up -d --build
```

Vite `dist/` papkasiga build qiladi va Dockerfile aynan shu papkadan nusxa
oladi (`COPY --from=build /app/dist`).

**Muhim:** `nginx.conf` dagi proxy ro'yxatida `admin` ham bo'lishi shart,
aks holda Django admin paneli (`/admin/`) ochilmaydi.

Productionda backend boshqa manzilda bo'lsa, `.env` ga `VITE_API_BASE_URL`
yoziladi (namuna: `.env.example`).

## Texnologiyalar

- **React 18 + Vite** — asosiy freymvork va build tool
- **React Router** — sahifalar aro navigatsiya, og'ir sahifalar `lazy()` bilan
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
| GGS tahlili | `/seismos` | `GET /seismos/api/options/`, `/api/layers/`, `/api/well-info/`, `POST /seismos/api/series/` |
| Zilzila tahlili | `/epoch` | `GET /seismos/api/options/`, `POST /seismos/api/epoch-analysis/` |
| Magnitka | `/magnitka` | `GET /magnitka/api/stations/`, `/api/measurements/`, `/api/earthquakes/` |
| Anomaliya | `/anomaly` | `GET /anomaly/api/options/`, `/anomaly/history/`, `/seismos/api/layers/`, `/seismos/api/well-info/`, `POST /anomaly/api/analyze/` |
| Informativlik | `/informativlik` | `GET /informativlik/api/options/`, `POST /informativlik/api/analyze/`, `/api/export/` |
| Katalog | `/catalog` | `GET /catalog-list/`, `POST /catalog-list/upload-catalog/`, `/upload-file/`, `/manual-entry/` |
| Baza yuklash | `/download-base` | `GET /upload/stations-wells/`, `/upload/get-stations/`, `POST /upload/api/`, `/upload/excel/`, `/upload/transfer/`, `/upload/magnitka/`, `/upload/spm/files/`, `/upload/spm/folder/` |

## Asosiy imkoniyatlar

### GGS tahlili (`/seismos`)
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
  sifatida — bosilganda ma'lumot ochiladi, yillik sigma segmentlari, PNG yuklash

### Zilzila tahlili (`/epoch`)
Har bir topilgan zilzila uchun alohida "oyna" grafigi: zilzila kuni — 0-nuqta,
X o'qi nisbiy kunlarda (masalan −30 … 0 … +10).
- Kun oldin / kun keyin sozlanadi
- Ma'lumot yo'q kunlar: haqiqiy o'lchovlar **to'liq** ko'k chiziq, bo'shliqlar
  esa **punktir** chiziq bilan bog'lanadi
- Sigma chiziqlari (butun tarix bo'yicha hisoblanadi), yoqib-o'chirish mumkin
- Nuqta ustiga borilganda: haqiqiy sana, zilziladan necha kun, qiymat

### Anomaliya (`/anomaly`)
- Quduq va parametr tanlash, davr (oy), minimal ketma-ket anomal qiymatlar
  soni (1…60 kun), sigma, oxirgi necha kunlik anomaliyalar, ixtiyoriy
  min magnituda
- **Grafik**: ko'k asosiy chiziq, UB (yashil) / Mean (magenta) / LB (ko'k)
  punktir chegaralari, chegaradan chiqqan bo'laklar **qalin qizil chiziq** —
  segment chetlari ±σ ni kesib o'tgan aniq nuqtaga interpolatsiya qilinadi.
  Min magnituda berilsa, o'ng o'qda zilzila ustunlari (magnituda va quduqdan
  masofa) chiziladi
- **Xarita**: yer yoriqlari va seysmogen zonalar, 4 xil fon, to'liq ekran,
  anomal va normal skvajinalar alohida yoqib-o'chiriladigan qatlamlar,
  anomal skvajina qizil pulsatsiyalanuvchi marker bilan belgilanadi
- **Markerga bosilsa**, o'sha skvajinaning barcha grafiklari ro'yxat boshiga
  chiqadi (marker sariq gardish, grafik sariq ramka bilan belgilanadi).
  Qayta bosilsa tartib asl holiga qaytadi; popup ichidagi
  "↓ Grafigiga o'tish" tugmasi sahifani grafikka siljitadi
- **Tarix** yorlig'i: oxirgi 50 ta saqlangan anomaliya yozuvi

### Magnitka (`/magnitka`)
- **Yangibozor** — baza stansiya: 1-minutlik ma'lumoti avval 10-minutlik
  o'rtachaga keltiriladi, so'ng barcha nuqtalar **kunlik o'rtacha**ga
  aylantiriladi (mavjud nuqtalar soniga bo'linadi — 144 yoki kamroq)
- Boshqa stansiyalar: Δ = qiymat − Yangibozor (bir xil vaqtda)
- Har stansiyaga alohida grafik, sana oralig'i, zilzila belgilari

### Katalog (`/catalog`)
Zilzilalar katalogi jadvali, qidiruv bilan. Katalogni tashqi API'dan,
Excel fayldan yoki qo'lda kiritish orqali to'ldirish mumkin.

## Loyiha tuzilishi

```
src/
  main.jsx             — kirish nuqtasi
  App.jsx              — marshrutlar (og'ir sahifalar lazy-load)
  index.css            — Tailwind qatlamlari va umumiy sinflar (.card, .btn-primary)
  api/client.js        — Axios instance + JWT interceptor (401 da refresh)
  store/authStore.js   — autentifikatsiya holati (Zustand)
  components/
    Layout.jsx         — sarlavha, navbar, chiqish tugmasi
    ProtectedRoute.jsx — token yo'q bo'lsa /login ga yo'naltiradi
    ErrorBoundary.jsx  — sahifadagi kutilmagan xatoni ushlaydi
    LazyRender.jsx     — grafiklarni faqat ekranga yaqinlashganda chizadi
    SeismicWaveform.jsx— login sahifasidagi animatsiya
  pages/               — har bir bo'limga mos sahifa (9 ta)
```
