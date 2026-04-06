import type { ComponentType, Ref, SVGProps } from "react";
import SegundaEtapaOverlay from "../../assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay";
import TerceraEtapaOverlay from "../../assets/project-overlays/arenas-malabrigo/tercera-etapa/overlay";

export type ArenasSvgProps = SVGProps<SVGSVGElement> & {
  svgRef?: Ref<SVGSVGElement>;
};

export type ProjectOverlayComponent = ComponentType<ArenasSvgProps>;

const normalizeOverlayKey = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/");

const normalizeStageKey = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const overlayModules = import.meta.glob<{ default: ProjectOverlayComponent }>(
  "../../assets/project-overlays/**/overlay.tsx",
  { eager: true },
);

const modulePathToRoute = (modulePath: string) =>
  modulePath
    .replace(/^..\/..\/assets\//, "/assets/")
    .replace(/\\/g, "/");

const overlayRegistry = new Map<string, ProjectOverlayComponent>(
  Object.entries(overlayModules).map(([modulePath, module]) => [
    normalizeOverlayKey(modulePathToRoute(modulePath)),
    module.default,
  ]),
);

overlayRegistry.set(
  normalizeOverlayKey("/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx"),
  SegundaEtapaOverlay,
);
overlayRegistry.set(
  normalizeOverlayKey("/assets/project-overlays/arenas-malabrigo/tercera-etapa/overlay.tsx"),
  TerceraEtapaOverlay,
);

const overlayRouteAliases = new Map<string, string>([
  [
    "/assets/proyectos/arenas-malabrigo/etapas/segunda-etapa/overlay.svg",
    "/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx",
  ],
  [
    "/assets/proyectos/arenas-malabrigo/overlay.svg",
    "/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx",
  ],
]);

const overlaySlugRegistry = new Map<string, string>([
  ["arenas-malabrigo2", "/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx"],
  ["arenas-malabrigo|segunda-etapa", "/assets/project-overlays/arenas-malabrigo/segunda-etapa/overlay.tsx"],
  ["arenas-malabrigo-3", "/assets/project-overlays/arenas-malabrigo/tercera-etapa/overlay.tsx"],
  ["arenas-malabrigo|tercera-etapa", "/assets/project-overlays/arenas-malabrigo/tercera-etapa/overlay.tsx"],
]);

const mapWebpRegistry = new Map<string, string>([
  ["arenas-malabrigo2", "/assets/proyectos/arenas-malabrigo/etapas/segunda-etapa/plano-fondo-demo-b.webp"],
  ["arenas-malabrigo|segunda-etapa", "/assets/proyectos/arenas-malabrigo/etapas/segunda-etapa/plano-fondo-demo-b.webp"],
  ["arenas-malabrigo-3", "/assets/proyectos/arenas-malabrigo/etapas/tercera-etapa/mapa_arenas_3.webp"],
  ["arenas-malabrigo|tercera-etapa", "/assets/proyectos/arenas-malabrigo/etapas/tercera-etapa/mapa_arenas_3.webp"],
]);

const resolveOverlayRoute = (
  overlayKey?: string | null,
  projectSlug?: string | null,
  projectStage?: string | null,
) => {
  const normalizedOverlayKey = normalizeOverlayKey(overlayKey);
  const normalizedSlug = normalizeOverlayKey(projectSlug);
  const slugStageKey = `${normalizedSlug.replace(/\d+$/, "")}|${normalizeStageKey(projectStage)}`;

  return (
    overlayRouteAliases.get(normalizedOverlayKey) ??
    (normalizedOverlayKey ||
    overlaySlugRegistry.get(normalizedSlug) ||
    overlaySlugRegistry.get(slugStageKey) ||
    "")
  );
};

export const resolveProjectOverlayComponent = (
  overlayKey?: string | null,
  projectSlug?: string | null,
  projectStage?: string | null,
) => {
  const resolvedRoute = resolveOverlayRoute(overlayKey, projectSlug, projectStage);
  return overlayRegistry.get(normalizeOverlayKey(resolvedRoute)) ?? null;
};

export const resolveProjectMapBackground = (
  mapWebpUrl?: string | null,
  projectSlug?: string | null,
  projectStage?: string | null,
) => {
  const normalizedSlug = normalizeOverlayKey(projectSlug);
  const slugStageKey = `${normalizedSlug.replace(/\d+$/, "")}|${normalizeStageKey(projectStage)}`;

  const directUrl = normalizeOverlayKey(mapWebpUrl);

  return (
    directUrl ||
    mapWebpRegistry.get(normalizedSlug) ||
    mapWebpRegistry.get(slugStageKey) ||
    ""
  );
};
