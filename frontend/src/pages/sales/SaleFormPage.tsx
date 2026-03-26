import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { useAuth } from "../../app/AuthContext";
import AdminTextInput from "../../components/admin/AdminTextInput";
import SaleClientCard from "../../components/sales/SaleClientCard";
import SaleClientModal from "../../components/sales/SaleClientModal";
import SaleEditableCard, { SaleFinancingCard } from "../../components/sales/SaleEditableCard";
import SalePaymentModal from "../../components/sales/SalePaymentModal";
import SalePaymentsCard from "../../components/sales/SalePaymentsCard";
import SaleSettingsModal from "../../components/sales/SaleSettingsModal";
import { printSaleDocument } from "../../components/sales/salePrint";
import { readCachedCotizadorQuote } from "../../domain/cotizador";
import type { Lote } from "../../domain/types";
import type { AdminUser } from "../../domain/adminUsers";
import type {
  InitialPaymentInput,
  SalePayment,
  SaleFormValues,
  SalePatchPayload,
  SalePaymentFormValues,
  SaleRecord,
  SaleState,
} from "../../domain/ventas";
import { listAdminUsers } from "../../services/adminUsers";
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
  asesorId: null,
  fechaVenta: todayInput(),
  fechaPagoPactada: "",
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

const asNumber = (value: string) => {
  const parsed = Number.parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const isValidDateInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
const normalizeText = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const advisorLabel = (user: AdminUser) => {
  const fullName = `${user.nombres ?? ""} ${user.apellidos ?? ""}`.trim();
  return fullName || user.username;
};

const computeInitialTotal = (payments: InitialPaymentInput[]) =>
  payments.reduce((acc, payment) => acc + asNumber(payment.monto), 0);

const filterFilledInitialPayments = (payments: InitialPaymentInput[]) =>
  payments.filter((payment) => String(payment.monto || "").trim() !== "");

const computePaidInstallments = (payments: SalePayment[]) =>
  payments.filter((payment) => payment.tipoPago === "CUOTA").reduce((acc, payment) => acc + Number(payment.monto || 0), 0);

const getSuggestedNextPaymentType = (payments: SalePayment[]) => {
  const hasSeparacion = payments.some((payment) => payment.tipoPago === "SEPARACION");
  if (!hasSeparacion) return "SEPARACION" as const;
  const hasInicial = payments.some((payment) => payment.tipoPago === "INICIAL");
  if (!hasInicial) return "INICIAL" as const;
  return "CUOTA" as const;
};

const getSuggestedNextInstallmentNumber = (payments: SalePayment[]) => {
  const paidInstallmentNumbers = payments
    .filter((payment) => payment.tipoPago === "CUOTA" && Number.isFinite(Number(payment.nroCuota)))
    .map((payment) => Number(payment.nroCuota ?? 0))
    .filter((value) => value > 0);

  return String((paidInstallmentNumbers.length ? Math.max(...paidInstallmentNumbers) : 0) + 1);
};

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

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path
      d="M12 3.5 13.8 5l2.4-.2 1 2.2 2 1.2-.5 2.3 1.3 2-1.3 2 .5 2.3-2 1.2-1 2.2-2.4-.2L12 20.5 10.2 19l-2.4.2-1-2.2-2-1.2.5-2.3-1.3-2 1.3-2-.5-2.3 2-1.2 1-2.2 2.4.2L12 3.5Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SaleFormPage() {
  const { id: saleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role, loginUsername, loginPin } = useAuth();
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
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [advisorOptions, setAdvisorOptions] = useState<{ id: string; name: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/ventas");
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        if (isEdit && saleId) {
          const detail = await getSaleById(saleId);
          setSale(detail);
          setForm({
            loteCodigo: detail.lote?.codigo ?? "",
            asesorId: detail.asesor?.id ?? null,
            fechaVenta: detail.fechaVenta.slice(0, 10),
            fechaPagoPactada: detail.fechaPagoPactada?.slice(0, 10) ?? "",
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
        const cachedQuote = loteCode ? readCachedCotizadorQuote(loteCode) : null;
        const cachedCuotas = Math.min(Math.max(Math.round(cachedQuote?.cuotas ?? 24), 1), 36);
        const cachedInicial = Math.max(Number(cachedQuote?.inicialMonto ?? 0), 0);
        const cachedPrecioVenta = Math.max(Number(cachedQuote?.precio ?? lote?.price ?? 0), 0);
        const cachedMontoCuota =
          cachedCuotas > 0 ? Number((Math.max(cachedPrecioVenta - cachedInicial, 0) / cachedCuotas).toFixed(2)) : 0;
        setSelectedLote(lote);
        setForm((current) => ({
          ...current,
          loteCodigo: loteCode,
          precioVenta: String(cachedPrecioVenta || 0),
          cantidadCuotas: String(cachedCuotas),
          montoCuota: String(cachedMontoCuota),
          pagosIniciales: current.pagosIniciales.map((payment) =>
            payment.tipoPago === "INICIAL"
              ? {
                  ...payment,
                  monto: cachedInicial > 0 ? String(cachedInicial) : payment.monto,
                }
              : payment
          ),
        }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la venta.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [isEdit, saleId, searchParams]);

  useEffect(() => {
    if (!loginUsername || !loginPin) return;

    const run = async () => {
      try {
        const payload = await listAdminUsers({ username: loginUsername, pin: loginPin });
        const users = payload.users
          .map((user) => ({
            id: user.id,
            username: user.username,
            rol: user.rol,
            name:
              user.estado === "INACTIVO" ? `${advisorLabel(user)} (${user.rol.toLowerCase()} inactivo)` : advisorLabel(user),
          }))
          .sort((left, right) => normalizeText(left.name).localeCompare(normalizeText(right.name), "es"));

        const current = users.find((user) => normalizeText(user.username) === normalizeText(loginUsername));
        setCurrentUserId(current?.id ?? null);

        if (role === "admin") {
          setAdvisorOptions(users.map(({ id, name, rol }) => ({ id, name: `${name} [${rol}]` })));
          setForm((currentForm) => {
            if (isEdit || currentForm.asesorId || !current?.id) return currentForm;
            return { ...currentForm, asesorId: current.id };
          });
          return;
        }

        setAdvisorOptions([]);
      } catch {
        setNotice("No se pudo cargar la lista de usuarios para asesor.");
      }
    };

    void run();
  }, [isEdit, loginPin, loginUsername, role]);

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

  const canEditCurrentSale = useMemo(() => {
    if (!isEdit) return true;
    if (role === "admin") return true;
    if (role !== "asesor") return false;
    const ownerUsername = sale?.asesor?.username?.trim().toLowerCase();
    const currentUsername = loginUsername?.trim().toLowerCase();
    if (!ownerUsername || !currentUsername) return false;
    return ownerUsername === currentUsername;
  }, [isEdit, loginUsername, role, sale?.asesor?.username]);

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
    const fechaVenta = String(form.fechaVenta || "").trim();
    const precioVentaRaw = String(form.precioVenta || "").trim();
    const precioVenta = Number.parseFloat(precioVentaRaw.replace(",", "."));
    const dniCliente = String(form.cliente.dni || "").trim();
    const dniCliente2 = String(form.cliente2?.dni || "").trim();

    if (!fechaVenta || !isValidDateInput(fechaVenta)) {
      return "Completa una fecha de venta valida.";
    }

    if (form.fechaPagoPactada.trim() && !isValidDateInput(form.fechaPagoPactada)) {
      return "Completa una fecha de pago pactada valida.";
    }

    if (dniCliente && !/^\d{8,12}$/.test(dniCliente)) {
      return "El DNI del cliente debe tener entre 8 y 12 digitos.";
    }

    if (dniCliente2 && !/^\d{8,12}$/.test(dniCliente2)) {
      return "El DNI del segundo titular debe tener entre 8 y 12 digitos.";
    }

    if (dniCliente2 && dniCliente2 === dniCliente) {
      return "El segundo titular debe tener DNI distinto al titular principal.";
    }

    if (precioVentaRaw && (!Number.isFinite(precioVenta) || precioVenta < 0)) {
      return "El precio de venta debe ser cero o mayor.";
    }

    if (form.tipoFinanciamiento !== "REDUCIR_CUOTA" && form.tipoFinanciamiento !== "REDUCIR_MESES") {
      return "Tipo de financiamiento invalido.";
    }

    if (form.tipoFinanciamiento === "REDUCIR_CUOTA" && form.cantidadCuotas.trim()) {
      const cuotas = Number.parseInt(String(form.cantidadCuotas || "").trim(), 10);
      if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > 36) {
        return "La cantidad de cuotas debe estar entre 1 y 36.";
      }
    }

    if (form.tipoFinanciamiento === "REDUCIR_MESES" && form.montoCuota.trim()) {
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
          ...(role === "admin" ? { asesorId: form.asesorId ?? null } : {}),
          fechaVenta: form.fechaVenta,
          fechaPagoPactada: form.fechaPagoPactada || null,
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

      const created = await createSale({
        ...form,
        pagosIniciales: filterFilledInitialPayments(form.pagosIniciales),
        asesorId: role === "admin" ? form.asesorId ?? currentUserId ?? null : currentUserId ?? null,
      });
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

  const selectedAdvisorLabel =
    advisorOptions.find((advisor) => advisor.id === form.asesorId)?.name ??
    (role === "asesor" ? loginUsername ?? "Asesor actual" : "Sin asesor");
  const suggestedNextPaymentType = sale ? getSuggestedNextPaymentType(sale.pagos) : "CUOTA";
  const suggestedNextInstallmentNumber = sale ? getSuggestedNextInstallmentNumber(sale.pagos) : "1";
  const suggestedDefaultPaymentAmount =
    suggestedNextPaymentType === "CUOTA" ? String(Number(sale?.montoCuota ?? 0).toFixed(2)) : "";

  const renderAdvisorCard = (disabled: boolean) => (
    <article className="sales-form-card sales-advisor-card">
      <header className="sales-client-card__header">
        <h3>Asesor asignado</h3>
      </header>
      <div className="sales-form-fields">
        {role === "admin" ? (
          <label className="sales-form-fields__full">
            Usuario responsable
            <select
              value={form.asesorId ?? ""}
              disabled={disabled}
              onChange={(event) => setForm((current) => ({ ...current, asesorId: event.target.value || null }))}
            >
              <option value="">Sin asesor</option>
              {advisorOptions.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {advisor.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="sales-form-fields__full">
            Usuario responsable
            <AdminTextInput value={selectedAdvisorLabel} disabled />
          </label>
        )}
      </div>
    </article>
  );

  const renderEditView = sale ? (
    <>
      <header className="sales-form-page__head">
        <div className="sales-form-page__heading">
          <div className="sales-form-page__title-row">
            <button
              type="button"
              className="btn ghost sales-header-action sales-header-action--back sales-header-action--title-back"
              onClick={goBack}
            >
              <IconArrowLeft />
              <span className="sales-header-action__label">Volver</span>
            </button>
            <h2>Modificar Venta</h2>
          </div>
        </div>
        <div className="sales-form-page__summary">
          <details className="sales-header-print-menu sales-header-print-menu--compact">
            <summary className="btn ghost sales-header-action sales-header-action--print-menu">
              <IconPrinter />
              <span className="sales-header-action__label">Imprimir</span>
              <IconChevronDown />
            </summary>
            <div className="sales-header-print-menu__dropdown">
              <button type="button" className="btn ghost sales-header-print-menu__item" onClick={() => handlePrint("separacion")}>
                <IconPrinter />
                <span>Separacion</span>
              </button>
              <button type="button" className="btn ghost sales-header-print-menu__item" onClick={() => handlePrint("contrato")}>
                <IconPrinter />
                <span>Contrato</span>
              </button>
            </div>
          </details>
          <button type="button" className="btn ghost sales-header-action sales-header-action--print-desktop" onClick={() => handlePrint("separacion")}>
            <IconPrinter />
            <span className="sales-header-action__label">Imprimir separacion</span>
          </button>
          <button
            type="button"
            className="btn ghost sales-header-action sales-header-action--icon-only"
            onClick={() => setSettingsModalOpen(true)}
            title="Ajustes"
            aria-label="Ajustes"
          >
            <IconSettings />
            <span className="sales-header-action__label">Ajustes</span>
          </button>
          <button type="button" className="btn ghost sales-header-action sales-header-action--print-desktop" onClick={() => handlePrint("contrato")}>
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

      <section className="sales-expediente-layout">
        <div className="sales-expediente-layout__main">
          <SaleEditableCard
            form={form}
            role={role}
            disabled={!canEditCurrentSale}
            preview={preview}
            lote={
              sale.lote
                ? {
                    codigo: sale.lote.codigo,
                    mz: sale.lote.mz,
                    lote: sale.lote.lote,
                    areaM2: sale.lote.areaM2,
                    estadoComercial: sale.lote.estadoComercial,
                    precioReferencial: sale.lote.precioReferencial,
                  }
                : selectedLote
                  ? {
                      codigo: selectedLote.id,
                      mz: selectedLote.mz,
                      lote: selectedLote.lote,
                      areaM2: selectedLote.areaM2,
                      estadoComercial: selectedLote.condicion,
                      precioReferencial: selectedLote.price,
                    }
                  : null
            }
            onFormChange={(updater) => setForm((current) => updater(current))}
          />
        </div>

        <div className="sales-expediente-layout__side">
          <SaleClientCard
            title="Datos del cliente"
            cliente={form.cliente}
            cliente2={form.cliente2}
            disabled={!canEditCurrentSale}
            onEditCliente={() => openClientModal("principal")}
            onAddCliente2={() => openClientModal("secundario")}
            onEditCliente2={() => openClientModal("secundario")}
            onRemoveCliente2={handleRemoveClient2}
          />
          <SaleFinancingCard
            form={form}
            role={role}
            disabled={!canEditCurrentSale}
            onFormChange={(updater) => setForm((current) => updater(current))}
          />
          <SalePaymentsCard
            sale={sale}
            disabled={!canEditCurrentSale}
            loading={saving}
            onAddPayment={handleOpenCreatePayment}
            onEditPayment={handleEditPayment}
          />
        </div>
      </section>
    </>
  ) : null;

  const renderCreateView = (
    <>
      <header className="sales-form-page__head">
        <div className="sales-form-page__heading">
          <div className="sales-form-page__title-row">
            <button
              type="button"
              className="btn ghost sales-header-action sales-header-action--back sales-header-action--title-back"
              onClick={goBack}
            >
              <IconArrowLeft />
              <span className="sales-header-action__label">Volver</span>
            </button>
            <h2>Nueva venta - SEPARACION / INICIAL</h2>
          </div>
        </div>
        <div className="sales-form-page__summary">
          <button type="button" className="btn sales-header-action sales-header-action--save" onClick={handleSubmit} disabled={saving}>
            <IconSave />
            <span className="sales-header-action__label">{saving ? "Guardando..." : "Crear venta"}</span>
          </button>
        </div>
      </header>

      <section className="sales-expediente-layout">
        <div className="sales-expediente-layout__main">
          <SaleEditableCard
            form={form}
            role={role}
            preview={preview}
            lote={
              selectedLote
                ? {
                    codigo: selectedLote.id,
                    mz: selectedLote.mz,
                    lote: selectedLote.lote,
                    areaM2: selectedLote.areaM2,
                    estadoComercial: selectedLote.condicion,
                    precioReferencial: selectedLote.price,
                  }
                : null
            }
            onFormChange={(updater) => setForm((current) => updater(current))}
          />
          {renderAdvisorCard(false)}
        </div>

        <div className="sales-expediente-layout__side">
          <SaleClientCard
            title="Datos del cliente"
            cliente={form.cliente}
            cliente2={form.cliente2}
            onEditCliente={() => openClientModal("principal")}
            onAddCliente2={() => openClientModal("secundario")}
            onEditCliente2={() => openClientModal("secundario")}
            onRemoveCliente2={handleRemoveClient2}
          />
          <SaleFinancingCard
            form={form}
            role={role}
            onFormChange={(updater) => setForm((current) => updater(current))}
          />
          <article className="sales-form-card">
            <header className="sales-client-card__header">
              <h3>Pagos iniciales</h3>
            </header>
            <div className="sales-form-fields sales-form-fields--payments">
              {form.pagosIniciales.map((payment, index) => (
                <div key={payment.tipoPago} className="sales-payment-inline">
                  <strong>{payment.tipoPago}</strong>
                  <div className="sales-payment-inline__date">
                    <AdminTextInput
                      type="date"
                      value={payment.fechaPago}
                      onChange={(event) => updateInitialPayment(index, "fechaPago", event.target.value)}
                    />
                  </div>
                  <div className="sales-payment-inline__amount">
                    <AdminTextInput
                      type="number"
                      step="0.01"
                      placeholder="Monto"
                      value={payment.monto}
                      onChange={(event) => updateInitialPayment(index, "monto", event.target.value)}
                    />
                  </div>
                  <div className="sales-payment-inline__note">
                    <AdminTextInput
                      placeholder="Observacion"
                      value={payment.observacion}
                      onChange={(event) => updateInitialPayment(index, "observacion", event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
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
        {error ? (
          <p className="admin-error">
            <span>{error}</span>
            <button type="button" className="admin-error__close" onClick={() => setError(null)} aria-label="Cerrar error">
              ×
            </button>
          </p>
        ) : null}
        {notice ? (
          <p className="admin-notice">
            <span>{notice}</span>
            <button type="button" className="admin-notice__close" onClick={() => setNotice("")} aria-label="Cerrar aviso">
              ×
            </button>
          </p>
        ) : null}

        {!loading ? (isEdit ? renderEditView : renderCreateView) : null}

        <SaleClientModal
          open={clientModalOpen}
          title={clientModalTarget === "principal" ? "Editar titular principal" : "Agregar / editar segundo titular"}
          saving={saving}
          initialValue={clientModalTarget === "principal" ? form.cliente : form.cliente2}
          onClose={() => setClientModalOpen(false)}
          onSave={handleSaveClientModal}
          onFindByDni={findClientByDniForModal}
        />
        {isEdit && paymentModalOpen ? (
          <SalePaymentModal
            key={editingPayment ? `edit-${editingPayment.id}` : "create-payment"}
            open={paymentModalOpen}
            saving={saving}
            initialValue={editingPayment}
            suggestedType={suggestedNextPaymentType}
            defaultAmount={suggestedDefaultPaymentAmount}
            suggestedInstallmentNumber={suggestedNextInstallmentNumber}
            onClose={() => {
              setPaymentModalOpen(false);
              setEditingPayment(null);
            }}
            onSave={handleSavePayment}
          />
        ) : null}
        {isEdit && sale ? (
          <SaleSettingsModal
            open={settingsModalOpen}
            sale={sale}
            form={form}
            role={role}
            advisorOptions={advisorOptions}
            disabled={!canEditCurrentSale}
            onFormChange={(updater) => setForm((current) => updater(current))}
            onClose={() => setSettingsModalOpen(false)}
          />
        ) : null}
      </section>
    </AppShell>
  );
}
