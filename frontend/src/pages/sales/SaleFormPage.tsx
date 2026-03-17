import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminSegmentedControl from "../../components/admin/AdminSegmentedControl";
import AdminTextInput from "../../components/admin/AdminTextInput";
import type { Lote } from "../../domain/types";
import type {
  InitialPaymentInput,
  SaleFormValues,
  SalePatchPayload,
  SalePaymentFormValues,
  SaleRecord,
  SaleState,
} from "../../domain/ventas";
import { loadLotesFromApi } from "../../services/lotes";
import { addSalePayment, createSale, findClientByDni, getSaleById, updateSale } from "../../services/ventas";

const todayInput = () => new Date().toISOString().slice(0, 10);

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
  pagosIniciales: [defaultInitialPayment("SEPARACION"), defaultInitialPayment("INICIAL")],
});

const emptyPaymentForm: SalePaymentFormValues = {
  fechaPago: todayInput(),
  tipoPago: "CUOTA",
  monto: "",
  nroCuota: "",
  observacion: "",
};

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

const paymentTypeOptions = [
  { value: "SEPARACION", label: "Separacion" },
  { value: "INICIAL", label: "Inicial" },
  { value: "CUOTA", label: "Cuota" },
  { value: "OTRO", label: "Otro" },
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

const computeInitialTotal = (payments: InitialPaymentInput[]) =>
  payments.reduce((acc, payment) => acc + asNumber(payment.monto), 0);

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

export default function SaleFormPage() {
  const { id: saleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isEdit = Boolean(saleId);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [form, setForm] = useState<SaleFormValues>(() =>
    createEmptySaleForm("", searchParams.get("target") === "VENDIDO" ? "INICIAL_PAGADA" : "SEPARADA")
  );
  const [paymentForm, setPaymentForm] = useState<SalePaymentFormValues>(emptyPaymentForm);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [dniSearching, setDniSearching] = useState(false);

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

  const preview = useMemo(
    () =>
      computePreview({
        precioVenta: form.precioVenta,
        tipoFinanciamiento: form.tipoFinanciamiento,
        cantidadCuotas: form.cantidadCuotas,
        montoCuota: form.montoCuota,
        pagosIniciales: isEdit ? undefined : form.pagosIniciales,
        montoInicialTotal: isEdit ? sale?.montoInicialTotal ?? 0 : undefined,
      }),
    [form, isEdit, sale]
  );

  const visibleStateOptions = useMemo(
    () => saleStateOptions.filter((item) => role === "admin" || item.value !== "CAIDA"),
    [role]
  );

  const updateClientField = (field: keyof SaleFormValues["cliente"], value: string) => {
    setForm((current) => ({
      ...current,
      cliente: {
        ...current.cliente,
        [field]: value,
      },
    }));
  };

  const updateInitialPayment = (index: number, field: keyof InitialPaymentInput, value: string) => {
    setForm((current) => ({
      ...current,
      pagosIniciales: current.pagosIniciales.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, [field]: value } : payment
      ),
    }));
  };

  const handleFindClient = async () => {
    if (!form.cliente.dni.trim()) return;

    try {
      setDniSearching(true);
      const found = await findClientByDni(form.cliente.dni.trim());
      if (found) {
        setForm((current) => ({
          ...current,
          cliente: found,
        }));
        setNotice("Cliente existente cargado por DNI.");
      } else {
        setNotice("No existe un cliente previo con ese DNI.");
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "No se pudo buscar cliente.");
    } finally {
      setDniSearching(false);
    }
  };

  const validateForm = () => {
    if (!form.loteCodigo) {
      return "Falta lote para la venta.";
    }
    if (!form.cliente.nombreCompleto.trim() || !form.cliente.dni.trim()) {
      return "Completa nombre y DNI del cliente.";
    }
    if (!form.precioVenta.trim()) {
      return "Completa el precio de venta.";
    }
    if (form.tipoFinanciamiento === "REDUCIR_CUOTA" && !form.cantidadCuotas.trim()) {
      return "Completa la cantidad de cuotas.";
    }
    if (form.tipoFinanciamiento === "REDUCIR_MESES" && !form.montoCuota.trim()) {
      return "Completa el monto de cuota.";
    }
    return null;
  };

  const handleSubmit = async () => {
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

  const handleAddPayment = async () => {
    if (!saleId) return;
    if (!paymentForm.monto.trim()) {
      setError("Completa el monto del pago.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await addSalePayment(saleId, paymentForm);
      setSale(updated);
      setPaymentForm(emptyPaymentForm);
      setNotice("Pago registrado.");
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "No se pudo registrar el pago.");
    } finally {
      setSaving(false);
    }
  };

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

        {!loading ? (
          <>
            <header className="sales-form-page__head">
              <div>
                <h2>{isEdit ? "Venta registrada" : "Registrar venta"}</h2>
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
                    <AdminTextInput type="date" value={form.fechaVenta} onChange={(event) => setForm((current) => ({ ...current, fechaVenta: event.target.value }))} />
                  </label>
                  <label>
                    Precio de venta
                    <AdminTextInput type="number" step="0.01" value={form.precioVenta} onChange={(event) => setForm((current) => ({ ...current, precioVenta: event.target.value }))} />
                  </label>
                  <label className="sales-form-fields__full">
                    Estado de venta
                    <AdminSegmentedControl
                      value={form.estadoVenta}
                      options={visibleStateOptions}
                      onChange={(value) => setForm((current) => ({ ...current, estadoVenta: value as SaleState }))}
                    />
                  </label>
                  <label className="sales-form-fields__full">
                    Tipo de financiamiento
                    <AdminSegmentedControl
                      value={form.tipoFinanciamiento}
                      options={financingOptions}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          tipoFinanciamiento: value as SaleFormValues["tipoFinanciamiento"],
                        }))
                      }
                    />
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
                    <textarea value={form.observacion} onChange={(event) => setForm((current) => ({ ...current, observacion: event.target.value }))} />
                  </label>
                </div>
              </div>

              <div className="sales-form-card">
                <h3>Cliente</h3>
                <div className="sales-form-fields">
                  <label className="sales-form-fields__dni">
                    DNI
                    <div className="sales-inline-action">
                      <AdminTextInput value={form.cliente.dni} onChange={(event) => updateClientField("dni", event.target.value)} />
                      <button type="button" className="btn ghost" onClick={handleFindClient} disabled={dniSearching}>
                        {dniSearching ? "Buscando..." : "Buscar DNI"}
                      </button>
                    </div>
                  </label>
                  <label className="sales-form-fields__full">
                    Nombre completo
                    <AdminTextInput value={form.cliente.nombreCompleto} onChange={(event) => updateClientField("nombreCompleto", event.target.value)} />
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
                    <AdminTextInput value={form.cliente.direccion} onChange={(event) => updateClientField("direccion", event.target.value)} />
                  </label>
                </div>
              </div>

              {!isEdit ? (
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
              ) : null}

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
                {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear venta"}
              </button>
            </div>

            {isEdit && sale ? (
              <section className="sales-payments-card">
                <button type="button" className="sales-collapse-toggle" onClick={() => setPaymentsOpen((current) => !current)}>
                  Registrar pagos
                  <span>{paymentsOpen ? "Ocultar" : "Mostrar"}</span>
                </button>
                {paymentsOpen ? (
                  <div className="sales-payments-card__body">
                    <div className="sales-payment-form">
                      <label>
                        Fecha
                        <AdminTextInput type="date" value={paymentForm.fechaPago} onChange={(event) => setPaymentForm((current) => ({ ...current, fechaPago: event.target.value }))} />
                      </label>
                      <label>
                        Tipo
                        <select value={paymentForm.tipoPago} onChange={(event) => setPaymentForm((current) => ({ ...current, tipoPago: event.target.value as SalePaymentFormValues["tipoPago"] }))}>
                          {paymentTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Monto
                        <AdminTextInput type="number" step="0.01" value={paymentForm.monto} onChange={(event) => setPaymentForm((current) => ({ ...current, monto: event.target.value }))} />
                      </label>
                      <label>
                        Nro cuota
                        <AdminTextInput value={paymentForm.nroCuota} onChange={(event) => setPaymentForm((current) => ({ ...current, nroCuota: event.target.value }))} />
                      </label>
                      <label className="sales-payment-form__full">
                        Observacion
                        <AdminTextInput value={paymentForm.observacion} onChange={(event) => setPaymentForm((current) => ({ ...current, observacion: event.target.value }))} />
                      </label>
                      <div className="sales-payment-form__actions">
                        <button type="button" className="btn" onClick={handleAddPayment} disabled={saving}>
                          Registrar pago
                        </button>
                      </div>
                    </div>

                    <div className="sales-payments-list">
                      <h4>Pagos registrados</h4>
                      <table className="sales-table sales-table--compact">
                        <thead>
                          <tr>
                            <th>FECHA</th>
                            <th>TIPO</th>
                            <th>MONTO</th>
                            <th>CUOTA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sale.pagos.map((payment) => (
                            <tr key={payment.id}>
                              <td>{new Date(payment.fechaPago).toLocaleDateString("es-PE")}</td>
                              <td>{payment.tipoPago}</td>
                              <td>{formatMoney(payment.monto)}</td>
                              <td>{payment.nroCuota ?? "-"}</td>
                            </tr>
                          ))}
                          {sale.pagos.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="muted" style={{ textAlign: "center" }}>
                                Aun no hay pagos registrados.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
