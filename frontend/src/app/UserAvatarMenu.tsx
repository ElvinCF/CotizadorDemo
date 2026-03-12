import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

type MenuItem = {
  label: string;
  to: string;
};

const roleMenuItems = (role: "vendedor" | "admin" | null, isAuthenticated: boolean): MenuItem[] => {
  if (!isAuthenticated || !role) {
    return [{ label: "Iniciar sesion", to: "/login" }];
  }

  const base: MenuItem[] = [
    { label: "Mapa", to: "/" },
    { label: "Editar lotes (vendedor)", to: "/vendedor" },
  ];

  if (role === "admin") {
    return [...base, { label: "Dashboard", to: "/admin" }, { label: "Usuarios", to: "/admin#usuarios" }];
  }

  return base;
};

const UserAvatarMenu = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role, username, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => roleMenuItems(role, isAuthenticated), [isAuthenticated, role]);
  const avatarLabel = (username?.trim()?.charAt(0) || "U").toUpperCase();

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
        <span>{avatarLabel}</span>
      </button>

      {open ? (
        <div className="avatar-dropdown" role="menu" aria-label="Opciones de usuario">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="avatar-dropdown__item"
              onClick={() => goTo(item.to)}
              role="menuitem"
            >
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

