import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useProjectContext } from "../../app/ProjectContext";
import { buildPrivateProjectPath, buildPublicProjectPath } from "../../app/projectRoutes";
import AdminTeamModal from "../../components/admin/AdminTeamModal";
import AdminTeamsPanel from "../../components/admin/AdminTeamsPanel";
import AdminUserModal from "../../components/admin/AdminUserModal";
import AdminUsersTable, { type AdminUsersSortKey } from "../../components/admin/AdminUsersTable";
import DataTableFilters from "../../components/data-table/DataTableFilters";
import DataTableShell from "../../components/data-table/DataTableShell";
import DataTableToolbar from "../../components/data-table/DataTableToolbar";
import { buildDateBounds, isDateInRange, withDefaultDateRange } from "../../components/data-table/dateRange";
import type { SortState } from "../../components/data-table/types";
import { useAuth } from "../../app/AuthContext";
import type { AdminTeam, AdminTeamPayload, AdminUser, AdminUserCatalogs, AdminUserPayload } from "../../domain/adminUsers";
import { createAdminTeam, createAdminUser, deleteAdminTeam, deleteAdminUser, listAdminTeams, listAdminUsers, updateAdminTeam, updateAdminUser } from "../../services/adminUsers";

type UsersFiltersState = {
  rol: "TODOS" | "SUPERADMIN" | "ADMIN" | "ASESOR";
  estado: "TODOS" | "ACTIVO" | "INACTIVO";
  fechaDesde: string;
  fechaHasta: string;
};

const defaultFilters: UsersFiltersState = {
  rol: "TODOS",
  estado: "TODOS",
  fechaDesde: "",
  fechaHasta: "",
};

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

const IconTable = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 10h18M9 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const normalizeText = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const compareText = (left: string, right: string) => left.localeCompare(right, "es", { sensitivity: "base" });

const compareNumber = (left: number, right: number) => left - right;

