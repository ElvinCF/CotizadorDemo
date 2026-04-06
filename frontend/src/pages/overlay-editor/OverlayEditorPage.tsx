import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import {
  resolveProjectMapBackground,
  resolveProjectOverlayComponent,
} from "../../components/overlays/projectOverlayRegistry";
import AppShell from "../../app/AppShell";
import { useProjectContext } from "../../app/ProjectContext";
import { buildPrivateProjectPath, buildPublicProjectPath } from "../../app/projectRoutes";
import { MAP_HEIGHT, MAP_WIDTH, defaultOverlay, mapVars } from "../../domain/constants";
import { overlayStyle } from "../../domain/finance";
import type { Lote, OverlayTransform } from "../../domain/types";
import { loadAdminLotesFromApi } from "../../services/lotes";
import ProjectSetupState from "../../components/project/ProjectSetupState";
import EditorPanel from "./EditorPanel";

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

const OverlayEditorPage = () => {
  const navigate = useNavigate();
  const { display, context, loading: projectLoading } = useProjectContext();
  const svgRef = useRef<SVGSVGElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const hasFitRef = useRef(false);
  const mapTransformRef = useRef({ scale: 1, positionX: 0, positionY: 0 });
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [overlay, setOverlay] = useState<OverlayTransform>(defaultOverlay);
  const overlayStyleMemo = useMemo(() => overlayStyle(overlay), [overlay]);
  const [mapTransform, setMapTransform] = useState({ scale: 1, positionX: 0, positionY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lotesLoading, setLotesLoading] = useState(true);
  const mapBackgroundImage = useMemo(
    () => resolveProjectMapBackground(display.mapaWebpUrl, display.projectSlug, display.stage),
    [display.mapaWebpUrl, display.projectSlug, display.stage],
  );
  const ProjectOverlayComponent = useMemo(
    () => resolveProjectOverlayComponent(context?.ui.mapaSvgUrl, display.projectSlug, display.stage),
    [context?.ui.mapaSvgUrl, display.projectSlug, display.stage],
  );
  const hasProjectMapContent = Boolean(mapBackgroundImage) && lotes.length > 0 && Boolean(ProjectOverlayComponent);
  const isMapContentLoading = projectLoading || (Boolean(mapBackgroundImage) && lotesLoading);

  useEffect(() => {
    let active = true;
    const syncLotes = async () => {
      try {
        setLotesLoading(true);
        const items = await loadAdminLotesFromApi({ slug: display.projectSlug });
        if (!active) return;
        setLotes(items);
        setLoadError(null);
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLotes([]);
        setLoadError(
          "No se pudo cargar lotes desde Supabase/API. Verifica SUPABASE_DB_SCHEMA y variables del backend."
        );
      } finally {
        if (!active) return;
        setLotesLoading(false);
      }
    };
    syncLotes();
    return () => {
      active = false;
    };
  }, [display.projectSlug]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;
    lotes.forEach((lote) => {
      const target = root.querySelector<SVGElement>(`#${CSS.escape(lote.id)}`);
      if (target) {
        target.setAttribute("data-status", lote.condicion);
      }
    });
  }, [lotes]);

  useEffect(() => {
    const element = mapContainerRef.current;
    if (!element || !transformRef.current) return;

    const fitToContainer = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const nextScale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
      const nextX = (width - MAP_WIDTH * nextScale) / 2;
      const nextY = (height - MAP_HEIGHT * nextScale) / 2;
      transformRef.current?.setTransform(nextX, nextY, nextScale, 0, "easeOut");
    };

    const observer = new ResizeObserver(() => {
      if (!hasFitRef.current) {
        fitToContainer();
        hasFitRef.current = true;
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <AppShell
      contentClassName="main--map"
      title="Editor de overlay"
      actions={
        <nav className="topbar-nav">
          <Link className="btn ghost topbar-action" to={buildPublicProjectPath(display.projectSlug)}>
            <IconMap />
            Mapa
          </Link>
          <Link className="btn ghost topbar-action" to={buildPrivateProjectPath(display.projectSlug, "lotes")}>
            <IconTable />
            Lotes
          </Link>
        </nav>
      }
    >
      {loadError && (
        <div className="modal-backdrop" onClick={() => setLoadError(null)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h4>Error de carga</h4>
            <p className="muted">{loadError}</p>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setLoadError(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <EditorPanel
        overlay={overlay}
        setOverlay={setOverlay}
        defaultOverlay={defaultOverlay}
        MapSvg={
          <div
            ref={mapContainerRef}
            className={`map-container ${isPanning ? "is-panning" : ""}`}
            style={mapVars as CSSProperties}
          >
            {isMapContentLoading ? (
              <section className="route-skeleton route-skeleton--map-loading" aria-label="Cargando mapa del proyecto">
                <div className="route-skeleton__map-layout">
                  <div className="route-skeleton__map-canvas" />
                </div>
              </section>
            ) : hasProjectMapContent ? (
              <TransformWrapper
                ref={transformRef}
                minScale={0.1}
                maxScale={8}
                centerOnInit={false}
                centerZoomedOut={false}
                limitToBounds={false}
                panning={{ velocityDisabled: true }}
                wheel={{ step: 0.04, smoothStep: 0.003 }}
                onTransformed={(_, state) => {
                  mapTransformRef.current = state;
                  setMapTransform({
                    scale: state.scale,
                    positionX: state.positionX,
                    positionY: state.positionY,
                  });
                }}
                onPanningStart={() => setIsPanning(true)}
                onPanningStop={() => setIsPanning(false)}
              >
                {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
                  <>
                    <div className="map-controls">
                      <button className="btn ghost" onClick={() => zoomIn()}>
                        +
                      </button>
                      <button className="btn ghost" onClick={() => zoomOut()}>
                        -
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() => {
                          if (mapContainerRef.current) {
                            const { width, height } = mapContainerRef.current.getBoundingClientRect();
                            const nextScale = Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
                            const nextX = (width - MAP_WIDTH * nextScale) / 2;
                            const nextY = (height - MAP_HEIGHT * nextScale) / 2;
                            setTransform(nextX, nextY, nextScale);
                            return;
                          }
                          resetTransform();
                        }}
                      >
                        Reset
                      </button>
                      <div className="zoom-indicator">{Math.round(mapTransform.scale * 100)}%</div>
                      <input
                        className="zoom-slider"
                        type="range"
                        min={0.1}
                        max={8}
                        step={0.05}
                        value={mapTransform.scale}
                        onChange={(event) =>
                          setTransform(
                            mapTransform.positionX,
                            mapTransform.positionY,
                            Number(event.target.value)
                          )
                        }
                      />
                    </div>
                    <TransformComponent wrapperClass="transform-wrapper">
                      <div className="map-layer">
                        <img
                          src={mapBackgroundImage}
                          alt="Plano de fondo"
                          className="map-background"
                          draggable={false}
                        />
                        {ProjectOverlayComponent ? <ProjectOverlayComponent svgRef={svgRef} className="lotes-svg" style={overlayStyleMemo} /> : null}
                      </div>
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            ) : (
              <ProjectSetupState
                title="Proyecto sin plano operativo"
                message="Este proyecto aun no tiene mapa WEBP/SVG o lotes importados."
                hint="Configura el proyecto y luego importa el inventario antes de editar el overlay."
                actions={
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => navigate(buildPrivateProjectPath(display.projectSlug, "proyecto"))}
                  >
                    Ir a configuracion
                  </button>
                }
              />
            )}
          </div>
        }
      />
    </AppShell>
  );
};

export default OverlayEditorPage;
