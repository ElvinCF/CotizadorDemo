# Plan de Migración BD `dev` (versión ejecutable de planificación)

## Contexto
- En `dev` solo existen tablas legacy: `usuarios` y `lotes`.
- Se requiere rediseóo completo del modelo comercial.
- Restricción explócita: reemplazar `lotes` actual y modificar `usuarios` actual.
- En esta entrega **no se ejeVuta nada**; solo se deja plan final.

---

## Principios de migración
1. **No pórdida de datos**: primero respaldo, despuós transformación.
2. **Corte controlado**: rename/legacy antes de drop definitivo.
3. **Idempotencia**: migraciones y seeds repetibles.
4. **Observabilidad**: validaciones por conteo, FKs y reglas de negocio.

---

## Secuencia propuesta (runbook)

## Paso 0 - Precheck
- Verificar conexión a `SUPABASE_DB_SCHEMA=dev`.
- Registrar versión actual de migraciones aplicadas.

## Paso 1 - Backup obligatorio
- Crear snapshot estructural y de datos de `dev.usuarios` y `dev.lotes`.
- Guardar en esquema/tabla de respaldo con timestamp.

## Paso 2 - Enums
Crear enums en `dev`:
- `rol_usuario_enum`
- `estado_general_enum`
- `tipo_documento_enum`
- `estado_lote_enum`
- `etapa_venta_enum`
- `estado_registro_enum`
- `tipo_pago_enum`
- `forma_pago_enum`
- `rol_en_venta_enum`
- `accion_admin_enum` (recomendado)

## Paso 3 - Tablas nuevas
Crear:
- `personas`, `empresas`, `proyectos`
- estructura nueva de `lotes`
- `ventas`, `ventas_clientes`, `pagos`, `autorizaciones_admin`

## Paso 4 - Migración de `usuarios` legacy
- Mapear cada usuario legacy a una fila en `personas`.
- Enlazar `usuarios.persona_id`.
- Normalizar username/rol/estado.
- Definir estrategia PIN dev (temporal) y ruta de hardening.

## Paso 5 - Migración de `lotes` legacy
- Transformar lotes legacy a la nueva estructura (`proyecto_id`, `codigo`, `manzana`, etc.).
- Validar integridad por conteo y unicidad.

## Paso 6 - Reglas duras
- Unique y FKs definitivas.
- óndice parcial: una venta activa por lote.
- óndices de consulta por módulo (lotes, ventas, pagos, usuarios).

## Paso 7 - Procedures/Triggers
- trigger `updated_at` general.
- recólculo de totales de venta desde pagos.
- sincronización de estado lote segón etapa de venta.
- auditoróa de autorización admin.
- adaptación de ajuste masivo de precios a nuevo contrato de lotes.

## Paso 8 - Seed demo y seed test
- `seed_demo`: empresa, proyecto, usuarios, lotes base, venta simple.
- `seed_test`: casos de pagos parciales, anulación, multi-cliente en venta.
- idempotencia con `upsert`.

## Paso 9 - Cutover
- Renombrar tablas legacy (`*_legacy`) para ventana de seguridad.
- Reapuntar vistas/procedures al esquema nuevo.
- Validar API en entorno dev.

## Paso 10 - Drop definitivo (diferido)
- Eliminar `lotes_legacy` y campos legacy de `usuarios` solo tras validación funcional y aprobación de equipo.

---

## Validaciones obligatorias post-migración
- [ ] Conteos esperados por entidad.
- [ ] 0 errores FK.
- [ ] 0 duplicados en uniques clave.
- [ ] Regla "1 venta activa por lote" funcionando.
- [ ] Procedures sin error en casos nominales y borde.
- [ ] Seeds cargan en limpio sin fallar.

---

## Plan de rollback
- R1: rollback lógico por restauración de tablas backup.
- R2: desactivar temporalmente nuevas rutas/servicios y volver a contrato legacy.
- R3: reporte de diferencias para reprocesar migración.

---

## Entregables tócnicos (cuando se implemente)
- Scripts SQL versionados por orden.
- Script de verificación post-migración.
- Script de seed demo/test.
- Documento de mapeo legacy -> nuevo modelo.
