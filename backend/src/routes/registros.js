// ── Rutas: Registros (Batch Save) y Estadísticas ─────────────
// Montado en: /api/registros
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Turnos tipo prueba: la asistencia se omite del % y se almacena como NP si procede
const TIPOS_PRUEBA = ['PP', 'PF', 'PE', 'EM'];

// ─────────────────────────────────────────────────────────────
// POST /api/registros/batch-save
// Guarda en una sola transacción atómica todos los registros
// de un turno. Si un registro falla, se hace rollback total.
// ─────────────────────────────────────────────────────────────
router.post('/batch-save', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { turno_id, registros } = req.body;

    if (!turno_id)                              return res.status(400).json({ error: 'turno_id es obligatorio' });
    if (!Array.isArray(registros) || !registros.length)
      return res.status(400).json({ error: 'registros debe ser un array no vacío' });

    // Validar rangos y valores antes de abrir la transacción
    const ASISTENCIA_VALIDA = ['A', 'F', 'NP'];
    for (const reg of registros) {
      if (reg.calificacion !== null && reg.calificacion !== undefined) {
        if (reg.calificacion < 0 || reg.calificacion > 5) {
          return res.status(400).json({
            error: `Calificación fuera de rango 0-5 para estudiante_id ${reg.estudiante_id}`
          });
        }
      }
      if (reg.asistencia != null && !ASISTENCIA_VALIDA.includes(reg.asistencia)) {
        return res.status(400).json({
          error: `Valor de asistencia inválido "${reg.asistencia}" para estudiante_id ${reg.estudiante_id}`
        });
      }
    }

    await client.query('BEGIN');

    // Verificar turno (dentro de la transacción para evitar race conditions)
    const turnoRes = await client.query(
      'SELECT * FROM turnos WHERE id = $1 AND deleted_at IS NULL',
      [turno_id]
    );
    if (!turnoRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    const turno = turnoRes.rows[0];
    const esPrueba = TIPOS_PRUEBA.includes(turno.tipo);

    // Verificar que todos los estudiante_id pertenecen al grupo del turno
    const estudianteIds = [...new Set(registros.map(r => r.estudiante_id))];
    const estCheck = await client.query(
      `SELECT id FROM estudiantes
       WHERE id = ANY($1) AND grupo_id = $2 AND deleted_at IS NULL`,
      [estudianteIds, turno.grupo_id]
    );
    if (estCheck.rows.length !== estudianteIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Algunos estudiantes no pertenecen a este grupo' });
    }

    let guardados = 0;
    for (const reg of registros) {
      // Regla: en turnos tipo prueba, si el estudiante no participa → almacenar NP
      let asistencia = reg.asistencia ?? null;
      if (esPrueba && asistencia === 'F') asistencia = 'NP';

      await client.query(
        `INSERT INTO registros (turno_id, estudiante_id, asistencia, calificacion)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (turno_id, estudiante_id) DO UPDATE
           SET asistencia    = EXCLUDED.asistencia,
               calificacion  = EXCLUDED.calificacion,
               updated_at    = NOW()`,
        [turno_id, reg.estudiante_id, asistencia, reg.calificacion ?? null]
      );
      guardados++;
    }

    await client.query(
      `INSERT INTO audit_log (profesor_id, grupo_id, accion, detalles)
       VALUES (1, $1, 'batch_save', $2)`,
      [turno.grupo_id, JSON.stringify({ turno_id, registros_guardados: guardados })]
    );

    await client.query('COMMIT');
    res.json({
      exito: true,
      registros_guardados: guardados,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/registros/turno/:turno_id
// Devuelve todos los registros de un turno (para cargar modal)
// ─────────────────────────────────────────────────────────────
router.get('/turno/:turno_id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.*, e.nombre, e.orden_alfabetico
       FROM registros r
       JOIN estudiantes e ON e.id = r.estudiante_id
       WHERE r.turno_id = $1
       ORDER BY e.orden_alfabetico`,
      [req.params.turno_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

export default router;
