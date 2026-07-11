import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Og'ir sahifalar (plotly, leaflet) faqat ochilganda yuklanadi —
// boshlang'ich yuklanish bir necha barobar tezlashadi
const Seismos = lazy(() => import("./pages/Seismos"));
const Magnitka = lazy(() => import("./pages/Magnitka"));
const Anomaly = lazy(() => import("./pages/Anomaly"));
const Informativlik = lazy(() => import("./pages/Informativlik"));
const Catalog = lazy(() => import("./pages/Catalog"));
const DownloadBase = lazy(() => import("./pages/DownloadBase"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function PageLoader() {
  return <p className="text-sm text-muted p-8 text-center">Sahifa yuklanmoqda...</p>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/seismos" element={<Seismos />} />
                <Route path="/magnitka" element={<Magnitka />} />
                <Route path="/anomaly" element={<Anomaly />} />
                <Route path="/informativlik" element={<Informativlik />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/download-base" element={<DownloadBase />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
