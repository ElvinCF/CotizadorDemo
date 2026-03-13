import express from "express";
import {
  getSupabaseAdminClient,
  listLotes,
  updateAvailablePricesMassive,
  updateLoteById,
} from "./lib/lotesService.mjs";
import {
  createUserAsync,
  getUserCatalogsAsync,
  listUsersAsync,
  loginAsync,
  updateUserAsync,
} from "./lib/usuariosService.mjs";

const getAdminCredentials = (req) => {
  const headerUser = req.headers["x-admin-user"];
  const headerPin = req.headers["x-admin-pin"];
  const bodyUser = req.body?.auth?.username;
  const bodyPin = req.body?.auth?.pin;

  return {
    username: typeof headerUser === "string" && headerUser.trim() ? headerUser.trim() : bodyUser,
    pin: typeof headerPin === "string" && headerPin.trim() ? headerPin.trim() : bodyPin,
  };
};

const PORT = Number(process.env.PORT || 8787);

const app = express();
app.use(express.json());

app.get("/api/lotes", async (_req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const items = await listLotes(supabase);
    res.json({ items, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error reading lotes from Supabase:", error);
    res.status(500).json({ error: "No se pudo leer lotes desde Supabase" });
  }
});

app.put("/api/lotes/:id", async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const item = await updateLoteById(supabase, req.params.id, req.body ?? {});

    if (!item) {
      res.status(404).json({ error: "Lote no encontrado" });
      return;
    }

    res.json({ item, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error updating lote in Supabase:", error);
    res.status(500).json({ error: "No se pudo actualizar lote en Supabase" });
  }
});

app.post("/api/lotes/precios-masivos", async (req, res) => {
  try {
    const supabase = getSupabaseAdminClient();
    const updatedCount = await updateAvailablePricesMassive(supabase, req.body ?? {});
    res.json({ updatedCount, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error bulk updating prices in Supabase:", error);
    const detail = error instanceof Error ? error.message : "Error desconocido";
    res.status(500).json({
      error: "No se pudo actualizar precios masivamente en Supabase",
      detail,
    });
  }
});

// ── Usuarios ────────────────────────────────────────────────────
app.get("/api/usuarios", async (req, res) => {
  try {
    const { username: authUser, pin: authPin } = getAdminCredentials(req);
    if (!authUser || !authPin) {
      res.status(401).json({ error: "Credenciales de admin requeridas." });
      return;
    }
    const users = await listUsersAsync(authUser, authPin);
    const catalogs = await getUserCatalogsAsync(authUser, authPin);
    res.json({ users, catalogs });
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(403).json({ error: error.message || "Error al listar usuarios." });
  }
});

app.post("/api/usuarios", async (req, res) => {
  try {
    const { username: authUser, pin: authPin } = getAdminCredentials(req);
    const { nuevoUsuario } = req.body ?? {};
    if (!authUser || !authPin) {
      res.status(401).json({ error: "Credenciales de admin requeridas." });
      return;
    }
    const user = await createUserAsync(authUser, authPin, nuevoUsuario);
    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error("Error creating user:", error);
    const status = error.message?.includes("permisos") ? 403
      : error.message?.includes("administradores") ? 409
      : error.message?.includes("ya existe") ? 409
      : 400;
    res.status(status).json({ error: error.message || "Error al crear usuario." });
  }
});

app.put("/api/usuarios", async (req, res) => {
  try {
    const { username: authUser, pin: authPin } = getAdminCredentials(req);
    const { id, patch } = req.body ?? {};
    if (!authUser || !authPin) {
      res.status(401).json({ error: "Credenciales de admin requeridas." });
      return;
    }
    const user = await updateUserAsync(authUser, authPin, id, patch);
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error updating user:", error);
    const status = error.message?.includes("permisos") ? 403
      : error.message?.includes("administradores") ? 409
      : error.message?.includes("ya existe") ? 409
      : error.message?.includes("no encontrado") ? 404
      : 400;
    res.status(status).json({ error: error.message || "Error al actualizar usuario." });
  }
});

// ── Auth ────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: "Falta usuario o PIN." });
    }

    const userData = await loginAsync(username, pin);
    if (!userData) {
      return res.status(401).json({ error: "Usuario o PIN incorrectos." });
    }

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(403).json({ error: error.message || "No tienes permisos para acceder." });
  }
});

app.listen(PORT, () => {
  console.log(`Supabase API running on http://127.0.0.1:${PORT}`);
});

