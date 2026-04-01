// ── Rutas: Turnos ─────────────────────────────────────────────
// Montado en: /api/grupos  →  /:grupo_id/turnos/...
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

const TIPOS_VALIDOS = ['C', 'CP', 'PL', 'PP', 'PF', 'PE', 'EM'];

// GET /api/grupos/:grupo_id/turnos — listar turnos activos (orden cronológico)
router.get('/:grupo_id/turnos', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM turnos
       WHERE grupo_id = $1 AND deleted_at IS NULL
       ORDER BY fecha ASC, numero_turno ASC`,
      [req.params.grupo_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/grupos/:grupo_id/turnos — crear turno (numero_turno auto-incremental)
router.post('/:grupo_id/turnos', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { grupo_id } = req.params;
    const { fecha, tipo, descripcion } = req.body;

    if (!fecha) return res.status(400).json({ error: 'fecha es obligatoria (YYYY-MM-DD)' });
    if (!tipo)  return res.status(400).json({ error: 'tipo es obligatorio' });
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: `tipo inválido. Opciones: ${TIPOS_VALIDOS.join(', ')}` });
    }

    await client.query('BEGIN');

    // Auto-incrementar numero_turno dentro del grupo
    const maxRes = await client.query(
      `SELECT COALESCE(MAX(numero_turno), 0) + 1 AS next
       FROM turnos WHERE grupo_id = $1`,
      [grupo_id]
    );
    const numero_turno = maxRes.rows[0].next;

    const result = await client.query(
      `INSERT INTO turnos (grupo_id, numero_turno, fecha, tipo, descripcion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [grupo_id, numero_turno, fecha, tipo, descripcion?.trim() || null]
    );
    const turno = result.rows[0];

    // Contar estudiantes activos como "registros pendientes"
    const pendRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM estudiantes
       WHERE grupo_id = $1 AND deleted_at IS NULL`,
      [grupo_id]
    );

    await client.query(
      `INSERT INTO audit_log (profesor_id, grupo_id, accion, detalles)
       VALUES (1, $1, 'crear_turno', $2)`,
      [grupo_id, JSON.stringify({ turno_id: turno.id, tipo, fecha })]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...turno, registros_pendientes: pendRes.rows[0].count });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// PUT /api/grupos/:grupo_id/turnos/:id — editar turno
router.put('/:grupo_id/turnos/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { grupo_id, id } = req.params;
    const { fecha, tipo, descripcion } = req.body;

    if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: `tipo inválido. Opciones: ${TIPOS_VALIDOS.join(', ')}` });
    }

    const campos = [];
    const valores = [];
    let idx = 1;
    if (fecha       !== undefined) { campos.push(`fecha = $${idx++}`);              valores.push(fecha); }
    if (tipo        !== undefined) { campos.push(`tipo = $${idx++}::tipo_turno`);   valores.push(tipo); }
    if (descripcion !== undefined) { campos.push(`descripcion = $${idx++}`);        valores.push(descripcion?.trim() || null); }

    if (!campos.length) return res.status(400).json({ error: 'No hay campos para actualizar' });

    valores.push(id, grupo_id);
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE turnos SET ${campos.join(', ')}
       WHERE id = $${idx++} AND grupo_id = $${idx++} AND deleted_at IS NULL
       RETURNING *`,
      valores
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    await client.query(
      `INSERT INTO audit_log (profesor_id, grupo_id, accion, detalles)
       VALUES (1, $1, 'editar_turno', $2)`,
      [grupo_id, JSON.stringify({ turno_id: id, cambios: req.body })]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// DELETE /api/grupos/:grupo_id/turnos/:id — soft delete
router.delete('/:grupo_id/turnos/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { grupo_id, id } = req.params;
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE turnos SET deleted_at = NOW()
       WHERE id = $1 AND grupo_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, grupo_id]
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    await client.query(
      `INSERT INTO audit_log (profesor_id, grupo_id, accion, detalles)
       VALUES (1, $1, 'soft_delete_turno', $2)`,
      [grupo_id, JSON.stringify({ turno_id: id })]
    );

    await client.query('COMMIT');
    res.json({ eliminado: true, id: parseInt(id) });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

export default router;
