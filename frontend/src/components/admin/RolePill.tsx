import type { AdminUserRole } from "../../domain/adminUsers";

type RolePillProps = {
  role: AdminUserRole;
};

export default function RolePill({ role }: RolePillProps) {
  return <span className={`role-pill ${role.toLowerCase()}`}>{role}</span>;
}
