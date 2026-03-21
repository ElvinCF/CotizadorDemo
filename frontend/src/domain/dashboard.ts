import type { PaymentType, SaleState } from "./ventas";

export type DashboardScope = "admin" | "asesor";
export type DashboardLotState = "DISPONIBLE" | "SEPARADO" | "VENDIDO";
export type DashboardGroupBy = "day" | "week" | "month";
export type DashboardRankingMetric =
  | "monto_vendido"
  | "monto_cobrado"
  | "ticket_promedio_venta"
  | "saldo_pendiente"
  | "cantidad_ventas"
  | "cartera_activa"
  | "mayor_venta";

export type DashboardCommonFilters = {
  from?: string | null;
  to?: string | null;
  estadoLote?: DashboardLotState | null;
  estadoVenta?: SaleState | null;
  page?: number | null;
  pageSize?: number | null;
};

export type DashboardAdminFilters = DashboardCommonFilters & {
  asesorId?: string | null;
};

export type DashboardSeriesFilters = DashboardCommonFilters & {
  groupBy?: DashboardGroupBy | null;
};

export type DashboardAdminSeriesFilters = DashboardSeriesFilters & {
  asesorId?: string | null;
};

export type DashboardPaymentFilters = DashboardCommonFilters & {
  tipoPago?: PaymentType | null;
};

export type DashboardAdminPaymentFilters = DashboardPaymentFilters & {
  asesorId?: string | null;
};

export type DashboardRankingFilters = DashboardAdminFilters & {
  metric?: DashboardRankingMetric | null;
  topN?: number | null;
};

export type DashboardAdminKpis = {
  inventarioTotal: number;
  lotesDisponibles: number;
  lotesSeparados: number;
  lotesVendidos: number;
  ventasActivas: number;
  montoVendido: number;
  montoCobrado: number;
  saldoPendienteGlobal: number;
  ticketPromedioVenta: number;
  asesorTopId: string | null;
  asesorTopUsername: string | null;
  asesorTopNombre: string | null;
  asesorTopMontoVendido: number;
};

export type DashboardAdvisorKpis = {
  misVentasActivas: number;
  misSeparaciones: number;
  miMontoVendido: number;
  miMontoCobrado: number;
  saldoPendienteMiCartera: number;
  ticketPromedioVenta: number;
  clientesActivos: number;
  mayorVenta: number;
};

export type DashboardSalesSeriesItem = {
  bucket: string;
  cantidadVentas: number;
  montoVendido: number;
  ticketPromedioVenta: number;
};

export type DashboardCollectionsSeriesItem = {
  bucket: string;
  cantidadPagos: number;
  montoCobrado: number;
};

export type DashboardInventoryItem = {
  estadoComercial: DashboardLotState;
  cantidad: number;
  porcentaje: number;
};

export type DashboardAdvisorSummaryItem = {
  asesorId: string;
  asesorUsername: string;
  asesorNombre: string;
  cantidadVentas: number;
  montoVendido: number;
  montoCobrado: number;
  ticketPromedioVenta: number;
  carteraActiva: number;
  saldoPendiente: number;
  mayorVenta: number;
};

export type DashboardAdminOverview = {
  kpis: DashboardAdminKpis;
  salesSeries: DashboardSalesSeriesItem[];
  inventory: DashboardInventoryItem[];
  advisorSummary: DashboardAdvisorSummaryItem[];
  advisorRanking: DashboardAdvisorSummaryItem[];
};

export type DashboardSaleOperationItem = {
  ventaId: string;
  fechaVenta: string;
  loteId: string | null;
  loteCodigo: string | null;
  clienteId: string | null;
  clienteNombre: string | null;
  clienteDni: string | null;
  asesorId?: string | null;
  asesorUsername?: string | null;
  asesorNombre?: string | null;
  estadoVenta: SaleState;
  precioVenta: number;
  montoInicialTotal: number;
  montoFinanciado: number;
  cantidadCuotas: number;
  montoCuota: number;
};

export type DashboardCancelledSaleItem = {
  ventaId: string;
  fechaVenta: string;
  loteId: string | null;
  loteCodigo: string | null;
  clienteId: string | null;
  clienteNombre: string | null;
  clienteDni: string | null;
  asesorId: string | null;
  asesorUsername: string | null;
  asesorNombre: string | null;
  estadoVenta: "CAIDA";
  precioVenta: number;
  observacion: string | null;
};

export type DashboardAdvisorClientItem = {
  clienteId: string;
  clienteNombre: string;
  clienteDni: string;
  operacionesActivas: number;
  montoAcumulado: number;
  saldoPendiente: number;
  ultimaFechaVenta: string | null;
};

export type DashboardAdvisorPaymentItem = {
  pagoId: string;
  ventaId: string;
  fechaPago: string;
  tipoPago: PaymentType;
  monto: number;
  nroCuota: number | null;
  loteId: string | null;
  loteCodigo: string | null;
  clienteId: string | null;
  clienteNombre: string | null;
  clienteDni: string | null;
  estadoVenta: SaleState;
};

export type DashboardAdvisorOperationsByStateItem = {
  estadoVenta: SaleState;
  cantidad: number;
  montoVendido: number;
};
