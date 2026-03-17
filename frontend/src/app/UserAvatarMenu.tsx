import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import ThemeToggle from "./ThemeToggle";

type MenuItem = {
  label: string;
  to: string;
  icon: ReactNode;
};

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 20a7 7 0 0 1 14 0"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M15.5 11a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 19a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M14 18a4 4 0 0 1 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconSales = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M3 19h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconLogin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M10 17 15 12 10 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 12H4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M20 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M14 17 19 12 14 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 12H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M4 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const roleMenuItems = (role: "asesor" | "admin" | null, isAuthenticated: boolean): MenuItem[] => {
  if (!isAuthenticated || !role) {
    return [{ label: "Iniciar sesion", to: "/login", icon: <IconLogin /> }];
  }

  const base: MenuItem[] = [
    { label: "Mapa", to: "/", icon: <IconMap /> },
    { label: "Editar lotes", to: "/lotes", icon: <IconTable /> },
    { label: "Ventas", to: "/ventas", icon: <IconSales /> },
  ];

  if (role === "admin") {
    return [
      ...base,
      { label: "Dashboard", to: "/admin", icon: <IconDashboard /> },
      { label: "Usuarios", to: "/usuarios", icon: <IconUsers /> },
    ];
  }

  return base;
};

const UserAvatarMenu = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role, username, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => roleMenuItems(role, isAuthenticated), [isAuthenticated, role]);
  const avatarLabel = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }

    const parts = String(username || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "US";
    }

    const first = parts[0]?.charAt(0) ?? "";
    const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0])?.charAt(0) ?? "";
    return `${first}${last}`.toUpperCase();
  }, [isAuthenticated, username]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const goTo = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <div className="user-avatar-menu" ref={wrapperRef}>
      <button
        type="button"
        className="avatar-btn"
        aria-label="Abrir menu de usuario"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {avatarLabel ? (
          <span className="avatar-btn__label">{avatarLabel}</span>
        ) : (
          <span className="avatar-btn__icon">
            <IconUser />
          </span>
        )}
      </button>

      {open ? (
        <div className="avatar-dropdown" role="menu" aria-label="Opciones de usuario">
          <div className="avatar-dropdown__theme" role="none">
            <span className="avatar-dropdown__theme-label">Tema</span>
            <ThemeToggle />
          </div>
          <div className="avatar-dropdown__sep avatar-dropdown__sep--mobile" />
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="avatar-dropdown__item"
              onClick={() => goTo(item.to)}
              role="menuitem"
            >
              <span className="avatar-dropdown__icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {isAuthenticated ? (
            <>
              <div className="avatar-dropdown__sep" />
              <button
                type="button"
                className="avatar-dropdown__item avatar-dropdown__item--danger"
                onClick={handleLogout}
                role="menuitem"
              >
                <span className="avatar-dropdown__icon" aria-hidden="true">
                  <IconLogout />
                </span>
                Cerrar sesion
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default UserAvatarMenu;

