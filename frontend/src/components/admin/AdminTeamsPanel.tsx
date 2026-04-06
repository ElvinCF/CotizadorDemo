import type { AdminTeam } from "../../domain/adminUsers";
import RolePill from "./RolePill";

type AdminTeamsPanelProps = {
  teams: AdminTeam[];
  onCreate: () => void;
  onEdit: (team: AdminTeam) => void;
  onDelete: (team: AdminTeam) => void;
};

export default function AdminTeamsPanel({ teams, onCreate, onEdit, onDelete }: AdminTeamsPanelProps) {
  return (
    <section className="admin-teams-panel">
      <header className="admin-teams-panel__header">
        <div>
          <h3>Equipos internos</h3>
          <p>Solo visible para superadmin. Admin no conoce esta estructura.</p>
        </div>
        <button type="button" className="btn data-table-toolbar__btn" onClick={onCreate}>
          + Nuevo equipo
        </button>
      </header>

      {teams.length === 0 ? (
        <div className="admin-teams-panel__empty">No hay equipos creados para este proyecto.</div>
      ) : (
        <div className="admin-teams-grid">
          {teams.map((team) => (
            <article key={team.id} className="admin-team-card">
              <header className="admin-team-card__header">
                <div>
                  <h4>{team.nombre}</h4>
                  <p>{team.adminNombre || "Sin responsable"}</p>
                </div>
                <span className={`estado-pill ${team.estado ? "activo" : "inactivo"}`}>
                  {team.estado ? "Activo" : "Inactivo"}
                </span>
              </header>

              <div className="admin-team-card__meta">
                <span>{team.members.length} miembros</span>
              </div>

              <div className="admin-team-card__members">
                {team.members.length === 0 ? (
                  <span className="admin-team-card__empty">Sin miembros activos.</span>
                ) : (
                  team.members.map((member) => (
                    <div key={member.userId} className="admin-team-card__member">
                      <div className="admin-team-card__member-text">
                        <strong>{member.nombre}</strong>
                        <span>@{member.username}</span>
                      </div>
                      <RolePill role={member.rol} />
                    </div>
                  ))
                )}
              </div>

              <footer className="admin-team-card__actions">
                <button type="button" className="btn ghost data-table__row-action" onClick={() => onEdit(team)}>
                  Editar equipo
                </button>
                <button
                  type="button"
                  className="btn ghost data-table__row-action admin-team-card__delete"
                  onClick={() => onDelete(team)}
                >
                  Eliminar
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
