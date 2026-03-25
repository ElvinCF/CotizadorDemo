export type SaleState =
  | "SEPARADA"
  | "INICIAL_PAGADA"
  | "CONTRATO_FIRMADO"
  | "PAGANDO"
  | "COMPLETADA"
  | "CAIDA";

export type FinancingType = "REDUCIR_CUOTA" | "REDUCIR_MESES";
export type PaymentType = "SEPARACION" | "INICIAL" | "CUOTA" | "OTRO";

export type SalesClient = {
  id?: string;
  nombreCompleto: string;
  dni: string;
  celular: string;
  direccion: string;
  ocupacion: string;
};

export type SalesLote = {
  id: string;
  codigo: string;
  mz: string;
  lote: number;
  areaM2: number | null;
  precioReferencial: number;
  estadoComercial: string;
};

export type SaleAdvisor = {
  id: string;
  username: string;
  nombre: string;
};

export type SalePayment = {
  id: string;
  fechaPago: string;
  tipoPago: PaymentType;
  monto: number;
  nroCuota: number | null;
  observacion: string;
  createdAt?: string;
};

export type SaleHistoryItem = {
  id: string;
  estadoAnterior: SaleState | null;
  estadoNuevo: SaleState;
  fechaCambio: string;
  usuario: {
    id: string;
    username: string;
    nombre: string;
  } | null;
};

export type SaleRecord = {
  id: string;
  fechaVenta: string;
  precioVenta: number;
  estadoVenta: SaleState;
  tipoFinanciamiento: FinancingType;
  montoInicialTotal: number;
  montoFinanciado: number;
  cantidadCuotas: number;
  montoCuota: number;
  observacion: string;
  lote: SalesLote | null;
  cliente: SalesClient | null;
  cliente2: SalesClient | null;
  asesor: SaleAdvisor | null;
  pagos: SalePayment[];
  historial: SaleHistoryItem[];
};

export type InitialPaymentInput = {
  tipoPago: Extract<PaymentType, "SEPARACION" | "INICIAL">;
  fechaPago: string;
  monto: string;
  observacion: string;
};

export type SaleFormValues = {
  loteCodigo: string;
  asesorId: string | null;
  fechaVenta: string;
  precioVenta: string;
  estadoVenta: SaleState;
  tipoFinanciamiento: FinancingType;
  cantidadCuotas: string;
  montoCuota: string;
  observacion: string;
  cliente: SalesClient;
  cliente2: SalesClient | null;
  pagosIniciales: InitialPaymentInput[];
};

export type SalePatchPayload = {
  asesorId?: string | null;
  fechaVenta: string;
  precioVenta: string;
  estadoVenta: SaleState;
  tipoFinanciamiento: FinancingType;
  cantidadCuotas: string;
  montoCuota: string;
  observacion: string;
  cliente: SalesClient;
  cliente2: SalesClient | null;
};

export type SalePaymentFormValues = {
  fechaPago: string;
  tipoPago: PaymentType;
  monto: string;
  nroCuota: string;
  observacion: string;
};
