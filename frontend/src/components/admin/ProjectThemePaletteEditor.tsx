import { useMemo, useState } from "react";
import AdminTextInput from "./AdminTextInput";
import {
  buildProjectThemeScale,
  DEFAULT_PROJECT_THEME_PALETTE,
  normalizeProjectThemePaletteMode,
  PROJECT_THEME_GROUPS,
  type ProjectThemeGroupKey,
  type ProjectThemePaletteState,
  type ThemeMode,
} from "../../domain/projectThemePalette";

type ProjectThemePaletteEditorProps = {
  value: ProjectThemePaletteState;
  onChange: (next: ProjectThemePaletteState) => void;
};

const themeModeOptions: Array<{ key: ThemeMode; label: string }> = [
  { key: "light", label: "Modo claro" },
  { key: "dark", label: "Modo oscuro" },
];

const themeSections: Array<{ key: "base" | "brand" | "support"; label: string }> = [
  { key: "base", label: "Bases" },
  { key: "brand", label: "Marca" },
  { key: "support", label: "Apoyo" },
];

export default function ProjectThemePaletteEditor({
  value,
  onChange,
}: ProjectThemePaletteEditorProps) {
  const [activeMode, setActiveMode] = useState<ThemeMode>("light");
  const [activeGroup, setActiveGroup] = useState<ProjectThemeGroupKey>("primary");

  const palette = value[activeMode];
  const selectedGroup = PROJECT_THEME_GROUPS.find((group) => group.key === activeGroup) ?? PROJECT_THEME_GROUPS[0];
  const selectedColor = palette[selectedGroup.key];
  const selectedScale = useMemo(
    () => buildProjectThemeScale(selectedColor, activeMode),
    [activeMode, selectedColor],
  );

  const updateGroupColor = (groupKey: ProjectThemeGroupKey, nextValue: string) => {
    const normalized = normalizeProjectThemePaletteMode({ [groupKey]: nextValue }, activeMode)[groupKey];
    onChange({
      ...value,
      [activeMode]: {
        ...value[activeMode],
        [groupKey]: normalized,
      },
    });
  };

  const restoreModeDefaults = () => {
    onChange({
      ...value,
      [activeMode]: { ...DEFAULT_PROJECT_THEME_PALETTE[activeMode] },
    });
  };

  return (
    <div className="project-theme-editor">
      <div className="project-theme-editor__toolbar">
        <div className="project-theme-editor__modes" role="tablist" aria-label="Modo de paleta">
          {themeModeOptions.map((mode) => (
            <button
              key={mode.key}
              type="button"
              className={`project-theme-editor__mode${activeMode === mode.key ? " is-active" : ""}`}
              onClick={() => setActiveMode(mode.key)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn ghost project-theme-editor__restore" onClick={restoreModeDefaults}>
          Restaurar {activeMode === "light" ? "claro" : "oscuro"}
        </button>
      </div>

      {themeSections.map((section) => (
        <section key={section.key} className="project-theme-editor__section">
          <header className="project-theme-editor__section-header">
            <h5>{section.label}</h5>
          </header>
          <div className="project-theme-editor__grid">
            {PROJECT_THEME_GROUPS.filter((group) => group.section === section.key).map((group) => {
              const tones = buildProjectThemeScale(palette[group.key], activeMode);
              return (
                <button
                  key={group.key}
                  type="button"
                  className={`project-theme-card${activeGroup === group.key ? " is-active" : ""}`}
                  onClick={() => setActiveGroup(group.key)}
                >
                  <div className="project-theme-card__head">
                    <strong>{group.label}</strong>
                    <span>{palette[group.key]}</span>
                  </div>
                  <div className="project-theme-card__tones" aria-hidden="true">
                    {tones.map((tone) => (
                      <span key={`${group.key}-${tone}`} style={{ background: tone }} />
                    ))}
                  </div>
                  <p>{group.description}</p>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <section className="project-theme-editor__detail">
        <header className="project-theme-editor__detail-header">
          <div>
            <h5>{selectedGroup.label}</h5>
            <p>{selectedGroup.description}</p>
          </div>
        </header>
        <div className="project-theme-editor__detail-body">
          <label className="project-theme-editor__picker">
            <span>Color base</span>
            <div className="project-theme-editor__picker-control">
              <input
                type="color"
                value={selectedColor}
                onChange={(event) => updateGroupColor(selectedGroup.key, event.target.value)}
              />
              <AdminTextInput
                value={selectedColor}
                onChange={(event) => updateGroupColor(selectedGroup.key, event.target.value)}
              />
            </div>
          </label>
          <div className="project-theme-editor__preview">
            <span>Tonos derivados</span>
            <div className="project-theme-editor__preview-scale">
              {selectedScale.map((tone) => (
                <div key={`${selectedGroup.key}-${tone}`} className="project-theme-editor__preview-swatch">
                  <span style={{ background: tone }} />
                  <small>{tone}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
