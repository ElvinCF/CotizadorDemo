import { useEffect, useState, type FormEvent } from "react";
import type { SalesClient } from "../../domain/ventas";
import AdminTextInput from "../admin/AdminTextInput";

type SaleClientModalProps = {
  open: boolean;
  title: string;
  saving: boolean;
  initialValue: SalesClient | null;
  onClose: () => void;
  onSave: (value: SalesClient) => void;
  onFindByDni?: (dni: string) => Promise<SalesClient | null>;
};

const emptyClient: SalesClient = {
  nombreCompleto: "",
  dni: "",
  celular: "",
  direccion: "",
  ocupacion: "",
};

export default function SaleClientModal({
  open,
  title,
  saving,
  initialValue,
  onClose,
  onSave,
  onFindByDni,
}: SaleClientModalProps) {
  const [form, setForm] = useState<SalesClient>(emptyClient);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setForm(initialValue ? { ...emptyClient, ...initialValue } : emptyClient);
    setError(null);
    setNotice("");
  }, [initialValue, open]);

  if (!open) return null;

  const handleFindByDni = async () => {
    if (!onFindByDni) return;
    const dni = form.dni.trim();
    if (!dni) return;
    setFinding(true);
    setError(null);
    setNotice("");
    try {
      const found = await onFindByDni(dni);
      if (!found) {
        setNotice("No se encontro cliente con ese DNI.");
        return;
      }
      setForm({ ...found });
      setNotice("Cliente cargado por DNI.");
    } catch (findError) {
      setError(findError instanceof Error ? findError.message : "No se pudo buscar cliente.");
    } finally {
      setFinding(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.nombreCompleto.trim() || !form.dni.trim()) {
      setError("Completa nombre y DNI.");
      return;
    }
    onSave({
      ...form,
      nombreCompleto: form.nombreCompleto.trim(),
      dni: form.dni.trim(),
      celular: form.celular.trim(),
      direccion: form.direccion.trim(),
      ocupacion: form.ocupacion.trim(),
    });
  };

  return (
    <div className="modal-backdrop" onClick={saving ? undefined : onClose}>
      <div className="sales-client-modal" onClick={(event) => event.stopPropagation()}>
        <header className="sales-client-modal__header">
          <h3>{title}</h3>
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            Cerrar
          </button>
        </header>
        <form className="sales-client-modal__form" onSubmit={handleSubmit}>
          <label className="sales-client-modal__dni">
            DNI
            <div className="sales-inline-action">
              <AdminTextInput
                value={form.dni}
                onChange={(event) => setForm((current) => ({ ...current, dni: event.target.value.replace(/\D/g, "") }))}
                inputMode="numeric"
              />
              {onFindByDni ? (
                <button type="button" className="btn ghost" onClick={handleFindByDni} disabled={finding || saving}>
                  {finding ? "Buscando..." : "Buscar DNI"}
                </button>
              ) : null}
            </div>
          </label>
          <label>
            Nombre completo
            <AdminTextInput
              value={form.nombreCompleto}
              onChange={(event) => setForm((current) => ({ ...current, nombreCompleto: event.target.value }))}
            />
          </label>
          <label>
            Celular
            <AdminTextInput
              value={form.celular}
              onChange={(event) => setForm((current) => ({ ...current, celular: event.target.value }))}
            />
          </label>
          <label>
            Ocupacion
            <AdminTextInput
              value={form.ocupacion}
              onChange={(event) => setForm((current) => ({ ...current, ocupacion: event.target.value }))}
            />
          </label>
          <label className="sales-client-modal__full">
            Direccion
            <AdminTextInput
              value={form.direccion}
              onChange={(event) => setForm((current) => ({ ...current, direccion: event.target.value }))}
            />
          </label>

          {notice ? <p className="admin-notice">{notice}</p> : null}
          {error ? <p className="admin-error">{error}</p> : null}

          <footer className="sales-client-modal__footer">
            <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Guardando..." : "Guardar titular"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

