// ── Rutas: Reportes y Exportación ────────────────────────────
// Montado en: /api/grupos  →  /:grupo_id/reportes/... y /:grupo_id/exportar/...
import { Router } from 'express';
import ExcelJS   from 'exceljs';
import pool      from '../db.js';

const router = Router();

// Colores para cortes (ARGB con alpha FF = opaco)
const COLOR_CORTE = { B: 'FF90EE90', R: 'FFFFD700', M: 'FFFF6961' };
const OBS_CORTE  = { B: 'Excelente', R: 'Revisar',  M: 'Riesgo', null: '' };

// ─────────────────────────────────────────────────────────────
// Helper: estadísticas de todos los estudiantes de un grupo
// en 2 queries (evita N+1)
// ─────────────────────────────────────────────────────────────
async function statsGrupo(grupo_id) {
  // Total de clases planificadas (si está definido) y clases dadas
  const grupoRes = await pool.query(
    `SELECT total_clases_planificadas FROM grupos WHERE id = $1`,
    [grupo_id]
  );
  const total_clases_planificadas = grupoRes.rows[0]?.total_clases_planificadas ?? null;

  // Total de turnos tipo clase para el grupo
  const clasesRes = await pool.query(
    `SELECT COUNT(*)::int AS total_clases FROM turnos
     WHERE grupo_id = $1 AND tipo IN ('C', 'CP', 'PL') AND deleted_at IS NULL`,
    [grupo_id]
  );
  const total_clases_dadas = clasesRes.rows[0].total_clases;
  const esProvisional      = total_clases_planificadas === null;
  const denominador        = total_clases_planificadas ?? total_clases_dadas;

  // Asistencias y promedios por estudiante
  const statsRes = await pool.query(
    `SELECT
       e.id, e.nombre, e.orden_alfabetico,
       COUNT(CASE WHEN r.asistencia = 'A'
                   AND t.tipo IN ('C', 'CP', 'PL')
                   AND t.deleted_at IS NULL THEN 1 END)::int          AS asistencias,
       ROUND(AVG(CASE WHEN r.calificacion IS NOT NULL
                       AND t.deleted_at IS NULL
                       THEN r.calificacion END)::numeric, 1)           AS promedio,
       COUNT(CASE WHEN r.calificacion IS NOT NULL
                   AND t.deleted_at IS NULL THEN 1 END)::int           AS total_evaluaciones
     FROM estudiantes e
     LEFT JOIN registros r ON r.estudiante_id = e.id
     LEFT JOIN turnos    t ON r.turno_id = t.id
     WHERE e.grupo_id = $1 AND e.deleted_at IS NULL
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
      nombre:              row.nombre,
      promedio,
      porcentaje_asistencia: pct,
      asistencias,
      total_clases:        total_clases_dadas,
      total_evaluaciones:  row.total_evaluaciones,
      corte,
      provisional:         esProvisional,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// POST /api/grupos/:grupo_id/reportes/generar-corte
// Genera Excel de corte evaluativo M/R/B
// ─────────────────────────────────────────────────────────────
router.post('/:grupo_id/reportes/generar-corte', async (req, res, next) => {
  try {
    const { grupo_id }                      = req.params;
    const { nombre_reporte = 'Corte Evaluativo' } = req.body;

    // Verificar grupo
    const grupoRes = await pool.query('SELECT * FROM grupos WHERE id = $1', [grupo_id]);
    if (!grupoRes.rows.length) return res.status(404).json({ error: 'Grupo no encontrado' });
    const grupo = grupoRes.rows[0];

    // Validar dataset mínimo
    const turnosCount = await pool.query(
      `SELECT COUNT(*)::int AS count FROM turnos
       WHERE grupo_id = $1 AND deleted_at IS NULL`,
      [grupo_id]
    );
    if (turnosCount.rows[0].count === 0) {
      return res.status(400).json({
        error: 'Dataset vacío. Requiere mínimo 1 turno registrado.',
      });
    }

    const stats = await statsGrupo(grupo_id);

    // ── Construir Excel ───────────────────────────────────────
    const wb  = new ExcelJS.Workbook();
    wb.creator = 'SGD-UCI';

    // Hoja 1: Corte Evaluativo
    const ws1 = wb.addWorksheet('Corte Evaluativo');

    // Cabecera informativa
    ws1.getRow(1).getCell(1).value = `Grupo: ${grupo.nombre} | Asignatura: ${grupo.asignatura} | Semestre: ${grupo.semestre || '-'}`;
    ws1.getRow(2).getCell(1).value = nombre_reporte;
    ws1.getRow(3).getCell(1).value = `Fecha generación: ${new Date().toLocaleDateString('es-ES')}`;
    ws1.addRow([]);

    // Encabezados de columna
    const hdr = ws1.addRow(['Estudiante', 'Promedio', '% Asistencia', 'Corte', 'Observación']);
    hdr.font = { bold: true };
    hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

    // Distribución de cortes
    const dist = { B: 0, R: 0, M: 0 };

    stats.forEach(({ nombre, promedio, porcentaje_asistencia, corte }) => {
      if (corte) dist[corte] = (dist[corte] || 0) + 1;
      const row = ws1.addRow([
        nombre,
        promedio ?? '-',
        `${porcentaje_asistencia}%`,
        corte ?? '-',
        OBS_CORTE[corte] ?? '',
      ]);
      if (corte && COLOR_CORTE[corte]) {
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CORTE[corte] } };
      }
    });

    ws1.getColumn(1).width = 32;
    ws1.getColumn(2).width = 12;
    ws1.getColumn(3).width = 16;
    ws1.getColumn(4).width = 10;
    ws1.getColumn(5).width = 14;

    // Hoja 2: Resumen Estadístico
    const ws2 = wb.addWorksheet('Resumen Estadístico');
    ws2.addRow(['Indicador', 'Valor']).font = { bold: true };
    ws2.addRow(['Total Estudiantes', stats.length]);
    ws2.addRow(['Corte B (Bien)',    dist.B]);
    ws2.addRow(['Corte R (Regular)', dist.R]);
    ws2.addRow(['Corte M (Mal)',     dist.M]);
    if (stats.length) {
      const promedioGrupal = stats.filter(s => s.promedio !== null).reduce((s, r) => s + r.promedio, 0)
        / (stats.filter(s => s.promedio !== null).length || 1);
      ws2.addRow(['Promedio Grupal', Math.round(promedioGrupal * 10) / 10]);
    }
    ws2.columns.forEach(col => { col.width = 24; });

    const buffer = await wb.xlsx.writeBuffer();
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_corte_${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/grupos/:grupo_id/exportar/matriz-completa
// Exporta la grilla completa estudiantes × turnos
// ─────────────────────────────────────────────────────────────
router.get('/:grupo_id/exportar/matriz-completa', async (req, res, next) => {
  try {
    const { grupo_id } = req.params;

    const grupoRes = await pool.query('SELECT * FROM grupos WHERE id = $1', [grupo_id]);
    if (!grupoRes.rows.length) return res.status(404).json({ error: 'Grupo no encontrado' });
    const grupo = grupoRes.rows[0];

    const [estRes, turnRes] = await Promise.all([
      pool.query(
        `SELECT * FROM estudiantes WHERE grupo_id = $1 AND deleted_at IS NULL
         ORDER BY orden_alfabetico`,
        [grupo_id]
      ),
      pool.query(
        `SELECT * FROM turnos WHERE grupo_id = $1 AND deleted_at IS NULL
         ORDER BY fecha ASC, numero_turno ASC`,
        [grupo_id]
      ),
    ]);

    if (!turnRes.rows.length) {
      return res.status(400).json({ error: 'No hay turnos registrados en este grupo' });
    }

    // Cargar todos los registros del grupo en un solo query
    const regRes = await pool.query(
      `SELECT r.* FROM registros r
       JOIN turnos t ON r.turno_id = t.id
       WHERE t.grupo_id = $1 AND t.deleted_at IS NULL`,
      [grupo_id]
    );
    const regMap = {};
    regRes.rows.forEach(r => { regMap[`${r.turno_id}_${r.estudiante_id}`] = r; });

    // ── Construir Excel ───────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Matriz Completa');

    // Fila de encabezado del grupo
    ws.addRow([`${grupo.nombre} — ${grupo.asignatura} — ${grupo.semestre || ''}`]);
    ws.addRow([]);

    // Encabezado de columnas: nombre + un col por turno
    const headerVals = [
      'Estudiante',
      ...turnRes.rows.map(t => `T${t.numero_turno} (${t.tipo})\n${t.fecha}`),
    ];
    const hdr = ws.addRow(headerVals);
    hdr.font      = { bold: true };
    hdr.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    hdr.alignment = { wrapText: true };
    ws.getRow(hdr.number).height = 40;

    // Filas de datos
    estRes.rows.forEach(est => {
      const vals = [est.nombre];
      turnRes.rows.forEach(turno => {
        const reg = regMap[`${turno.id}_${est.id}`];
        if (reg) {
          const a = reg.asistencia    ?? '-';
          const c = reg.calificacion  != null ? reg.calificacion : '--';
          vals.push(`${a} / ${c}`);
        } else {
          vals.push('');
        }
      });
      ws.addRow(vals);
    });

    ws.getColumn(1).width = 32;
    turnRes.rows.forEach((_, i) => { ws.getColumn(i + 2).width = 14; });

    const buffer = await wb.xlsx.writeBuffer();
    const fname  = `matriz_${grupo.nombre.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
    res.set({
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fname}"`,
    });
    res.send(buffer);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/grupos/:grupo_id/auditoria — historial de acciones
// ─────────────────────────────────────────────────────────────
router.get('/:grupo_id/auditoria', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_log WHERE grupo_id = $1
       ORDER BY timestamp DESC LIMIT 200`,
      [req.params.grupo_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

export default router;
