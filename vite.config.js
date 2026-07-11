import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: {
          plotly: ["plotly.js-dist-min", "react-plotly.js"],
          leaflet: ["leaflet", "react-leaflet"],
          vendor: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "axios", "zustand"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Faqat API yo'llari Django'ga yo'naltiriladi —
      // React sahifa manzillari (/anomaly, /seismos, ...) Vite'da qoladi,
      // shuning uchun sahifani F5 bilan yangilash ham ishlaydi.
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/seismos/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/magnitka/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/anomaly/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/anomaly/history": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/informativlik/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/catalog-list": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/upload": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/media": { target: "http://127.0.0.1:8000", changeOrigin: true },
      // Eski dizayndagi logotiplar (logo5.png, logo6.png) Django static'dan olinadi
      "/static": { target: "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
});
