import { useMemo, useState, type FormEvent } from "react";
import type { AdminTeam, AdminTeamPayload, AdminUser } from "../../domain/adminUsers";
import AdminSegmentedControl from "./AdminSegmentedControl";
import AdminTextInput from "./AdminTextInput";
import RolePill from "./RolePill";
import AppModal from "../ui/AppModal";

type AdminTeamModalProps = {
  open: boolean;
  mode: "create" | "edit";
  team: AdminTeam | null;
  users: AdminUser[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: AdminTeamPayload) => Promise<void>;
};

const buildInitialForm = (team: AdminTeam | null): AdminTeamPayload => ({
  nombre: team?.nombre ?? "",
  adminId: team?.adminId ?? null,
  memberIds: team?.members.map((member) => member.userId) ?? [],
  estado: team?.estado ?? true,
});

export default function AdminTeamModal({
  open,
  mode,
  team,
  users,
  saving,
  error,
  onClose,
  onSubmit,
}: AdminTeamModalProps) {
  const [form, setForm] = useState<AdminTeamPayload>(() => buildInitialForm(team));
  const [localError, setLocalError] = useState<string | null>(null);

  const adminCandidates = useMemo(() => users.filter((user) => user.rol !== "ASESOR"), [users]);

  if (!open) return null;

  const handleToggleMember = (userId: string) => {
    setForm((current) => {
      const exists = current.memberIds.includes(userId);
      return {
        ...current,
        memberIds: exists ? current.memberIds.filter((item) => item !== userId) : [...current.memberIds, userId],
      };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    const nombre = form.nombre.trim();
    if (!nombre) {
      setLocalError("El nombre del equipo es obligatorio.");
      return;
    }

    await onSubmit({
      nombre,
      adminId: form.adminId || null,
      memberIds: form.memberIds,
      estado: form.estado,
    });
  };

  return (
    <AppModal
      open={open}
      title={mode === "create" ? "Crear equipo" : "Editar equipo"}
      description={mode === "create" ? "Agrupa usuarios internos del proyecto." : "Actualiza miembros y responsable del equipo."}
      onClose={onClose}
      closeDisabled={saving}
      className="admin-user-modal admin-team-modal"
    >
      <form className="admin-user-form" onSubmit={handleSubmit}>
          <label className="admin-user-form__field">
            Nombre del equipo
            <AdminTextInput
              value={form.nombre}
              onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
              placeholder="Ej: Equipo AIO"
              autoFocus
            />
          </label>

          <div className="admin-user-form__grid">
            <label className="admin-user-form__field">
              Responsable
              <select
                className="admin-input"
                value={form.adminId ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adminId: event.target.value ? event.target.value : null,
                  }))
                }
              >
                <option value="">Sin responsable</option>
                {adminCandidates.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.nombres} ${user.apellidos}`.trim() || user.username}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-user-form__field">
              Estado
              <AdminSegmentedControl
                value={form.estado ? "ACTIVO" : "INACTIVO"}
                options={[
                  { value: "ACTIVO", label: "Activo", tone: "status-activo" },
                  { value: "INACTIVO", label: "Inactivo", tone: "status-inactivo" },
                ]}
                onChange={(value) => setForm((current) => ({ ...current, estado: value === "ACTIVO" }))}
              />
            </label>
          </div>

          <section className="admin-team-members">
            <header className="admin-team-members__header">
              <h4>Miembros</h4>
              <span>{form.memberIds.length} seleccionados</span>
            </header>
            <div className="admin-team-members__list">
              {users.map((user) => {
                const checked = form.memberIds.includes(user.id);
                const label = `${user.nombres} ${user.apellidos}`.trim() || user.username;
                return (
                  <label key={user.id} className={`admin-team-member${checked ? " is-selected" : ""}`}>
                    <input type="checkbox" checked={checked} onChange={() => handleToggleMember(user.id)} />
                    <div className="admin-team-member__body">
                      <div>
                        <strong>{label}</strong>
                        <span>@{user.username}</span>
                      </div>
                      <RolePill role={user.rol} />
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {localError ? <p className="admin-error">{localError}</p> : null}
          {error ? <p className="admin-error">{error}</p> : null}

        <footer className="admin-user-form__actions">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Guardando..." : mode === "create" ? "Crear equipo" : "Guardar equipo"}
          </button>
        </footer>
      </form>
    </AppModal>
  );
}
