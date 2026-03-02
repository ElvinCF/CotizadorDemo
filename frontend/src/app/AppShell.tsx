import type { ReactNode } from "react";
import ThemeToggle from "./ThemeToggle";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  contentClassName?: string;
};

const AppShell = ({
  children,
  title = "Mapa cotizador de Arenas Malabrigo",
  actions,
  contentClassName = "",
}: AppShellProps) => (
  <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand__headline">
          <span className="brand__icon" aria-hidden="true">
            <img src="/assets/Logo_Arenas_Malabrigo.svg" alt="" />
          </span>
          <div className="brand__text">
            <span className="brand__title">{title}</span>
          </div>
        </div>
      </div>
      <div className="topbar__actions">
        {actions}
        <ThemeToggle />
      </div>
    </header>

    <main className={`main ${contentClassName}`.trim()}>{children}</main>
  </div>
);

export default AppShell;
