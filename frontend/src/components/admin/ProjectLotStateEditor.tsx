import AdminTextInput from "./AdminTextInput";

export type ProjectLotStateKey = "disponible" | "separado" | "vendido" | "selected";

export type ProjectLotStateEditorValue = Record<ProjectLotStateKey, { color: string; opacity: string }>;

const LOT_STATE_META: Array<{ key: ProjectLotStateKey; label: string }> = [
  { key: "disponible", label: "Disponible" },
  { key: "separado", label: "Separado" },
  { key: "vendido", label: "Vendido" },
  { key: "selected", label: "Seleccionado" },
];

type ProjectLotStateEditorProps = {
  value: ProjectLotStateEditorValue;
  onChange: (next: ProjectLotStateEditorValue) => void;
};

export default function ProjectLotStateEditor({ value, onChange }: ProjectLotStateEditorProps) {
  const updateItem = (key: ProjectLotStateKey, patch: Partial<ProjectLotStateEditorValue[ProjectLotStateKey]>) => {
    onChange({
      ...value,
      [key]: {
        ...value[key],
        ...patch,
      },
    });
  };

  return (
    <div className="project-lot-state-editor">
      {LOT_STATE_META.map((item) => {
        const current = value[item.key];
        const percent = Math.round(Number(current.opacity || 0) * 100);

        return (
          <section key={item.key} className="project-lot-state-card">
            <header className="project-lot-state-card__header">
              <span>{item.label}</span>
              <span className="project-lot-state-card__percent">{percent}%</span>
            </header>

            <div className="project-lot-state-card__color-row">
              <input
                type="color"
                value={current.color}
                aria-label={`Color ${item.label}`}
                onChange={(event) => updateItem(item.key, { color: event.target.value })}
              />
              <AdminTextInput
                value={current.color}
                onChange={(event) => updateItem(item.key, { color: event.target.value })}
              />
            </div>

            <div className="project-lot-state-card__slider-row">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={percent}
                aria-label={`Transparencia ${item.label}`}
                onChange={(event) => updateItem(item.key, { opacity: String(Number(event.target.value) / 100) })}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
