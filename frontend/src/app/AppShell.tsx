import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { COMPANY_LOGO_IMAGE } from "./assets";
import { useAuth } from "./AuthContext";
import { useProjectContext } from "./ProjectContext";
import { buildPrivateProjectPath, buildPublicProjectPath, extractProjectSlugFromPath, replaceLeadingProjectSlug } from "./projectRoutes";
import { writePreferredProjectSlug } from "../services/projectContext";
import ThemeToggle from "./ThemeToggle";
import UserAvatarMenu from "./UserAvatarMenu";

type AppShellProps = {
  children: ReactNode;
  title?: ReactNode;
  titleMeta?: ReactNode;
  actions?: ReactNode;
  mobileActions?: ReactNode;
  contentClassName?: string;
  keepThemeVisibleOnMobile?: boolean;
  hideProjectSwitcher?: boolean;
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
  hideProjectSwitcher = false,
}: AppShellProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, rawRole } = useAuth();
  const { display, bundle } = useProjectContext();
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

  const visibleProjects = bundle?.proyectos ?? [];
  const showProjectSwitcher = !hideProjectSwitcher && isAuthenticated && rawRole === "SUPERADMIN" && visibleProjects.length > 1;

  const handleProjectChange = (nextSlug: string) => {
    writePreferredProjectSlug(nextSlug);
    const currentSlug = extractProjectSlugFromPath(location.pathname);
    if (currentSlug) {
      navigate(`${replaceLeadingProjectSlug(location.pathname, nextSlug)}${location.search || ""}`);
      return;
    }

    if (isAuthenticated) {
      navigate(buildPrivateProjectPath(nextSlug, "dashboard"));
      return;
    }

    navigate(buildPublicProjectPath(nextSlug));
  };

  const projectSwitcher = showProjectSwitcher ? (
    <>
      {visibleProjects.map((project) => {
        const optionLabel = project.etapa ? `${project.nombre} - ${project.etapa}` : project.nombre;
        return (
          <option key={project.proyectoId} value={project.slug}>
            {optionLabel}
          </option>
        );
      })}
    </>
  ) : null;

  return (
    <div ref={shellRef} className="app-shell" style={shellStyle}>
      <header ref={headerRef} className="topbar">
        <div className="brand">
          <div className="brand__headline">
            <span className="brand__icon" aria-hidden="true">
                      <img src={display.logoHeaderUrl || COMPANY_LOGO_IMAGE} alt="" />
            </span>
            <div className="brand__text">
              <div className="brand__title-row">
                {typeof title === "string" ? (
                  <span className={`brand__title${showProjectSwitcher ? " brand__title--with-project-switcher" : ""}`}>
                    {title}
                  </span>
                ) : (
                  title
                )}
                {showProjectSwitcher ? (
                  <label className="topbar__project-switcher topbar__project-switcher--mobile">
                    <select
                      aria-label="Seleccionar proyecto activo"
                      value={display.projectSlug}
                      onChange={(event) => handleProjectChange(event.target.value)}
                    >
                      {projectSwitcher}
                    </select>
                  </label>
                ) : null}
                {titleMeta ? <div className="brand__title-meta">{titleMeta}</div> : null}
              </div>
            </div>
          </div>
        </div>
        <div className="topbar__actions">
          {showProjectSwitcher ? (
            <label className="topbar__project-switcher topbar__project-switcher--desktop">
              <select
                aria-label="Seleccionar proyecto activo"
                value={display.projectSlug}
                onChange={(event) => handleProjectChange(event.target.value)}
              >
                {projectSwitcher}
              </select>
            </label>
          ) : null}
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
