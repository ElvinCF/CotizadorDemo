export type AdminUserRole = "ADMIN" | "ASESOR";
export type AdminUserStatus = "ACTIVO" | "INACTIVO";

export type AdminUser = {
  id: string;
  username: string;
  rol: AdminUserRole;
  estado: AdminUserStatus;
  nombres: string;
  apellidos: string;
  telefono: string;
  created_at: string;
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
