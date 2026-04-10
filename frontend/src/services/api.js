// Todas las llamadas al backend en un solo lugar.
// En desarrollo, Vite proxy redirige /api → http://localhost:3000
// En producción, VITE_API_URL apunta al backend desplegado

const BASE = import.meta.env.VITE_API_URL || '';

const handleResponse = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.mensaje || `HTTP ${res.status}`);
  }
  return res.json();
};

// ── Grupos ────────────────────────────────────────────────────
export const getGrupos       = ()         => fetch(`${BASE}/api/grupos`).then(handleResponse);
export const getGrupo        = (id)       => fetch(`${BASE}/api/grupos/${id}`).then(handleResponse);
export const createGrupo     = (data)     => fetch(`${BASE}/api/grupos`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);
export const updateGrupo     = (id, data) => fetch(`${BASE}/api/grupos/${id}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);
export const deleteGrupo     = (id)       => fetch(`${BASE}/api/grupos/${id}`, { method: 'DELETE' }).then(handleResponse);

// ── Estudiantes ───────────────────────────────────────────────
export const getEstudiantes  = (gid) =>
  fetch(`${BASE}/api/grupos/${gid}/estudiantes`).then(handleResponse);

// TODO(futuro): estadísticas individuales por estudiante. Actualmente el cálculo
// se realiza en el cliente (calcStats en TablaRegistros). Endpoint listo para uso futuro.
export const getEstadisticas = (gid, eid) =>
  fetch(`${BASE}/api/grupos/${gid}/estudiantes/${eid}/estadisticas`).then(handleResponse);

export const createEstudiante = (gid, data) => fetch(`${BASE}/api/grupos/${gid}/estudiantes`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);

export const updateEstudiante = (gid, eid, data) => fetch(`${BASE}/api/grupos/${gid}/estudiantes/${eid}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);

export const deleteEstudiante = (gid, eid) =>
  fetch(`${BASE}/api/grupos/${gid}/estudiantes/${eid}`, { method: 'DELETE' }).then(handleResponse);

export const bulkImportEstudiantes = async (gid, archivo) => {
  const fd = new FormData();
  fd.append('archivo', archivo);
  const res = await fetch(`${BASE}/api/grupos/${gid}/estudiantes/bulk-import`, { method: 'POST', body: fd });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Si el backend envía datos estructurados (ej. duplicados), los devolvemos
    if (body.errores) return { ...body, exito: false };
    throw new Error(body.error || body.mensaje || `HTTP ${res.status}`);
  }
  return body;
};

// ── Turnos ────────────────────────────────────────────────────
export const getTurnos       = (gid)        => fetch(`${BASE}/api/grupos/${gid}/turnos`).then(handleResponse);
export const createTurno     = (gid, data)  => fetch(`${BASE}/api/grupos/${gid}/turnos`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);
export const updateTurno     = (gid, tid, data) => fetch(`${BASE}/api/grupos/${gid}/turnos/${tid}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);
export const deleteTurno     = (gid, tid)   => fetch(`${BASE}/api/grupos/${gid}/turnos/${tid}`, { method: 'DELETE' }).then(handleResponse);

// ── Registros ─────────────────────────────────────────────────
export const getRegistrosTurno = (tid) =>
  fetch(`${BASE}/api/registros/turno/${tid}`).then(handleResponse);

export const batchSave = (turno_id, registros) => fetch(`${BASE}/api/registros/batch-save`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ turno_id, registros }),
}).then(handleResponse);

// ── Reportes ──────────────────────────────────────────────────
export const generarCorte = (gid, nombre_reporte) =>
  fetch(`${BASE}/api/grupos/${gid}/reportes/generar-corte`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre_reporte }),
  }).then(async (res) => {
    if (!res.ok) { const b = await res.json(); throw new Error(b.error); }
    return res.blob(); // descarga directa
  });

export const exportarMatriz = (gid) =>
  fetch(`${BASE}/api/grupos/${gid}/exportar/matriz-completa`).then(async (res) => {
    if (!res.ok) { const b = await res.json(); throw new Error(b.error); }
    return res.blob();
  });

// ── Auditoría ─────────────────────────────────────────────────
export const getAuditoria = (gid) =>
  fetch(`${BASE}/api/grupos/${gid}/auditoria`).then(handleResponse);
