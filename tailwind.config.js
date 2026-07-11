/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ESKI DIZAYN: ochiq fon, Bootstrap uslubi.
        // Token nomlari saqlangan — komponentlar o'zgarmasdan light bo'ladi.
        ink: {
          DEFAULT: "#F5F7FA",   // sahifa foni (ochiq kulrang)
          50: "#0A1220",        // sarlavhalar (to'q)
          100: "#212529",       // asosiy matn (bootstrap body)
          800: "#FFFFFF",       // kartalar foni (oq)
          900: "#F8F9FA",       // input fonlari
        },
        border: "#DEE2E6",      // bootstrap chegara rangi
        // Eski top-bar gradienti uchun
        navy: {
          DEFAULT: "#003366",
          dark: "#001a33",
          border: "#002244",
        },
        amber: {
          DEFAULT: "#fd7e14",   // bootstrap orange (sigma chiziqlar uchun)
          light: "#ffab5e",
        },
        teal: {
          DEFAULT: "#0d6efd",   // bootstrap primary blue (asosiy aksent)
          dark: "#0a58ca",
        },
        danger: "#dc3545",      // bootstrap danger
        muted: "#6c757d",       // bootstrap muted
      },
      fontFamily: {
        display: ["system-ui", "-apple-system", "\"Segoe UI\"", "Roboto", "sans-serif"],
        body: ["system-ui", "-apple-system", "\"Segoe UI\"", "Roboto", "sans-serif"],
        mono: ["\"SFMono-Regular\"", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
