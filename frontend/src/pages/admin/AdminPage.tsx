import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";

type Usuario = {
  id: string;
  username: string;
  rol: string;
  estado: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  created_at: string;
};

const MAX_ADMINS = 3;

function AdminPage() {
  const { loginUsername, loginPin } = useAuth();
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "",
    pin: "",
    rol: "ASESOR" as "ADMIN" | "ASESOR",
    nombres: "",
    apellidos: "",
    telefono: "",
  });

  const adminCount = users.filter((u) => u.rol === "ADMIN" && u.estado === "ACTIVO").length;
  const canCreateAdmin = adminCount < MAX_ADMINS;

  const loadUsers = async () => {
    try {
      setError(null);
      const res = await fetch("/api/usuarios", {
        headers: {
          "x-admin-user": loginUsername ?? "",
          "x-admin-pin": loginPin ?? "",
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setForm({ username: "", pin: "", rol: "ASESOR", nombres: "", apellidos: "", telefono: "" });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.pin || !form.nombres) {
      setError("Completa username, PIN y nombres.");
      return;
    }
    if (!/^\d{4,6}$/.test(form.pin)) {
      setError("El PIN debe ser de 4 a 6 dígitos.");
      return;
    }
    if (form.rol === "ADMIN" && !canCreateAdmin) {
      setError(`Ya hay ${MAX_ADMINS} administradores activos.`);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice("");
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: { username: loginUsername, pin: loginPin },
          nuevoUsuario: form,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNotice(`Usuario '${form.username}' creado exitosamente.`);
      resetForm();
      setFormOpen(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario.");
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <nav className="topbar-nav">
      <Link className="btn ghost" to="/cotizador">Cotizador</Link>
      <Link className="btn ghost" to="/lotes">Lotes</Link>
    </nav>
  );

  return (
    <AppShell title="Gestión de Usuarios" actions={actions}>
      <section className="admin-page">
        <div className="admin-page__head">
          <div className="admin-page__summary">
            <span className="admin-badge">{users.length} usuarios</span>
            <span className={`admin-badge ${canCreateAdmin ? "" : "warn"}`}>
              {adminCount}/{MAX_ADMINS} admins
            </span>
          </div>
          <button className="btn" onClick={() => setFormOpen(!formOpen)}>
            {formOpen ? "Cancelar" : "+ Nuevo usuario"}
          </button>
        </div>

        {error && (
          <p className="admin-error">
            {error}
            <button type="button" className="admin-error__close" onClick={() => setError(null)}>×</button>
          </p>
        )}
        {notice && (
          <p className="admin-notice">
            {notice}
            <button type="button" className="admin-notice__close" onClick={() => setNotice("")}>×</button>
          </p>
        )}

        {formOpen && (
          <form className="admin-form" onSubmit={handleCreate}>
            <h3>Crear nuevo usuario</h3>
            <div className="admin-form__grid">
              <label>
                Username *
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="ej: juan.perez"
                  autoComplete="off"
                />
              </label>
              <label>
                PIN (4-6 dígitos) *
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
                  placeholder="••••"
                  autoComplete="new-password"
                />
              </label>
              <label>
                Nombres *
                <input
                  value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                  placeholder="Juan Carlos"
                />
              </label>
              <label>
                Apellidos
                <input
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                  placeholder="Pérez García"
                />
              </label>
              <label>
                Teléfono
                <input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="987654321"
                />
              </label>
              <label>
                Rol
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value as "ADMIN" | "ASESOR" })}
                >
                  <option value="ASESOR">Asesor</option>
                  <option value="ADMIN" disabled={!canCreateAdmin}>
                    Admin {canCreateAdmin ? "" : `(máx ${MAX_ADMINS})`}
                  </option>
                </select>
              </label>
            </div>
            <div className="admin-form__actions">
              <button type="button" className="btn ghost" onClick={() => { resetForm(); setFormOpen(false); }} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn" disabled={saving}>
                {saving ? "Guardando..." : "Crear usuario"}
              </button>
            </div>
          </form>
        )}

        <div className="admin-table-wrap">
          {loading ? (
            <p className="muted">Cargando usuarios...</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>USERNAME</th>
                  <th>NOMBRE</th>
                  <th>ROL</th>
                  <th>ESTADO</th>
                  <th>TELÉFONO</th>
                  <th>CREADO</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{`${u.nombres} ${u.apellidos}`.trim()}</td>
                    <td>
                      <span className={`role-pill ${u.rol.toLowerCase()}`}>{u.rol}</span>
                    </td>
                    <td>
                      <span className={`estado-pill ${u.estado.toLowerCase()}`}>{u.estado}</span>
                    </td>
                    <td>{u.telefono || "-"}</td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("es-PE") : "-"}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="muted" style={{ textAlign: "center" }}>No hay usuarios registrados.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </AppShell>
  );
}

export default AdminPage;
