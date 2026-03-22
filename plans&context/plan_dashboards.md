# Plan Maestro de Dashboards (Backlog por Fases)

Fecha de actualización: 2026-03-21  
Estado: **Plan vigente**

Este documento **reemplaza** los enfoques anteriores de planificación de dashboard y concentra:
- producto
- UX/UI
- backend/SQL
- orden de implementación por fases

## 1) Objetivo de negocio

Entregar un dashboard ejecutivo-operativo que permita:
- medir avance comercial real del proyecto
- separar claramente `vendido` vs `cobrado`
- evaluar rendimiento de asesores
- detectar riesgos de cobranza y vencimientos
- buscar información rápida de cliente/lote/asesor

## 2) Alcance funcional (beta)

### 2.1 Resumen general del proyecto (arriba)
- Total de lotes
- Total vendidos
- Total separados
- Total disponibles
- Porcentaje de avance de ventas

### 2.2 Ventas del mes
- Cantidad de lotes vendidos en el mes
- Valor total vendido del mes (monto de venta, no cobros)
- Precio promedio de venta por lote
- Lote más caro vendido del mes
- Lote más barato vendido del mes

### 2.3 Ingresos reales del mes
- Total ingresado por iniciales
- Total ingresado por cuotas
- Total general ingresado
- Diferencia entre vendido y cobrado

### 2.4 Rendimiento de asesores
Por asesor:
- cantidad de lotes vendidos
- valor vendido
- ingreso real generado
- precio promedio de venta
- ranking por cantidad de ventas

Incluido en beta si hay data suficiente:
- ranking por valor vendido
- ranking por ingreso real generado

### 2.5 Control de precios y descuentos
Mínimo beta:
- precio promedio de venta
- precio más alto y más bajo
- comparación precio lista vs precio cierre por venta

Opcional fase siguiente:
- asesores que venden más cerca de lista
- asesores que aplican más descuento

### 2.6 Estado por manzana / zona
- manzanas con más ventas
- manzanas con menos ventas
- precio promedio de venta por manzana

Beta: tabla ordenable.  
Fase posterior: vista mapa/heat por zona.

### 2.7 Cobranza y vencimientos (obligatorio beta)
- pagos pendientes hoy
- pagos que vencen en próximos 7 días
- pagos vencidos

Detalle por fila:
- cliente
- lote
- fecha vencimiento
- monto
- estado: al día / por vencer / vencido

### 2.8 Historial básico por mes
- ventas mes actual vs mes anterior
- ingresos mes actual vs mes anterior
- variación simple

### 2.9 Búsqueda rápida global
Búsqueda por:
- nombre cliente
- número lote
- nombre asesor

### 2.10 Requisitos visuales
- dashboard limpio, sin sobrecarga
- cards arriba para KPIs
- tablas abajo para detalle
- filtros mínimos: mes, asesor, manzana

---

## 3) Decisiones cerradas

### 3.1 Definición de periodo “mes”
Se manejará con:
- `select año`
- `select mes`
- rango calculado automáticamente (`from`/`to`) manteniendo soporte de rango explícito

Regla UX:
- modo principal: año + mes
- modo avanzado: rango manual (si se habilita)

### 3.2 Fuente de “precio lista”
Regla oficial:
- usar `precio_lista` **guardado en la venta** cuando exista
- si no existe, usar precio de lote como fallback de compatibilidad

Recomendación técnica:
- persistir snapshot de `precio_lista` en `ventas` para trazabilidad histórica

### 3.3 Lógica de vencimiento
Fuente principal:
- `fecha_pago_pactada` de `ventas`

Uso de fecha contrato:
- solo como fallback si `fecha_pago_pactada` está vacía

### 3.4 Timezone oficial
- `America/Lima` en backend para cierres, agrupaciones por día/mes y comparativas

---

## 4) Arquitectura de datos y API

## 4.1 Endpoints
Se mantiene y prioriza endpoint agregado para eficiencia:
- `GET /api/dashboard/admin/resumen`

Debe devolver en un solo payload:
- `kpis`
- `salesSeries`
- `inventory`
- `advisorSummary`
- `advisorRanking`

Endpoints complementarios (detalle):
- ventas activas
- operaciones caídas
- series cobros avanzadas
- tablas operativas de cobranza

## 4.2 Reglas backend
- validar rol por endpoint (`ADMIN`, `ASESOR`)
- timezone `America/Lima`
- filtros normalizados (año/mes -> from/to)
- fallback seguro en campos históricos (`precio_lista`, `fecha_pago_pactada`)
- respuestas estables en `camelCase`
- arrays vacíos y KPIs en cero cuando no hay data

