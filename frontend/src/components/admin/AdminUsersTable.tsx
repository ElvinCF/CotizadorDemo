import type { AdminUser } from "../../domain/adminUsers";
import RolePill from "./RolePill";
import StatusPill from "./StatusPill";

type AdminUsersTableProps = {
  users: AdminUser[];
  loading: boolean;
  onEdit: (user: AdminUser) => void;
};

export default function AdminUsersTable({ users, loading, onEdit }: AdminUsersTableProps) {
  if (loading) {
    return <p className="muted">Cargando usuarios...</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>USERNAME</th>
            <th>NOMBRE</th>
            <th>ROL</th>
            <th>TELEFONO</th>
            <th>CREADO</th>
            <th>ESTADO</th>
            <th>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{`${user.nombres} ${user.apellidos}`.trim()}</td>
              <td>
                <RolePill role={user.rol} />
              </td>
              <td>{user.telefono || "-"}</td>
              <td>{user.created_at ? new Date(user.created_at).toLocaleDateString("es-PE") : "-"}</td>
              <td>
                <StatusPill status={user.estado} />
              </td>
              <td>
                <button type="button" className="btn ghost" onClick={() => onEdit(user)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 ? (
            <tr>
              <td colSpan={7} className="muted" style={{ textAlign: "center" }}>
                No hay usuarios registrados.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
