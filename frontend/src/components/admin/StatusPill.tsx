import type { AdminUserStatus } from "../../domain/adminUsers";

type StatusPillProps = {
  status: AdminUserStatus;
};

export default function StatusPill({ status }: StatusPillProps) {
  return <span className={`estado-pill ${status.toLowerCase()}`}>{status}</span>;
}
