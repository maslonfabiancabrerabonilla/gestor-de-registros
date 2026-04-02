// ── Rutas: Estudiantes ────────────────────────────────────────
// Montado en: /api/grupos  →  /:grupo_id/estudiantes/...
import { Router } from 'express';
import multer  from 'multer';
import ExcelJS from 'exceljs';
import pool from '../db.js';

const router = Router();

// Multer: almacenamiento en memoria (no escribe en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },            // 5 MB máximo
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
// Helpers de cálculo (reutilizados en /estadisticas)
// ─────────────────────────────────────────────────────────────
async function calcularEstadisticasEstudiante(estudiante_id, grupo_id) {
  // Clases planificadas del grupo (para denominar % asistencia)
  const grupoRes = await pool.query(
    'SELECT total_clases_planificadas FROM grupos WHERE id = $1',
    [grupo_id]
  );
  const total_clases_planificadas = grupoRes.rows[0]?.total_clases_planificadas ?? null;

  // Asistencia (solo clases: C, CP, PL)
  const asistRes = await pool.query(
    `SELECT
       COUNT(CASE WHEN r.asistencia = 'A' THEN 1 END)::int AS asistencias,
       COUNT(t.id)::int                                      AS total_clases
     FROM turnos t
     LEFT JOIN registros r ON r.turno_id = t.id AND r.estudiante_id = $1
     WHERE t.grupo_id = $2
       AND t.tipo IN ('C', 'CP', 'PL')
       AND t.deleted_at IS NULL`,
    [estudiante_id, grupo_id]
  );
  const { asistencias, total_clases } = asistRes.rows[0];

  const esProvisional = total_clases_planificadas === null;
  const denominador   = total_clases_planificadas ?? total_clases;
  const faltas        = total_clases - asistencias;
  const porcentaje_asistencia =
    denominador > 0 ? Math.max(0, Math.round(((denominador - faltas) / denominador) * 1000) / 10) : 100;

  // Calificaciones (solo no-NULL)
  const calRes = await pool.query(
    `SELECT ROUND(AVG(r.calificacion)::numeric, 1) AS promedio,
            COUNT(r.calificacion)::int              AS total_evaluaciones
     FROM registros r
     JOIN turnos t ON r.turno_id = t.id
     WHERE r.estudiante_id = $1
       AND r.calificacion IS NOT NULL
       AND t.deleted_at IS NULL`,
    [estudiante_id]
  );
  const promedio          = calRes.rows[0].promedio ? parseFloat(calRes.rows[0].promedio) : null;
  const total_evaluaciones = calRes.rows[0].total_evaluaciones;

  // Corte M/R/B
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

// ─────────────────────────────────────────────────────────────
// GET /api/grupos/:grupo_id/estudiantes
// ─────────────────────────────────────────────────────────────
router.get('/:grupo_id/estudiantes', async (req, res, next) => {
  try {
    const { grupo_id }           = req.params;
    const { solo_activos = 'true' } = req.query;
    const filtro = solo_activos === 'true' ? 'AND deleted_at IS NULL' : '';
    const result = await pool.query(
      `SELECT * FROM estudiantes WHERE grupo_id = $1 ${filtro} ORDER BY orden_alfabetico`,
      [grupo_id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────
// GET /api/grupos/:grupo_id/estudiantes/:id/estadisticas
// DEBE ir antes de /:id para evitar que Express lo capture
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
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const sheet = wb.worksheets[0];

    const nombresRAW = [];
    sheet.eachRow((row, rowNum) => {
      const val = String(row.getCell(1).text ?? '').trim();
      if (val) nombresRAW.push({ fila: rowNum, valor: val });
    });

    if (!nombresRAW.length)    return res.status(400).json({ error: 'El archivo no contiene datos' });
    if (nombresRAW.length > 200) return res.status(400).json({ error: 'Máximo 200 filas permitidas' });

    // 2. Detectar duplicados dentro del archivo
    const seenEnArchivo = new Map();
    const erroresArchivo = [];
    nombresRAW.forEach(({ fila, valor }) => {
      const key = valor.toLowerCase();
      if (seenEnArchivo.has(key)) {
        erroresArchivo.push({ fila, valor, razon: `Duplicado con fila ${seenEnArchivo.get(key)}` });
      } else {
        seenEnArchivo.set(key, fila);
      }
    });
    if (erroresArchivo.length) {
      return res.status(409).json({
        exito: false,
        mensaje: 'El archivo contiene nombres duplicados',
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
       WHERE grupo_id = $1 AND deleted_at IS NULL`,
      [grupo_id]
    );
    const setExistentes = new Set(existentesRes.rows.map(r => r.n));

    const nuevos     = nombresOrdenados.filter(n => !setExistentes.has(n.toLowerCase()));
    const duplicados = nombresOrdenados.filter(n =>  setExistentes.has(n.toLowerCase()));

    if (duplicados.length > 0) {
      return res.status(409).json({
        exito: false,
        duplicados,
        nuevo_pendiente: nuevos.length,
        mensaje: 'Hay estudiantes que ya existen en el grupo. Elimínalos del archivo y vuelve a importar.',
      });
    }

    // 5. Inserción en transacción atómica
    await client.query('BEGIN');

    // Obtener el máximo orden actual para insertar al final temporalmente
    const maxOrdenRes = await client.query(
      `SELECT COALESCE(MAX(orden_alfabetico), 0) AS max
       FROM estudiantes WHERE grupo_id = $1 AND deleted_at IS NULL`,
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
    await client.query(
      `WITH ranked AS (
         SELECT id, ROW_NUMBER() OVER (ORDER BY LOWER(nombre)) AS rn
         FROM estudiantes WHERE grupo_id = $1 AND deleted_at IS NULL
       )
       UPDATE estudiantes e SET orden_alfabetico = ranked.rn
       FROM ranked WHERE e.id = ranked.id`,
      [grupo_id]
    );

    await client.query(
      `INSERT INTO audit_log (profesor_id, grupo_id, accion, detalles)
       VALUES (1, $1, 'bulk_import', $2)`,
      [grupo_id, JSON.stringify({ importados: nuevos.length, duplicados: duplicados.length })]
    );

    await client.query('COMMIT');
    res.json({
      exito:      true,
      importados: nuevos.length,
      duplicados: 0,
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
       FROM estudiantes WHERE grupo_id = $1 AND deleted_at IS NULL`,
      [grupo_id]
    );
    const insertRes = await client.query(
      `INSERT INTO estudiantes (grupo_id, nombre, orden_alfabetico)
       VALUES ($1, $2, $3) RETURNING *`,
      [grupo_id, nombre.trim(), maxRes.rows[0].next]
    );

    // Reordenar todo el grupo alfabéticamente
    await client.query(
      `WITH ranked AS (
         SELECT id, ROW_NUMBER() OVER (ORDER BY LOWER(nombre)) AS rn
         FROM estudiantes WHERE grupo_id = $1 AND deleted_at IS NULL
       )
       UPDATE estudiantes e SET orden_alfabetico = ranked.rn
       FROM ranked WHERE e.id = ranked.id`,
      [grupo_id]
    );

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
       WHERE id = $2 AND grupo_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [nombre.trim(), id, grupo_id]
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Estudiante no encontrado o ya eliminado' });
    }

    // Reordenar todo el grupo alfabéticamente tras el cambio de nombre
    await client.query(
      `WITH ranked AS (
         SELECT id, ROW_NUMBER() OVER (ORDER BY LOWER(nombre)) AS rn
         FROM estudiantes WHERE grupo_id = $1 AND deleted_at IS NULL
       )
       UPDATE estudiantes e SET orden_alfabetico = ranked.rn
       FROM ranked WHERE e.id = ranked.id`,
      [grupo_id]
    );

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
// ?metodo=soft (default) | hard
// ─────────────────────────────────────────────────────────────
router.delete('/:grupo_id/estudiantes/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { grupo_id, id } = req.params;
    const { metodo = 'soft' } = req.query;

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

    if (metodo === 'hard') {
      await client.query('DELETE FROM estudiantes WHERE id = $1', [id]);
    } else {
      await client.query('UPDATE estudiantes SET deleted_at = NOW() WHERE id = $1', [id]);
    }

    const accion = metodo === 'hard' ? 'hard_delete_estudiante' : 'soft_delete_estudiante';
    await client.query(
      `INSERT INTO audit_log (profesor_id, grupo_id, accion, detalles)
       VALUES (1, $1, $2, $3)`,
      [grupo_id, accion, JSON.stringify({ estudiante_id: parseInt(id), nombre: estudiante.nombre })]
    );

    await client.query('COMMIT');
    res.json({ eliminado: true, metodo, id: parseInt(id) });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

export default router;
