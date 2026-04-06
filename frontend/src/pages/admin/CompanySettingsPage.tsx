import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useProjectContext } from "../../app/ProjectContext";
import { buildPrivateProjectPath, buildPublicProjectPath } from "../../app/projectRoutes";
import AdminTextInput from "../../components/admin/AdminTextInput";
import type { CompanySettings } from "../../domain/projectContext";
import { getCompanySettings, updateCompanySettings } from "../../services/projectContext";

const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const emptyForm: CompanySettings = {
  id: "",
  nombreComercial: "",
  razonSocial: "",
  ruc: "",
  direccionFiscal: "",
  telefono: "",
  email: "",
  webUrl: "",
  logoPrincipalUrl: "",
  logoSecundarioUrl: "",
  estado: true,
};

export default function CompanySettingsPage() {
  const { refresh, display } = useProjectContext();
  const [form, setForm] = useState<CompanySettings>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        setLoading(true);
        const item = await getCompanySettings();
        if (!active) return;
        setForm(item);
        setError(null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar empresa.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const logoPreviewUrls = useMemo(
    () => [form.logoPrincipalUrl, form.logoSecundarioUrl].filter(Boolean),
    [form.logoPrincipalUrl, form.logoSecundarioUrl]
  );

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setNotice("");
      const item = await updateCompanySettings(form);
      setForm(item);
      setNotice("Empresa actualizada.");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar empresa.");
    } finally {
      setSaving(false);
    }
  };

  const topbarActions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to={buildPublicProjectPath(display.projectSlug)}>
        <IconMap />
        Mapa
      </Link>
      <Link className="btn ghost topbar-action" to={buildPrivateProjectPath(display.projectSlug, "dashboard")}>
        <IconDashboard />
        Dashboard
      </Link>
      <Link className="btn ghost topbar-action" to={buildPrivateProjectPath(display.projectSlug, "proyecto")}>
        Proyecto
      </Link>
    </nav>
  );

  return (
    <AppShell title="Empresa" actions={topbarActions} contentClassName="main--data-table">
      <section className="settings-page">
        <div className="settings-page__header">
          <div>
            <h2>Empresa</h2>
            <p>Configuracion legal y visual base. Solo visible para SUPERADMIN.</p>
          </div>
          <div className="settings-page__actions">
            <button type="button" className="btn" onClick={() => void save()} disabled={loading || saving}>
              {saving ? "Guardando..." : "Guardar empresa"}
            </button>
          </div>
        </div>

        {error ? <p className="settings-error">{error}</p> : null}
        {notice ? <p className="settings-notice">{notice}</p> : null}

        <article className="settings-card">
          <header className="settings-card__header">
            <h3>Datos base</h3>
          </header>
          <div className="settings-form settings-form--two-columns">
            <label className="settings-field">
              <span>Nombre comercial</span>
              <AdminTextInput value={form.nombreComercial} onChange={(e) => setForm((c) => ({ ...c, nombreComercial: e.target.value }))} />
            </label>
            <label className="settings-field">
              <span>Razon social</span>
              <AdminTextInput value={form.razonSocial} onChange={(e) => setForm((c) => ({ ...c, razonSocial: e.target.value }))} />
            </label>
            <label className="settings-field">
              <span>RUC</span>
              <AdminTextInput value={form.ruc} onChange={(e) => setForm((c) => ({ ...c, ruc: e.target.value.replace(/\D/g, "") }))} maxLength={11} />
            </label>
            <label className="settings-field">
              <span>Telefono</span>
              <AdminTextInput value={form.telefono} onChange={(e) => setForm((c) => ({ ...c, telefono: e.target.value }))} />
            </label>
            <label className="settings-field">
              <span>Email</span>
              <AdminTextInput type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} />
            </label>
            <label className="settings-field">
              <span>Web</span>
              <AdminTextInput value={form.webUrl} onChange={(e) => setForm((c) => ({ ...c, webUrl: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--span-2">
              <span>Direccion fiscal</span>
              <textarea className="settings-textarea" rows={3} value={form.direccionFiscal} onChange={(e) => setForm((c) => ({ ...c, direccionFiscal: e.target.value }))} />
            </label>
            <label className="settings-field settings-field--checkbox">
              <input type="checkbox" checked={form.estado} onChange={(e) => setForm((c) => ({ ...c, estado: e.target.checked }))} />
              <span>Empresa activa</span>
            </label>
          </div>
        </article>

        <article className="settings-card">
          <header className="settings-card__header">
            <h3>Branding</h3>
          </header>
          <div className="settings-form settings-form--two-columns">
            <label className="settings-field">
              <span>Logo principal</span>
              <AdminTextInput value={form.logoPrincipalUrl} onChange={(e) => setForm((c) => ({ ...c, logoPrincipalUrl: e.target.value }))} />
            </label>
            <label className="settings-field">
              <span>Logo secundario</span>
              <AdminTextInput value={form.logoSecundarioUrl} onChange={(e) => setForm((c) => ({ ...c, logoSecundarioUrl: e.target.value }))} />
            </label>
          </div>
          {logoPreviewUrls.length ? (
            <div className="settings-preview-grid">
              {logoPreviewUrls.map((src) => (
                <div key={src} className="settings-preview-card">
                  <img src={src} alt="Preview logo" className="settings-preview-card__image" />
                  <span>{src}</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      </section>
    </AppShell>
  );
}

