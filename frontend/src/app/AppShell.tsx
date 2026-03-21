import type { ReactNode } from "react";
import ThemeToggle from "./ThemeToggle";
import UserAvatarMenu from "./UserAvatarMenu";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  titleMeta?: ReactNode;
  actions?: ReactNode;
  mobileActions?: ReactNode;
  contentClassName?: string;
  keepThemeVisibleOnMobile?: boolean;
};

const AppShell = ({
  children,
  title = "Arenas Malabrigo - Mapa cotizador",
  titleMeta,
  actions,
  mobileActions,
  contentClassName = "",
  keepThemeVisibleOnMobile = false,
}: AppShellProps) => (
  <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <div className="brand__headline">
          <span className="brand__icon" aria-hidden="true">
            <img src="/assets/Logo_Arenas_Malabrigo.svg" alt="" />
          </span>
          <div className="brand__text">
            <div className="brand__title-row">
              <span className="brand__title">{title}</span>
              {titleMeta ? <div className="brand__title-meta">{titleMeta}</div> : null}
            </div>
          </div>
        </div>
      </div>
      <div className="topbar__actions">
        {actions ? <div className="topbar__context-actions">{actions}</div> : null}
        {mobileActions ? <div className="topbar__mobile-actions">{mobileActions}</div> : null}
        <div className={`topbar__theme${keepThemeVisibleOnMobile ? " topbar__theme--mobile-visible" : ""}`}>
          <ThemeToggle />
        </div>
        <UserAvatarMenu />
      </div>
    </header>

    <main className={`main ${contentClassName}`.trim()}>{children}</main>
  </div>
);

export default AppShell;
