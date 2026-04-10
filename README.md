# SGD-UCI — Sistema de Gestión Docente

Sistema web para el control de asistencia, calificaciones y reportes de grupos académicos en la Universidad de las Ciencias Informáticas (UCI). Permite al docente gestionar grupos, estudiantes, turnos de clase, registros de asistencia/calificación y generar reportes de corte evaluativo en formato Excel.

---

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Tecnologías](#tecnologías)
3. [Requisitos](#requisitos)
4. [Instalación y Arranque](#instalación-y-arranque)
5. [Estructura del Proyecto](#estructura-del-proyecto)
6. [Backend — Descripción de Archivos](#backend--descripción-de-archivos)
7. [Frontend — Descripción de Archivos](#frontend--descripción-de-archivos)
8. [Infraestructura y Configuración](#infraestructura-y-configuración)
9. [Base de Datos](#base-de-datos)
10. [API REST](#api-rest)
11. [Reglas de Negocio](#reglas-de-negocio)
12. [Testing](#testing)
13. [Comandos Útiles](#comandos-útiles)
14. [Limitaciones Conocidas](#limitaciones-conocidas)

---

## Arquitectura General

```
┌─────────────────┐       ┌──────────────────────┐       ┌────────────────────┐
│    Frontend      │       │    Backend API        │       │   PostgreSQL 15    │
│  React 18 + Vite │──────▶│  Express (Node 18)    │──────▶│   (Alpine)         │
│  Tailwind CSS    │  /api │  Puerto 3000 (host)   │       │   Puerto 5432      │
│  Puerto 5173     │       │  Puerto 5000 (Docker) │       │                    │
│                  │       │  Helmet · CORS        │       │  Volumen: datos    │
└─────────────────┘       └──────────────────────┘       └────────────────────┘
       SPA                     Contenedor Docker              Contenedor Docker
```

El frontend (SPA) se comunica con el backend a través del proxy de Vite (`/api` → `http://localhost:3000`). El backend y la base de datos corren en contenedores Docker orquestados por Docker Compose.

---

## Tecnologías

| Capa           | Tecnología                              | Versión  |
|----------------|-----------------------------------------|----------|
| Frontend       | React + JSX                             | 18.3     |
| Bundler        | Vite                                    | 5.2      |
| Estilos        | Tailwind CSS                            | 3.4      |
| Ruteo          | React Router                            | 6.23     |
| Iconos         | Lucide React                            | 1.8      |
| Backend        | Node.js (ESM, `"type": "module"`)       | 18       |
| Framework HTTP | Express                                 | 4.18     |
| Base de datos  | PostgreSQL (Alpine)                     | 15       |
| Driver DB      | pg (node-postgres)                      | 8.x      |
| Excel          | ExcelJS                                 | 4.x      |
| Upload         | Multer (en memoria)                     | 1.x      |
| Seguridad      | Helmet + CORS                           | —        |
| Contenedores   | Docker + Docker Compose                 | —        |
| Tests backend  | Node.js test runner (`node:test`) + supertest | —  |
| Tests frontend | Vitest + React Testing Library + jsdom  | 4.1      |

---

## Requisitos

| Herramienta    | Versión mínima |
|----------------|----------------|
| Docker Desktop | 4.x            |
| Node.js        | 18.x (solo para desarrollo frontend local) |
| npm            | 9.x            |
| Git            | 2.x            |

---

## Instalación y Arranque

### 1. Clonar el repositorio

```bash
git clone https://github.com/maslonfabiancabrerabonilla/gestor-de-registros.git
cd gestor-de-registros
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
# Editar .env.local si se necesitan valores personalizados
```

### 3. Levantar backend + base de datos

```bash
docker-compose up -d
```

Esto crea los contenedores `docente_postgres` y `docente_api`. El backend espera al healthcheck de PostgreSQL antes de arrancar. El esquema de la base de datos se inicializa automáticamente con `sql/init.sql`.

### 4. Levantar frontend (desarrollo)

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. El proxy de Vite redirige `/api` a `http://localhost:3000`.

### 5. Verificar salud del sistema

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"...","database":"connected"}
```

---

## Estructura del Proyecto

```
ProyectoGestorDeRegistro/
│
├── docker-compose.yml              # Orquestación de contenedores (Postgres + API)
├── .env.example                    # Plantilla de variables de entorno
├── .gitignore                      # Exclusiones de Git
│
├── sql/
│   └── init.sql                    # DDL completo: tablas, índices, triggers, vista
│
├── backend/
│   ├── Dockerfile                  # Build multi-etapa (builder + runtime)
│   ├── package.json                # Dependencias y scripts del backend
│   ├── src/
│   │   ├── index.js                # Punto de entrada Express, middleware, rutas
│   │   ├── db.js                   # Pool PostgreSQL (singleton)
│   │   ├── routes/
│   │   │   ├── grupos.js           # CRUD de grupos académicos
│   │   │   ├── estudiantes.js      # CRUD + importación Excel de estudiantes
│   │   │   ├── turnos.js           # CRUD de turnos (clases y evaluaciones)
│   │   │   ├── registros.js        # Guardado por lote de asistencia/calificaciones
│   │   │   └── reportes.js         # Generación de reportes Excel + auditoría
│   │   └── utils/
│   │       ├── estadisticas.js     # Cálculo de estadísticas (individual y grupal)
│   │       ├── excelParser.js      # Parsing de archivos Excel + detección de duplicados
│   │       └── reordenar.js        # Reordenamiento alfabético de estudiantes
│   └── tests/
│       ├── grupos.test.js          # 14 tests — CRUD grupos
│       ├── estudiantes.test.js     # 15 tests — CRUD + bulk + orden
│       ├── turnos.test.js          # 16 tests — CRUD + 7 tipos + renumeración
│       ├── registros.test.js       # 15 tests — batch-save + reglas de negocio
│       ├── reportes.test.js        #  6 tests — Excel + auditoría
│       └── seguridad.test.js       #  6 tests — Helmet, SQL injection, XSS
│
└── frontend/
    ├── package.json                # Dependencias y scripts del frontend
    ├── vite.config.js              # Configuración Vite: proxy, Vitest, puerto
    ├── tailwind.config.js          # Configuración de Tailwind CSS
    ├── postcss.config.js           # PostCSS con Tailwind y autoprefixer
    ├── index.html                  # HTML raíz del SPA
    ├── public/                     # Assets estáticos
    ├── src/
    │   ├── main.jsx                # Punto de entrada React (BrowserRouter)
    │   ├── App.jsx                 # Definición de rutas del SPA
    │   ├── index.css               # Estilos globales + directivas Tailwind
    │   ├── constants.js            # Constantes compartidas (tipos, colores, badges)
    │   ├── services/
    │   │   └── api.js              # Cliente HTTP centralizado (fetch)
    │   ├── pages/
    │   │   ├── PageGrupos.jsx      # Página principal: listado de grupos
    │   │   ├── PageRegistros.jsx   # Página de registros: grilla + estadísticas
    │   │   └── PageAdmin.jsx       # Página de administración: log de auditoría
    │   ├── components/
    │   │   ├── TablaRegistros.jsx   # Grilla de asistencia/calificaciones (componente principal)
    │   │   ├── ModalCrearGrupo.jsx  # Modal para crear grupo
    │   │   ├── ModalEditarGrupo.jsx # Modal para editar grupo
    │   │   ├── ModalEstudiante.jsx  # Modal para agregar estudiante (manual/Excel)
    │   │   ├── ModalEditarEstudiante.jsx  # Modal para renombrar estudiante
    │   │   ├── ModalTurno.jsx       # Modal para crear/editar turno
    │   │   ├── ModalConfirmar.jsx   # Modal genérico de confirmación
    │   │   └── ModalManual.jsx      # Modal de manual de usuario
    │   ├── utils/
    │   │   ├── estadisticas.js      # Cálculo de estadísticas en el cliente
    │   │   └── descargarBlob.js     # Descarga de archivos blob
    │   └── test/
    │       ├── setup.js             # Setup de Vitest (jsdom)
    │       ├── api.test.js          #  9 tests — cliente HTTP
    │       ├── App.test.jsx         #  4 tests — ruteo del SPA
    │       ├── ModalConfirmar.test.jsx  # 8 tests — modal de confirmación
    │       └── ModalEstudiante.test.jsx # 9 tests — modal de estudiantes
    └── dist/                        # Build de producción (generado)
```

---

## Backend — Descripción de Archivos

### Punto de entrada y datos

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `src/index.js` | 67 | Punto de entrada del servidor Express. Configura middleware (Helmet, CORS, JSON), monta los 5 routers en sus rutas base, define el endpoint `/health` para verificar estado del servidor y conexión a BD. Escucha en el puerto definido por `PORT` (default 5000). Exporta `app` para que los tests puedan hacer requests sin levantar el puerto. |
| `src/db.js` | 15 | Crea y exporta un singleton del `Pool` de `pg` (node-postgres) usando la variable `DATABASE_URL`. Todas las rutas y utilidades importan este pool para ejecutar consultas SQL. |

### Rutas (`src/routes/`)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `grupos.js` | 166 | CRUD completo de grupos académicos. Al crear un grupo con `total_clases_planificadas`, genera automáticamente turnos plantilla (C, CP, PL). Registra acciones en `audit_log` (creación, edición, eliminación). Valida nombre único, asignatura requerida, y TCP no negativo. |
| `estudiantes.js` | 313 | CRUD de estudiantes con validación por regex (`NOMBRE_REGEX`: solo letras, espacios, acentos, ñ). Soporta importación masiva desde Excel vía Multer (máximo 5 MB, hasta 200 filas). Tras cada operación de creación, edición o eliminación, reordena automáticamente los estudiantes del grupo en orden alfabético. Incluye endpoint de estadísticas individuales. Delega lógica a `utils/estadisticas.js`, `utils/excelParser.js` y `utils/reordenar.js`. |
| `turnos.js` | 174 | CRUD de turnos de clase. Valida 7 tipos permitidos (`C`, `CP`, `PL`, `PP`, `PF`, `PE`, `EM`), unicidad de fecha por grupo, y formato de fecha válido. Al eliminar un turno, renumera secuencialmente los restantes del mismo tipo para mantener numeración continua (ej: C1, C2, C3). Registra acciones en `audit_log`. |
| `registros.js` | 138 | Guardado atómico (transaccional) de registros de asistencia y calificación por turno. Valida que los estudiantes pertenezcan al grupo del turno, que el turno tenga fecha asignada, y aplica reglas diferenciadas para clases vs. evaluaciones. Usa `INSERT ... ON CONFLICT DO UPDATE` (UPSERT) para permitir reenvíos. |
| `reportes.js` | 186 | Generación de dos tipos de reporte Excel: **corte evaluativo** (estadísticas con colores B/R/M por estudiante) y **matriz completa** (estudiantes × turnos con todas las asistencias y calificaciones). También expone el log de auditoría (últimas 200 acciones). Usa `statsGrupo()` de `utils/estadisticas.js` para evitar consultas N+1. |

### Utilidades (`src/utils/`)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `estadisticas.js` | 137 | Lógica centralizada de cálculo de estadísticas. Exporta dos funciones: `calcularEstadisticasEstudiante(estudiante_id, grupo_id)` para un estudiante individual, y `statsGrupo(grupo_id)` que calcula las estadísticas de todos los estudiantes del grupo en solo 3 queries (evita N+1). Calcula: % asistencia, promedio, corte (B/R/M), alerta de inasistencia, indicador provisional. Usado por `estudiantes.js` y `reportes.js`. |
| `excelParser.js` | 57 | Parsing de archivos Excel (.xlsx/.xls) para importación masiva de estudiantes. Exporta `parsearExcel(buffer)` que extrae nombres de la primera columna (máximo 200 filas, omite celdas vacías) y `detectarDuplicadosEnArchivo(nombres)` que identifica duplicados dentro del mismo archivo. Lanza errores descriptivos si el archivo está vacío, no tiene hojas, o excede el límite. |
| `reordenar.js` | 19 | Función reutilizable `reordenarEstudiantes(client, grupo_id)` que actualiza el campo `orden_alfabetico` de todos los estudiantes de un grupo usando `ROW_NUMBER() OVER (ORDER BY LOWER(nombre))`. Recibe el `client` de una transacción activa. Consolida una query que antes estaba duplicada 4 veces en `estudiantes.js`. |

### Tests (`tests/`)

| Archivo | Tests | Qué verifica |
|---------|-------|--------------|
| `grupos.test.js` | 14 | CRUD completo, validaciones (nombre vacío, duplicado, sin asignatura), TCP negativo, creación de turnos plantilla. |
| `estudiantes.test.js` | 15 | CRUD, validación por regex, caracteres inválidos, números en nombre, duplicados, orden alfabético secuencial, estadísticas. |
| `turnos.test.js` | 16 | CRUD para los 7 tipos de turno, renumeración secuencial al eliminar, validación de fechas, unicidad de fecha. |
| `registros.test.js` | 15 | Batch-save, reglas de clase (calificación solo con asistencia), reglas de evaluación (NP sin nota, obligatoriedad), rango 2-5, UPSERT, fecha requerida, estudiantes de otro grupo. |
| `reportes.test.js` | 6 | Generación de Excel de corte, matriz completa, 404 para grupo inexistente, grupo sin turnos, log de auditoría. |
| `seguridad.test.js` | 6 | Headers Helmet, ruta 404, JSON malformado, SQL injection en parámetros, XSS almacenado como texto plano. |

---

## Frontend — Descripción de Archivos

### Punto de entrada y configuración

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `src/main.jsx` | 12 | Punto de entrada de React. Monta `<App />` dentro de `<BrowserRouter>` y `<StrictMode>` en el elemento `#root` del HTML. |
| `src/App.jsx` | 15 | Define las 3 rutas del SPA: `/` → PageGrupos, `/grupos/:id` → PageRegistros, `/grupos/:id/admin` → PageAdmin. Cualquier ruta no reconocida redirige a `/`. |
| `src/index.css` | — | Directivas `@tailwind` (base, components, utilities) y estilos globales personalizados (scrollbar, etc.). |
| `src/constants.js` | 20 | Constantes compartidas entre componentes: `TIPOS_CLASE` (tipos que son clases: C, CP, PL), `TIPO_COLOR` (colores de badge por tipo de turno), `ASIST_BG` (fondos de celda por asistencia: A=verde, F=rojo, NP=gris), `CORTE_BADGE` (estilos de badge para corte B/R/M). |

### Servicio HTTP (`src/services/`)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `api.js` | 97 | Cliente HTTP centralizado que encapsula todas las llamadas `fetch` al backend. Expone funciones nombradas para cada endpoint: `getGrupos()`, `createGrupo()`, `getEstudiantes()`, `bulkImportEstudiantes()`, `getTurnos()`, `getRegistrosTurno()`, `batchSave()`, `generarCorte()`, `exportarMatriz()`, `getAuditoria()`, entre otras. Maneja errores HTTP con `handleResponse()` que parsea el JSON de error del servidor. |

### Páginas (`src/pages/`)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `PageGrupos.jsx` | 241 | Página principal "Mis Grupos". Muestra la lista de grupos del docente en tarjetas con opciones para crear, editar y eliminar. Incluye botón de ayuda que abre el manual de usuario. Gestiona estados de carga, errores y los modales de CRUD. Header con título y marca institucional. |
| `PageRegistros.jsx` | 374 | Página central del sistema. Muestra el nombre del grupo, resumen de turnos (clases y evaluaciones), y renderiza `<TablaRegistros>` como componente hijo. Permite crear/editar/eliminar turnos, agregar/editar/eliminar estudiantes, y exportar reportes Excel (corte evaluativo y matriz completa). Calcula el resumen de turnos usando la constante `TIPOS_CLASE`. Header compacto con navegación de vuelta a grupos y acceso a administración. |
| `PageAdmin.jsx` | 115 | Página de administración que muestra el log de auditoría del grupo (últimas 200 acciones). Cada entrada muestra la acción realizada, los detalles en formato legible y la fecha/hora. Header consistente con las demás páginas. |

### Componentes (`src/components/`)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `TablaRegistros.jsx` | 433 | Componente principal de la grilla de datos. Renderiza una tabla con estudiantes como filas y turnos como columnas. Cada celda permite editar asistencia (A/F/NP) y calificación (2-5). Implementa guardado por lote: los cambios se acumulan en estado local y se envían al servidor al presionar "Guardar" por turno. Muestra estadísticas en tiempo real (% asistencia, promedio, corte B/R/M, alertas) calculadas con `calcStats`. Diferencia visualmente clases de evaluaciones, marca celdas con cambios pendientes (borde ámbar), y ofrece botones de guardar/descartar por turno. |
| `ModalCrearGrupo.jsx` | 92 | Modal con formulario para crear un nuevo grupo. Campos: nombre (requerido), asignatura (requerido), semestre (opcional), total de clases planificadas (opcional, numérico). Valida campos y muestra errores del servidor. Estado de carga mientras se envía. |
| `ModalEditarGrupo.jsx` | 92 | Modal para editar un grupo existente. Pre-carga los valores actuales del grupo. Mismos campos que el de creación. Envía solo los campos modificados. |
| `ModalEstudiante.jsx` | 250 | Modal con dos modos de operación: **manual** (campo de texto para un estudiante) y **Excel** (selector de archivo .xlsx/.xls para importación masiva). En modo Excel, muestra un resumen del resultado de la importación con conteo de insertados, duplicados ignorados y errores con detalle por fila. Valida el nombre con `NOMBRE_REGEX` en modo manual. |
| `ModalEditarEstudiante.jsx` | 65 | Modal para renombrar un estudiante existente. Pre-carga el nombre actual. No realiza acción si el nombre no cambió. Valida con `NOMBRE_REGEX`. |
| `ModalTurno.jsx` | 145 | Modal para crear o editar un turno. Agrupa los tipos en dos secciones: "Clases" (C, CP, PL) y "Evaluaciones" (PP, PF, PE, EM) con selección por radio buttons. Campos: tipo (requerido), fecha (opcional, con advertencia si no se asigna), descripción (opcional). Soporta modo creación y modo edición. |
| `ModalConfirmar.jsx` | 58 | Modal genérico de confirmación reutilizable. Usado para confirmar eliminaciones. Props: título, mensaje, texto del botón, variante visual (peligro/rojo o advertencia/ámbar), estado de carga, error. Emite callbacks `onConfirmar` y `onCerrar`. |
| `ModalManual.jsx` | 158 | Modal de ayuda que muestra el manual de usuario del sistema. Dividido en 7 secciones: Grupos, Estudiantes, Turnos, Registros, Estadísticas y Corte, Exportación, Administración. Cada sección contiene pares término-definición que explican las funcionalidades al usuario. |

### Utilidades (`src/utils/`)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `estadisticas.js` | 46 | Réplica en el cliente de la lógica de estadísticas del servidor. Exporta `calcStats(estudiante, turnos, registrosMap, totalClasesPlanificadas)` que calcula en tiempo real: asistencias, clases dadas, % asistencia, promedio de calificaciones, corte (B/R/M), alerta de inasistencia, e indicador de estadísticas provisionales (cuando se usa TCP como denominador). Permite mostrar estadísticas actualizadas instantáneamente sin esperar al servidor. |
| `descargarBlob.js` | 11 | Utilidad para descargar un `Blob` como archivo en el navegador. Crea un URL temporal con `URL.createObjectURL`, dispara la descarga mediante un `<a>` invisible, y limpia el URL. Usado por `PageRegistros` para descargar los reportes Excel. |

### Tests (`src/test/`)

| Archivo | Tests | Qué verifica |
|---------|-------|--------------|
| `setup.js` | — | Configuración de Vitest: entorno jsdom, limpieza de mocks entre tests. |
| `api.test.js` | 9 | `handleResponse` (éxito, error con JSON, error sin JSON), `bulkImportEstudiantes` (envió FormData), `batchSave` (payload correcto, error HTTP). |
| `App.test.jsx` | 4 | Renderizado de rutas: `/` muestra PageGrupos, `/grupos/:id` muestra PageRegistros, `/grupos/:id/admin` muestra PageAdmin, ruta no existente redirige a `/`. |
| `ModalConfirmar.test.jsx` | 8 | Renderizado de texto, callbacks onConfirmar/onCerrar, variantes peligro/advertencia, estado cargando (botón deshabilitado, spinner), muestra de errores. |
| `ModalEstudiante.test.jsx` | 9 | Modo manual (envío, validación nombre vacío, caracteres inválidos), modo Excel (selección archivo, importación exitosa, manejo de duplicados, errores del servidor). |

---

## Infraestructura y Configuración

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `docker-compose.yml` | 79 | Define 2 servicios: **postgres** (PostgreSQL 15-alpine con volumen persistente, healthcheck, puerto 5432) y **api** (build desde `backend/Dockerfile`, puerto 3000→5000, depends_on postgres healthy). Red interna `docente_network`. Variables de entorno para credenciales de BD. |
| `backend/Dockerfile` | 42 | Build multi-etapa: etapa **builder** instala dependencias npm, etapa **runtime** copia solo los artefactos necesarios. Corre como usuario no-root `node` por seguridad. Healthcheck integrado con `GET /health`. Puerto 5000. |
| `sql/init.sql` | 264 | Esquema completo de la base de datos (idempotente). Define: tipo ENUM `tipo_turno` (7 valores) y `asistencia_tipo` (A, F, NP), 5 tablas (`grupos`, `estudiantes`, `turnos`, `registros`, `audit_log`), índices, constraints (UNIQUE, CHECK, FK con CASCADE), triggers para `updated_at`, y la vista materializada `v_estadisticas_estudiantes`. Inserta datos de ejemplo. |
| `vite.config.js` | 25 | Configuración de Vite: plugin React, puerto 5173, proxy de `/api` y `/health` al backend (`http://localhost:3000`), configuración de Vitest (jsdom, globals, setup file). |
| `.env.example` | 19 | Plantilla de variables de entorno: credenciales PostgreSQL, puerto del servidor, DATABASE_URL, nivel de log. No se commitean los `.env` reales. |
| `.gitignore` | 35 | Excluye: `.env*` (excepto `.env.example`), `node_modules/`, `dist/`, logs, archivos de IDE, archivos del SO, volúmenes Docker. |

---

## Base de Datos

### Diagrama de tablas

```
grupos (1) ──────< estudiantes (N)
  │                      │
  │                      │
  └──────< turnos (N)    │
               │          │
               └───< registros (N)
                    FK: estudiante_id
                    FK: turno_id
                    UNIQUE(turno_id, estudiante_id)

audit_log ──── FK: grupo_id
```

### Tablas principales

| Tabla          | Columnas clave                                           | Descripción |
|----------------|----------------------------------------------------------|-------------|
| `grupos`       | `id`, `nombre` (UNIQUE), `asignatura`, `semestre`, `total_clases_planificadas` | Grupos académicos del docente. TCP define el denominador para % asistencia. |
| `estudiantes`  | `id`, `grupo_id` (FK), `nombre`, `orden_alfabetico`     | Estudiantes por grupo. Nombre único dentro del grupo. Orden actualizado automáticamente. |
| `turnos`       | `id`, `grupo_id` (FK), `tipo` (ENUM), `numero`, `fecha`, `descripcion` | Turnos de clase/evaluación. 7 tipos posibles. Numerados secuencialmente por tipo dentro del grupo. |
| `registros`    | `id`, `turno_id` (FK), `estudiante_id` (FK), `asistencia` (ENUM), `calificacion` (2-5 nullable) | Asistencia y calificación por celda (turno × estudiante). UPSERT en guardados sucesivos. |
| `audit_log`    | `id`, `grupo_id` (FK), `accion`, `detalle` (JSONB), `created_at` | Registro inmutable de todas las acciones realizadas sobre un grupo. |

### Vista: `v_estadisticas_estudiantes`

Vista SQL que calcula en tiempo real por cada estudiante:
- **% asistencia**: asistencias / denominador × 100 (solo turnos tipo C/CP/PL con fecha)
- **Denominador**: `total_clases_planificadas` del grupo si está definido, sino cantidad de clases dadas
- **Promedio**: media aritmética de calificaciones (excluyendo NP y turnos sin registro)
- **Corte**: B (promedio ≥ 4.0 y asistencia ≥ 80%), R (promedio ≥ 3.0 y asistencia ≥ 70%), M (otro caso)

### Acceso directo a la BD

| Campo      | Valor                  |
|------------|------------------------|
| Host       | `localhost`            |
| Puerto     | `5432`                 |
| Usuario    | `docente`              |
| Contraseña | `docente_dev_password` |
| BD         | `docente_db`           |

```bash
docker-compose exec postgres psql -U docente -d docente_db
```

---

## API REST

Base URL: `http://localhost:3000`

### Grupos

| Método | Ruta                  | Descripción                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/api/grupos`         | Listar todos los grupos              |
| GET    | `/api/grupos/:id`     | Obtener grupo por ID                 |
| POST   | `/api/grupos`         | Crear grupo (`nombre`, `asignatura`, `semestre?`, `total_clases_planificadas?`) |
| PUT    | `/api/grupos/:id`     | Actualizar grupo                     |
| DELETE | `/api/grupos/:id`     | Eliminar grupo (cascada)             |

### Estudiantes

| Método | Ruta                                              | Descripción |
|--------|----------------------------------------------------|-------------|
| GET    | `/api/grupos/:id/estudiantes`                     | Listar estudiantes del grupo (orden alfabético) |
| GET    | `/api/grupos/:gid/estudiantes/:eid`               | Obtener estudiante específico |
| GET    | `/api/grupos/:gid/estudiantes/:eid/estadisticas`  | Estadísticas individuales (asistencia, promedio, corte) |
| POST   | `/api/grupos/:id/estudiantes`                     | Crear estudiante (`nombre`) |
| POST   | `/api/grupos/:id/estudiantes/bulk-import`          | Importar desde Excel (.xlsx/.xls, max 200 filas, 5 MB) |
| PUT    | `/api/grupos/:gid/estudiantes/:eid`               | Actualizar nombre del estudiante |
| DELETE | `/api/grupos/:gid/estudiantes/:eid`               | Eliminar estudiante |

### Turnos

| Método | Ruta                                  | Descripción |
|--------|---------------------------------------|-------------|
| GET    | `/api/grupos/:id/turnos`              | Listar turnos del grupo |
| POST   | `/api/grupos/:id/turnos`              | Crear turno (`tipo`, `fecha?`, `descripcion?`) |
| PUT    | `/api/grupos/:gid/turnos/:tid`        | Actualizar turno |
| DELETE | `/api/grupos/:gid/turnos/:tid`        | Eliminar turno (renumera secuencialmente) |

### Registros

| Método | Ruta                              | Descripción |
|--------|-----------------------------------|-------------|
| GET    | `/api/registros/turno/:turno_id`  | Obtener registros de un turno |
| POST   | `/api/registros/batch-save`       | Guardar lote de registros (`turno_id`, `registros[]`) |

Cada registro: `{ estudiante_id, asistencia: 'A'|'F'|'NP', calificacion?: 2-5 }`

### Reportes y Exportación

| Método | Ruta                                           | Descripción |
|--------|-------------------------------------------------|-------------|
| POST   | `/api/grupos/:id/reportes/generar-corte`       | Excel con corte evaluativo (colores B/R/M) |
| GET    | `/api/grupos/:id/exportar/matriz-completa`     | Excel con grilla completa (estudiantes × turnos) |
| GET    | `/api/grupos/:id/auditoria`                    | Log de auditoría (últimas 200 acciones, JSON) |

### Health Check

| Método | Ruta       | Descripción                          |
|--------|------------|--------------------------------------|
| GET    | `/health`  | Estado del servidor y conexión a BD  |

---

## Reglas de Negocio

### Tipos de turno

| Código | Nombre                   | Categoría   |
|--------|--------------------------|-------------|
| `C`    | Conferencia              | Clase       |
| `CP`   | Clase Práctica           | Clase       |
| `PL`   | Práctica de Laboratorio  | Clase       |
| `PP`   | Prueba Parcial           | Evaluación  |
| `PF`   | Prueba Final             | Evaluación  |
| `PE`   | Prueba Extraordinaria    | Evaluación  |
| `EM`   | Examen Mundial           | Evaluación  |

### Asistencia y calificación

| Escenario | Asistencia | Calificación | Regla |
|-----------|------------|--------------|-------|
| Clase — asistió | `A` | 2–5 (opcional) | Calificación permitida solo con asistencia |
| Clase — faltó | `F` | — | No se permite calificación |
| Evaluación — asistió | `A` | 2–5 (obligatoria) | Debe tener calificación si asiste |
| Evaluación — no presentó | `NP` | — | Sin calificación |

### Corte evaluativo

| Corte | Condición |
|-------|-----------|
| **B** (Bien) | Promedio ≥ 4.0 **y** asistencia ≥ 80% |
| **R** (Regular) | Promedio ≥ 3.0 **y** asistencia ≥ 70% |
| **M** (Mal) | Cualquier otro caso |

### Validación de nombres

Los nombres de estudiantes deben cumplir: solo letras (incluyendo acentos y ñ), espacios, y mínimo 3 caracteres. No se permiten números ni caracteres especiales.

---

## Testing

### Total: 102 tests automatizados

### Backend — 72 tests de integración

Tecnología: Node.js native test runner (`node:test`) + `supertest`

```bash
# Requisito: contenedores corriendo (docker-compose up -d)
cd backend
npm install
$env:DATABASE_URL = "postgresql://docente:docente_dev_password@localhost:5432/docente_db"
$env:NODE_ENV = "test"
npm test
```

| Archivo              | Tests | Cobertura |
|----------------------|-------|-----------|
| `grupos.test.js`     | 14    | CRUD, validación, duplicados, TCP, turnos plantilla |
| `estudiantes.test.js`| 15    | CRUD, regex, XSS, orden alfabético, bulk import |
| `turnos.test.js`     | 16    | CRUD, 7 tipos, renumeración secuencial, fechas |
| `registros.test.js`  | 15    | Batch-save, reglas clase/evaluación, UPSERT, rango |
| `reportes.test.js`   | 6     | Generación Excel, 404, grupo sin turnos, auditoría |
| `seguridad.test.js`  | 6     | Helmet, SQL injection, XSS, JSON malformado |

### Frontend — 30 tests unitarios y de componentes

Tecnología: Vitest + jsdom + React Testing Library

```bash
cd frontend
npm install
npm test
```

| Archivo                      | Tests | Cobertura |
|------------------------------|-------|-----------|
| `api.test.js`                | 9     | handleResponse, bulkImport, batchSave |
| `App.test.jsx`               | 4     | Routing: /, /grupos/:id, /admin, 404 |
| `ModalConfirmar.test.jsx`    | 8     | Render, callbacks, variantes, cargando |
| `ModalEstudiante.test.jsx`   | 9     | Manual, Excel, validación, duplicados |

---

## Comandos Útiles

```bash
# ─── Docker ──────────────────────────────────────────────
docker-compose ps                # Estado de contenedores
docker-compose logs -f api       # Logs del backend en tiempo real
docker-compose logs -f postgres  # Logs de PostgreSQL en tiempo real
docker-compose down              # Parar servicios
docker-compose down -v           # Parar servicios y eliminar datos
docker-compose build api         # Rebuild del backend
docker-compose up -d             # Levantar servicios

# ─── Frontend ────────────────────────────────────────────
cd frontend
npm run dev                      # Servidor de desarrollo (puerto 5173)
npm run build                    # Build de producción (genera dist/)
npm run preview                  # Previsualizar build de producción
npm test                         # Ejecutar tests (Vitest)
npm run test:watch               # Tests en modo watch

# ─── Backend (requiere contenedores corriendo) ──────────
cd backend
npm test                         # Ejecutar 72 tests de integración
npm run dev                      # Servidor con nodemon (auto-restart)

# ─── Base de datos ───────────────────────────────────────
docker-compose exec postgres psql -U docente -d docente_db
```

---

## Limitaciones Conocidas

| Problema | Detalle | Impacto |
|----------|---------|---------|
| Locale PostgreSQL | Alpine usa locale C; caracteres acentuados (Á, É) se ordenan después de Z en `ORDER BY` | Nombres con acentos al inicio pueden aparecer al final de la lista |
| Autenticación | No implementada (MVP) — cualquier usuario accede a toda la información | No usar en producción sin agregar autenticación |
| Single-tenant | Un solo profesor (ID=1 hardcoded) | Diseñado para un único docente |
| Frontend estático | No se sirve desde el backend; requiere servidor Vite o build aparte | En producción se necesita `npm run build` y un servidor estático |

---

## Licencia

Proyecto académico — Universidad de las Ciencias Informáticas (UCI).

