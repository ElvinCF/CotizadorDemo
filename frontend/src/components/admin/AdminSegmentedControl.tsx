import type { ReactNode } from "react";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  tone?: "neutral" | "role-admin" | "role-asesor" | "status-activo" | "status-inactivo";
  disabled?: boolean;
  icon?: ReactNode;
};

type AdminSegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
};

export default function AdminSegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: AdminSegmentedControlProps<T>) {
  return (
    <div className="admin-segmented" role="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`admin-segmented__option admin-segmented__option--${option.tone ?? "neutral"}${
              selected ? " is-selected" : ""
            }`}
            onClick={() => onChange(option.value)}
            disabled={option.disabled}
            aria-pressed={selected}
          >
            {option.icon ? <span className="admin-segmented__icon">{option.icon}</span> : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
