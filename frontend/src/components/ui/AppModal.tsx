import type { ReactNode } from "react";

type AppModalProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  bodyClassName?: string;
  closeLabel?: string;
  closeDisabled?: boolean;
};

export default function AppModal({
  open,
  title,
  description,
  onClose,
  footer,
  children,
  size = "md",
  className = "",
  bodyClassName = "",
  closeLabel = "Cerrar",
  closeDisabled = false,
}: AppModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={closeDisabled ? undefined : onClose}>
      <div
        className={`app-modal app-modal--${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="app-modal__header">
          <div className="app-modal__headline">
            <h3>{title}</h3>
            {description ? <div className="app-modal__description">{description}</div> : null}
          </div>
          <button type="button" className="btn ghost app-modal__close" onClick={onClose} disabled={closeDisabled}>
            {closeLabel}
          </button>
        </header>

        <div className={`app-modal__body ${bodyClassName}`.trim()}>{children}</div>

        {footer ? <footer className="app-modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
