# Correcciones e Ideas

Actualizado: `2026-04-01`
Rol: `Exploracion previa`

## Uso de este documento

Este archivo no es:

- plan formal
- backlog comprometido
- fuente de verdad

Este archivo si es:

- lista de correcciones detectadas
- ideas de mejora
- oportunidades de producto
- notas previas a priorizacion

## Regla de uso

Todo lo que entre aqui aun debe pasar por evaluacion.

Solo cuando una idea se aprueba:

- pasa a un `plan_*.md` si queda pendiente
- o pasa a un `arq_*.md`, `1_esquema_bd.md` o `2_reglas_negocio.md` si ya fue aplicada

## Estados sugeridos

Usar solo estos estados dentro de este archivo:

- `Detectado`
- `Idea`
- `Por evaluar`
- `Descartado`
- `Movido a plan`

## Plantilla sugerida

### Titulo corto

Estado: `Idea`
Modulo: `Componentes | Ventas | Dashboards | BD | Operacion`
Impacto: `Alto | Medio | Bajo`

Descripcion:

- que se detecto
- por que importa
- que riesgo o mejora aportaria

Siguiente paso:

- validar
- diseñar
- mover a plan

## Entrada inicial

### Consolidar registro de mejoras futuras

Estado: `Detectado`
Modulo: `Documentacion`
Impacto: `Medio`

Descripcion:

- hacia falta un espacio intermedio entre idea y plan
- esto evita mezclar backlog formal con notas aun no priorizadas

Siguiente paso:

- usar este archivo como embudo previo antes de abrir nuevas fases en los planes

## Correcciones e ideas vigentes

### Documentacion funcional para usuario final (v1)

Estado: `Idea`
Modulo: `Documentacion`
Impacto: `Alto`

Descripcion:

- crear una primera version de documentacion profesional de funciones del software
- redactada en lenguaje de alto nivel para usuario final (no tecnico)
- cubrir modulos principales, flujos y limites operativos

Siguiente paso:

- definir indice y formato (manual web, PDF o base de conocimiento)
- mover a plan cuando se apruebe alcance y propietario

### Ventas Fase 5: multi-lote con estrategia de no ruptura

Estado: `Por evaluar`
Modulo: `Ventas | BD`
Impacto: `Alto`

Descripcion:

- en mapa, cotizacion, proforma y venta soportar seleccion de mas de un lote
- si el usuario elige un solo lote, mantener la UI actual sin cambios de experiencia
- modelar detalle en tabla `lotes_venta` (o `venta_lotes`, validar nombre final)
- aplicar migracion progresiva y compatible para no romper BD ni flujos desplegados

Siguiente paso:

- aterrizar estrategia tecnica final en `4-1_plan_ventas.md` Fase 5
- definir plan de migracion por etapas y rollback

### Equipos de asesores y privacidad comercial

Estado: `Idea`
Modulo: `Usuarios | Ventas | Permisos`
Impacto: `Alto`

Descripcion:

- permitir formar equipos de asesores
- definir reglas de privacidad por equipo (que puede ver/editar cada rol)
- mantener trazabilidad de accesos y acciones por usuario/equipo

Siguiente paso:

- disenar matriz de permisos y escenarios operativos
- mover a plan cuando se cierre la politica de privacidad interna

### Accesos por proyecto y login condicionado (Admin/Asesor)

Estado: `Movido a plan`
Modulo: `Seguridad | Usuarios | Proyectos`
Impacto: `Alto`

Descripcion:

- agregar gestion Admin de accesos por proyecto (`proyecto_usuarios`)
- `ADMIN` mantiene acceso total a todos los proyectos de la empresa
- `ASESOR` solo puede ingresar si tiene acceso activo al proyecto actual
- incluir 2 apartados de configuracion: datos de empresa y datos de proyecto

Siguiente paso:

- continuar ejecucion por fases en `context/4_planes.md` Fase 6

### Priorizacion del plan padre frontend + librerias UI

Estado: `Por evaluar`
Modulo: `Componentes`
Impacto: `Medio`

Descripcion:

- subir prioridad del plan padre de frontend para acelerar consistencia visual
- evaluar librerias open source gratuitas y de buena calidad para UI
- incluir librerias de iconos con licencia compatible

Siguiente paso:

- comparar opciones (bundle, accesibilidad, mantenimiento, licencia)
- proponer stack objetivo y mover a `4_planes.md` cuando se priorice

