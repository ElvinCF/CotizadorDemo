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
            <img src="/assets/arenas_club_cele.png" alt="" />
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
    <footer className="app-footer">
      <div className="app-footer__content">
        <span className="app-footer__label">
          Desarrollado por{" "}
          <a
            href="https://www.instagram.com/adaptic.pe"
            target="_blank"
            rel="noreferrer"
            className="app-footer__link"
            aria-label="Adaptic by grupo AIO en Instagram"
          >
            <img src="/adaptic.ico" alt="" aria-hidden="true" className="app-footer__logo" />
            <strong>Adaptic by grupo AIO</strong>
          </a>
        </span>
      </div>
    </footer>
  </div>
);

export default AppShell;
