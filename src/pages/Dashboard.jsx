import { Link } from "react-router-dom";

const MODULES = [
  { to: "/seismos", title: "Seysmik tahlil", desc: "Quduq tanlash, xarita va sigma-tahlil grafiklari" },
  { to: "/magnitka", title: "Magnitka", desc: "O'lchov dinamikasi va grafiklar" },
  { to: "/anomaly", title: "Anomaliya", desc: "Sigma-tahlil, xarita va tarix" },
  { to: "/informativlik", title: "Informativlik", desc: "q-baholash, grafiklar va Excel eksport" },
  { to: "/catalog", title: "Katalog", desc: "Zilzilalar katalogi" },
  { to: "/download-base", title: "Baza yuklash", desc: "Tashqi manbalardan sinxronlash" },
];

/* Eski index.html'ning aynan nusxasi: katta sarlavha + laboratoriya posteri */
export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl text-center mt-6 mb-10">
        Seysmoprognostik ma'lumotlarni tahlil qilish boshqaruv paneli
      </h1>

      <div className="flex justify-center mb-10">
        <img src="/static/images/Picture.png" alt="Laboratoriya"
          className="max-w-full w-[660px] rounded-lg shadow-md"
          onError={(e) => { e.currentTarget.style.display = "none"; }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {MODULES.map((m) => (
          <Link key={m.to} to={m.to} className="card hover:border-teal transition-colors">
            <h3 className="text-base mb-1.5">{m.title}</h3>
            <p className="text-sm text-muted">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
