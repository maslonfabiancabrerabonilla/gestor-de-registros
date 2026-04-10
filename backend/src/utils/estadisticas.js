// ── Utilidad: Cálculo de estadísticas ─────────────────────────
// Centraliza la lógica de asistencia, promedio y corte B/R/M
// usada tanto en estudiantes.js como en reportes.js.
import pool from '../db.js';

/**
 * Calcula estadísticas individuales de un estudiante: asistencia, promedio,
 * corte evaluativo (B/R/M) y alerta de inasistencia.
 * @param {number} estudiante_id - ID del estudiante.
 * @param {number} grupo_id      - ID del grupo al que pertenece.
 * @returns {Promise<{asistencias, total_clases, porcentaje_asistencia, promedio, total_evaluaciones, corte, alerta_inasistencia, provisional}>}
 */
export async function calcularEstadisticasEstudiante(estudiante_id, grupo_id) {
  const grupoRes = await pool.query(
    'SELECT total_clases_planificadas FROM grupos WHERE id = $1',
    [grupo_id]
  );
  const total_clases_planificadas = grupoRes.rows[0]?.total_clases_planificadas ?? null;

  const asistRes = await pool.query(
    `SELECT
       COUNT(CASE WHEN r.asistencia = 'A' THEN 1 END)::int AS asistencias,
       COUNT(t.id)::int                                      AS total_clases
     FROM turnos t
     LEFT JOIN registros r ON r.turno_id = t.id AND r.estudiante_id = $1
     WHERE t.grupo_id = $2
       AND t.tipo IN ('C', 'CP', 'PL')
       AND t.fecha IS NOT NULL`,
    [estudiante_id, grupo_id]
  );
  const { asistencias, total_clases } = asistRes.rows[0];

  const esProvisional = total_clases_planificadas === null;
  const denominador   = total_clases_planificadas ?? total_clases;
  const faltas        = total_clases - asistencias;
  const porcentaje_asistencia =
    denominador > 0 ? Math.max(0, Math.round(((denominador - faltas) / denominador) * 1000) / 10) : 100;

  const calRes = await pool.query(
    `SELECT ROUND(AVG(r.calificacion)::numeric, 1) AS promedio,
            COUNT(r.calificacion)::int              AS total_evaluaciones
     FROM registros r
     JOIN turnos t ON r.turno_id = t.id
     WHERE r.estudiante_id = $1
       AND r.calificacion IS NOT NULL`,
    [estudiante_id]
  );
  const promedio           = calRes.rows[0].promedio ? parseFloat(calRes.rows[0].promedio) : null;
  const total_evaluaciones = calRes.rows[0].total_evaluaciones;

  let corte = null;
  if (promedio !== null) {
    if      (promedio >= 4.0 && porcentaje_asistencia >= 80) corte = 'B';
    else if (promedio >= 3.0 && porcentaje_asistencia >= 70) corte = 'R';
    else                                                      corte = 'M';
  }

  const alerta_inasistencia =
    !esProvisional && denominador > 0 && faltas / denominador > 0.20;

  return { asistencias, total_clases, porcentaje_asistencia, promedio, total_evaluaciones, corte, alerta_inasistencia, provisional: esProvisional };
}

/**
 * Calcula asistencia, promedio y corte (B/R/M) para TODOS los
 * estudiantes de un grupo en 3 queries (evita N+1).
 * @param {number} grupo_id - ID del grupo.
 * @returns {Promise<Array<{nombre, promedio, porcentaje_asistencia, asistencias, total_clases, total_evaluaciones, corte, provisional}>>}
 */
export async function statsGrupo(grupo_id) {
  const grupoRes = await pool.query(
    `SELECT total_clases_planificadas FROM grupos WHERE id = $1`,
    [grupo_id]
  );
  const total_clases_planificadas = grupoRes.rows[0]?.total_clases_planificadas ?? null;

  const clasesRes = await pool.query(
    `SELECT COUNT(*)::int AS total_clases FROM turnos
     WHERE grupo_id = $1 AND tipo IN ('C', 'CP', 'PL') AND fecha IS NOT NULL`,
    [grupo_id]
  );
  const total_clases_dadas = clasesRes.rows[0].total_clases;
  const esProvisional      = total_clases_planificadas === null;
  const denominador        = total_clases_planificadas ?? total_clases_dadas;

  const statsRes = await pool.query(
    `SELECT
       e.id, e.nombre, e.orden_alfabetico,
       COUNT(CASE WHEN r.asistencia = 'A'
                   AND t.tipo IN ('C', 'CP', 'PL')
                   AND t.fecha IS NOT NULL THEN 1 END)::int          AS asistencias,
       ROUND(AVG(CASE WHEN r.calificacion IS NOT NULL
                       THEN r.calificacion END)::numeric, 1)           AS promedio,
       COUNT(CASE WHEN r.calificacion IS NOT NULL
                   THEN 1 END)::int           AS total_evaluaciones
     FROM estudiantes e
     LEFT JOIN registros r ON r.estudiante_id = e.id
     LEFT JOIN turnos    t ON r.turno_id = t.id
     WHERE e.grupo_id = $1
     GROUP BY e.id, e.nombre, e.orden_alfabetico
     ORDER BY e.orden_alfabetico`,
    [grupo_id]
  );

  return statsRes.rows.map(row => {
    const asistencias = row.asistencias;
    const promedio    = row.promedio ? parseFloat(row.promedio) : null;
    const faltas      = total_clases_dadas - asistencias;
    const pct         = denominador > 0
      ? Math.max(0, Math.round(((denominador - faltas) / denominador) * 1000) / 10)
      : 100;

    let corte = null;
    if (promedio !== null) {
      if      (promedio >= 4.0 && pct >= 80) corte = 'B';
      else if (promedio >= 3.0 && pct >= 70) corte = 'R';
      else                                    corte = 'M';
    }

    return {
      nombre:               row.nombre,
      promedio,
      porcentaje_asistencia: pct,
      asistencias,
      total_clases:         total_clases_dadas,
      total_evaluaciones:   row.total_evaluaciones,
      corte,
      provisional:          esProvisional,
    };
  });
}
