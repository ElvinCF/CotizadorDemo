# Guia de Ramas y Flujo de Trabajo

Actualizado: `2026-03-22`

## Objetivo

Mantener un flujo simple, repetible y seguro para trabajar en equipo sin perder cambios.

## Estructura de ramas

- `main`: produccion
- `QA`: validacion previa a produccion
- `dev`: integracion principal del equipo
- `Dev-Elvin`, `Dev-Erwin`, `Dev-Gelm`: ramas personales

## Regla base

Nadie trabaja directo en `main`.  
El trabajo diario ocurre en la rama personal y luego se integra hacia `dev`.

## Flujo diario recomendado

### 1. Actualizar rama personal

```bash
git checkout Dev-TuNombre
git fetch origin
git pull origin dev
```

### 2. Trabajar y guardar cambios

```bash
git status
git add .
git commit -m "Describe el cambio"
git push origin Dev-TuNombre
```

### 3. Integrar a `dev`

Opcion recomendada:

- abrir PR desde tu rama personal hacia `dev`

Opcion por consola si el equipo ya lo acordo:

```bash
git checkout dev
git pull origin dev
git merge Dev-TuNombre
git push origin dev
git checkout Dev-TuNombre
```

## Manejo de conflictos

Si `git pull origin dev` o `git merge` genera conflicto:

1. revisar archivos en conflicto
2. decidir que bloque conservar o como combinar ambos
3. guardar
4. ejecutar:

```bash
git add .
git commit -m "Resuelve conflictos con dev"
```

## Regla de seguridad

Antes de mergear a `dev`, validar al menos:

- compila
- no rompe flujo principal
- no deja archivos temporales o secretos

## Cheat sheet

Actualizarme:

```bash
git checkout Dev-TuNombre
git pull origin dev
```

Guardar y subir:

```bash
git add .
git commit -m "Describe el cambio"
git push origin Dev-TuNombre
```

Mandar a `dev`:

- PR hacia `dev`

## Regla de mantenimiento de este documento

Actualizar este archivo solo si cambia:

- estrategia de ramas
- politica de merge
- politica de PR o validacion
