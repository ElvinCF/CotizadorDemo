import { memo, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import ArenasSvg from "../../components/arenas";
import AppShell from "../../app/AppShell";
import { defaultOverlay, mapVars } from "../../domain/constants";
import { overlayStyle } from "../../domain/finance";
import type { OverlayTransform } from "../../domain/types";
import EditorPanel from "./EditorPanel";

const MemoArenasSvg = memo(ArenasSvg);

const OverlayEditorPage = () => {
  const [overlay, setOverlay] = useState<OverlayTransform>(defaultOverlay);
  const overlayStyleMemo = useMemo(() => overlayStyle(overlay), [overlay]);

  return (
    <AppShell
      title="Editor de overlay"
      actions={
        <nav className="topbar-nav">
          <Link className="btn ghost" to="/">
            Ver mapa
          </Link>
          <Link className="btn ghost" to="/vendedor">
            Panel vendedor
          </Link>
        </nav>
      }
    >
      <EditorPanel
        overlay={overlay}
        setOverlay={setOverlay}
        defaultOverlay={defaultOverlay}
        mapVars={mapVars as CSSProperties}
        MapSvg={
          <div className="map-layer">
            <img
              src="/assets/plano-fondo-demo.webp"
              alt="Plano de fondo"
              className="map-background"
              draggable={false}
            />
            <MemoArenasSvg className="lotes-svg" style={overlayStyleMemo} />
          </div>
        }
      />
    </AppShell>
  );
};

export default OverlayEditorPage;
