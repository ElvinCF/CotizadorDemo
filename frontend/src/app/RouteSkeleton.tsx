import AppShell from "./AppShell";

type RouteSkeletonVariant = "map" | "table" | "dashboard" | "form";

type RouteSkeletonProps = {
  title?: string;
  variant?: RouteSkeletonVariant;
  contentClassName?: string;
};

export default function RouteSkeleton({
  title = "Cargando modulo",
  variant = "table",
  contentClassName = "",
}: RouteSkeletonProps) {
  return (
    <AppShell title={title} contentClassName={contentClassName}>
      <section className={`route-skeleton route-skeleton--${variant}`} aria-busy="true" aria-live="polite">
        <header className="route-skeleton__head">
          <span className="route-skeleton__line route-skeleton__line--title" />
          <span className="route-skeleton__line route-skeleton__line--meta" />
        </header>

        <div className="route-skeleton__toolbar">
          <span className="route-skeleton__line route-skeleton__line--search" />
          <span className="route-skeleton__line route-skeleton__line--btn" />
          <span className="route-skeleton__line route-skeleton__line--btn" />
        </div>

        {variant === "dashboard" ? (
          <>
            <div className="route-skeleton__cards">
              {Array.from({ length: 4 }).map((_, index) => (
                <article key={`dashboard-kpi-${index}`} className="route-skeleton__card" />
              ))}
            </div>
            <div className="route-skeleton__charts">
              <article className="route-skeleton__chart route-skeleton__chart--large" />
              <article className="route-skeleton__chart" />
            </div>
          </>
        ) : null}

        {variant === "map" ? (
          <div className="route-skeleton__map-layout">
            <article className="route-skeleton__map-canvas" />
            <aside className="route-skeleton__map-drawer" />
          </div>
        ) : null}

        {variant === "form" ? (
          <div className="route-skeleton__form-layout">
            <article className="route-skeleton__form-col">
              <span className="route-skeleton__line route-skeleton__line--field" />
              <span className="route-skeleton__line route-skeleton__line--field" />
              <span className="route-skeleton__line route-skeleton__line--field" />
              <span className="route-skeleton__line route-skeleton__line--block" />
            </article>
            <article className="route-skeleton__form-col">
              <span className="route-skeleton__line route-skeleton__line--field" />
              <span className="route-skeleton__line route-skeleton__line--block" />
              <span className="route-skeleton__line route-skeleton__line--block" />
            </article>
          </div>
        ) : null}

        {variant === "table" ? (
          <div className="route-skeleton__table">
            {Array.from({ length: 6 }).map((_, index) => (
              <span key={`table-row-${index}`} className="route-skeleton__line route-skeleton__line--row" />
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
