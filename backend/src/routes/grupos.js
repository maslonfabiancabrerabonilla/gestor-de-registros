// ── Rutas: Grupos ─────────────────────────────────────────────
// Montado en: /api/grupos
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/grupos — listar todos los grupos
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM grupos ORDER BY id');
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/grupos/:id — obtener un grupo
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM grupos WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Grupo no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/grupos — crear grupo
router.post('/', async (req, res, next) => {
  try {
    const { nombre, asignatura, semestre, total_clases_planificadas } = req.body;
    if (!nombre?.trim())      return res.status(400).json({ error: 'nombre es obligatorio' });
    if (!asignatura?.trim())  return res.status(400).json({ error: 'asignatura es obligatoria' });

    const tcp = total_clases_planificadas != null ? parseInt(total_clases_planificadas, 10) : null;
    if (tcp !== null && (isNaN(tcp) || tcp <= 0))
      return res.status(400).json({ error: 'total_clases_planificadas debe ser un entero positivo' });

    const result = await pool.query(
      `INSERT INTO grupos (nombre, asignatura, semestre, profesor_id, total_clases_planificadas)
       VALUES ($1, $2, $3, 1, $4) RETURNING *`,
      [nombre.trim(), asignatura.trim(), semestre?.trim() || null, tcp]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un grupo con ese nombre' });
    next(err);
  }
});

// PUT /api/grupos/:id — actualizar grupo
router.put('/:id', async (req, res, next) => {
  try {
    const { nombre, asignatura, semestre, total_clases_planificadas } = req.body;

    // Construcción dinámica del SET
    const campos = [];
    const valores = [];
    let idx = 1;
    if (nombre      !== undefined) { campos.push(`nombre = $${idx++}`);     valores.push(nombre.trim()); }
    if (asignatura  !== undefined) { campos.push(`asignatura = $${idx++}`); valores.push(asignatura.trim()); }
    if (semestre    !== undefined) { campos.push(`semestre = $${idx++}`);   valores.push(semestre?.trim() || null); }
    if (total_clases_planificadas !== undefined) {
      const tcp = total_clases_planificadas != null ? parseInt(total_clases_planificadas, 10) : null;
      if (tcp !== null && (isNaN(tcp) || tcp <= 0))
        return res.status(400).json({ error: 'total_clases_planificadas debe ser un entero positivo' });
      campos.push(`total_clases_planificadas = $${idx++}`);
      valores.push(tcp);
    }

    if (!campos.length) return res.status(400).json({ error: 'No hay campos para actualizar' });

    valores.push(req.params.id);
    const result = await pool.query(
      `UPDATE grupos SET ${campos.join(', ')} WHERE id = $${idx} RETURNING *`,
      valores
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Grupo no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un grupo con ese nombre' });
    next(err);
  }
});

// DELETE /api/grupos/:id — eliminar grupo (hard delete, cascada a tablas hijas)
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM grupos WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Grupo no encontrado' });
    res.json({ eliminado: true, id: result.rows[0].id });
  } catch (err) { next(err); }
});

export default router;
