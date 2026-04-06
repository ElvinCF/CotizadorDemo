import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppShell from "../../app/AppShell";
import { COMPANY_LOGO_IMAGE, PRINT_FOOTER_RIBBON, PROJECT_LOGO_SVG } from "../../app/assets";
import { useAuth } from "../../app/AuthContext";
import { useProjectContext } from "../../app/ProjectContext";
import { buildPrivateProjectPath, buildPublicProjectPath } from "../../app/projectRoutes";
import AdminTextInput from "../../components/admin/AdminTextInput";
import DataTable from "../../components/data-table/DataTable";
import SaleClientCard from "../../components/sales/SaleClientCard";
import SaleClientModal from "../../components/sales/SaleClientModal";
import {
  SaleContractSummaryCard,
  SaleDataCard,
  SaleFinancingCard,
} from "../../components/sales/SaleEditableCard";
import SalePaymentModal from "../../components/sales/SalePaymentModal";
import { SalePaymentsModal, SalePaymentsOverviewCard } from "../../components/sales/SalePaymentsCard";
import SaleSettingsModal from "../../components/sales/SaleSettingsModal";
import { readCachedCotizadorQuote } from "../../domain/cotizador";
import { formatArea, formatMoney } from "../../domain/formatters";
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
import { formatSaleStateLabel, saleStateClassName } from "../../domain/ventas";
import { listAdminUsers } from "../../services/adminUsers";
import { loadAdminLotesFromApi } from "../../services/lotes";
import { addSalePayment, createSale, deleteSalePayment, findClientByDni, getSaleById, listSaleAccessByLot, updateSale, updateSalePayment } from "../../services/ventas";
import { waitForPrintWindowAssets } from "../../utils/printWindow";

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
  loteCodigos: loteCodigo ? [loteCodigo] : [],
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

const parseLotCodesFromParam = (rawValue: string | null) =>
  [...new Set(String(rawValue ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean))];

const PROFORMA_SALE_DRAFT_KEY = "arenas.proforma.to.sale.v1";

type SaleLotRow = {
  rowId: string;
  mz: string;
  loteCode: string;
};

type ProformaSaleDraft = {
  loteCodigos: string[];
  precioVenta?: number;
  inicial?: number;
  separacion?: number;
  meses?: number;
  montoCuota?: number;
  tipoFinanciamiento?: SaleFormValues["tipoFinanciamiento"];
  cliente?: SaleFormValues["cliente"];
};

const createLotRowId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `sale-lot-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
      const montoCuota = cuotas > 0 ? Number((montoFinanciado / cuotas).toFixed(2)) : 0;
      const ultimaCuota = cuotas > 1 ? Number((montoFinanciado - montoCuota * (cuotas - 1)).toFixed(2)) : montoCuota;
      return {
        montoInicialTotal,
        montoFinanciado,
        cantidadCuotas: cuotas,
        montoCuota,
        ultimaCuota,
        ultimaCuotaAjustada: Math.abs(ultimaCuota - montoCuota) >= 0.01,
      };
    }

    const cuota = Math.max(1, asNumber(values.montoCuota));
    const cantidadCuotas = Math.max(1, Math.ceil(montoFinanciado / cuota));
    const ultimaCuota = cantidadCuotas > 1 ? Number((montoFinanciado - cuota * (cantidadCuotas - 1)).toFixed(2)) : Number(cuota.toFixed(2));
    return {
      montoInicialTotal,
      montoFinanciado,
      cantidadCuotas,
      montoCuota: Number(cuota.toFixed(2)),
      ultimaCuota,
      ultimaCuotaAjustada: Math.abs(ultimaCuota - Number(cuota.toFixed(2))) >= 0.01,
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

const IconSpinner = () => (
  <svg className="sales-spinner" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" opacity="0.28" />
    <path d="M12 4a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path
      d="m9 7 .6-2h4.8L15 7m-8.2 0 .9 11.1a2 2 0 0 0 2 1.9h4.6a2 2 0 0 0 2-1.9L17.2 7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

type MobileAccordionSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

type ExpedienteSection = {
  key: string;
  title: string;
  node: ReactNode;
  defaultOpen?: boolean;
};

type SaleExpedienteTemplateProps = {
  heading: string;
  status: SaleState;
  saving: boolean;
  saveDisabled: boolean;
  saveLongLabel: string;
  saveShortLabel: string;
  readOnlyNotice?: string | null;
  showSettings?: boolean;
  onBack: () => void;
  onSave: () => void;
  onOpenSettings?: () => void;
  onPrintSeparation?: (() => void) | null;
  printSeparationDisabled?: boolean;
  mainSections: ExpedienteSection[];
  sideSections: ExpedienteSection[];
};

function MobileAccordionSection({ title, defaultOpen = true, children }: MobileAccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`sales-mobile-section${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="sales-mobile-section__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <IconChevronDown />
      </button>
      <div className="sales-mobile-section__content">{children}</div>
    </section>
  );
}

