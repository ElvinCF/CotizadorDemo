import DataTable from "../data-table/DataTable";
import DataTableLoadingRows from "../data-table/DataTableLoadingRows";
import DataTableSortHeader from "../data-table/DataTableSortHeader";
import { resolveTableLoadState } from "../data-table/loadState";
import type { SortState } from "../data-table/types";
import type { AdminUser } from "../../domain/adminUsers";
import RolePill from "./RolePill";
import StatusPill from "./StatusPill";

export type AdminUsersSortKey = "username" | "nombre" | "rol" | "telefono" | "creado" | "estado";

type AdminUsersTableProps = {
  users: AdminUser[];
  loading: boolean;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  sort: SortState<AdminUsersSortKey>;
  onSort: (key: AdminUsersSortKey) => void;
};

const sortDirectionFor = (sort: SortState<AdminUsersSortKey>, key: AdminUsersSortKey) =>
  sort.key === key ? sort.direction : null;

export default function AdminUsersTable({ users, loading, onEdit, onDelete, sort, onSort }: AdminUsersTableProps) {
  const loadState = resolveTableLoadState(loading, users.length);
  const showDataRows = loadState === "ready" || loadState === "loading-refresh";

  return (
    <DataTable className="admin-users-table-view">
      <table>
        <thead>
          <tr>
            <th>
              <DataTableSortHeader
                label="Username"
                direction={sortDirectionFor(sort, "username")}
                onToggle={() => onSort("username")}
              />
            </th>
            <th>
              <DataTableSortHeader label="Nombre" direction={sortDirectionFor(sort, "nombre")} onToggle={() => onSort("nombre")} />
            </th>
            <th>
              <DataTableSortHeader label="Rol" direction={sortDirectionFor(sort, "rol")} onToggle={() => onSort("rol")} />
            </th>
            <th>
              <DataTableSortHeader
                label="Telefono"
                direction={sortDirectionFor(sort, "telefono")}
                onToggle={() => onSort("telefono")}
              />
            </th>
            <th>
              <DataTableSortHeader label="Creado" direction={sortDirectionFor(sort, "creado")} onToggle={() => onSort("creado")} />
            </th>
            <th>
              <DataTableSortHeader label="Estado" direction={sortDirectionFor(sort, "estado")} onToggle={() => onSort("estado")} />
            </th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loadState === "loading-initial" ? <DataTableLoadingRows colSpan={7} label="Cargando usuarios" /> : null}

          {loadState === "loading-refresh" ? (
            <tr>
              <td colSpan={7} className="data-table__refreshing">
                Actualizando usuarios...
              </td>
            </tr>
          ) : null}

          {showDataRows &&
            users.map((user) => (
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
                  <div className="admin-users-table__actions">
                    <button type="button" className="btn ghost data-table__row-action" onClick={() => onEdit(user)}>
                      Editar
                    </button>
                    {user.canDelete !== false ? (
                      <button
                        type="button"
                        className="btn ghost data-table__row-action admin-users-table__delete"
                        onClick={() => onDelete(user)}
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}

          {loadState === "empty" ? (
            <tr>
              <td colSpan={7} className="data-table__empty">
                No hay usuarios registrados.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </DataTable>
  );
}
