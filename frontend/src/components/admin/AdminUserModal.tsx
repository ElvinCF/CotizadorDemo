import { useState, type FormEvent } from "react";
import type { AdminUser, AdminUserCatalogs, AdminUserPayload } from "../../domain/adminUsers";
import AdminSegmentedControl from "./AdminSegmentedControl";
import AdminTextInput from "./AdminTextInput";

type AdminUserModalProps = {
  open: boolean;
  mode: "create" | "edit";
  user: AdminUser | null;
  catalogs: AdminUserCatalogs;
  saving: boolean;
  canCreateAdmin: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: AdminUserPayload) => Promise<void>;
};

const emptyForm: AdminUserPayload = {
  username: "",
  pin: "",
  rol: "ASESOR",
  estado: "ACTIVO",
  nombres: "",
  apellidos: "",
  telefono: "",
};

const IconAdmin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M12 3 19 7v5c0 4.2-2.5 7.8-7 9-4.5-1.2-7-4.8-7-9V7l7-4Z" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconAdvisor = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconActive = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconInactive = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

type SegmentedTone =
  | "neutral"
  | "role-admin"
  | "role-asesor"
  | "status-activo"
  | "status-inactivo";

export default function AdminUserModal({
  open,
  mode,
  user,
  catalogs,
  saving,
  canCreateAdmin,
  error,
  onClose,
  onSubmit,
}: AdminUserModalProps) {
  const initialForm = mode === "edit" && user
    ? {
        username: user.username,
        pin: "",
        rol: user.rol,
        estado: user.estado,
        nombres: user.nombres,
        apellidos: user.apellidos,
        telefono: user.telefono,
      }
    : emptyForm;
  const [form, setForm] = useState<AdminUserPayload>(initialForm);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!open) return null;

  const roleOptions = catalogs.roles.map((role) => ({
    value: role,
    label: role,
    tone: (role === "ADMIN" ? "role-admin" : "role-asesor") as SegmentedTone,
    disabled: role === "ADMIN" && !canCreateAdmin && user?.rol !== "ADMIN",
    icon: role === "ADMIN" ? <IconAdmin /> : <IconAdvisor />,
  }));

  const statusOptions = catalogs.statuses.map((status) => ({
    value: status,
    label: status,
    tone: (status === "ACTIVO" ? "status-activo" : "status-inactivo") as SegmentedTone,
    icon: status === "ACTIVO" ? <IconActive /> : <IconInactive />,
  }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const username = form.username.trim().toLowerCase();
    const pin = String(form.pin ?? "").trim();
    const nombres = form.nombres.trim();
    const apellidos = form.apellidos.trim();
    const telefono = form.telefono.trim();

    if (!username || !nombres) {
      setLocalError("Completa username y nombres.");
      return;
    }

    if (mode === "create" && !pin) {
      setLocalError("El PIN es obligatorio para crear el usuario.");
      return;
    }

    if (pin && !/^\d{4,6}$/.test(pin)) {
      setLocalError("El PIN debe ser de 4 a 6 digitos.");
      return;
    }

    if (form.rol === "ADMIN" && !canCreateAdmin && user?.rol !== "ADMIN") {
      setLocalError("Ya se alcanzo el maximo de administradores activos.");
      return;
    }

    await onSubmit({
      username,
      pin: pin || undefined,
      rol: form.rol,
      estado: form.estado,
      nombres,
      apellidos,
      telefono,
    });
  };

  return (
    <div className="modal-backdrop" onClick={saving ? undefined : onClose}>
      <div className="admin-user-modal" onClick={(event) => event.stopPropagation()}>
        <header className="admin-user-modal__header">
          <div className="admin-user-modal__headline">
            <h3>{mode === "create" ? "Crear usuario" : "Editar usuario"}</h3>
            <p>{mode === "create" ? "Registra un nuevo acceso para el equipo." : "Actualiza los datos del usuario seleccionado."}</p>
          </div>
          <button type="button" className="btn ghost admin-user-modal__close" onClick={onClose} disabled={saving}>
            <IconClose />
            Cerrar
          </button>
        </header>

        <form className="admin-user-form" onSubmit={handleSubmit}>
          <div className="admin-user-form__credentials">
            <label className="admin-user-form__field">
              Username *
              <AdminTextInput
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="ej: juan.perez"
                autoComplete="off"
                autoFocus
              />
            </label>
            <label className="admin-user-form__field">
              PIN {mode === "create" ? "*" : "(opcional)"}
              <AdminTextInput
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={form.pin ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pin: event.target.value.replace(/\D/g, ""),
                  }))
                }
                placeholder={mode === "create" ? "******" : "Solo si quieres cambiarlo"}
                autoComplete={mode === "create" ? "new-password" : "off"}
              />
            </label>
          </div>

          <div className="admin-user-form__grid">
            <label className="admin-user-form__field">
              Nombres *
              <AdminTextInput
                value={form.nombres}
                onChange={(event) => setForm((current) => ({ ...current, nombres: event.target.value }))}
                placeholder="Juan Carlos"
              />
            </label>
            <label className="admin-user-form__field">
              Apellidos
              <AdminTextInput
                value={form.apellidos}
                onChange={(event) => setForm((current) => ({ ...current, apellidos: event.target.value }))}
                placeholder="Perez Garcia"
              />
            </label>
            <label className="admin-user-form__field">
              Telefono
              <AdminTextInput
                value={form.telefono}
                onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))}
                placeholder="987654321"
              />
            </label>
          </div>

          <div className="admin-user-form__options">
            <label className="admin-user-form__field">
              Rol
              <AdminSegmentedControl
                value={form.rol}
                options={roleOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, rol: value as AdminUserPayload["rol"] }))
                }
              />
            </label>
            <label className="admin-user-form__field">
              Estado
              <AdminSegmentedControl
                value={form.estado}
                options={statusOptions}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    estado: value as AdminUserPayload["estado"],
                  }))
                }
              />
            </label>
          </div>

          {localError ? <p className="admin-error">{localError}</p> : null}
          {error ? <p className="admin-error">{error}</p> : null}

          <div className="admin-user-form__actions">
            <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Guardando..." : mode === "create" ? "Crear usuario" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