function SaleExpedienteTemplate({
  heading,
  status,
  saving,
  saveDisabled,
  saveLongLabel,
  saveShortLabel,
  readOnlyNotice,
  showSettings = false,
  onBack,
  onSave,
  onOpenSettings,
  onPrintSeparation = null,
  printSeparationDisabled = true,
  mainSections,
  sideSections,
}: SaleExpedienteTemplateProps) {
  return (
    <>
      <header className="sales-form-page__head">
        <div className="sales-form-page__mobile-bar" role="toolbar" aria-label="Acciones principales de venta">
          <button
            type="button"
            className="btn ghost sales-header-action sales-header-action--back"
            onClick={onBack}
            aria-label="Volver"
            title="Volver"
          >
            <IconArrowLeft />
          </button>
          <span className="sales-form-page__mobile-bar-spacer" aria-hidden="true" />
          <span className={`sales-form-page__status-badge ${saleStateClassName(status)}`}>{formatSaleStateLabel(status)}</span>
          {onPrintSeparation ? (
            <PrintMenu
              onPrintSeparation={onPrintSeparation}
              printSeparationDisabled={printSeparationDisabled}
            />
          ) : null}
          {showSettings ? (
            <button
              type="button"
              className="btn ghost sales-header-action"
              onClick={onOpenSettings}
              title="Ajustes"
              aria-label="Ajustes"
            >
              <IconSettings />
            </button>
          ) : null}
          <button
            type="button"
            className="btn sales-header-action sales-header-action--save"
            onClick={onSave}
            disabled={saveDisabled}
            title={saveShortLabel}
            aria-label={saveShortLabel}
          >
            {saving ? <IconSpinner /> : <IconSave />}
          </button>
        </div>
        <div className="sales-form-page__heading">
          <div className="sales-form-page__title-row">
            <button
              type="button"
              className="btn ghost sales-header-action sales-header-action--back sales-header-action--title-back"
              onClick={onBack}
            >
              <IconArrowLeft />
              <span className="sales-header-action__label">Volver</span>
            </button>
            <h2>{heading}</h2>
            <span className={`sales-form-page__status-badge ${saleStateClassName(status)}`}>{formatSaleStateLabel(status)}</span>
          </div>
        </div>
        <div className="sales-form-page__summary">
          <PrintMenu
            onPrintSeparation={onPrintSeparation}
            printSeparationDisabled={printSeparationDisabled}
          />
          {showSettings ? (
            <button
              type="button"
              className="btn ghost sales-header-action"
              onClick={onOpenSettings}
              title="Ajustes"
              aria-label="Ajustes"
            >
              <IconSettings />
              <span className="sales-header-action__label">Ajustes</span>
            </button>
          ) : null}
          <button type="button" className="btn sales-header-action sales-header-action--save" onClick={onSave} disabled={saveDisabled}>
            {saving ? <IconSpinner /> : <IconSave />}
            <span className="sales-header-action__label sales-header-action__label--long">{saveLongLabel}</span>
            <span className="sales-header-action__label sales-header-action__label--short">{saveShortLabel}</span>
          </button>
        </div>
      </header>

      {readOnlyNotice ? <p className="admin-notice">{readOnlyNotice}</p> : null}

      <section className="sales-expediente-layout">
        <div className="sales-expediente-layout__main">
          {mainSections.map((section) => (
            <MobileAccordionSection key={section.key} title={section.title} defaultOpen={section.defaultOpen}>
              {section.node}
            </MobileAccordionSection>
          ))}
        </div>

        <div className="sales-expediente-layout__side">
          {sideSections.map((section) => (
            <MobileAccordionSection key={section.key} title={section.title} defaultOpen={section.defaultOpen}>
              {section.node}
            </MobileAccordionSection>
          ))}
        </div>
      </section>
    </>
  );
}

