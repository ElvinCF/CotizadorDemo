export type AdminUserRole = "SUPERADMIN" | "ADMIN" | "ASESOR";
export type AdminUserStatus = "ACTIVO" | "INACTIVO";

export type AdminUser = {
  id: string;
  username: string;
  rol: AdminUserRole;
  estado: AdminUserStatus;
  nombres: string;
  apellidos: string;
  telefono: string;
  proyectoId?: string | null;
  created_at: string;
  canDelete?: boolean;
};

export type AdminUserCatalogs = {
  roles: AdminUserRole[];
  statuses: AdminUserStatus[];
};

export type AdminUserPayload = {
  username: string;
  pin?: string;
  rol: AdminUserRole;
  estado: AdminUserStatus;
  nombres: string;
  apellidos: string;
  telefono: string;
};

export type AdminTeamMember = {
  userId: string;
  username: string;
  nombre: string;
  rol: AdminUserRole;
  estado: AdminUserStatus;
};

export type AdminTeam = {
  id: string;
  proyectoId: string;
  nombre: string;
  adminId: string | null;
  adminNombre: string | null;
  estado: boolean;
  createdAt: string;
  members: AdminTeamMember[];
};

export type AdminTeamsPayload = {
  proyectoId: string;
  users: AdminUser[];
  teams: AdminTeam[];
};

export type AdminTeamPayload = {
  nombre: string;
  adminId: string | null;
  memberIds: string[];
  estado: boolean;
};