### Integracion CRM Freeler y conversion lead -> cliente

Estado: `Idea`
Modulo: `Integraciones | CRM`
Impacto: `Alto`

Descripcion:

- permitir vincular base de clientes con CRM Freeler
- soportar relacion entre cliente interno y lead ganado
- evitar duplicidad y mantener consistencia de IDs entre sistemas

Siguiente paso:

- levantar requisitos de integracion (API, autenticacion, mapeo de estados)
- definir si la sincronizacion sera unidireccional o bidireccional

### Priorizacion MoSCoW de ideas nuevas

Estado: `Por evaluar`
Modulo: `Planificacion`
Impacto: `Medio`

Descripcion:

- priorizar las ideas nuevas con criterio MoSCoW para decidir cual pasa primero a plan formal

Siguiente paso:

- pendiente por decision del equipo

### Dashboard: filtros y toolbar

Estado: `Por evaluar`
Modulo: `Dashboards`
Impacto: `Medio`

Descripcion:

- corregir funcionamiento y reglas de filtros
- aclarar iconos
- ajustar tamanos de botones de acciones

Siguiente paso:

- mover a `4-2_plan_dashboards.md` cuando se priorice

### Lotes: correccion de filtros del modulo

Estado: `Por evaluar`
Modulo: `Componentes`
Impacto: `Medio`

Descripcion:

- corregir minimo y maximo de `m2`
- aclarar iconos
- ajustar botones de ocultar o mostrar filtros y limpiar

Siguiente paso:

- mover a `4_planes.md` cuando se priorice

### Venta: ajustes y trazabilidad

Estado: `Idea`
Modulo: `Ventas`
Impacto: `Medio`

Descripcion:

- crear boton `Ajustes` dentro de la venta
- mover ahi `tipo_financiamiento`
- mover ahi `fecha_primera_cuota`
- mostrar dentro de ese bloque la trazabilidad o historico de la venta

Siguiente paso:

- definir alcance de la trazabilidad y mover a `4-1_plan_ventas.md` cuando se priorice

### Venta: historico visible de estados

Estado: `Idea`
Modulo: `Ventas`
Impacto: `Medio`

Descripcion:

- mostrar historico de estados de venta en algun bloque visible del expediente

Siguiente paso:

- definir si vive en la pagina principal o dentro de `Ajustes`

### Venta nueva con UI nueva

Estado: `Movido a plan`
Modulo: `Ventas`
Impacto: `Alto`

Descripcion:

- la venta nueva no debe volver a la UI anterior
- debe usar la UI nueva del modulo ventas

Siguiente paso:

- resuelto en `4-1_plan_ventas.md`

### Cotizador multi-lote

Estado: `Movido a plan`
Modulo: `Ventas`
Impacto: `Alto`

Descripcion:

- permitir seleccionar y cotizar varios lotes
- permitir armar una venta de varios lotes

Siguiente paso:

- desarrollado ahora en `4-1_plan_ventas.md` como Fase 5

### Documentos de venta e impresion

Estado: `Movido a plan`
Modulo: `Ventas`
Impacto: `Alto`

Descripcion:

- consolidar formatos de impresion del expediente
- incluir ficha de separacion, contrato, venta e historial de pagos
- usar datos existentes en la venta

Siguiente paso:

- desarrollado ahora en `4-1_plan_ventas.md` como Fase 6

### Cotizador: checklist comercial de plusvalia por habilitaciones

Estado: `Idea`
Modulo: `Ventas | Cotizador`
Impacto: `Medio`

Descripcion:

- en el drawer cotizador, agregar un checklist interactivo (2 columnas) para estimar plusvalia comercial
- cada item mostrara: icono, etiqueta, porcentaje y casilla
- la grafica de plusvalia reaccionara en tiempo real segun checks activados
- reemplaza texto estatico inferior del card por controles de simulacion comercial

Checklist propuesto (borrador):

- servicios basicos completos (luz + agua + desague)
- gas domiciliario / GLP formal
- vias asfaltadas y acceso vehicular
- transporte publico cercano
- saneamiento registral (titulo)
- zonificacion favorable
- equipamientos cercanos (salud/colegio/comercio)
- seguridad e iluminacion publica

Siguiente paso:

- validar lista final y porcentajes comerciales
- definir libreria de iconos (Lucide o Tabler)
- mover a plan cuando se apruebe para implementacion
