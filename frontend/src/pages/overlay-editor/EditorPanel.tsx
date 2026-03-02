import type React from "react";
import type { FC } from "react";

type OverlayTransform = {
  x: number;
  y: number;
  scale: number;
};

type Props = {
  overlay: OverlayTransform;
  setOverlay: (next: OverlayTransform) => void;
  defaultOverlay: OverlayTransform;
  mapVars: React.CSSProperties;
  MapSvg: React.ReactNode;
};

const EditorPanel: FC<Props> = ({ overlay, setOverlay, defaultOverlay, mapVars, MapSvg }) => (
  <section className="editor-panel">
    <div className="editor-header">
      <h3>Editor de overlay</h3>
      <p className="muted">Ajusta posicion y escala del SVG sobre el PNG fijo.</p>
    </div>
    <div className="editor-grid">
      <div className="editor-controls">
        <label>
          X ({overlay.x}px)
          <div className="editor-inputs">
            <input
              type="number"
              value={overlay.x}
              onChange={(event) => setOverlay({ ...overlay, x: Number(event.target.value || 0) })}
            />
            <input
              type="range"
              min={-400}
              max={400}
              value={overlay.x}
              onChange={(event) => setOverlay({ ...overlay, x: Number(event.target.value) })}
            />
          </div>
        </label>
        <label>
          Y ({overlay.y}px)
          <div className="editor-inputs">
            <input
              type="number"
              value={overlay.y}
              onChange={(event) => setOverlay({ ...overlay, y: Number(event.target.value || 0) })}
            />
            <input
              type="range"
              min={-400}
              max={400}
              value={overlay.y}
              onChange={(event) => setOverlay({ ...overlay, y: Number(event.target.value) })}
            />
          </div>
        </label>
        <label>
          Escala ({overlay.scale.toFixed(2)})
          <div className="editor-inputs">
            <input
              type="number"
              step={0.01}
              value={overlay.scale}
              onChange={(event) =>
                setOverlay({ ...overlay, scale: Number(event.target.value || 1) })
              }
            />
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.01}
              value={overlay.scale}
              onChange={(event) => setOverlay({ ...overlay, scale: Number(event.target.value) })}
            />
          </div>
        </label>
        <div className="editor-actions">
          <button className="btn" onClick={() => setOverlay(defaultOverlay)}>
            Reset
          </button>
        </div>
        <div className="editor-output">
          <span>Transform actual</span>
          <code>
            x: {overlay.x}, y: {overlay.y}, scale: {overlay.scale.toFixed(2)}
          </code>
        </div>
      </div>
      <div className="editor-canvas" style={mapVars}>
        {MapSvg}
      </div>
    </div>
  </section>
);

export default EditorPanel;
