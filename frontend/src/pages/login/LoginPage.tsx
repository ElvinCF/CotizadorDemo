import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { NavLink, Navigate, useLocation } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";

const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default function LoginPage() {
  const { isAuthenticated, login, role } = useAuth();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAutoKey, setLastAutoKey] = useState<string | null>(null);

  const normalizedUsername = useMemo(() => username.trim(), [username]);

  if (isAuthenticated) {
    const from = location.state?.from?.pathname;
    if (from && from !== "/login") {
      return <Navigate to={from} replace />;
    }
    return <Navigate to={role === "admin" ? "/admin" : "/lotes"} replace />;
  }

  const submitLogin = useCallback(async () => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    if (!normalizedUsername) {
      setError("Ingresa tu usuario para continuar.");
      setIsSubmitting(false);
      return;
    }

    // Keep manual login compatible with 4-6 digits while enabling auto-submit at 6 digits.
    if (!/^\d{4,6}$/.test(pin)) {
      setError("El PIN debe tener entre 4 y 6 digitos numericos.");
      setIsSubmitting(false);
      return;
    }

    const success = await login(normalizedUsername, pin);
    if (!success) {
      setError("Usuario o PIN incorrectos. (O cuenta inactiva)");
    }
    setIsSubmitting(false);
  }, [isSubmitting, login, normalizedUsername, pin]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitLogin();
  };

  const handlePinChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      if (value.length <= 6) {
        setPin(value);
      }
    }
  };

  useEffect(() => {
    if (!normalizedUsername || pin.length !== 6 || isSubmitting) return;
    const nextKey = `${normalizedUsername.toLowerCase()}|${pin}`;
    if (lastAutoKey === nextKey) return;
    setLastAutoKey(nextKey);
    void submitLogin();
  }, [isSubmitting, lastAutoKey, normalizedUsername, pin, submitLogin]);

  useEffect(() => {
    if (pin.length < 6) {
      setLastAutoKey(null);
    }
  }, [pin.length]);

  const topbarActions = (
    <nav className="nav-links" aria-label="Navegacion principal">
      <NavLink
        to="/"
        aria-label="Ir al mapa"
        className={({ isActive }) => `nav-link nav-link--with-icon${isActive ? " active" : ""}`}
      >
        <span className="nav-link__icon" aria-hidden="true">
          <IconMap />
        </span>
        <span className="nav-link__label">Mapa</span>
      </NavLink>
    </nav>
  );

  return (
    <AppShell
      title="Arenas Malabrigo - Acceso"
      actions={topbarActions}
      contentClassName="main--auth"
    >
      <section className="auth-layout">
        <article className="auth-card">
          <header className="auth-card__header">
            <h2>Inicio de sesión</h2>
            <p>Accede con tu usuario y PIN asignado.</p>
          </header>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field" htmlFor="username">
              <span>Usuario</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. vendedor o admin"
                required
                autoFocus
              />
            </label>

            <label className="auth-field" htmlFor="pin">
              <span>PIN de seguridad (4 a 6 digitos)</span>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                value={pin}
                onChange={handlePinChange}
                placeholder="******"
                required
                autoComplete="current-password"
                maxLength={6}
              />
            </label>

            <p className="auth-hint">
              Cuando completes los 6 digitos del PIN, el acceso se envia automaticamente.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn primary auth-submit" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </article>
      </section>
    </AppShell>
  );
}
