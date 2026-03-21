import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminTextInput from "../../components/admin/AdminTextInput";
import SaleClientCard from "../../components/sales/SaleClientCard";
import SaleClientModal from "../../components/sales/SaleClientModal";
import SaleEditableCard from "../../components/sales/SaleEditableCard";
import SalePaymentModal from "../../components/sales/SalePaymentModal";
import SalePaymentsCard from "../../components/sales/SalePaymentsCard";
import { printSaleDocument } from "../../components/sales/salePrint";
import type { Lote } from "../../domain/types";
import type {
  InitialPaymentInput,
  SalePayment,
  SaleFormValues,
  SalePatchPayload,
  SalePaymentFormValues,
  SaleRecord,
  SaleState,
} from "../../domain/ventas";
import { loadLotesFromApi } from "../../services/lotes";
import { addSalePayment, createSale, findClientByDni, getSaleById, updateSale, updateSalePayment } from "../../services/ventas";

const todayInput = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const defaultInitialPayment = (tipoPago: InitialPaymentInput["tipoPago"]): InitialPaymentInput => ({
  tipoPago,
  fechaPago: todayInput(),
  monto: "",
  observacion: "",
});

const emptyClient = {
  nombreCompleto: "",
  dni: "",
  celular: "",
  direccion: "",
  ocupacion: "",
};

const createEmptySaleForm = (loteCodigo = "", targetState: SaleState = "SEPARADA"): SaleFormValues => ({
  loteCodigo,
  fechaVenta: todayInput(),
  precioVenta: "",
  estadoVenta: targetState,
  tipoFinanciamiento: "REDUCIR_CUOTA",
  cantidadCuotas: "12",
  montoCuota: "0",
  observacion: "",
  cliente: { ...emptyClient },
  cliente2: null,
  pagosIniciales: [defaultInitialPayment("SEPARACION"), defaultInitialPayment("INICIAL")],
});

const saleStateOptions: { value: SaleState; label: string; tone: "neutral" }[] = [
  { value: "SEPARADA", label: "Separada", tone: "neutral" },
  { value: "INICIAL_PAGADA", label: "Inicial pagada", tone: "neutral" },
  { value: "CONTRATO_FIRMADO", label: "Contrato firmado", tone: "neutral" },
  { value: "PAGANDO", label: "Pagando", tone: "neutral" },
  { value: "COMPLETADA", label: "Completada", tone: "neutral" },
  { value: "CAIDA", label: "Caida", tone: "neutral" },
];

const financingOptions = [
  { value: "REDUCIR_CUOTA", label: "Reducir cuota", tone: "neutral" as const },
  { value: "REDUCIR_MESES", label: "Reducir meses", tone: "neutral" as const },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value || 0);

const asNumber = (value: string) => {
  const parsed = Number.parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const isValidDateInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());

const computeInitialTotal = (payments: InitialPaymentInput[]) =>
  payments.reduce((acc, payment) => acc + asNumber(payment.monto), 0);

const computePaidInstallments = (payments: SalePayment[]) =>
  payments.filter((payment) => payment.tipoPago === "CUOTA").reduce((acc, payment) => acc + Number(payment.monto || 0), 0);

const computePreview = (values: {
  precioVenta: string;
  tipoFinanciamiento: SaleFormValues["tipoFinanciamiento"];
  cantidadCuotas: string;
  montoCuota: string;
  pagosIniciales?: InitialPaymentInput[];
  montoInicialTotal?: number;
}) => {
  const montoInicialTotal =
    values.montoInicialTotal ?? computeInitialTotal(values.pagosIniciales ?? [defaultInitialPayment("SEPARACION")]);
  const precioVenta = asNumber(values.precioVenta);
  const montoFinanciado = Math.max(0, precioVenta - montoInicialTotal);

  if (values.tipoFinanciamiento === "REDUCIR_CUOTA") {
    const cuotas = Math.min(36, Math.max(1, Number.parseInt(values.cantidadCuotas || "1", 10) || 1));
    return {
      montoInicialTotal,
      montoFinanciado,
      cantidadCuotas: cuotas,
      montoCuota: cuotas > 0 ? Number((montoFinanciado / cuotas).toFixed(2)) : 0,
    };
  }

  const cuota = Math.max(1, asNumber(values.montoCuota));
  return {
    montoInicialTotal,
    montoFinanciado,
    cantidadCuotas: Math.max(1, Math.ceil(montoFinanciado / cuota)),
    montoCuota: Number(cuota.toFixed(2)),
  };
};

