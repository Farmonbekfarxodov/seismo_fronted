# Seysmologiya — Frontend (React + Vite)

Bu loyiha `Seysmologiya` Django backend'i uchun yozilgan React SPA frontend.

## Ishga tushirish

```bash
npm install
npm run dev
```

Vite dev-server `http://localhost:5173` da ishga tushadi va `/api`, `/magnitka`,
`/seismos`, `/anomaly`, `/informativlik`, `/catalog-list`, `/upload`, `/media`
so'rovlarini `http://127.0.0.1:8000` dagi Django serverga proxy qiladi
(`vite.config.js`ga qarang). Shuning uchun ishlashi uchun Django ham parallel
ishga tushirilgan bo'lishi kerak: `python manage.py runserver`.

Production uchun: `npm run build`, natija `dist/` papkasida bo'ladi — uni
Django'ning `STATIC_ROOT`iga yoki alohida statik hostingga (Nginx, Vercel va h.k.)
joylashtirish mumkin. Bu holda `.env` orqali `VITE_API_BASE_URL`ni backend
domeniga o'rnating.

## Texnologiyalar

- **React 18 + Vite** — asosiy freymvork va build tool
- **React Router** — sahifalar aro navigatsiya
- **TanStack Query** — server holatini boshqarish (keshlash, loading/error)
- **Zustand** — autentifikatsiya holati (global state)
- **Axios** — JWT access/refresh token avtomatik yangilanadigan interceptor bilan
- **Tailwind CSS** — dizayn tizimi
- **React-Leaflet** — xaritalar (`seismos` moduli uchun)
- **Recharts** — grafiklar (`magnitka` moduli uchun)
- **React Hook Form** — formalar

## Qaysi modullar hoziroq real backend bilan ishlaydi

| Modul | Holat | Backend endpoint |
|---|---|---|
| Login | ✅ Ulangan | `POST /api/token/`, `POST /api/token/refresh/` |
| Magnitka | ✅ Ulangan | `GET /magnitka/api/stations/`, `GET /magnitka/api/measurements/` |
| Baza yuklash | ✅ Ulangan | `POST /upload/magnitka/`, `POST /upload/api/`, `POST /upload/excel/` |
| Seysmik tahlil | ⏳ Mock ma'lumot | Backend hali JSON API bermaydi |
| Anomaliya | ⏳ Mock ma'lumot | Backend hali JSON API bermaydi |
| Informativlik | ⏳ Mock ma'lumot | Backend hali JSON API bermaydi |
| Katalog | ⏳ Mock ma'lumot | Backend hali JSON API bermaydi |

"⏳" bilan belgilangan sahifalar UI jihatdan tayyor, lekin ular hozircha faqat
namunaviy (mock) ma'lumot ko'rsatadi — chunki mos Django view'lar hozircha
HTML render qiladi (`render()`), JSON qaytarmaydi. Ularni ulash uchun sahifa
ichidagi "Backend ulanishi kutilmoqda" bannerida ko'rsatilgan endpointlarni
Django tomonda DRF `APIView`/`ViewSet` sifatida qo'shish kerak.

## Backendda qilinishi kerak bo'lgan ishlar (frontend to'liq ishlashi uchun)

1. `seismos_app`, `app_anomaly`, `app_informativlik`, `upload_catalog_app`
   view'larini JSON qaytaradigan DRF endpointlarga aylantirish
   (hozirgi `render(request, "...", context)` o'rniga `Response(serializer.data)`).
2. `download_base_app` va `seismos_app`dagi `@csrf_exempt` dekoratorlarini olib
   tashlab, JWT autentifikatsiya bilan almashtirish (frontend allaqachon
   `Authorization: Bearer <token>` headerini yuboradi — shuni tekshirib,
   ruxsat berish kifoya).
3. `settings.py`da `CORS_ALLOWED_ORIGINS`ga dev uchun
   `http://localhost:5173`ni qo'shish.
4. Har bir app uchun `serializers.py` yozish (hozircha faqat `app_users`da bor).

## Loyiha tuzilishi

```
src/
  api/client.js        — Axios instance + JWT interceptor
  store/authStore.js   — autentifikatsiya holati (Zustand)
  components/          — Layout, ProtectedRoute, umumiy UI qismlari
  pages/                — har bir Django app'ga mos sahifa
```