function SaleInitialPaymentsCard({
  payments,
  onChange,
}: {
  payments: InitialPaymentInput[];
  onChange: (index: number, field: keyof InitialPaymentInput, value: string) => void;
}) {
  return (
    <article className="sales-form-card sales-form-card--compact-payments">
      <header className="sales-client-card__header">
        <h3>Pagos iniciales</h3>
      </header>
      <div className="sales-form-fields sales-form-fields--payments">
        {payments.map((payment, index) => (
          <div key={payment.tipoPago} className="sales-payment-inline">
            <strong className="sales-payment-inline__type">{payment.tipoPago}</strong>
            <div className="sales-payment-inline__fields">
              <div className="sales-payment-inline__date">
                <AdminTextInput type="date" value={payment.fechaPago} onChange={(event) => onChange(index, "fechaPago", event.target.value)} />
              </div>
              <div className="sales-payment-inline__amount">
                <AdminTextInput
                  type="number"
                  step="0.01"
                  placeholder="Monto"
                  value={payment.monto}
                  onChange={(event) => onChange(index, "monto", event.target.value)}
                />
              </div>
              <div className="sales-payment-inline__note">
                <AdminTextInput
                  placeholder="Observacion"
                  value={payment.observacion}
                  onChange={(event) => onChange(index, "observacion", event.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function PrintMenu({
  onPrintSeparation,
  printSeparationDisabled,
}: {
  onPrintSeparation?: (() => void) | null;
  printSeparationDisabled?: boolean;
}) {
  const separationDisabled = printSeparationDisabled || !onPrintSeparation;
  return (
    <details className="sales-header-print-menu">
      <summary className="btn ghost sales-header-action sales-header-action--print-menu" aria-label="Imprimir">
        <IconPrinter />
        <span className="sales-header-action__label">Imprimir</span>
        <IconChevronDown />
      </summary>
      <div className="sales-header-print-menu__dropdown">
        <button
          type="button"
          className="btn ghost sales-header-print-menu__item"
          disabled={separationDisabled}
          onClick={(event) => {
            if (!onPrintSeparation) return;
            const details = event.currentTarget.closest("details");
            if (details) details.removeAttribute("open");
            onPrintSeparation();
          }}
        >
          <IconPrinter />
          <span>Ficha separacion</span>
        </button>
        <button type="button" className="btn ghost sales-header-print-menu__item" disabled>
          <IconPrinter />
          <span>Contrato</span>
        </button>
      </div>
    </details>
  );
}

const normalizeClientForCompare = (client: SaleFormValues["cliente"] | null | undefined) => ({
  nombreCompleto: String(client?.nombreCompleto || "").trim(),
  dni: String(client?.dni || "").trim(),
  celular: String(client?.celular || "").trim(),
  direccion: String(client?.direccion || "").trim(),
  ocupacion: String(client?.ocupacion || "").trim(),
});

const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function SaleFormPage() {
  const { id: saleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role, loginUsername, loginPin } = useAuth();
  const { display } = useProjectContext();
  const isEdit = Boolean(saleId);
  const [lotesCatalog, setLotesCatalog] = useState<Lote[]>([]);
  const [lotRows, setLotRows] = useState<SaleLotRow[]>([]);
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [form, setForm] = useState<SaleFormValues>(() =>
    createEmptySaleForm("", searchParams.get("target") === "VENDIDO" ? "INICIAL_PAGADA" : "SEPARADA")
  );
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientModalTarget, setClientModalTarget] = useState<"principal" | "secundario">("principal");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalePayment | null>(null);
  const [paymentsListModalOpen, setPaymentsListModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [advisorOptions, setAdvisorOptions] = useState<{ id: string; name: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeSaleByLotCode, setActiveSaleByLotCode] = useState<Record<string, string>>({});

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(buildPrivateProjectPath(display.projectSlug, "ventas"));
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setLotesCatalog([]);
        setActiveSaleByLotCode({});
        const [allLotes, lotAccess] = await Promise.all([
          loadAdminLotesFromApi({ slug: display.projectSlug }),
          listSaleAccessByLot({ slug: display.projectSlug }).catch(() => []),
        ]);
        setLotesCatalog(allLotes);
        setActiveSaleByLotCode(
          lotAccess.reduce<Record<string, string>>((acc, item) => {
            const lotCode = String(item.loteCodigo || "").trim().toUpperCase();
            if (!lotCode) return acc;
            acc[lotCode] = item.saleId;
            return acc;
          }, {})
        );
        if (isEdit && saleId) {
          const detail = await getSaleById(saleId);
          setSale(detail);
          const editLotCodes =
            detail.lotes?.map((item) => item.codigo).filter(Boolean) ?? (detail.lote?.codigo ? [detail.lote.codigo] : []);
          setForm({
            loteCodigo: detail.lote?.codigo ?? "",
            loteCodigos: editLotCodes,
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
          setLotRows(
            editLotCodes.map((code) => {
              const fromCatalog = allLotes.find((item) => item.id === code);
              const fromSale = detail.lotes?.find((item) => item.codigo === code);
              return {
                rowId: createLotRowId(),
                mz: fromCatalog?.mz ?? fromSale?.mz ?? "",
                loteCode: code,
              };
            })
          );
          return;
        }

        let draftFromProforma: ProformaSaleDraft | null = null;
        const rawDraft = typeof window !== "undefined" ? window.sessionStorage.getItem(PROFORMA_SALE_DRAFT_KEY) : null;
        if (rawDraft) {
          try {
            draftFromProforma = JSON.parse(rawDraft) as ProformaSaleDraft;
          } catch {
            draftFromProforma = null;
          }
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(PROFORMA_SALE_DRAFT_KEY);
          }
        }

        const loteCode = searchParams.get("lote") || draftFromProforma?.loteCodigos?.[0] || "";
        const lotCodesFromQuery = parseLotCodesFromParam(searchParams.get("lotes"));
        const lotCodesFromDraft = Array.isArray(draftFromProforma?.loteCodigos)
          ? draftFromProforma!.loteCodigos.map((code) => String(code).trim().toUpperCase()).filter(Boolean)
          : [];
        const mergedLotCodes = [...new Set([...(loteCode ? [loteCode] : []), ...lotCodesFromQuery, ...lotCodesFromDraft])];
        const selectedFromCatalog = loteCode ? allLotes.find((item) => item.id === loteCode) ?? null : null;
        const cachedQuote = loteCode ? readCachedCotizadorQuote(loteCode) : null;
        const cachedCuotas = Math.min(Math.max(Math.round(cachedQuote?.cuotas ?? 24), 1), 36);
        const cachedInicial = Math.max(Number(cachedQuote?.inicialMonto ?? 0), 0);
        const cachedPrecioVenta = Math.max(Number(cachedQuote?.precio ?? selectedFromCatalog?.price ?? 0), 0);
        const draftCuotas = Math.min(Math.max(Math.round(Number(draftFromProforma?.meses ?? cachedCuotas)), 1), 36);
        const draftInicial = Math.max(Number(draftFromProforma?.inicial ?? cachedInicial), 0);
        const draftSeparacion = Math.max(Number(draftFromProforma?.separacion ?? 0), 0);
        const draftPrecioVenta = Math.max(Number(draftFromProforma?.precioVenta ?? cachedPrecioVenta), 0);
        const draftMontoCuota =
          draftCuotas > 0
            ? Number(
                (
                  Number.isFinite(Number(draftFromProforma?.montoCuota))
                    ? Number(draftFromProforma?.montoCuota)
                    : Math.max(draftPrecioVenta - draftInicial - draftSeparacion, 0) / draftCuotas
                ).toFixed(2)
              )
            : 0;

        setForm((current) => ({
          ...current,
          loteCodigo: loteCode,
          loteCodigos: mergedLotCodes,
          precioVenta: String(draftPrecioVenta || 0),
          cantidadCuotas: String(draftCuotas),
          montoCuota: String(draftMontoCuota),
          tipoFinanciamiento: draftFromProforma?.tipoFinanciamiento ?? current.tipoFinanciamiento,
          cliente: draftFromProforma?.cliente ? { ...draftFromProforma.cliente } : current.cliente,
          pagosIniciales: current.pagosIniciales.map((payment) =>
            payment.tipoPago === "INICIAL"
              ? {
                  ...payment,
                  monto: draftInicial > 0 ? String(draftInicial) : payment.monto,
                }
              : payment.tipoPago === "SEPARACION"
                ? {
                    ...payment,
                    monto: draftSeparacion > 0 ? String(draftSeparacion) : payment.monto,
                  }
              : payment
          ),
        }));
        setLotRows(
          mergedLotCodes.map((code) => {
            const fromCatalog = allLotes.find((item) => item.id === code);
            return {
              rowId: createLotRowId(),
              mz: fromCatalog?.mz ?? "",
              loteCode: code,
            };
          })
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la venta.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [display.projectSlug, isEdit, saleId, searchParams]);

  useEffect(() => {
    const nextCodes = [...new Set(lotRows.map((row) => row.loteCode).filter(Boolean))];
    setForm((current) => {
      const currentCodes = current.loteCodigos ?? (current.loteCodigo ? [current.loteCodigo] : []);
      if (JSON.stringify(currentCodes) === JSON.stringify(nextCodes)) {
        return current;
      }
      return {
        ...current,
        loteCodigo: nextCodes[0] ?? "",
        loteCodigos: nextCodes,
      };
    });
  }, [lotRows]);

  useEffect(() => {
    if (role !== "admin" || !loginUsername || !loginPin) {
      setAdvisorOptions([]);
      return;
    }

    const run = async () => {
      try {
        const payload = await listAdminUsers({ username: loginUsername, pin: loginPin }, { slug: display.projectSlug });
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

        setAdvisorOptions(users.map(({ id, name, rol }) => ({ id, name: `[${rol}] ${name}` })));
        setForm((currentForm) => {
          if (isEdit || currentForm.asesorId || !current?.id) return currentForm;
          return { ...currentForm, asesorId: current.id };
        });
      } catch {
        setNotice("No se pudo cargar la lista de usuarios.");
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
        ultimaCuota:
          base.cantidadCuotas > 1
            ? Number((Math.max(0, base.montoFinanciado - totalCuotasPagadas) - base.montoCuota * (base.cantidadCuotas - 1)).toFixed(2))
            : Number(Math.max(0, base.montoFinanciado - totalCuotasPagadas).toFixed(2)),
        ultimaCuotaAjustada:
          base.cantidadCuotas > 1 &&
          Math.abs(
            Number((Math.max(0, base.montoFinanciado - totalCuotasPagadas) - base.montoCuota * (base.cantidadCuotas - 1)).toFixed(2)) -
              base.montoCuota
          ) >= 0.01,
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

  const hasPendingChanges = useMemo(() => {
    if (!isEdit) {
      return Boolean(String(form.fechaVenta || "").trim());
    }

    if (!sale) return false;

    const sameClients =
      JSON.stringify(normalizeClientForCompare(form.cliente)) ===
        JSON.stringify(
          normalizeClientForCompare({
            nombreCompleto: sale.cliente?.nombreCompleto ?? "",
            dni: sale.cliente?.dni ?? "",
            celular: sale.cliente?.celular ?? "",
            direccion: sale.cliente?.direccion ?? "",
            ocupacion: sale.cliente?.ocupacion ?? "",
          })
        ) &&
      JSON.stringify(normalizeClientForCompare(form.cliente2)) ===
        JSON.stringify(
          normalizeClientForCompare({
            nombreCompleto: sale.cliente2?.nombreCompleto ?? "",
            dni: sale.cliente2?.dni ?? "",
            celular: sale.cliente2?.celular ?? "",
            direccion: sale.cliente2?.direccion ?? "",
            ocupacion: sale.cliente2?.ocupacion ?? "",
          })
        );

    const sameAdvisor = role === "admin" ? (form.asesorId ?? null) === (sale.asesor?.id ?? null) : true;
    const sameDate = form.fechaVenta === sale.fechaVenta.slice(0, 10);
    const samePactDate = (form.fechaPagoPactada || "") === (sale.fechaPagoPactada?.slice(0, 10) ?? "");
    const samePrice = Math.abs(asNumber(form.precioVenta) - Number(sale.precioVenta || 0)) < 0.005;
    const sameState = form.estadoVenta === sale.estadoVenta;
    const sameFinancing = form.tipoFinanciamiento === sale.tipoFinanciamiento;
    const sameCount = Number.parseInt(form.cantidadCuotas || "0", 10) === Number(sale.cantidadCuotas || 0);
    const sameInstallment = Math.abs(asNumber(form.montoCuota) - Number(sale.montoCuota || 0)) < 0.005;
    const sameNote = String(form.observacion || "").trim() === String(sale.observacion || "").trim();

    return !(sameClients && sameAdvisor && sameDate && samePactDate && samePrice && sameState && sameFinancing && sameCount && sameInstallment && sameNote);
  }, [form, isEdit, role, sale]);

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
          loteCodigo: form.loteCodigo,
          loteCodigos: form.loteCodigos ?? (form.loteCodigo ? [form.loteCodigo] : []),
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
        loteCodigos: form.loteCodigos ?? (form.loteCodigo ? [form.loteCodigo] : []),
        pagosIniciales: filterFilledInitialPayments(form.pagosIniciales),
        asesorId: role === "admin" ? form.asesorId ?? currentUserId ?? null : currentUserId ?? null,
      });
      navigate(buildPrivateProjectPath(display.projectSlug, "ventas", created.id), { replace: true });
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

  const handleDeletePayment = async (payment: SalePayment) => {
    if (!saleId || role !== "admin" || !canEditCurrentSale) return;
    const confirmed = window.confirm(`Eliminar pago ${payment.tipoPago}?`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setNotice("");
    try {
      const updated = await deleteSalePayment(saleId, payment.id);
      setSale(updated);
      setForm((current) => ({ ...current, estadoVenta: updated.estadoVenta }));
      setNotice("Pago eliminado.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el pago.");
    } finally {
      setSaving(false);
    }
  };

  const selectedAdvisorLabel =
    advisorOptions.find((advisor) => advisor.id === form.asesorId)?.name ??
    (role === "asesor" ? loginUsername ?? "Asesor actual" : "Sin asesor");
  const suggestedNextPaymentType = sale ? getSuggestedNextPaymentType(sale.pagos) : "CUOTA";
  const suggestedNextInstallmentNumber = sale ? getSuggestedNextInstallmentNumber(sale.pagos) : "1";
  const suggestedDefaultPaymentAmount =
    suggestedNextPaymentType === "CUOTA" ? String(Number(sale?.montoCuota ?? 0).toFixed(2)) : "";

  const addLotRow = () => {
    setLotRows((current) => [...current, { rowId: createLotRowId(), mz: "", loteCode: "" }]);
  };

  const updateLotRowMz = (rowId: string, mz: string) => {
    setLotRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, mz, loteCode: "" } : row)));
  };

  const updateLotRowCode = (rowId: string, loteCode: string) => {
    const selected = lotesCatalog.find((item) => item.id === loteCode) ?? null;
    setLotRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? { ...row, loteCode, mz: selected?.mz ?? row.mz }
          : row
      )
    );
  };

  const removeLotRow = (rowId: string) => {
    setLotRows((current) => current.filter((row) => row.rowId !== rowId));
  };

  const renderAdvisorCard = (disabled: boolean) => (
    <article className="sales-form-card sales-advisor-card sales-mobile-keep-header">
      <header className="sales-client-card__header sales-advisor-card__header">
        <h3>Asesor asignado</h3>
        {role === "admin" ? (
          <select
            className="sales-advisor-card__select"
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
        ) : null}
      </header>
      <div className="sales-form-fields">
        {role !== "admin" ? (
          <label className="sales-form-fields__full">
            Usuario responsable
            <AdminTextInput value={selectedAdvisorLabel} disabled />
          </label>
        ) : null}
      </div>
    </article>
  );

  const renderSaleLotsCard = (disabled: boolean) => {
    const currentSelectedCodes = lotRows.map((row) => row.loteCode).filter(Boolean);
    const selectableLots = lotesCatalog.filter((item) => {
      if (currentSelectedCodes.includes(item.id)) {
        return true;
      }
      const activeSaleId = activeSaleByLotCode[item.id] ?? null;
      if (!activeSaleId) {
        return true;
      }
      return isEdit && Boolean(saleId) && activeSaleId === saleId;
    });
    const mzOptions = Array.from(new Set(selectableLots.map((item) => item.mz).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true, sensitivity: "base" })
    );
    const totalPrecioRef = lotRows.reduce((sum, row) => {
      const selected = selectableLots.find((item) => item.id === row.loteCode) ?? null;
      return sum + Math.max(Number(selected?.price ?? 0), 0);
    }, 0);
    const selectedCount = lotRows.filter((row) => row.loteCode).length;

    return (
      <article className="sales-form-card sales-editable-card sales-editable-card--lot-list">
        <header className="sales-section-card__header">
          <h3>{selectedCount > 1 ? "Datos de los lotes" : "Datos del lote"}</h3>
        </header>
        <DataTable className="proforma-lote-table-view sale-lot-list-table">
          <table className="sales-table proforma-lote-table">
            <thead>
              <tr>
                <th>MZ</th>
                <th>Lote</th>
                <th>Precio m2</th>
                <th>Area total (m2)</th>
                <th>Precio ref.</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lotRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Sin lotes asociados.
                  </td>
                </tr>
              ) : (
                lotRows.map((row) => {
                  const selectedCodesExceptCurrent = lotRows
                    .filter((candidate) => candidate.rowId !== row.rowId)
                    .map((candidate) => candidate.loteCode)
                    .filter(Boolean);
                  const lotesByMz = selectableLots
                    .filter((item) => item.mz === row.mz)
                    .filter((item) => !selectedCodesExceptCurrent.includes(item.id) || item.id === row.loteCode)
                    .sort((a, b) => a.lote - b.lote);
                  const selectedLoteRow = selectableLots.find((item) => item.id === row.loteCode) ?? null;

                  return (
                    <tr key={row.rowId}>
                      <td>
                        <select
                          value={row.mz}
                          disabled={disabled}
                          onChange={(event) => updateLotRowMz(row.rowId, event.target.value)}
                        >
                          <option value="">Mz</option>
                          {mzOptions.map((mz) => (
                            <option key={mz} value={mz}>
                              {mz}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.loteCode}
                          disabled={disabled || !row.mz}
                          onChange={(event) => updateLotRowCode(row.rowId, event.target.value)}
                        >
                          <option value="">Lt</option>
                          {lotesByMz.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.lote}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {selectedLoteRow && Number(selectedLoteRow.areaM2) > 0
                          ? formatMoney(Math.max(Number(selectedLoteRow.price ?? 0), 0) / Number(selectedLoteRow.areaM2))
                          : "-"}
                      </td>
                      <td>{formatArea(selectedLoteRow?.areaM2 ?? null)}</td>
                      <td>{selectedLoteRow ? formatMoney(selectedLoteRow.price) : "-"}</td>
                      <td>
                        <button
                          className="btn ghost icon-only"
                          type="button"
                          disabled={disabled}
                          onClick={() => removeLotRow(row.rowId)}
                          aria-label="Eliminar lote"
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <button className="btn ghost proforma-add-lote" type="button" disabled={disabled} onClick={addLotRow}>
                    Agregar lote
                  </button>
                </td>
                <td />
                <td />
                <td className="proforma-lote-table__total">
                  <span className="proforma-lote-table__total-label">Total precio:</span>
                  <span>{formatMoney(totalPrecioRef)}</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </DataTable>
      </article>
    );
  };

  const lotSectionTitle = lotRows.filter((row) => row.loteCode).length > 1
    ? "Datos de los lotes"
    : "Datos del lote";

  const lotesDisabled = isEdit ? !canEditCurrentSale : false;

  const lotsSection: ExpedienteSection = {
    key: "lots",
    title: lotSectionTitle,
    node: renderSaleLotsCard(lotesDisabled),
  };

  const handlePrintSeparation = async () => {
    const activeLotCodes = (form.loteCodigos ?? []).filter(Boolean);
    const lotsText = activeLotCodes.length > 0 ? activeLotCodes.join(", ") : form.loteCodigo || "";
    const separacionAmount =
      sale?.pagos.find((payment) => payment.tipoPago === "SEPARACION")?.monto ??
      asNumber(form.pagosIniciales.find((payment) => payment.tipoPago === "SEPARACION")?.monto ?? "");
    const inicialAmount =
      sale?.montoInicialTotal ??
      asNumber(form.pagosIniciales.find((payment) => payment.tipoPago === "INICIAL")?.monto ?? "");
    const precioVenta = asNumber(form.precioVenta);
    const montoFinanciado = Math.max(precioVenta - inicialAmount - separacionAmount, 0);
    const cuotas = Math.max(Number(form.cantidadCuotas || 0), 1);
    const cuotaMonto = asNumber(form.montoCuota) || Number((montoFinanciado / cuotas).toFixed(2));
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = String(today.getFullYear());
    const clientName = form.cliente.nombreCompleto?.trim() ?? "";
    const clientDni = form.cliente.dni?.trim() ?? "";
    const clientOcupacion = form.cliente.ocupacion?.trim() ?? "";
    const clientPhone = form.cliente.celular?.trim() ?? "";
    const clientAddress = form.cliente.direccion?.trim() ?? "";
    const advisorNameRaw = selectedAdvisorLabel?.trim() ?? "";
    const advisorNameClean = advisorNameRaw
      .replace(/\[[^\]]*]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const advisorName = advisorNameClean.split(" ").filter(Boolean).slice(0, 2).join(" ");
    const advisorPhone = "";
    const projectName = display.projectName || "Proyecto";
    const projectLocation = display.locationText || "-";
    const empresaRuc = display.ownerRuc || "-";
    const empresaNombre = display.owner || "-";
    const logoHolaTrujillo = new URL(display.logoFooterUrl || COMPANY_LOGO_IMAGE, window.location.origin).href;
    const logoArenasMalabrigo = new URL(display.logoProyectoUrl || PROJECT_LOGO_SVG, window.location.origin).href;
    const footerRibbonUrl = new URL(PRINT_FOOTER_RIBBON, window.location.origin).href;
    const hasValue = (value: string) => value.trim().length > 0;
    const renderInlineField = (value: string, size: "wide" | "mid" | "short" = "mid") =>
      hasValue(value)
        ? `<span class="filled ${size}">${escapeHtml(value)}</span>`
        : `<span class="line ${size}"></span>`;

    const printHtml = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Ficha de separacion</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; font-family: Cambria, "Palatino Linotype", "Book Antiqua", "Times New Roman", serif; color: #1c1c1c; }
            .doc {
              width: 100%;
              padding: 1mm 2mm 0;
              box-sizing: border-box;
              min-height: calc(297mm - 20mm);
              position: relative;
              display: flex;
              flex-direction: column;
              padding-bottom: 18mm;
            }
            .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 16px; }
            .head img { height: 40px; max-width: 45%; width: auto; object-fit: contain; }
            .title { text-align: center; font-size: 20px; font-weight: 700; text-decoration: underline; margin: 6px 0 10px; letter-spacing: 0.01em; }
            p { font-size: 14.2px; line-height: 1.42; margin: 6px 0; }
            .legal-text { text-align: justify; text-wrap: pretty; }
            .line { display: inline-block; min-width: 120px; border-bottom: 1px solid #222; font-weight: 700; padding: 0 4px 1px; min-height: 1em; }
            .line.wide { min-width: 220px; }
            .line.mid { min-width: 150px; }
            .line.short { min-width: 90px; }
            .filled {
              display: inline-block;
              font-weight: 700;
              text-decoration: underline;
              text-decoration-thickness: 1px;
              text-underline-offset: 2px;
              padding: 0 4px 1px;
              vertical-align: baseline;
            }
            .filled.wide { min-width: 220px; }
            .filled.mid { min-width: 150px; }
            .filled.short { min-width: 90px; }
            .summary { margin: 10px 0 6px; display: grid; gap: 4px; font-size: 14.4px; }
            .summary-row { display: flex; align-items: baseline; gap: 8px; }
            .note { margin-top: 8px; font-style: italic; font-weight: 700; text-align: center; }
            .date-row { margin-top: 12px; text-align: right; font-size: 16px; }
            .signatures { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .signature { min-height: 128px; }
            .signature .sign-line {
              margin-top: 16px;
              margin-bottom: 8px;
              border-bottom: 1px solid #222;
              height: 22px;
            }
            .signature .field { margin-top: 6px; font-size: 14.4px; }
            .advisor { margin-top: 12px; width: 52%; }
            .advisor .sign-line {
              margin-top: 14px;
              margin-bottom: 8px;
              border-bottom: 1px solid #222;
              height: 22px;
            }
            .accounts { margin-top: 12px; text-align: right; font-family: Arial, sans-serif; font-size: 13px; }
            .accounts strong { color: #c96f28; font-size: 24px; line-height: 1.05; display: inline-block; text-align: left; }
            .accounts .bank { margin-top: 6px; font-weight: 700; color: #1f3c7a; }
            .footer-ribbon {
              position: absolute;
              left: 0;
              right: 0;
              bottom: 0;
              width: 100%;
              height: 16mm;
              object-fit: cover;
            }
          </style>
        </head>
        <body>
          <div class="doc">
            <div class="head">
              <img src="${logoHolaTrujillo}" alt="Hola Trujillo" />
              <img src="${logoArenasMalabrigo}" alt="${escapeHtml(projectName)}" />
            </div>
            <div class="title">PRE-ACUERDO DE PAGO POR SEPARACI&Oacute;N DE LOTE</div>
            <p class="legal-text">
              Por el presente documento, el(la) sr(a) ${renderInlineField(clientName, "wide")} de ocupaci&oacute;n
              ${renderInlineField(clientOcupacion, "mid")}, identificado(a) con DNI
              N&deg; ${renderInlineField(clientDni, "mid")}, domiciliado en
              ${renderInlineField(clientAddress, "wide")}, realiz&oacute; el dep&oacute;sito de
              S/ ${renderInlineField(formatMoney(separacionAmount).replace("S/", "").trim(), "short")}
              por concepto de pago de separaci&oacute;n del lote
              ${renderInlineField(lotsText, "mid")} del proyecto denominado
              <strong>${escapeHtml(projectName)}</strong>, ubicado en ${escapeHtml(projectLocation)}, a nombre de la empresa
              <strong>${escapeHtml(empresaNombre)}</strong> con RUC ${escapeHtml(empresaRuc)}.
            </p>

            <div class="summary">
              <div class="summary-row"><strong>Precio total:</strong> S/ ${renderInlineField(formatMoney(precioVenta).replace("S/", "").trim(), "mid")}</div>
              <div class="summary-row"><strong>Monto de separaci&oacute;n:</strong> S/ ${renderInlineField(formatMoney(separacionAmount).replace("S/", "").trim(), "mid")}</div>
              <div class="summary-row"><strong>Inicial:</strong> S/ ${renderInlineField(formatMoney(inicialAmount).replace("S/", "").trim(), "mid")}</div>
              <div class="summary-row"><strong>Fecha de pago de la inicial:</strong> ${renderInlineField((form.fechaPagoPactada || form.fechaVenta || "").trim(), "mid")}</div>
              <div class="summary-row"><strong>Tiempo de pago total:</strong> ${renderInlineField(String(cuotas), "short")} meses</div>
              <div class="summary-row"><strong>Monto a financiar:</strong> S/ ${renderInlineField(formatMoney(montoFinanciado).replace("S/", "").trim(), "mid")} &nbsp; <strong>Cuota:</strong> S/ ${renderInlineField(formatMoney(cuotaMonto).replace("S/", "").trim(), "short")}</div>
            </div>

            <p class="legal-text">
              En tal sentido queda acordado que, en el plazo indicado, el promitente comprador se compromete
              a cumplir con el cronograma pactado. Se firma el presente documento en se&ntilde;al de conformidad,
              adjuntando copia de DNI y voucher de pagos para fines correspondientes.
            </p>
            <p class="note">
              Asimismo, queda estipulado que al no cumplir con el pago o desistir de la compra,
              el comprador pierde autom&aacute;ticamente su separaci&oacute;n sin opci&oacute;n a reclamo.
            </p>

            <div class="date-row">Trujillo, ${renderInlineField(day, "short")} de ${renderInlineField(month, "short")} del ${renderInlineField(year, "short")}</div>

            <div class="signatures">
              <div class="signature">
                <div class="field"><strong>Firma</strong></div>
                <div class="sign-line"></div>
                <div class="field"><strong>Nombre:</strong> ${renderInlineField(clientName, "wide")}</div>
                <div class="field"><strong>DNI:</strong> ${renderInlineField(clientDni, "mid")}</div>
                <div class="field"><strong>Ocupaci&oacute;n:</strong> ${renderInlineField(clientOcupacion, "mid")}</div>
                <div class="field"><strong>Celular:</strong> ${renderInlineField(clientPhone, "mid")}</div>
              </div>
              <div class="signature">
                <div class="field"><strong>Firma</strong></div>
                <div class="sign-line"></div>
                <div class="field"><strong>Nombre:</strong> ${renderInlineField("", "wide")}</div>
                <div class="field"><strong>DNI:</strong> ${renderInlineField("", "mid")}</div>
                <div class="field"><strong>Ocupaci&oacute;n:</strong> ${renderInlineField("", "mid")}</div>
                <div class="field"><strong>Celular:</strong> ${renderInlineField("", "mid")}</div>
              </div>
            </div>

            <div class="advisor">
              <div class="field"><strong>Firma</strong></div>
              <div class="sign-line"></div>
              <div class="field"><strong>Asesor:</strong> ${renderInlineField(advisorName, "mid")}</div>
              <div class="field"><strong>Celular:</strong> ${renderInlineField(advisorPhone, "mid")}</div>
            </div>

            <div class="accounts">
              <strong>CUENTAS<br/>OFICIALES</strong>
              <div class="bank">BCP: 5707328977043</div>
            </div>

            <img class="footer-ribbon" src="${footerRibbonUrl}" alt="" aria-hidden="true" />
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1024,height=900");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    await waitForPrintWindowAssets(printWindow);
    printWindow.focus();
    printWindow.print();
  };

  const saleSection: ExpedienteSection = {
    key: "sale",
    title: "Datos de la venta",
    node: (
      <SaleDataCard
        form={form}
        role={role}
        disabled={isEdit ? !canEditCurrentSale : false}
        onFormChange={(updater) => setForm((current) => updater(current))}
      />
    ),
  };

  const clientSection: ExpedienteSection = {
    key: "clients",
    title: "Datos del cliente",
    node: (
      <SaleClientCard
        title="Datos del cliente"
        cliente={form.cliente}
        cliente2={form.cliente2}
        disabled={isEdit ? !canEditCurrentSale : false}
        onEditCliente={() => openClientModal("principal")}
        onAddCliente2={() => openClientModal("secundario")}
        onEditCliente2={() => openClientModal("secundario")}
        onRemoveCliente2={handleRemoveClient2}
      />
    ),
  };

  const financingSection: ExpedienteSection = {
    key: "finance",
    title: "Datos de la financiacion",
    node: (
      <SaleFinancingCard
        form={form}
        role={role}
        preview={preview}
        disabled={isEdit ? !canEditCurrentSale : false}
        onFormChange={(updater) => setForm((current) => updater(current))}
      />
    ),
  };

  const summarySection: ExpedienteSection = {
    key: "summary",
    title: "Resumen de la financiacion",
    node: <SaleContractSummaryCard preview={preview} />,
  };

  const paymentsSection: ExpedienteSection =
    isEdit && sale
      ? {
          key: "payments",
          title: "Pagos realizados",
          node: (
            <SalePaymentsOverviewCard
              sale={sale}
              disabled={!canEditCurrentSale}
              onOpenPayments={() => setPaymentsListModalOpen(true)}
              onAddPayment={handleOpenCreatePayment}
            />
          ),
        }
      : {
          key: "initial-payments",
          title: "Pagos iniciales",
          node: <SaleInitialPaymentsCard payments={form.pagosIniciales} onChange={updateInitialPayment} />,
        };

  const advisorSection: ExpedienteSection | null =
    role === "admin"
      ? {
          key: "advisor",
          title: "Asesor asignado",
          node: renderAdvisorCard(isEdit ? !canEditCurrentSale : false),
        }
      : null;

  const baseMainSections: ExpedienteSection[] = [
    saleSection,
    clientSection,
    lotsSection,
    financingSection,
  ];

  const sharedSideSections: ExpedienteSection[] = [summarySection, paymentsSection];
  if (advisorSection) {
    sharedSideSections.push(advisorSection);
  }

  const actions = (
    <nav className="topbar-nav">
      <Link className="btn ghost topbar-action" to={buildPublicProjectPath(display.projectSlug)}>
        <IconMap />
        Mapa
      </Link>
      <Link className="btn ghost topbar-action" to={buildPrivateProjectPath(display.projectSlug, "lotes")}>
        <IconLotes />
        Lotes
      </Link>
      <Link className="btn ghost topbar-action" to={buildPrivateProjectPath(display.projectSlug, "ventas")}>
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

        {!loading
          ? isEdit && sale
            ? (
              <SaleExpedienteTemplate
                heading="Modificar Venta"
                status={form.estadoVenta}
                saving={saving}
                saveDisabled={saving || !canEditCurrentSale || !hasPendingChanges}
                saveLongLabel="Guardar cambios"
                saveShortLabel="Guardar"
                readOnlyNotice={!canEditCurrentSale ? "Modo solo lectura: esta venta pertenece a otro asesor." : null}
                showSettings
                onBack={goBack}
                onSave={handleSubmit}
                onOpenSettings={() => setSettingsModalOpen(true)}
                onPrintSeparation={handlePrintSeparation}
                printSeparationDisabled={!Boolean(sale)}
                mainSections={baseMainSections}
                sideSections={sharedSideSections}
              />
              )
            : (
              <SaleExpedienteTemplate
                heading="Nueva venta"
                status={form.estadoVenta}
                saving={saving}
                saveDisabled={saving}
                saveLongLabel={saving ? "Guardando..." : "Crear venta"}
                saveShortLabel="Guardar"
                onBack={goBack}
                onSave={handleSubmit}
                onPrintSeparation={null}
                printSeparationDisabled
                mainSections={baseMainSections}
                sideSections={sharedSideSections}
              />
              )
          : null}

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
          <SalePaymentsModal
            open={paymentsListModalOpen}
            sale={sale}
            disabled={!canEditCurrentSale}
            loading={saving}
            onClose={() => setPaymentsListModalOpen(false)}
            onAddPayment={handleOpenCreatePayment}
            onEditPayment={handleEditPayment}
            onDeletePayment={handleDeletePayment}
            canDeletePayments={role === "admin"}
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




