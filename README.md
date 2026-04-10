# SGD-UCI — Sistema de Gestión Docente

Sistema web para el control de asistencia, calificaciones y reportes de grupos académicos en la Universidad de las Ciencias Informáticas (UCI).

---

## Tabla de Contenidos

1. [Arquitectura](#arquitectura)
2. [Requisitos](#requisitos)
3. [Instalación y Arranque](#instalación-y-arranque)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [API REST](#api-rest)
6. [Base de Datos](#base-de-datos)
7. [Testing](#testing)
8. [Comandos Útiles](#comandos-útiles)
9. [Limitaciones Conocidas](#limitaciones-conocidas)

---

## Arquitectura

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Frontend   │────▶│   Backend API    │────▶│   PostgreSQL 15    │
│  React 18   │     │  Express (Node)  │     │   (Alpine)         │
│  Vite 5     │     │  Puerto 3000     │     │   Puerto 5432      │
│  Tailwind   │     │                  │     │                    │
│  Puerto 5173│     │  Helmet · CORS   │     │  Volumen: datos    │
└─────────────┘     └──────────────────┘     └────────────────────┘
     SPA                  Docker                   Docker
```

- **Frontend**: React 18 + Vite 5 + Tailwind CSS 3.4 + React Router 6
- **Backend**: Node.js 18 + Express 4 + ExcelJS (ESM, `"type": "module"`)
- **Base de datos**: PostgreSQL 15-alpine, esquema gestionado por `sql/init.sql`
- **Contenedores**: Docker Compose orquesta `postgres` y `api`

---

## Requisitos

| Herramienta      | Versión mínima |
|------------------|----------------|
| Docker Desktop   | 4.x            |
| Node.js          | 18.x (solo para desarrollo frontend local) |
| npm              | 9.x            |
| Git              | 2.x            |

---

## Instalación y Arranque

### 1. Clonar el repositorio

```bash
git clone https://github.com/maslonfabiancabrerabonilla/gestor-de-registros.git
cd gestor-de-registros
```

### 2. Levantar backend + base de datos

```bash
docker-compose up -d
```

Esto crea los contenedores `docente_postgres` y `docente_api`. El backend espera al healthcheck de PostgreSQL antes de arrancar.

### 3. Levantar frontend (desarrollo)

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. El proxy de Vite redirige `/api` a `http://localhost:3000`.

### 4. Verificar salud

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"...","database":"connected"}
```

---

## Estructura del Proyecto

```
ProyectoGestorDeRegistro/
├── docker-compose.yml         # Orquestación Postgres + API
├── sql/
│   └── init.sql               # Schema DDL (idempotente)
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.js           # Entry point Express
│   │   ├── db.js              # Pool PostgreSQL (singleton)
│   │   └── routes/
│   │       ├── grupos.js      # CRUD grupos
│   │       ├── estudiantes.js # CRUD + bulk-import Excel
│   │       ├── turnos.js      # CRUD turnos
│   │       ├── registros.js   # Batch-save asistencia/calificaciones
│   │       └── reportes.js    # Exportación Excel + auditoría
│   └── tests/                 # 72 tests de integración
│       ├── grupos.test.js
│       ├── estudiantes.test.js
│       ├── turnos.test.js
│       ├── registros.test.js
│       ├── reportes.test.js
│       └── seguridad.test.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── src/
    │   ├── App.jsx            # Router principal
    │   ├── services/api.js    # Cliente HTTP (fetch)
    │   ├── pages/
    │   │   ├── PageGrupos.jsx     # Listado de grupos
    │   │   ├── PageRegistros.jsx  # Tabla de asistencia/calificaciones
    │   │   └── PageAdmin.jsx      # Administración del grupo
    │   ├── components/
    │   │   ├── ModalCrearGrupo.jsx
    │   │   ├── ModalEditarGrupo.jsx
    │   │   ├── ModalEstudiante.jsx     # Manual + bulk import
    │   │   ├── ModalEditarEstudiante.jsx
    │   │   ├── ModalTurno.jsx
    │   │   ├── ModalConfirmar.jsx
    │   │   └── TablaRegistros.jsx
    │   └── test/              # 30 tests unitarios/componente
    │       ├── setup.js
    │       ├── api.test.js
    │       ├── App.test.jsx
    │       ├── ModalConfirmar.test.jsx
    │       └── ModalEstudiante.test.jsx
    └── public/
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

| Método | Ruta                                        | Descripción                          |
|--------|---------------------------------------------|--------------------------------------|
| GET    | `/api/grupos/:id/estudiantes`               | Listar estudiantes del grupo (orden alfabético) |
| POST   | `/api/grupos/:id/estudiantes`               | Crear estudiante (`nombre`)          |
| PUT    | `/api/grupos/:gid/estudiantes/:eid`         | Actualizar nombre del estudiante     |
| DELETE | `/api/grupos/:gid/estudiantes/:eid`         | Eliminar estudiante                  |
| POST   | `/api/grupos/:id/estudiantes/bulk-import`   | Importar desde Excel (.xlsx/.xls)    |
| GET    | `/api/grupos/:id/estudiantes/estadisticas`  | Estadísticas: asistencia, promedio, corte |

### Turnos

| Método | Ruta                                  | Descripción                          |
|--------|---------------------------------------|--------------------------------------|
| GET    | `/api/grupos/:id/turnos`              | Listar turnos del grupo              |
| POST   | `/api/grupos/:id/turnos`              | Crear turno (`tipo`, `fecha?`, `descripcion?`) |
| PUT    | `/api/grupos/:gid/turnos/:tid`        | Actualizar turno                     |
| DELETE | `/api/grupos/:gid/turnos/:tid`        | Eliminar turno (renumera secuencialmente) |

**Tipos de turno válidos:** `C` (Clase), `CP` (Clase Práctica), `PL` (Práctica de Laboratorio), `PP` (Prueba Parcial), `PF` (Prueba Final), `PE` (Prueba Extraordinaria), `EM` (Examen)

### Registros

| Método | Ruta                          | Descripción                          |
|--------|-------------------------------|--------------------------------------|
| POST   | `/api/registros/batch-save`   | Guardar lote de registros (`turno_id`, `registros[]`) |

Cada registro: `{ estudiante_id, asistencia: 'A'|'F'|'NP', calificacion?: 2-5 }`

**Reglas de negocio:**
- Clases (`C`, `CP`, `PL`): calificación permitida solo con asistencia `A`, rango 2–5
- Evaluaciones (`PP`, `PF`, `PE`, `EM`): calificación obligatoria si asistencia es `A`, rango 2–5; `NP` sin calificación

### Reportes

| Método | Ruta                                       | Descripción                         |
|--------|--------------------------------------------|-------------------------------------|
| GET    | `/api/grupos/:id/reportes/corte`           | Excel con estadísticas de corte     |
| GET    | `/api/grupos/:id/reportes/matriz`          | Excel con matriz completa           |
| GET    | `/api/grupos/:id/audit-log`                | Log de auditoría (JSON)             |

### Health Check

| Método | Ruta       | Descripción              |
|--------|------------|--------------------------|
| GET    | `/health`  | Estado del servidor y BD |

---

## Base de Datos

### Diagrama de tablas

```
grupos (1) ──────< estudiantes (N)
  │                     │
  │                     │
  └──────< turnos (N)   │
               │         │
               └──< registros (N) ──> estudiante_id
```

### Tablas principales

| Tabla        | Descripción                                              |
|--------------|----------------------------------------------------------|
| `grupos`      | Grupos académicos (nombre único, asignatura, TCP)        |
| `estudiantes` | Estudiantes por grupo (nombre único por grupo, orden alfabético) |
| `turnos`      | Turnos/clases (tipo ENUM, fecha, número secuencial)      |
| `registros`   | Asistencia y calificación por turno-estudiante (UPSERT)  |
| `audit_log`   | Log de acciones con detalle JSONB                        |

### Vista: `v_estadisticas_estudiantes`

Calcula en tiempo real por estudiante:
- **% asistencia**: sobre turnos tipo C/CP/PL con fecha
- **Denominador**: `total_clases_planificadas` del grupo (si definido), sino clases dadas
- **Promedio**: media de calificaciones (excluyendo NP)
- **Corte**: B (≥4.0 y ≥80%), R (≥3.0 y ≥70%), M (otro caso)

### Acceso directo a la BD

| Campo      | Valor                |
|------------|----------------------|
| Host       | `localhost`          |
| Puerto     | `5432`               |
| Usuario    | `docente`            |
| Contraseña | `docente_dev_password` |
| BD         | `docente_db`         |

```bash
docker-compose exec postgres psql -U docente -d docente_db
```

---

## Testing

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

| Archivo              | Tests | Cobertura                                     |
|----------------------|-------|-----------------------------------------------|
| `grupos.test.js`     | 14    | CRUD, validación, duplicados, TCP             |
| `estudiantes.test.js`| 15    | CRUD, regex, XSS, orden alfabético, bulk      |
| `turnos.test.js`     | 16    | CRUD, 7 tipos, renumeración secuencial        |
| `registros.test.js`  | 15    | Batch-save, reglas clase/examen, upsert       |
| `reportes.test.js`   | 6     | Generación Excel, audit log                   |
| `seguridad.test.js`  | 6     | Helmet, SQL injection, XSS, JSON malformado   |

### Frontend — 30 tests unitarios y de componentes

Tecnología: Vitest + jsdom + React Testing Library

```bash
cd frontend
npm install
npm test
```

| Archivo                      | Tests | Cobertura                                    |
|------------------------------|-------|----------------------------------------------|
| `api.test.js`                | 9     | handleResponse, bulkImport, batchSave        |
| `App.test.jsx`               | 4     | Routing: /, /grupos/:id, /admin, 404         |
| `ModalConfirmar.test.jsx`    | 8     | Render, callbacks, variantes, cargando       |
| `ModalEstudiante.test.jsx`   | 9     | Manual, Excel, validación, duplicados        |

### Total: 102 tests automatizados

---

## Comandos Útiles

```bash
# Estado de contenedores
docker-compose ps

# Logs en tiempo real
docker-compose logs -f api
docker-compose logs -f postgres

# Parar servicios
docker-compose down

# Resetear BD (elimina todos los datos)
docker-compose down -v

# Rebuild backend (tras cambios en Dockerfile)
docker-compose build api && docker-compose up -d api

# Frontend en producción
cd frontend && npm run build && npm run preview
```

---

## Limitaciones Conocidas

| Problema | Detalle | Impacto |
|----------|---------|---------|
| Locale PostgreSQL | Alpine usa locale C; caracteres acentuados (Á, É) se ordenan después de Z | Nombres con acentos al inicio pueden aparecer al final de la lista |
| Autenticación | No implementada (MVP) — cualquier usuario accede a toda la información | No usar en producción sin agregar autenticación |
| Single-tenant | Un solo profesor (ID=1 hardcoded) | Diseñado para un único docente |

---

## Licencia

Proyecto académico — Universidad de las Ciencias Informáticas (UCI).

