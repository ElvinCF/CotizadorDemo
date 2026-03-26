import { useState, type FormEvent } from "react";
import type { PaymentType, SalePayment, SalePaymentFormValues } from "../../domain/ventas";
import AdminTextInput from "../admin/AdminTextInput";

type SalePaymentModalProps = {
  open: boolean;
  saving: boolean;
  initialValue?: SalePayment | null;
  suggestedType?: PaymentType;
  defaultAmount?: string;
  suggestedInstallmentNumber?: string;
  onClose: () => void;
  onSave: (values: SalePaymentFormValues) => Promise<void>;
};

const todayInput = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const buildEmptyPaymentForm = (
  suggestedType: PaymentType = "CUOTA",
  defaultAmount = "",
  suggestedInstallmentNumber = ""
): SalePaymentFormValues => ({
  fechaPago: todayInput(),
  tipoPago: suggestedType,
  monto: suggestedType === "CUOTA" ? defaultAmount : "",
  nroCuota: suggestedType === "CUOTA" ? suggestedInstallmentNumber : "",
  observacion: "",
});

const paymentTypeOptions: { value: PaymentType; label: string }[] = [
  { value: "SEPARACION", label: "Separacion" },
  { value: "INICIAL", label: "Inicial" },
  { value: "CUOTA", label: "Cuota" },
  { value: "OTRO", label: "Otro" },
];

export default function SalePaymentModal({
  open,
  saving,
  initialValue,
  suggestedType = "CUOTA",
  defaultAmount = "",
  suggestedInstallmentNumber = "",
  onClose,
  onSave,
}: SalePaymentModalProps) {
  const initialForm: SalePaymentFormValues = initialValue
    ? {
        fechaPago: initialValue.fechaPago?.slice(0, 10) || todayInput(),
        tipoPago: initialValue.tipoPago,
        monto: String(initialValue.monto ?? ""),
        nroCuota: initialValue.nroCuota != null ? String(initialValue.nroCuota) : "",
        observacion: initialValue.observacion ?? "",
      }
    : buildEmptyPaymentForm(suggestedType, defaultAmount, suggestedInstallmentNumber);
  const [form, setForm] = useState<SalePaymentFormValues>(initialForm);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.monto.trim()) {
      setError("Completa el monto del pago.");
      return;
    }
    if (form.tipoPago === "CUOTA" && !form.nroCuota.trim()) {
      setError("Completa el numero de cuota.");
      return;
    }

    try {
      await onSave(form);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el pago.");
    }
  };

  return (
    <div className="modal-backdrop modal-backdrop--payment" onClick={saving ? undefined : onClose}>
      <div className="sales-payment-modal" onClick={(event) => event.stopPropagation()}>
        <header className="sales-payment-modal__header">
          <h3>{initialValue ? "Editar pago" : "Registrar pago"}</h3>
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            Cerrar
          </button>
        </header>
        <form className="sales-payment-modal__form" onSubmit={handleSubmit}>
          <label>
            Fecha
            <AdminTextInput
              type="date"
              value={form.fechaPago}
              onChange={(event) => setForm((current) => ({ ...current, fechaPago: event.target.value }))}
            />
          </label>
          <label>
            Tipo
            <select
              value={form.tipoPago}
              onChange={(event) =>
                setForm((current) => {
                  const nextType = event.target.value as SalePaymentFormValues["tipoPago"];
                  if (initialValue) {
                    return { ...current, tipoPago: nextType };
                  }
                  if (nextType === "CUOTA") {
                    return {
                      ...current,
                      tipoPago: nextType,
                      monto: defaultAmount,
                      nroCuota: suggestedInstallmentNumber,
                    };
                  }
                  return {
                    ...current,
                    tipoPago: nextType,
                    monto: "",
                    nroCuota: "",
                  };
                })
              }
            >
              {paymentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Monto
            <AdminTextInput
              type="number"
              step="0.01"
              value={form.monto}
              onChange={(event) => setForm((current) => ({ ...current, monto: event.target.value }))}
            />
          </label>
          <label>
            Nro cuota
            <AdminTextInput
              value={form.nroCuota}
              onChange={(event) => setForm((current) => ({ ...current, nroCuota: event.target.value }))}
              placeholder={form.tipoPago === "CUOTA" ? "Obligatorio para cuota" : "Opcional"}
            />
          </label>
          <label className="sales-payment-modal__full">
            Observacion
            <AdminTextInput
              value={form.observacion}
              onChange={(event) => setForm((current) => ({ ...current, observacion: event.target.value }))}
            />
          </label>

          {error ? <p className="admin-error">{error}</p> : null}

          <footer className="sales-payment-modal__footer">
            <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Guardando..." : initialValue ? "Guardar cambios" : "Guardar pago"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
