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
  manzana?: string | null;
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
  collectionsSeries: DashboardCollectionsSeriesItem[];
  inventory: DashboardInventoryItem[];
  advisorSummary: DashboardAdvisorSummaryItem[];
  advisorRanking: DashboardAdvisorSummaryItem[];
  executive?: DashboardAdminExecutiveOverview;
};

export type DashboardAdminExecutiveProjectSummary = {
  totalLotes: number;
  totalVendidos: number;
  totalSeparados: number;
  totalDisponibles: number;
  porcentajeAvanceVentas: number;
};

export type DashboardAdminExecutiveSalesMonth = {
  cantidadVendidosMes: number;
  valorTotalVendidoMes: number;
  precioPromedioVendidoMes: number;
  loteMasCaroCodigo: string;
  precioMaxVendidoMes: number;
  loteMasBaratoCodigo: string;
  precioMinVendidoMes: number;
};

export type DashboardAdminExecutiveIncomeMonth = {
  ingresoInicialMes: number;
  ingresoCuotasMes: number;
  ingresoTotalMes: number;
  diferenciaVendidoCobradoMes: number;
};

export type DashboardAdminExecutiveMonthComparison = {
  ventasMesActual: number;
  ventasMesAnterior: number;
  ingresosMesActual: number;
  ingresosMesAnterior: number;
  variacionVentasPct: number;
  variacionIngresosPct: number;
};

export type DashboardAdminExecutiveAdvisorItem = {
  asesorId: string;
  asesorUsername: string;
  asesorNombre: string;
  cantidadVentas: number;
  montoVendido: number;
  ingresoInicialGenerado: number;
  precioPromedioVenta: number;
};

export type DashboardAdminExecutiveManzanaItem = {
  manzana: string;
  cantidadVentas: number;
  precioPromedioVenta: number;
  valorTotalMz: number;
  valorVendido: number;
  valorCobrado: number;
};

export type DashboardAdminExecutivePriceControlItem = {
  ventaId: string;
  loteCodigo: string;
  asesorNombre: string;
  precioLista: number;
  precioCierre: number;
  descuentoMonto: number;
  descuentoPct: number;
};

export type DashboardAdminExecutiveCollectionItem = {
  ventaId: string;
  clienteNombre: string;
  clienteTelefono?: string;
  loteCodigo: string;
  fechaVencimiento: string;
  montoPagar: number;
  montoPendiente: number;
  estado: "HOY" | "POR_VENCER" | "VENCIDO" | "AL_DIA";
};

export type DashboardAdminExecutiveOverview = {
  period: {
    year: number;
    month: number;
    from: string;
    to: string;
  };
  projectSummary: DashboardAdminExecutiveProjectSummary;
  salesMonth: DashboardAdminExecutiveSalesMonth;
  incomeMonth: DashboardAdminExecutiveIncomeMonth;
  monthComparison: DashboardAdminExecutiveMonthComparison;
  advisorPerformance: DashboardAdminExecutiveAdvisorItem[];
  manzanaSummary: DashboardAdminExecutiveManzanaItem[];
  priceControl: DashboardAdminExecutivePriceControlItem[];
  collections: {
    pendingToday: DashboardAdminExecutiveCollectionItem[];
    dueNext7Days: DashboardAdminExecutiveCollectionItem[];
    overdue: DashboardAdminExecutiveCollectionItem[];
  };
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