## 4.3 Performance
- usar `Pool` PostgreSQL
- evitar múltiples llamadas paralelas para cabecera ejecutiva
- cargar primero KPIs y resumen crítico
- diferir bloques secundarios si hace falta

---

## 5) Diseño UX/UI objetivo

## 5.1 Estructura desktop
- Franja 1: título + filtros compactos + acciones
- Franja 2: cards KPI principales
- Franja 3: gráficos principales (ventas vs cobros, inventario)
- Franja 4: tablas operativas (asesores, cobranza)
- Franja 5: tablas de análisis (manzana, precios/descuentos)

## 5.2 Gráficos recomendados
- Línea doble: `ventas vs cobros` por mes
- Dona: distribución `disponible/separado/vendido`
- Barras horizontales: ranking asesores
- Tabla ordenable: manzanas y control de precios

## 5.3 Responsividad
- Desktop: layout 12 columnas
- Tablet: bloques en 2-3 franjas
- Mobile: 1 columna, prioridad KPI + listas accionables

## 5.4 Color semántico
- disponible: verde
- separado: ámbar
- vendido/completada: azul/teal
- por vencer: naranja
- vencido/caída: rojo
- cobrado: verde intenso

---

## 6) Backlog por fases

## Fase 1 - Núcleo beta (alta prioridad)
Objetivo: lectura ejecutiva inmediata + datos confiables.

Historias:
1. Cards de resumen general del proyecto
2. Bloque ventas del mes
3. Bloque ingresos reales del mes
4. Historial mes actual vs anterior
5. Filtros: año, mes, asesor, manzana
6. Búsqueda rápida global
7. Endpoint agregado `admin/resumen` consumido por frontend

Criterios de aceptación:
- carga inicial <= 2.5s en dataset beta
- no errores en estados vacíos
- diferencias vendido vs cobrado visibles en UI

## Fase 2 - Operación comercial y cobranza
Objetivo: convertir dashboard en herramienta diaria.

Historias:
1. Rendimiento completo de asesores (rankings)
2. Cobranza/vencimientos hoy + 7 días + vencidos
3. Tabla de acciones de cobranza
4. Estado por manzana (tabla con orden y filtros)

Criterios de aceptación:
- listas accionables por estado de vencimiento
- ranking consistente con filtros activos

## Fase 3 - Control de precios y eficiencia
Objetivo: mejorar decisiones de precio y descuento.

Historias:
1. Precio promedio/alto/bajo
2. Precio lista vs cierre por venta
3. Métricas por asesor de cercanía a lista y descuento

Criterios de aceptación:
- trazabilidad por venta
- consistencia con reglas de precio_lista

## Fase 4 - Mejoras visuales y analítica extendida
Objetivo: pulido visual y exploración avanzada.

Historias:
1. Mapa por zona con intensidad comercial (si aplica)
2. Drill-down por manzana/asesor
3. Exportaciones ejecutivas

---

## 7) Priorización de implementación (técnica)

Orden sugerido:
1. cerrar contratos de campos faltantes (`precio_lista`, `fecha_pago_pactada`)
2. endpoint agregado + validaciones timezone/filtros
3. construir franja KPI y ventas/cobros del mes
4. añadir tablas de cobranza y ranking asesores
5. cerrar control de precios/descuentos

---

## 8) Dependencias y coordinación

Backend:
- confirmar campos disponibles en schema actual
- asegurar índices para consultas por fecha/asesor/manzana

Frontend:
- componentes de cards/charts/tablas reutilizables
- estados loading/empty/error homogéneos
- filtros unificados y persistencia opcional en URL

---

## 9) Riesgos vigentes

1. Datos históricos incompletos de `precio_lista` en ventas antiguas
2. Inconsistencia de `fecha_pago_pactada` en registros legacy
3. Sobrepeso visual si se intenta meter todo en primera pantalla
4. Tiempos de respuesta si se mezcla detalle operativo pesado en carga inicial

Mitigación:
- fallback controlado
- carga progresiva por secciones
- priorización estricta por fases

---

## 10) Definición de listo (DoD)

Un bloque del dashboard se considera “listo” cuando:
- cumple contrato backend
- respeta filtros globales
- funciona en desktop/tablet/mobile
- tiene loading + empty + error
- pasa validación manual de números con muestra real
- no degrada tiempos de carga de pantalla completa

---

## 11) Notas de versionado

- Este documento pasa a ser el **plan rector** de dashboards.
- Los documentos anteriores se mantienen como histórico técnico, pero no como plan activo.
