import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminUserModal from "../../components/admin/AdminUserModal";
import AdminUsersTable from "../../components/admin/AdminUsersTable";
import type { AdminUser, AdminUserCatalogs, AdminUserPayload } from "../../domain/adminUsers";
import { createAdminUser, listAdminUsers, updateAdminUser } from "../../services/adminUsers";

const MAX_ADMINS = 3;

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

function AdminPage() {
  const { loginUsername, loginPin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [catalogs, setCatalogs] = useState<AdminUserCatalogs>({
    roles: ["ADMIN", "ASESOR"],
    statuses: ["ACTIVO", "INACTIVO"],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const adminCount = users.filter((user) => user.rol === "ADMIN" && user.estado === "ACTIVO").length;
  const asesorTotal = users.filter((user) => user.rol === "ASESOR").length;
  const asesorCount = users.filter((user) => user.rol === "ASESOR" && user.estado === "ACTIVO").length;
  const canCreateAdmin = adminCount < MAX_ADMINS;

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
      const data = await listAdminUsers(credentials);
      setUsers(data.users);
      setCatalogs(data.catalogs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

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

  const handleSaveUser = async (payload: AdminUserPayload) => {
    setSaving(true);
    setModalError(null);
    setNotice("");

    try {
      if (editingUser) {
        await updateAdminUser(credentials, editingUser.id, payload);
        setNotice(`Usuario '${payload.username}' actualizado.`);
      } else {
        await createAdminUser(credentials, payload);
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

  const actions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to="/">
        <IconMap />
        Mapa
      </Link>
      <Link className="btn ghost topbar-action" to="/lotes">
        <IconTable />
        Lotes
      </Link>
      <Link className="btn ghost topbar-action" to="/admin">
        <IconDashboard />
        Dashboard
      </Link>
    </nav>
  );

  return (
    <AppShell title="Gestion de Usuarios" actions={actions} contentClassName="main--admin">
      <section className="admin-page">
        <div className="admin-page__head">
          <div className="admin-page__summary">
            <span className="admin-badge admin-badge--total">{users.length} usuarios</span>
            <span className="admin-badge admin-badge--asesor">
              {asesorCount}/{Math.max(asesorTotal, 1)} asesores activos
            </span>
            <span className={`admin-badge admin-badge--admin${canCreateAdmin ? "" : " warn"}`}>
              {adminCount}/{MAX_ADMINS} admins activos
            </span>
          </div>
          <button className="btn" onClick={openCreateModal}>
            + Nuevo usuario
          </button>
        </div>

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

        <AdminUsersTable users={users} loading={loading} onEdit={openEditModal} />
      </section>

      <AdminUserModal
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
    </AppShell>
  );
}

export default AdminPage;