function AdminPage() {
  const { loginUsername, loginPin, rawRole } = useAuth();
  const { display } = useProjectContext();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [catalogs, setCatalogs] = useState<AdminUserCatalogs>({
    roles: ["ADMIN", "ASESOR"],
    statuses: ["ACTIVO", "INACTIVO"],
  });
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<UsersFiltersState>(defaultFilters);
  const [sort, setSort] = useState<SortState<AdminUsersSortKey>>({ key: "username", direction: "asc" });
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<AdminTeam | null>(null);
  const [teamModalError, setTeamModalError] = useState<string | null>(null);

  const isSuperadmin = rawRole === "SUPERADMIN";
  const canCreateAdmin = true;

  const credentials = useMemo(
    () => ({
      username: loginUsername,
      pin: loginPin,
    }),
    [loginPin, loginUsername]
  );

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      const data = await listAdminUsers(credentials, { slug: display.projectSlug });
      setUsers(data.users);
      setCatalogs(data.catalogs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, [credentials, display.projectSlug]);

  const loadTeams = useCallback(async () => {
    if (!isSuperadmin) {
      setTeams([]);
      setTeamsLoading(false);
      setTeamsError(null);
      return;
    }

    try {
      setTeamsError(null);
      const data = await listAdminTeams(credentials, { slug: display.projectSlug });
      setTeams(data.teams);
    } catch (loadError) {
      setTeamsError(loadError instanceof Error ? loadError.message : "Error al cargar equipos.");
    } finally {
      setTeamsLoading(false);
    }
  }, [credentials, display.projectSlug, isSuperadmin]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const openCreateModal = () => {
    setEditingUser(null);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingUser(null);
    setModalError(null);
  };

  const openCreateTeamModal = () => {
    setEditingTeam(null);
    setTeamModalError(null);
    setTeamModalOpen(true);
  };

  const openEditTeamModal = (team: AdminTeam) => {
    setEditingTeam(team);
    setTeamModalError(null);
    setTeamModalOpen(true);
  };

  const closeTeamModal = () => {
    if (saving) return;
    setTeamModalOpen(false);
    setEditingTeam(null);
    setTeamModalError(null);
  };

  const applyTeamsPayload = useCallback((data: { teams: AdminTeam[]; users?: AdminUser[] }) => {
    setTeams(Array.isArray(data.teams) ? data.teams : []);
    if (Array.isArray(data.users)) {
      setUsers(data.users);
    }
  }, []);

  const handleSaveUser = async (payload: AdminUserPayload) => {
    setSaving(true);
    setModalError(null);
    setNotice("");

    try {
      if (editingUser) {
        await updateAdminUser(credentials, editingUser.id, payload, { slug: display.projectSlug });
        setNotice(`Usuario '${payload.username}' actualizado.`);
      } else {
        await createAdminUser(credentials, payload, { slug: display.projectSlug });
        setNotice(`Usuario '${payload.username}' creado exitosamente.`);
      }

      closeModal();
      await loadUsers();
    } catch (saveError) {
      setModalError(saveError instanceof Error ? saveError.message : "Error al guardar usuario.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    const confirmed = window.confirm(`Eliminar al usuario '${user.username}'?`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setNotice("");

    try {
      await deleteAdminUser(credentials, user.id, { slug: display.projectSlug });
      setNotice(`Usuario '${user.username}' eliminado correctamente.`);
      await Promise.all([loadUsers(), isSuperadmin ? loadTeams() : Promise.resolve()]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error al eliminar usuario.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTeam = async (payload: AdminTeamPayload) => {
    setSaving(true);
    setTeamModalError(null);
    setNotice("");

    try {
      const data = editingTeam
        ? await updateAdminTeam(credentials, editingTeam.id, payload, { slug: display.projectSlug })
        : await createAdminTeam(credentials, payload, { slug: display.projectSlug });
      applyTeamsPayload(data);
      setNotice(`Equipo '${payload.nombre}' ${editingTeam ? "actualizado" : "creado"} correctamente.`);
      closeTeamModal();
    } catch (saveError) {
      setTeamModalError(saveError instanceof Error ? saveError.message : "Error al guardar equipo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (team: AdminTeam) => {
    const confirmed = window.confirm(`Eliminar el equipo '${team.nombre}'?`);
    if (!confirmed) return;

    setSaving(true);
    setTeamsError(null);
    setNotice("");

    try {
      const data = await deleteAdminTeam(credentials, team.id, { slug: display.projectSlug });
      applyTeamsPayload(data);
      setNotice(`Equipo '${team.nombre}' eliminado correctamente.`);
    } catch (deleteError) {
      setTeamsError(deleteError instanceof Error ? deleteError.message : "Error al eliminar equipo.");
    } finally {
      setSaving(false);
    }
  };

  const visibleUsers = useMemo(() => {
    const query = normalizeText(search);
    const filtered = users.filter((user) => {
      const roleOk = filters.rol === "TODOS" || user.rol === filters.rol;
      const statusOk = filters.estado === "TODOS" || user.estado === filters.estado;
      const dateOk = isDateInRange(user.created_at, filters.fechaDesde, filters.fechaHasta);
      if (!roleOk || !statusOk || !dateOk) return false;

      if (!query) return true;
      const haystack = normalizeText(
        [user.username, user.nombres, user.apellidos, user.telefono || "", user.rol, user.estado].join(" ")
      );
      return haystack.includes(query);
    });

    if (!sort.key || !sort.direction) return filtered;

    const sorted = [...filtered].sort((left, right) => {
      switch (sort.key) {
        case "username":
          return compareText(left.username, right.username);
        case "nombre":
          return compareText(
            `${left.nombres} ${left.apellidos}`.trim(),
            `${right.nombres} ${right.apellidos}`.trim()
          );
        case "rol":
          return compareText(left.rol, right.rol);
        case "telefono":
          return compareText(left.telefono || "", right.telefono || "");
        case "creado":
          return compareNumber(new Date(left.created_at).getTime(), new Date(right.created_at).getTime());
        case "estado":
          return compareText(left.estado, right.estado);
        default:
          return 0;
      }
    });

    return sort.direction === "asc" ? sorted : sorted.reverse();
  }, [filters, search, sort, users]);

  const dateBounds = useMemo(() => buildDateBounds(users.map((user) => user.created_at)), [users]);

  useEffect(() => {
    if (!dateBounds.min || !dateBounds.max) return;
    setFilters((current) =>
      withDefaultDateRange(current, {
        min: dateBounds.min,
        max: dateBounds.max,
      })
    );
  }, [dateBounds.max, dateBounds.min]);

  const handleSort = (key: AdminUsersSortKey) => {
    setSort((current) => {
      if (current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      if (current.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  };

  const resetFilters = () =>
    setFilters({
      ...defaultFilters,
      fechaDesde: dateBounds.min,
      fechaHasta: dateBounds.max,
    });

  const topbarActions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to={buildPublicProjectPath(display.projectSlug)}>
        <IconMap />
        Mapa
      </Link>
      <Link className="btn ghost topbar-action" to={buildPrivateProjectPath(display.projectSlug, "lotes")}>
        <IconTable />
        Lotes
      </Link>
      <Link className="btn ghost topbar-action" to={buildPrivateProjectPath(display.projectSlug, "dashboard")}>
        <IconDashboard />
        Dashboard
      </Link>
    </nav>
  );

  const toolbarActions = (
    <>
      <button type="button" className="btn data-table-toolbar__btn" onClick={openCreateModal}>
        + Nuevo
      </button>
    </>
  );

  return (
    <AppShell title="Gestion de Usuarios" actions={topbarActions} contentClassName="main--data-table">
      <DataTableShell
        className="admin-users-page"
        title="Usuarios registrados"
        meta={<span className="data-table-shell__count">{`${visibleUsers.length} de ${users.length}`}</span>}
        toolbar={
          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            onClearSearch={() => setSearch("")}
            searchPlaceholder="Buscar por username, nombre, telefono o estado"
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((current) => !current)}
            onClearFilters={resetFilters}
            actions={toolbarActions}
          />
        }
        filters={
          <DataTableFilters open={filtersOpen}>
            <label className="data-table-filters__field">
              <span>Rol</span>
              <select value={filters.rol} onChange={(event) => setFilters((current) => ({ ...current, rol: event.target.value as UsersFiltersState["rol"] }))}>
                <option value="TODOS">Todos</option>
                {catalogs.roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="data-table-filters__field">
              <span>Estado</span>
              <select
                value={filters.estado}
                onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value as UsersFiltersState["estado"] }))}
              >
                <option value="TODOS">Todos</option>
                {catalogs.statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="data-table-filters__field data-table-filters__field--date">
              <span>Desde</span>
              <input
                type="date"
                value={filters.fechaDesde}
                min={dateBounds.min || undefined}
                max={filters.fechaHasta || dateBounds.max || undefined}
                onChange={(event) => setFilters((current) => ({ ...current, fechaDesde: event.target.value }))}
              />
            </label>

            <label className="data-table-filters__field data-table-filters__field--date">
              <span>Hasta</span>
              <input
                type="date"
                value={filters.fechaHasta}
                min={filters.fechaDesde || dateBounds.min || undefined}
                max={dateBounds.max || undefined}
                onChange={(event) => setFilters((current) => ({ ...current, fechaHasta: event.target.value }))}
              />
            </label>
          </DataTableFilters>
        }
      >
        {error ? (
          <p className="admin-error">
            {error}
            <button type="button" className="admin-error__close" onClick={() => setError(null)}>
              x
            </button>
          </p>
        ) : null}

        {notice ? (
          <p className="admin-notice">
            {notice}
            <button type="button" className="admin-notice__close" onClick={() => setNotice("")}>
              x
            </button>
          </p>
        ) : null}

        <AdminUsersTable
          users={visibleUsers}
          loading={loading}
          onEdit={openEditModal}
          onDelete={handleDeleteUser}
          sort={sort}
          onSort={handleSort}
        />

        {isSuperadmin ? (
          <section className="admin-users-page__teams">
            {teamsError ? (
              <p className="admin-error">
                {teamsError}
                <button type="button" className="admin-error__close" onClick={() => setTeamsError(null)}>
                  x
                </button>
              </p>
            ) : null}
            {teamsLoading ? (
              <div className="admin-teams-panel__empty">Cargando equipos...</div>
            ) : (
              <AdminTeamsPanel teams={teams} onCreate={openCreateTeamModal} onEdit={openEditTeamModal} onDelete={handleDeleteTeam} />
            )}
          </section>
        ) : null}
      </DataTableShell>

      {modalOpen ? (
        <AdminUserModal
          key={`${editingUser ? `edit-${editingUser.id}` : "create"}-${modalOpen ? "open" : "closed"}`}
          open={modalOpen}
          mode={editingUser ? "edit" : "create"}
          user={editingUser}
          catalogs={catalogs}
          saving={saving}
          canCreateAdmin={canCreateAdmin}
          error={modalError}
          onClose={closeModal}
          onSubmit={handleSaveUser}
        />
      ) : null}

      {teamModalOpen ? (
        <AdminTeamModal
          open={teamModalOpen}
          mode={editingTeam ? "edit" : "create"}
          team={editingTeam}
          users={users.filter((user) => user.rol !== "SUPERADMIN")}
          saving={saving}
          error={teamModalError}
          onClose={closeTeamModal}
          onSubmit={handleSaveTeam}
        />
      ) : null}
    </AppShell>
  );
}

export default AdminPage;
