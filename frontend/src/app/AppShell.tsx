import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const HEADER_FALLBACK = 40;
const FOOTER_FALLBACK = 34;

const AppShell = ({
  children,
  title = "Arenas Malabrigo - Mapa cotizador",
  titleMeta,
  actions,
  mobileActions,
  contentClassName = "",
  keepThemeVisibleOnMobile = false,
}: AppShellProps) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const [layoutVars, setLayoutVars] = useState({
    headerHeight: HEADER_FALLBACK,
    footerHeight: FOOTER_FALLBACK,
  });

  useEffect(() => {
    const shell = shellRef.current;
    const header = headerRef.current;
    const footer = footerRef.current;
    if (!shell || !header || !footer) return;

    let rafId = 0;
    const updateLayoutVars = () => {
      const nextHeaderHeight = Math.ceil(header.getBoundingClientRect().height) || HEADER_FALLBACK;
      const nextFooterHeight = Math.ceil(footer.getBoundingClientRect().height) || FOOTER_FALLBACK;

      setLayoutVars((current) => {
        if (current.headerHeight === nextHeaderHeight && current.footerHeight === nextFooterHeight) {
          return current;
        }
        return {
          headerHeight: nextHeaderHeight,
          footerHeight: nextFooterHeight,
        };
      });
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateLayoutVars);
    };

    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(header);
    observer.observe(footer);
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [actions, keepThemeVisibleOnMobile, mobileActions, title, titleMeta]);

  const shellStyle = useMemo(
    () =>
      ({
        "--header-height": `${layoutVars.headerHeight}px`,
        "--app-footer-height": `${layoutVars.footerHeight}px`,
      }) as CSSProperties,
    [layoutVars.footerHeight, layoutVars.headerHeight]
  );

  return (
    <div ref={shellRef} className="app-shell" style={shellStyle}>
      <header ref={headerRef} className="topbar">
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
      <footer ref={footerRef} className="app-footer">
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
};

export default AppShell;