const IconMap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 4v13.5M15 6.5V20" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconLotes = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 10h18M9 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M15 18 9 12l6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPrinter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M7 8V4h10v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 14h10v6H7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M5 4h11l3 3v13H5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M8 4v6h8V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M8 20v-6h8v6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export default function SaleFormPage() {
  const { id: saleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role, loginUsername } = useAuth();
  const isEdit = Boolean(saleId);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [form, setForm] = useState<SaleFormValues>(() =>
    createEmptySaleForm("", searchParams.get("target") === "VENDIDO" ? "INICIAL_PAGADA" : "SEPARADA")
  );
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientModalTarget, setClientModalTarget] = useState<"principal" | "secundario">("principal");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalePayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        if (isEdit && saleId) {
          const detail = await getSaleById(saleId);
          setSale(detail);
          setForm({
            loteCodigo: detail.lote?.codigo ?? "",
            fechaVenta: detail.fechaVenta.slice(0, 10),
            precioVenta: String(detail.precioVenta),
            estadoVenta: detail.estadoVenta,
            tipoFinanciamiento: detail.tipoFinanciamiento,
            cantidadCuotas: String(detail.cantidadCuotas),
            montoCuota: String(detail.montoCuota),
            observacion: detail.observacion,
            cliente: {
              nombreCompleto: detail.cliente?.nombreCompleto ?? "",
              dni: detail.cliente?.dni ?? "",
              celular: detail.cliente?.celular ?? "",
              direccion: detail.cliente?.direccion ?? "",
              ocupacion: detail.cliente?.ocupacion ?? "",
            },
            cliente2: detail.cliente2
              ? {
                  nombreCompleto: detail.cliente2.nombreCompleto ?? "",
                  dni: detail.cliente2.dni ?? "",
                  celular: detail.cliente2.celular ?? "",
                  direccion: detail.cliente2.direccion ?? "",
                  ocupacion: detail.cliente2.ocupacion ?? "",
                }
              : null,
            pagosIniciales: [defaultInitialPayment("SEPARACION"), defaultInitialPayment("INICIAL")],
          });
          setSelectedLote(
            detail.lote
              ? {
                  id: detail.lote.codigo,
                  dbId: detail.lote.id,
                  mz: detail.lote.mz,
                  lote: detail.lote.lote,
                  areaM2: detail.lote.areaM2,
                  price: detail.lote.precioReferencial,
                  condicion: detail.lote.estadoComercial,
                }
              : null
          );
          return;
        }

        const loteCode = searchParams.get("lote") || "";
        const allLotes = await loadLotesFromApi();
        const lote = allLotes.find((item) => item.id === loteCode) ?? null;
        setSelectedLote(lote);
        setForm((current) => ({
          ...current,
          loteCodigo: loteCode,
          precioVenta: lote?.price != null ? String(lote.price) : current.precioVenta,
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la venta.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [isEdit, saleId, searchParams]);

  const preview = useMemo(() => {
    const base = computePreview({
      precioVenta: form.precioVenta,
      tipoFinanciamiento: form.tipoFinanciamiento,
      cantidadCuotas: form.cantidadCuotas,
      montoCuota: form.montoCuota,
      pagosIniciales: isEdit ? undefined : form.pagosIniciales,
      montoInicialTotal: isEdit ? sale?.montoInicialTotal ?? 0 : undefined,
    });
    const totalCuotasPagadas = isEdit ? computePaidInstallments(sale?.pagos ?? []) : 0;

    return {
      precioVenta: asNumber(form.precioVenta),
      montoInicialTotal: base.montoInicialTotal,
      totalCuotasPagadas,
      montoFinanciado: Math.max(0, base.montoFinanciado - totalCuotasPagadas),
      cantidadCuotas: base.cantidadCuotas,
      montoCuota: base.montoCuota,
    };
  }, [form, isEdit, sale]);

  const visibleStateOptions = useMemo(
    () => saleStateOptions.filter((item) => role === "admin" || item.value !== "CAIDA"),
    [role]
  );

  const canEditCurrentSale = useMemo(() => {
    if (!isEdit) return true;
    if (role === "admin") return true;
    if (role !== "asesor") return false;
    const ownerUsername = sale?.asesor?.username?.trim().toLowerCase();
    const currentUsername = loginUsername?.trim().toLowerCase();
    if (!ownerUsername || !currentUsername) return false;
    return ownerUsername === currentUsername;
  }, [isEdit, loginUsername, role, sale?.asesor?.username]);

  const updateClientField = (field: keyof SaleFormValues["cliente"], value: string) =>
    setForm((current) => ({
      ...current,
      cliente: {
        ...current.cliente,
        [field]: value,
      },
    }));

  const updateInitialPayment = (index: number, field: keyof InitialPaymentInput, value: string) => {
    setForm((current) => ({
      ...current,
      pagosIniciales: current.pagosIniciales.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, [field]: value } : payment
      ),
    }));
  };

  const findClientByDniForModal = async (dni: string) => findClientByDni(dni);

  const validateForm = () => {
    const loteCodigo = String(form.loteCodigo || "").trim();
    const fechaVenta = String(form.fechaVenta || "").trim();
    const precioVenta = Number.parseFloat(String(form.precioVenta || "").replace(",", "."));
    const nombreCliente = String(form.cliente.nombreCompleto || "").trim();
    const dniCliente = String(form.cliente.dni || "").trim();
    const dniCliente2 = String(form.cliente2?.dni || "").trim();
    const nombreCliente2 = String(form.cliente2?.nombreCompleto || "").trim();

    if (!loteCodigo) {
      return "Falta lote para la venta.";
    }

    if (!fechaVenta || !isValidDateInput(fechaVenta)) {
      return "Completa una fecha de venta valida.";
    }

    if (!nombreCliente || !dniCliente) {
      return "Completa nombre y DNI del cliente.";
    }

    if (!/^\d{8,12}$/.test(dniCliente)) {
      return "El DNI del cliente debe tener entre 8 y 12 digitos.";
    }

    if (form.cliente2 && (nombreCliente2 || dniCliente2) && (!nombreCliente2 || !dniCliente2)) {
      return "Completa nombre y DNI del segundo titular o dejalo vacio.";
    }

    if (dniCliente2 && !/^\d{8,12}$/.test(dniCliente2)) {
      return "El DNI del segundo titular debe tener entre 8 y 12 digitos.";
    }

    if (dniCliente2 && dniCliente2 === dniCliente) {
      return "El segundo titular debe tener DNI distinto al titular principal.";
    }

    if (!form.precioVenta.trim()) {
      return "Completa el precio de venta.";
    }

    if (!Number.isFinite(precioVenta) || precioVenta <= 0) {
      return "El precio de venta debe ser mayor que cero.";
    }

    if (form.tipoFinanciamiento !== "REDUCIR_CUOTA" && form.tipoFinanciamiento !== "REDUCIR_MESES") {
      return "Tipo de financiamiento invalido.";
    }

    if (form.tipoFinanciamiento === "REDUCIR_CUOTA" && !form.cantidadCuotas.trim()) {
      return "Completa la cantidad de cuotas.";
    }

    if (form.tipoFinanciamiento === "REDUCIR_CUOTA") {
      const cuotas = Number.parseInt(String(form.cantidadCuotas || "").trim(), 10);
      if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > 36) {
        return "La cantidad de cuotas debe estar entre 1 y 36.";
      }
    }

    if (form.tipoFinanciamiento === "REDUCIR_MESES" && !form.montoCuota.trim()) {
      return "Completa el monto de cuota.";
    }

    if (form.tipoFinanciamiento === "REDUCIR_MESES") {
      const montoCuota = Number.parseFloat(String(form.montoCuota || "").replace(",", "."));
      if (!Number.isFinite(montoCuota) || montoCuota <= 0) {
        return "El monto por cuota debe ser mayor que cero.";
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    if (isEdit && !canEditCurrentSale) {
      setError("No puedes editar una venta asignada a otro asesor.");
      return;
    }

    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice("");

    try {
      if (isEdit && saleId) {
        const payload: SalePatchPayload = {
          fechaVenta: form.fechaVenta,
          precioVenta: form.precioVenta,
          estadoVenta: form.estadoVenta,
          tipoFinanciamiento: form.tipoFinanciamiento,
          cantidadCuotas: form.cantidadCuotas,
          montoCuota: form.montoCuota,
          observacion: form.observacion,
          cliente: form.cliente,
          cliente2: form.cliente2,
        };
        const updated = await updateSale(saleId, payload);
        setSale(updated);
        setNotice("Venta actualizada.");
        return;
      }

      const created = await createSale(form);
      navigate(`/ventas/${created.id}`, { replace: true });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la venta.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayment = async (values: SalePaymentFormValues) => {
    if (!saleId) return;
    if (!canEditCurrentSale) {
      setError("No puedes editar pagos de una venta asignada a otro asesor.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = editingPayment
        ? await updateSalePayment(saleId, editingPayment.id, values)
        : await addSalePayment(saleId, values);
      setSale(updated);
      setForm((current) => ({
        ...current,
        estadoVenta: updated.estadoVenta,
      }));
      setNotice(editingPayment ? "Pago actualizado." : "Pago registrado.");
      setPaymentModalOpen(false);
      setEditingPayment(null);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "No se pudo guardar el pago.");
      throw paymentError;
    } finally {
      setSaving(false);
    }
  };

  const openClientModal = (target: "principal" | "secundario") => {
    if (!canEditCurrentSale) return;
    setClientModalTarget(target);
    setClientModalOpen(true);
  };

  const handleSaveClientModal = (client: SaleFormValues["cliente"]) => {
    if (!canEditCurrentSale) {
      setError("No puedes editar titulares de una venta asignada a otro asesor.");
      return;
    }
    setForm((current) => {
      if (clientModalTarget === "secundario") {
        return {
          ...current,
          cliente2: { ...client },
        };
      }
      return {
        ...current,
        cliente: { ...client },
      };
    });
    setClientModalOpen(false);
    setNotice(clientModalTarget === "secundario" ? "Segundo titular actualizado." : "Titular principal actualizado.");
  };

  const handleRemoveClient2 = () => {
    if (!canEditCurrentSale) return;
    setForm((current) => ({ ...current, cliente2: null }));
    setNotice("Segundo titular eliminado de la venta.");
  };

  const handlePrint = (kind: "separacion" | "contrato") => {
    if (!sale) return;
    printSaleDocument({
      kind,
      sale,
      cliente: form.cliente,
      cliente2: form.cliente2,
    });
  };

  const handleOpenCreatePayment = () => {
    if (!canEditCurrentSale) return;
    setEditingPayment(null);
    setPaymentModalOpen(true);
  };

  const handleEditPayment = (payment: SalePayment) => {
    if (!canEditCurrentSale) return;
    setEditingPayment(payment);
    setPaymentModalOpen(true);
    setNotice("");
  };

  const renderEditView = sale ? (
    <>
      <header className="sales-form-page__head">
        <div className="sales-form-page__heading">
          <div className="sales-form-page__title-row">
            <h2>Modificar Venta</h2>
            <span className="sales-pill is-info">{form.estadoVenta.replaceAll("_", " ")}</span>
            {selectedLote ? (
              <div className="sales-form-page__lote-row">
                <span className="sales-form-page__lote-pill sales-form-page__lote-pill--mz">MZ {selectedLote.mz}</span>
                <span className="sales-form-page__lote-pill">Lote {selectedLote.lote}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="sales-form-page__summary">
          <button
            type="button"
            className="btn ghost sales-header-action sales-header-action--back"
            onClick={() => navigate("/ventas")}
          >
            <IconArrowLeft />
            <span className="sales-header-action__label">Volver</span>
          </button>
          <button type="button" className="btn ghost sales-header-action" onClick={() => handlePrint("separacion")}>
            <IconPrinter />
            <span className="sales-header-action__label">Imprimir separacion</span>
          </button>
          <button type="button" className="btn ghost sales-header-action" onClick={() => handlePrint("contrato")}>
            <IconPrinter />
            <span className="sales-header-action__label">Imprimir contrato</span>
          </button>
          <button
            type="button"
            className="btn sales-header-action sales-header-action--save"
            onClick={handleSubmit}
            disabled={saving || !canEditCurrentSale}
          >
            <IconSave />
            <span className="sales-header-action__label">{saving ? "Guardando..." : "Guardar cambios"}</span>
          </button>
        </div>
      </header>

      {!canEditCurrentSale ? (
        <p className="admin-notice">Modo solo lectura: esta venta pertenece a otro asesor.</p>
      ) : null}

      <SaleEditableCard
        form={form}
        role={role}
        disabled={!canEditCurrentSale}
        preview={preview}
        onFormChange={(updater) => setForm((current) => updater(current))}
      />

      <section className="sales-detail-grid">
        <SaleClientCard
          cliente={form.cliente}
          cliente2={form.cliente2}
          disabled={!canEditCurrentSale}
          onEditCliente={() => openClientModal("principal")}
          onAddCliente2={() => openClientModal("secundario")}
          onEditCliente2={() => openClientModal("secundario")}
          onRemoveCliente2={handleRemoveClient2}
        />
        <SalePaymentsCard
          sale={sale}
          disabled={!canEditCurrentSale}
          loading={saving}
          onAddPayment={handleOpenCreatePayment}
          onEditPayment={handleEditPayment}
        />
      </section>
    </>
  ) : null;

  const renderCreateView = (
    <>
      <header className="sales-form-page__head">
        <div>
          <h2>Registrar venta</h2>
          <p>{selectedLote ? `Lote ${selectedLote.mz} - ${selectedLote.lote}` : "Completa el formulario de la venta."}</p>
        </div>
        {selectedLote ? (
          <div className="sales-form-page__summary">
            <span className="admin-badge admin-badge--asesor">{selectedLote.mz}</span>
            <span className="admin-badge admin-badge--total">Lote {selectedLote.lote}</span>
          </div>
        ) : null}
      </header>

      <div className="sales-form-grid">
        <div className="sales-form-card">
          <h3>Venta</h3>
          <div className="sales-form-fields">
            <label>
              Fecha de venta
              <AdminTextInput
                type="date"
                value={form.fechaVenta}
                onChange={(event) => setForm((current) => ({ ...current, fechaVenta: event.target.value }))}
              />
            </label>
            <label>
              Precio de venta
              <AdminTextInput
                type="number"
                step="0.01"
                value={form.precioVenta}
                onChange={(event) => setForm((current) => ({ ...current, precioVenta: event.target.value }))}
              />
            </label>
            <label className="sales-form-fields__full">
              Estado de venta
              <select
                value={form.estadoVenta}
                onChange={(event) => setForm((current) => ({ ...current, estadoVenta: event.target.value as SaleState }))}
              >
                {visibleStateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sales-form-fields__full">
              Tipo de financiamiento
              <select
                value={form.tipoFinanciamiento}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tipoFinanciamiento: event.target.value as SaleFormValues["tipoFinanciamiento"],
                  }))
                }
              >
                {financingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {form.tipoFinanciamiento === "REDUCIR_CUOTA" ? (
              <label>
                Cantidad de cuotas
                <AdminTextInput
                  type="number"
                  min={1}
                  max={36}
                  value={form.cantidadCuotas}
                  onChange={(event) => setForm((current) => ({ ...current, cantidadCuotas: event.target.value }))}
                />
              </label>
            ) : (
              <label>
                Monto por cuota
                <AdminTextInput
                  type="number"
                  step="0.01"
                  value={form.montoCuota}
                  onChange={(event) => setForm((current) => ({ ...current, montoCuota: event.target.value }))}
                />
              </label>
            )}
            <label className="sales-form-fields__full">
              Observacion
              <textarea
                value={form.observacion}
                onChange={(event) => setForm((current) => ({ ...current, observacion: event.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="sales-form-card">
          <h3>Cliente titular</h3>
          <div className="sales-form-fields">
            <label className="sales-form-fields__dni">
              DNI
              <div className="sales-inline-action">
                <AdminTextInput value={form.cliente.dni} onChange={(event) => updateClientField("dni", event.target.value)} />
                <button
                  type="button"
                  className="btn ghost"
                  onClick={async () => {
                    try {
                      const found = await findClientByDni(form.cliente.dni.trim());
                      if (!found) {
                        setNotice("No existe un cliente previo con ese DNI.");
                        return;
                      }
                      setForm((current) => ({ ...current, cliente: found }));
                      setNotice("Cliente existente cargado por DNI.");
                    } catch (searchError) {
                      setError(searchError instanceof Error ? searchError.message : "No se pudo buscar cliente.");
                    }
                  }}
                >
                  Buscar DNI
                </button>
              </div>
            </label>
            <label className="sales-form-fields__full">
              Nombre completo
              <AdminTextInput
                value={form.cliente.nombreCompleto}
                onChange={(event) => updateClientField("nombreCompleto", event.target.value)}
              />
            </label>
            <label>
              Celular
              <AdminTextInput value={form.cliente.celular} onChange={(event) => updateClientField("celular", event.target.value)} />
            </label>
            <label>
              Ocupacion
              <AdminTextInput value={form.cliente.ocupacion} onChange={(event) => updateClientField("ocupacion", event.target.value)} />
            </label>
            <label className="sales-form-fields__full">
              Direccion
              <AdminTextInput
                value={form.cliente.direccion}
                onChange={(event) => updateClientField("direccion", event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="sales-form-card">
          <h3>Pagos iniciales</h3>
          <div className="sales-form-fields sales-form-fields--payments">
            {form.pagosIniciales.map((payment, index) => (
              <div key={payment.tipoPago} className="sales-payment-inline">
                <strong>{payment.tipoPago}</strong>
                <AdminTextInput
                  type="date"
                  value={payment.fechaPago}
                  onChange={(event) => updateInitialPayment(index, "fechaPago", event.target.value)}
                />
                <AdminTextInput
                  type="number"
                  step="0.01"
                  placeholder="Monto"
                  value={payment.monto}
                  onChange={(event) => updateInitialPayment(index, "monto", event.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="sales-form-card sales-form-card--summary">
          <h3>Resumen financiero</h3>
          <div className="sales-kpi-grid">
            <article>
              <span>Inicial total</span>
              <strong>{formatMoney(preview.montoInicialTotal)}</strong>
            </article>
            <article>
              <span>Monto financiado</span>
              <strong>{formatMoney(preview.montoFinanciado)}</strong>
            </article>
            <article>
              <span>Cuotas</span>
              <strong>{preview.cantidadCuotas}</strong>
            </article>
            <article>
              <span>Cuota base</span>
              <strong>{formatMoney(preview.montoCuota)}</strong>
            </article>
          </div>
        </div>
      </div>

      <div className="sales-form-actions">
        <button type="button" className="btn ghost" onClick={() => navigate("/ventas")}>
          Volver
        </button>
        <button type="button" className="btn" onClick={handleSubmit} disabled={saving}>
          {saving ? "Guardando..." : "Crear venta"}
        </button>
      </div>
    </>
  );

  const actions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to="/">
        <IconMap />
        Mapa
      </Link>
      <Link className="btn ghost topbar-action" to="/lotes">
        <IconLotes />
        Lotes
      </Link>
      <Link className="btn ghost topbar-action" to="/ventas">
        Ventas
      </Link>
    </nav>
  );

  return (
    <AppShell title={isEdit ? "Detalle de Venta" : "Nueva Venta"} actions={actions} contentClassName="main--admin">
      <section className="sales-form-page">
        {loading ? <p className="muted">Cargando venta...</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
        {notice ? <p className="admin-notice">{notice}</p> : null}

        {!loading ? (isEdit ? renderEditView : renderCreateView) : null}

        {isEdit ? (
          <>
            <SaleClientModal
              open={clientModalOpen}
              title={clientModalTarget === "principal" ? "Editar titular principal" : "Agregar / editar segundo titular"}
              saving={saving}
              initialValue={clientModalTarget === "principal" ? form.cliente : form.cliente2}
              onClose={() => setClientModalOpen(false)}
              onSave={handleSaveClientModal}
              onFindByDni={findClientByDniForModal}
            />
            {paymentModalOpen ? (
              <SalePaymentModal
                key={editingPayment ? `edit-${editingPayment.id}` : "create-payment"}
                open={paymentModalOpen}
                saving={saving}
                initialValue={editingPayment}
                onClose={() => {
                  setPaymentModalOpen(false);
                  setEditingPayment(null);
                }}
                onSave={handleSavePayment}
              />
            ) : null}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
