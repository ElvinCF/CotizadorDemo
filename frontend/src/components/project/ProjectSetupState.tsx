import type { ReactNode } from "react";

type ProjectSetupStateProps = {
  title: string;
  message: string;
  hint?: string;
  actions?: ReactNode;
};

export default function ProjectSetupState({ title, message, hint, actions }: ProjectSetupStateProps) {
  return (
    <section className="project-setup-state" aria-live="polite">
      <div className="project-setup-state__badge">Configuracion pendiente</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {hint ? <small>{hint}</small> : null}
      {actions ? <div className="project-setup-state__actions">{actions}</div> : null}
    </section>
  );
}
