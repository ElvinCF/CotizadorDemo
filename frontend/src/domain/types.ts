export type Lote = {
  id: string;
  dbId?: string;
  mz: string;
  lote: number;
  areaM2: number | null;
  price: number | null;
  condicion: string;
  ventaActiva?: boolean;
  ventaActivaId?: string | null;
};

export type QuoteState = {
  precio: number;
  inicialMonto: number;
  cuotas: number;
  interesAnual: number;
};

export type OverlayTransform = {
  x: number;
  y: number;
  scale: number;
};

export type FiltersState = {
  mz: string;
  status: string;
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
};

export type ProformaState = {
  cliente: {
    nombre: string;
    dni: string;
    celular: string;
    direccion: string;
    correo: string;
  };
  proyecto: {
    proyecto: string;
    ubicacion: string;
  };
  lotes: Array<{
    id: string;
    mz: string;
    lote: string;
    area: string;
    precioReferencial: number;
  }>;
  precioRegular: number;
  precioPromocional: number;
  descuentoSoles: number;
  descuentoPct: number;
  diasVigencia: number;
  fechaCaducidad: string;
  separacion: number;
  inicial: number;
  meses: number;
  vendedor: {
    nombre: string;
    celular: string;
  };
  creadoEn: string;
};
