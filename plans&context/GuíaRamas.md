# Guía de Flujo de Trabajo en Git (Para Principiantes)

Bienvenido(a) al equipo. Para mantener nuestro código ordenado y evitar perder el trabajo de nuestros compañeros, utilizamos un flujo de trabajo basado en ramas (branches). Este documento te explicará paso a paso cómo trabajar en tu día a día, descargar actualizaciones y subir tus cambios.

---

## 🌳 Nuestra Estructura de Ramas

Actualmente el repositorio está dividido en las siguientes ramas principales:

*   **`main`**: Es la rama de producción. Contiene el código estable y final. **No trabajamos directamente en esta rama.**
*   **`QA`**: Rama de pruebas (Quality Assurance). Aquí se juntan los cambios para ser probados exhaustivamente antes de pasar a main.
*   **`dev`**: Rama principal de desarrollo. Aquí se consolida el trabajo de todos los desarrolladores.
    *   **`Dev-Erwin`**: Rama de trabajo personal de Erwin.
    *   **`Dev-Elvin`**: Rama de trabajo personal de Elvin.
    *   **`Dev-Gelm`**: Rama de trabajo personal de Gelman.

---

## 🔄 El Ciclo de Trabajo Diario (Lo que debes hacer cada día)

Para evitar los temidos "conflictos de código", el orden ideal que debes seguir cada vez que vayas a iniciar a trabajar (o iniciar una nueva tarea) es el siguiente:

1.  **Bajar los cambios** de `dev` (o `main`) a tu rama personal para estar actulizado.
2.  **Trabajar** programando en tu máquina asegurándote de estar en tu rama.
3.  **Subir (Push)** tus cambios a tu rama personal en GitHub.
4.  **Integrar (Merge)** tus cambios de tu rama personal hacia la rama `dev`.

---

## 📖 Comandos Paso a Paso

*Usaremos la rama `dev-Gelm` como ejemplo. Simplemente cambia este nombre por tu rama personal (`Dev-Erwin` o `Dev-Elvin`).*

### 1. Bajar cambios a tu rama (Desde `dev` o `main`)
Antes de empezar a codificar, **siempre** asegúrate de tener la versión más reciente del trabajo del equipo. Habitualmente bajaremos los cambios de `dev`.

```bash
# 1. Asegúrate de estar posicionado en TU rama personal:
git checkout dev-Gelm

# 2. Descarga la información más reciente de las ramas remotas del servidor (GitHub):
git fetch

# 3. Trae (jala) los últimos cambios de la rama Dev hacia tu rama actual:
git pull origin dev

# (Nota: Si necesitas bajar cambios directo de la rama principal, el comando sería: git pull origin main)
```

> ⚠️ **Atención:** Al hacer `git pull`, Git intentará unir los códigos. Si modificaste el mismo archivo que otro compañero, ocurrirá un **conflicto**.
> *¿Qué hacer?* Abre tu editor (ej. VS Code), busca los archivos marcados con conflictos, elige con qué línea de código quieres quedarte, guárdalo y luego ejecuta:
> `git add .` seguido de `git commit -m "Resolviendo conflictos con Dev"`.


### 2. Trabajar y Subir cambios a TU propia rama
Una vez que has programado tu nueva tarea y comprobado que compila y funciona bien, es momento de respaldar tu trabajo en GitHub en tu rama.

```bash
# 1. Mira qué archivos has agregado o modificado:
git status

# 2. Agrega todos los cambios para prepararlos (el punto significa "todos los archivos"):
git add .

# 3. Crea el "paquete" o commit con un mensaje claro de lo que hiciste:
git commit -m "Agregando el diseño de la pantalla de inicio"

# 4. Sube este commit a tu rama personal en GitHub:
git push origin dev-Gelm
```
*¡Listo! Tu código está a salvo en la nube, pero todavía está solo en tu rama.*


### 3. Subir los cambios de tu rama hacia `dev`
Ahora que tu trabajo está completado en tu rama, queremos enviarlo a la rama `Dev` para que el resto del equipo pueda obtenerlo.

####  A través de la Consola (Merge local)
Si el equipo coordina realizar los "Merge" directamente desde la consola (Asegurate de haber subido ya tus cambios en tu rama), el proceso es:

```bash
# 1. Posiciónate temporalmente en la rama dev:
git checkout dev

# 2. Asegúrate de descargar lo último de dev por si alguien más subió algo mientras tú trabajabas:
git pull origin dev

# 3. Une los cambios de tu rama personal hacia dev:
git merge dev-Gelm

# 4. Sube la rama dev actualizada a GitHub:
git push origin dev

# 5. Regresa rápidamente a tu rama personal para continuar trabajando:
git checkout dev-Gelm
```

---

## 📝 Resumen Resumido (Cheat Sheet)

Pega esto en un post-it cerca de tu monitor:

1. **Actualizarme antes de iniciar:** `git checkout dev-MiNombre` ➔ `git pull origin dev`
2. **Hacer punto de guardado local:** `git add .` ➔ `git commit -m "Terminé módulo X"`
3. **Subir a mi nube:** `git push origin dev-MiNombre`
4. **Mandar a dev:** Abrir PR en GitHub apuntando hacia > `dev`
