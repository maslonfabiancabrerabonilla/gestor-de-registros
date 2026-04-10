// ── Utilidad: Cálculo de estadísticas en el cliente ───────────
// Extraído de TablaRegistros para reutilización.
import { TIPOS_CLASE } from '../constants.js';

/**
 * Calcula asistencia, promedio, corte B/R/M y alerta para un estudiante.
 * @param {object}  est   - Estudiante { id, nombre }.
 * @param {Array}   turnos - Lista de turnos del grupo.
 * @param {object}  registrosMap - Mapa turno_id → estudiante_id → registro.
 * @param {number|null} totalClasesPlanificadas - Clases planificadas del grupo.
 * @returns {{ asistencias, clasesDadas, denominador, pct, promedio, corte, alerta, esProvisional }}
 */
export function calcStats(est, turnos, registrosMap, totalClasesPlanificadas) {
  const turnosClase = turnos.filter(t => TIPOS_CLASE.includes(t.tipo) && t.fecha);

  const asistencias = turnosClase.filter(
    t => registrosMap[t.id]?.[est.id]?.asistencia === 'A'
  ).length;

  const clasesDadas   = turnosClase.length;
  const esProvisional = totalClasesPlanificadas == null;
  const denominador   = totalClasesPlanificadas ?? clasesDadas;
  const faltas        = clasesDadas - asistencias;
  const pctInasistencia = denominador > 0
    ? Math.round((faltas / denominador) * 1000) / 10
    : 0;
  const pct = Math.max(0, 100 - pctInasistencia);

  const cals = turnos
    .map(t => registrosMap[t.id]?.[est.id]?.calificacion)
    .filter(c => c != null);

  const promedio = cals.length > 0
    ? Math.round(cals.reduce((s, c) => s + parseFloat(c), 0) / cals.length * 10) / 10
    : null;

  let corte = null;
  if (promedio !== null) {
    if      (promedio >= 4.0 && pct >= 80) corte = 'B';
    else if (promedio >= 3.0 && pct >= 70) corte = 'R';
    else                                   corte = 'M';
  }

  const alerta = !esProvisional && denominador > 0 && faltas / denominador > 0.20;

  return { asistencias, clasesDadas, denominador, pct, promedio, corte, alerta, esProvisional };
}
