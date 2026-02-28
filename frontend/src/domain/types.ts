export type Lote = {
  id: string;
  mz: string;
  lote: number;
  areaM2: number | null;
  price: number | null;
  condicion: string;
  asesor?: string;
  cliente?: string;
  comentario?: string;
  ultimaModificacion?: string;
};

export type CsvRow = {
  MZ?: string;
  LOTE?: string;
  AREA?: string;
  PRECIO?: string;
  CONDICION?: string;
  ASESOR?: string;
  CLIENTE?: string;
  COMENTARIO?: string;
  ULTIMA_MODIFICACION?: string;
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
  lote: {
    proyecto: string;
    mz: string;
    lote: string;
    area: string;
    ubicacion: string;
  };
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
