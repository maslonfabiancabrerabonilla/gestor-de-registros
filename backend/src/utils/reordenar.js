// ── Utilidad: Reordenamiento alfabético de estudiantes ────────
// Query centralizada que se usa en crear, importar, editar y eliminar.

/**
 * Reordena todos los estudiantes de un grupo alfabéticamente.
 * Debe ejecutarse dentro de una transacción activa.
 * @param {import('pg').PoolClient} client - Cliente de transacción activa.
 * @param {number|string} grupo_id - ID del grupo.
 */
export async function reordenarEstudiantes(client, grupo_id) {
  await client.query(
    `WITH ranked AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY LOWER(nombre)) AS rn
       FROM estudiantes WHERE grupo_id = $1
     )
     UPDATE estudiantes e SET orden_alfabetico = ranked.rn
     FROM ranked WHERE e.id = ranked.id`,
    [grupo_id]
  );
}
