/**
 * Backend hali JSON API bermaydigan sahifalarda ko'rsatiladi.
 * `endpoints` — shu sahifa uchun Django tomonda yaratilishi kerak bo'lgan endpointlar ro'yxati.
 */
export default function BackendTodoNotice({ endpoints = [] }) {
  return (
    <div className="card border-amber/30 bg-amber/5 mb-6">
      <p className="text-sm font-semibold text-amber mb-2">
        Backend ulanishi kutilmoqda
      </p>
      <p className="text-sm text-muted mb-3">
        Bu sahifa hozircha namunaviy (mock) ma'lumot bilan ishlaydi. Django
        tomonda quyidagi endpointlar DRF JSON API sifatida qo'shilgach, shu
        sahifa haqiqiy ma'lumotga ulanadi:
      </p>
      <ul className="text-sm font-mono text-teal space-y-1">
        {endpoints.map((ep) => (
          <li key={ep}>{ep}</li>
        ))}
      </ul>
    </div>
  );
}
