// Kimyoviy/gaz parametr kodlarini (backend'dagi DEFAULT_ELEMENTS_GROUPS
// ro'yxati: He, H2, O2, N2, CH4, CO2, F, C2H6, pH, Eh, HCO3, Cl2, T0, Q, P,
// EOCC) EKRANGA chiqarishda chiroyli formulaga aylantiruvchi funksiya.
//
// Nima uchun kerak: backend/forma/grafik state'ida kod "H2O", "C2H6" kabi
// TEKIS matn sifatida saqlanadi (checkbox value, API so'rov parametri,
// Plotly trace key va h.k.) — bularga tegish shart emas va tegib ham
// bo'lmaydi. Faqat FOYDALANUVCHIGA ko'rinadigan joyda (checkbox yorlig'i,
// jadval katakchasi, grafik sarlavhasi/legendasi) raqamlar kimyoviy
// formuladagidek pastki indeksga (H₂O, C₂H₆) aylantiriladi.
//
// Kod ichidagi HAR BIR raqam — hozirgi barcha parametr kodlarida (H2, O2,
// N2, CH4, CO2, C2H6, HCO3, Cl2, T0) — aynan shu ma'noda (atom soni yoki
// shunga o'xshash indeks) ishlatiladi, shuning uchun oddiy global
// almashtirish xavfsiz: harflarga tegilmaydi (pH, Eh, Q, P, F, He, EOCC
// o'zgarishsiz qoladi, chunki ularda raqam yo'q).

const SUBSCRIPT_DIGITS = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
};

// formatParam("C2H6") -> "C₂H₆"; formatParam("CH4, CO2") -> "CH₄, CO₂"
// (bir nechta parametr vergul bilan qo'shib yozilgan holatda ham ishlaydi);
// formatParam("pH") -> "pH" (raqam yo'q — o'zgarmaydi).
//
// MAXSUS HOLAT — "T0": bu yerdagi "0" kimyoviy indeks/atom soni EMAS, shunchaki
// parametr kodining o'zi ("harorat" ma'nosida, "T" bilan bir xil) — shuning
// uchun uni pastki indeksga aylantirish ("T₀") noto'g'ri bo'lardi. Foydalanuvchi
// so'rovi bilan bu "0" butunlay (hatto oddiy raqam sifatida ham) olib
// tashlanadi — natija shunchaki "T".
export function formatParam(code) {
  if (code == null) return code;
  if (code === "T0") return "T";
  return String(code).replace(/[0-9]/g, (d) => SUBSCRIPT_DIGITS[d] ?? d);
}

// Har bir parametrning o'lchov birligi — grafiklarning Y-o'qida "Qiymati"
// so'zi o'rniga ko'rsatish uchun (foydalanuvcha qo'lyozma jadvali bo'yicha).
// Cl2 (mg/l) va P (atm) uchun foydalanuvchi tomonidan alohida tasdiqlangan.
const PARAM_UNITS = {
  He: "%", H2: "%", O2: "%", N2: "%", CH4: "%", CO2: "%", C2H6: "%",
  pH: "-lg(H+)", Eh: "mV", HCO3: "mg/l", Cl2: "mg/l",
  T0: "°C", F: "F⁻", Q: "l/sek", P: "Pa", EOCC: "m",
};

// paramUnit("He") -> "%"; noma'lum kod uchun "" qaytaradi.
export function paramUnit(code) {
  return PARAM_UNITS[code] ?? "";
}

// Grafik Y-o'qi sarlavhasi uchun tayyor matn: "He, %", "pH, -lg(H+)", "T, °C".
// Birlik topilmasa, faqat formatlangan parametr nomi qaytariladi.
export function paramAxisLabel(code) {
  const unit = paramUnit(code);
  return unit ? `${formatParam(code)}, ${unit}` : formatParam(code);
}
