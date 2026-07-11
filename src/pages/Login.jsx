import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import SeismicWaveform from "../components/SeismicWaveform";

export default function Login() {
  const { register, handleSubmit, formState } = useForm();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const isLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNavigate();

  async function onSubmit(values) {
    const ok = await login(values.username, values.password);
    if (ok) navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <SeismicWaveform className="w-48 h-10 mx-auto mb-4" tone="teal" />
          <h1 className="text-2xl font-semibold">Seysmologiya</h1>
          <p className="text-sm text-muted mt-1">Tizimga kirish</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Foydalanuvchi nomi
            </label>
            <input
              id="username"
              className="input-field"
              autoComplete="username"
              {...register("username", { required: true })}
            />
            {formState.errors.username && (
              <p className="text-danger text-xs mt-1">Bu maydon majburiy</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="password">
              Parol
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              autoComplete="current-password"
              {...register("password", { required: true })}
            />
            {formState.errors.password && (
              <p className="text-danger text-xs mt-1">Bu maydon majburiy</p>
            )}
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? "Tekshirilmoqda..." : "Kirish"}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-4 font-mono">
          POST /api/token/ &mdash; SimpleJWT (app_users)
        </p>
      </div>
    </div>
  );
}
