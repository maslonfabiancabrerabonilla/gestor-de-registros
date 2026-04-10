// ── Rutas: Estudiantes ────────────────────────────────────────
// Montado en: /api/grupos  →  /:grupo_id/estudiantes/...
import { Router } from 'express';
import multer  from 'multer';
import pool from '../db.js';
import { calcularEstadisticasEstudiante } from '../utils/estadisticas.js';
import { parsearExcel, detectarDuplicadosEnArchivo } from '../utils/excelParser.js';
import { reordenarEstudiantes } from '../utils/reordenar.js';

const router = Router();

// ── Constantes ────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5 MB — límite de archivo Excel

// Multer: almacenamiento en memoria (no escribe en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const permitidos = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (permitidos.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se aceptan archivos .xlsx o .xls'));
  },
});

// ─────────────────────────────────────────────────────────────
// GET /api/grupos/:grupo_id/estudiantes
// ─────────────────────────────────────────────────────────────
router.get('/:grupo_id/estudiantes', async (req, res, next) => {
  try {
    const { grupo_id } = req.params;
    const result = await pool.query(
      `SELECT * FROM estudiantes WHERE grupo_id = $1 ORDER BY orden_alfabetico`,
      [grupo_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/grupos/:grupo_id/estudiantes/:id/estadisticas
// DEBE ir antes de /:id para evitar que Express lo capture
// TODO(futuro): endpoint listo para vista individual de estadísticas.
// Actualmente el frontend calcula stats en el cliente (calcStats).
// ─────────────────────────────────────────────────────────────
router.get('/:grupo_id/estudiantes/:id/estadisticas', async (req, res, next) => {
  try {
    const { grupo_id, id } = req.params;
    const estRes = await pool.query(
      'SELECT * FROM estudiantes WHERE id = $1 AND grupo_id = $2',
      [id, grupo_id]
    );
    if (!estRes.rows.length) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const stats = await calcularEstadisticasEstudiante(id, grupo_id);
    res.json({ estudiante_id: parseInt(id), nombre: estRes.rows[0].nombre, ...stats });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/grupos/:grupo_id/estudiantes/:id
// ─────────────────────────────────────────────────────────────
router.get('/:grupo_id/estudiantes/:id', async (req, res, next) => {
  try {
    const { grupo_id, id } = req.params;
    const result = await pool.query(
      'SELECT * FROM estudiantes WHERE id = $1 AND grupo_id = $2',
      [id, grupo_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Estudiante no encontrado' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// POST /api/grupos/:grupo_id/estudiantes/bulk-import
// Importación masiva desde Excel (.xlsx | .xls)
// DEBE ir antes de /:id para que Express no trate 'bulk-import' como un :id de tipo POST
// ─────────────────────────────────────────────────────────────
router.post('/:grupo_id/estudiantes/bulk-import', upload.single('archivo'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { grupo_id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo Excel (campo: archivo)' });

    // 1. Parsear Excel
    let nombresRAW;
    try {
      nombresRAW = await parsearExcel(req.file.buffer);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }

    // 2. Detectar duplicados dentro del archivo
    const { duplicados: erroresArchivo } = detectarDuplicadosEnArchivo(nombresRAW);
    if (erroresArchivo.length) {
      const detalle = erroresArchivo.map(e => `"${e.valor}" (fila ${e.fila})`).join(', ');
      return res.status(409).json({
        exito: false,
        error: `El archivo contiene nombres duplicados: ${detalle}`,
        errores: erroresArchivo,
      });
    }

    // 3. Ordenar alfabéticamente (Simple Sort)
    const nombresOrdenados = nombresRAW
      .map(n => n.valor)
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    // 4. Verificar duplicados contra la BD
    const existentesRes = await client.query(
      `SELECT LOWER(nombre) AS n FROM estudiantes
       WHERE grupo_id = $1`,
      [grupo_id]
    );
    const setExistentes = new Set(existentesRes.rows.map(r => r.n));

    const nuevos     = nombresOrdenados.filter(n => !setExistentes.has(n.toLowerCase()));
    const duplicados = nombresOrdenados.filter(n =>  setExistentes.has(n.toLowerCase()));

    // Si no hay nuevos, informar sin error
    if (nuevos.length === 0) {
      return res.json({
        exito:      true,
        importados: 0,
        duplicados: duplicados.length,
        mensaje:    'Todos los estudiantes del archivo ya existen en el grupo.',
      });
    }

    // 5. Inserción en transacción atómica
    await client.query('BEGIN');

    // Obtener el máximo orden actual para insertar al final temporalmente
    const maxOrdenRes = await client.query(
      `SELECT COALESCE(MAX(orden_alfabetico), 0) AS max
       FROM estudiantes WHERE grupo_id = $1`,
      [grupo_id]
    );
    let orden = parseInt(maxOrdenRes.rows[0].max);

    for (const nombre of nuevos) {
      orden += 1;
      await client.query(
        `INSERT INTO estudiantes (grupo_id, nombre, orden_alfabetico) VALUES ($1, $2, $3)`,
        [grupo_id, nombre, orden]
      );
    }

    // Reordenar todo el grupo alfabéticamente tras la inserción masiva
    await reordenarEstudiantes(client, grupo_id);

    await client.query(
      `INSERT INTO audit_log (profesor_id, grupo_id, accion, detalles)
       VALUES (1, $1, 'bulk_import', $2)`,
      [grupo_id, JSON.stringify({ importados: nuevos.length, duplicados: duplicados.length })]
    );

    await client.query('COMMIT');
    res.json({
      exito:      true,
      importados: nuevos.length,
      duplicados: duplicados.length,
      errores:    0,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// ─────────────────────────────────────────────────────────────
// POST /api/grupos/:grupo_id/estudiantes — crear individual
// ─────────────────────────────────────────────────────────────
const NOMBRE_REGEX = /^[\p{L}\s\-.]+$/u;

router.post('/:grupo_id/estudiantes', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { grupo_id } = req.params;
    const { nombre }   = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'nombre es obligatorio' });
    if (!NOMBRE_REGEX.test(nombre.trim()))
      return res.status(400).json({ error: 'El nombre solo puede contener letras, espacios, guiones y puntos' });

    await client.query('BEGIN');

    // Insertar con orden temporal al final
    const maxRes = await client.query(
      `SELECT COALESCE(MAX(orden_alfabetico), 0) + 1 AS next
       FROM estudiantes WHERE grupo_id = $1`,
      [grupo_id]
    );
    const insertRes = await client.query(
      `INSERT INTO estudiantes (grupo_id, nombre, orden_alfabetico)
       VALUES ($1, $2, $3) RETURNING *`,
      [grupo_id, nombre.trim(), maxRes.rows[0].next]
    );

    // Reordenar todo el grupo alfabéticamente
    await reordenarEstudiantes(client, grupo_id);

    await client.query('COMMIT');
    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un estudiante con ese nombre en el grupo' });
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/grupos/:grupo_id/estudiantes/:id — actualizar nombre
// ─────────────────────────────────────────────────────────────
router.put('/:grupo_id/estudiantes/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { grupo_id, id } = req.params;
    const { nombre }       = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'nombre es obligatorio' });
    if (!NOMBRE_REGEX.test(nombre.trim()))
      return res.status(400).json({ error: 'El nombre solo puede contener letras, espacios, guiones y puntos' });

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE estudiantes SET nombre = $1
       WHERE id = $2 AND grupo_id = $3
       RETURNING *`,
      [nombre.trim(), id, grupo_id]
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    // Reordenar todo el grupo alfabéticamente tras el cambio de nombre
    await reordenarEstudiantes(client, grupo_id);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un estudiante con ese nombre en el grupo' });
    next(err);
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/grupos/:grupo_id/estudiantes/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:grupo_id/estudiantes/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { grupo_id, id } = req.params;

    await client.query('BEGIN');

    const estRes = await client.query(
      'SELECT * FROM estudiantes WHERE id = $1 AND grupo_id = $2',
      [id, grupo_id]
    );
    if (!estRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }
    const estudiante = estRes.rows[0];

    await client.query('DELETE FROM estudiantes WHERE id = $1', [id]);

    // Reordenar los estudiantes restantes
    await reordenarEstudiantes(client, grupo_id);

    await client.query(
      `INSERT INTO audit_log (profesor_id, grupo_id, accion, detalles)
       VALUES (1, $1, 'delete_estudiante', $2)`,
      [grupo_id, JSON.stringify({ estudiante_id: parseInt(id), nombre: estudiante.nombre })]
    );

    await client.query('COMMIT');
    res.json({ eliminado: true, id: parseInt(id) });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

export default router;
