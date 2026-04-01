-- ============================================================
-- sql/init.sql — Schema inicial SGD-UCI
-- Idempotente: seguro para ejecutar varias veces (IF NOT EXISTS / ON CONFLICT)
-- Ejecutado automáticamente por PostgreSQL al crear el contenedor por primera vez
-- ============================================================

-- ── Tipos ENUM ───────────────────────────────────────────────
-- Crear tipo turno (idempotente: ignora duplicate_object si ya existe)
DO $$ BEGIN
  CREATE TYPE tipo_turno AS ENUM ('C', 'CP', 'PL', 'PP', 'PF', 'PE', 'EM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Crear tipo asistencia (idempotente)
DO $$ BEGIN
  CREATE TYPE asistencia_tipo AS ENUM ('A', 'F', 'NP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tabla GRUPOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grupos (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(255) NOT NULL UNIQUE,
  asignatura   VARCHAR(255) NOT NULL,
  semestre     VARCHAR(50),
  profesor_id  INT NOT NULL DEFAULT 1,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Tabla ESTUDIANTES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estudiantes (
  id                 SERIAL PRIMARY KEY,
  grupo_id           INT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  nombre             VARCHAR(255) NOT NULL,
  orden_alfabetico   INT NOT NULL,
  deleted_at         TIMESTAMP NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(grupo_id, nombre),
  CONSTRAINT orden_positivo CHECK (orden_alfabetico > 0)
);

CREATE INDEX IF NOT EXISTS idx_estudiantes_grupo_deleted ON estudiantes(grupo_id, deleted_at);

-- ── Tabla TURNOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turnos (
  id            SERIAL PRIMARY KEY,
  grupo_id      INT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  numero_turno  INT NOT NULL,
  fecha         DATE NOT NULL,
  tipo          tipo_turno NOT NULL,
  descripcion   VARCHAR(500),
  deleted_at    TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(grupo_id, numero_turno),
  CONSTRAINT numero_positivo CHECK (numero_turno > 0)
);

CREATE INDEX IF NOT EXISTS idx_turnos_grupo_fecha ON turnos(grupo_id, fecha);

-- ── Tabla REGISTROS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros (
  id             SERIAL PRIMARY KEY,
  turno_id       INT NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  estudiante_id  INT NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  asistencia     asistencia_tipo,
  calificacion   NUMERIC(3,1),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(turno_id, estudiante_id),
  CONSTRAINT cal_rango CHECK (calificacion >= 0 AND calificacion <= 5 OR calificacion IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_registros_estudiante_turno ON registros(estudiante_id, turno_id);

-- ── Tabla AUDIT_LOG ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  profesor_id INT NOT NULL,
  grupo_id    INT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  accion      VARCHAR(100) NOT NULL,
  detalles    JSONB,
  timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_grupo_ts ON audit_log(grupo_id, timestamp DESC);

-- ── Función: actualizar updated_at automáticamente ───────────
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Triggers updated_at ──────────────────────────────────────
DROP TRIGGER IF EXISTS trg_grupos_updated ON grupos;
CREATE TRIGGER trg_grupos_updated
  BEFORE UPDATE ON grupos
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trg_estudiantes_updated ON estudiantes;
CREATE TRIGGER trg_estudiantes_updated
  BEFORE UPDATE ON estudiantes
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trg_turnos_updated ON turnos;
CREATE TRIGGER trg_turnos_updated
  BEFORE UPDATE ON turnos
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trg_registros_updated ON registros;
CREATE TRIGGER trg_registros_updated
  BEFORE UPDATE ON registros
  FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- ── Dato inicial de ejemplo ──────────────────────────────────
INSERT INTO grupos (nombre, asignatura, semestre, profesor_id)
VALUES ('Grupo A', 'Estructuras de Datos', '2025-1', 1)
ON CONFLICT DO NOTHING;

-- ── Vista: Estadísticas por Estudiante ───────────────────────
-- Calcula asistencia, promedio y corte M/R/B en tiempo real.
-- Reglas confirmadas:
--   * Solo turnos tipo C/CP/PL cuentan para % asistencia
--   * Corte B: promedio >= 4.0 AND asistencia >= 80%
--   * Corte R: promedio >= 3.0 AND asistencia >= 70%
--   * Corte M: cualquier otro caso
--   * NP se omite del cálculo (solo aplica a PP/PF/PE/EM)
CREATE OR REPLACE VIEW v_estadisticas_estudiantes AS
WITH clases_por_grupo AS (
  SELECT grupo_id, COUNT(*)::int AS total_clases
  FROM   turnos
  WHERE  tipo IN ('C', 'CP', 'PL') AND deleted_at IS NULL
  GROUP BY grupo_id
)
SELECT
  e.id                                                            AS estudiante_id,
  e.grupo_id,
  e.nombre,
  COALESCE(c.total_clases, 0)                                    AS total_clases,
  COUNT(CASE WHEN r.asistencia = 'A'
              AND t.tipo IN ('C', 'CP', 'PL')
              AND t.deleted_at IS NULL THEN 1 END)::int           AS asistencias,
  ROUND(
    100.0 * COUNT(CASE WHEN r.asistencia = 'A'
                        AND t.tipo IN ('C', 'CP', 'PL')
                        AND t.deleted_at IS NULL THEN 1 END)
    / NULLIF(COALESCE(c.total_clases, 0), 0),
    1
  )                                                               AS porcentaje_asistencia,
  ROUND(
    AVG(CASE WHEN r.calificacion IS NOT NULL
              AND t.deleted_at IS NULL THEN r.calificacion END)::numeric,
    1
  )                                                               AS promedio,
  COUNT(CASE WHEN r.calificacion IS NOT NULL
              AND t.deleted_at IS NULL THEN 1 END)::int           AS total_evaluaciones,
  CASE
    WHEN AVG(CASE WHEN r.calificacion IS NOT NULL
                   AND t.deleted_at IS NULL THEN r.calificacion END) IS NULL
      THEN NULL
    WHEN AVG(CASE WHEN r.calificacion IS NOT NULL
                   AND t.deleted_at IS NULL THEN r.calificacion END) >= 4.0
         AND COUNT(CASE WHEN r.asistencia = 'A'
                         AND t.tipo IN ('C', 'CP', 'PL')
                         AND t.deleted_at IS NULL THEN 1 END)::numeric
             / NULLIF(COALESCE(c.total_clases, 0), 0) >= 0.80
      THEN 'B'
    WHEN AVG(CASE WHEN r.calificacion IS NOT NULL
                   AND t.deleted_at IS NULL THEN r.calificacion END) >= 3.0
         AND COUNT(CASE WHEN r.asistencia = 'A'
                         AND t.tipo IN ('C', 'CP', 'PL')
                         AND t.deleted_at IS NULL THEN 1 END)::numeric
             / NULLIF(COALESCE(c.total_clases, 0), 0) >= 0.70
      THEN 'R'
    ELSE 'M'
  END                                                             AS corte
FROM  estudiantes e
LEFT JOIN clases_por_grupo c  ON c.grupo_id = e.grupo_id
LEFT JOIN registros r         ON r.estudiante_id = e.id
LEFT JOIN turnos t            ON r.turno_id = t.id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.grupo_id, e.nombre, c.total_clases;
