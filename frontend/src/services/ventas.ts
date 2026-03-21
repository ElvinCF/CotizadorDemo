import type {
  SaleFormValues,
  SalePatchPayload,
  SalePaymentFormValues,
  SaleRecord,
  SalesClient,
} from "../domain/ventas";

type AuthCredentials = {
  username: string | null;
  pin: string | null;
};

type StoredAuthSession = {
  loginUsername?: string | null;
  loginPin?: string | null;
};

const readStoredCredentials = (): AuthCredentials => {
  if (typeof window === "undefined") {
    return { username: null, pin: null };
  }

  try {
    const raw = window.localStorage.getItem("auth_session");
    if (!raw) {
      return { username: null, pin: null };
    }

    const session = JSON.parse(raw) as StoredAuthSession;
    return {
      username: session.loginUsername ?? null,
      pin: session.loginPin ?? null,
    };
  } catch {
    return { username: null, pin: null };
  }
};

const ensureCredentials = (): AuthCredentials => {
  const credentials = readStoredCredentials();
  if (!credentials.username || !credentials.pin) {
    throw new Error("Tu sesion no tiene credenciales vigentes. Cierra sesion e ingresa nuevamente.");
  }
  return credentials;
};

const buildHeaders = () => {
  const credentials = ensureCredentials();
  return {
    "Content-Type": "application/json",
    "x-auth-user": credentials.username ?? "",
    "x-auth-pin": credentials.pin ?? "",
  };
};

const parseJsonSafe = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const buildError = async (response: Response, fallback: string) => {
  const payload = await parseJsonSafe(response);
  return new Error(payload.error || fallback);
};

export const listSales = async () => {
  const response = await fetch("/api/ventas", {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo listar ventas (${response.status})`);
  }

  const payload = (await response.json()) as { items?: SaleRecord[] };
  return Array.isArray(payload.items) ? payload.items : [];
};

export const getSaleById = async (saleId: string) => {
  const response = await fetch(`/api/ventas/${saleId}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo cargar la venta (${response.status})`);
  }

  const payload = (await response.json()) as { sale?: SaleRecord };
  if (!payload.sale) {
    throw new Error("La venta solicitada no existe.");
  }
  return payload.sale;
};

export const createSale = async (values: SaleFormValues) => {
  const response = await fetch("/api/ventas", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo crear la venta (${response.status})`);
  }

  const payload = (await response.json()) as { sale?: SaleRecord };
  if (!payload.sale) {
    throw new Error("La API no devolvio la venta creada.");
  }
  return payload.sale;
};

export const updateSale = async (saleId: string, values: SalePatchPayload) => {
  const response = await fetch(`/api/ventas/${saleId}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo actualizar la venta (${response.status})`);
  }

  const payload = (await response.json()) as { sale?: SaleRecord };
  if (!payload.sale) {
    throw new Error("La API no devolvio la venta actualizada.");
  }
  return payload.sale;
};

export const addSalePayment = async (saleId: string, values: SalePaymentFormValues) => {
  const response = await fetch(`/api/ventas/${saleId}/pagos`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo registrar el pago (${response.status})`);
  }

  const payload = (await response.json()) as { sale?: SaleRecord };
  if (!payload.sale) {
    throw new Error("La API no devolvio la venta actualizada.");
  }
  return payload.sale;
};

export const updateSalePayment = async (saleId: string, paymentId: string, values: SalePaymentFormValues) => {
  const response = await fetch(`/api/ventas/${saleId}/pagos/${paymentId}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo actualizar el pago (${response.status})`);
  }

  const payload = (await response.json()) as { sale?: SaleRecord };
  if (!payload.sale) {
    throw new Error("La API no devolvio la venta actualizada.");
  }
  return payload.sale;
};

export const findClientByDni = async (dni: string) => {
  const params = new URLSearchParams({ dni });
  const response = await fetch(`/api/clientes?${params.toString()}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await buildError(response, `No se pudo buscar cliente (${response.status})`);
  }

  const payload = (await response.json()) as { client?: SalesClient | null };
  return payload.client ?? null;
};
