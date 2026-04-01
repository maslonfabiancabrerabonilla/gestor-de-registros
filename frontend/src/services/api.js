// Todas las llamadas al backend en un solo lugar.
// Vite proxy redirige /api → http://localhost:3000
// Por eso no necesitamos escribir la URL completa aquí.

const handleResponse = async (res) => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// ── Grupos ────────────────────────────────────────────────────
export const getGrupos       = ()         => fetch('/api/grupos').then(handleResponse);
export const getGrupo        = (id)       => fetch(`/api/grupos/${id}`).then(handleResponse);
export const createGrupo     = (data)     => fetch('/api/grupos', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);
export const updateGrupo     = (id, data) => fetch(`/api/grupos/${id}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);
export const deleteGrupo     = (id)       => fetch(`/api/grupos/${id}`, { method: 'DELETE' }).then(handleResponse);

// ── Estudiantes ───────────────────────────────────────────────
export const getEstudiantes  = (gid, soloActivos = true) =>
  fetch(`/api/grupos/${gid}/estudiantes?solo_activos=${soloActivos}`).then(handleResponse);

export const getEstadisticas = (gid, eid) =>
  fetch(`/api/grupos/${gid}/estudiantes/${eid}/estadisticas`).then(handleResponse);

export const createEstudiante = (gid, data) => fetch(`/api/grupos/${gid}/estudiantes`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);

export const updateEstudiante = (gid, eid, data) => fetch(`/api/grupos/${gid}/estudiantes/${eid}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);

export const deleteEstudiante = (gid, eid, metodo = 'soft') =>
  fetch(`/api/grupos/${gid}/estudiantes/${eid}?metodo=${metodo}`, { method: 'DELETE' }).then(handleResponse);

export const bulkImportEstudiantes = (gid, archivo) => {
  const fd = new FormData();
  fd.append('archivo', archivo);
  return fetch(`/api/grupos/${gid}/estudiantes/bulk-import`, { method: 'POST', body: fd }).then(handleResponse);
};

// ── Turnos ────────────────────────────────────────────────────
export const getTurnos       = (gid)        => fetch(`/api/grupos/${gid}/turnos`).then(handleResponse);
export const createTurno     = (gid, data)  => fetch(`/api/grupos/${gid}/turnos`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);
export const updateTurno     = (gid, tid, data) => fetch(`/api/grupos/${gid}/turnos/${tid}`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
}).then(handleResponse);
export const deleteTurno     = (gid, tid)   => fetch(`/api/grupos/${gid}/turnos/${tid}`, { method: 'DELETE' }).then(handleResponse);

// ── Registros ─────────────────────────────────────────────────
export const getRegistrosTurno = (tid) =>
  fetch(`/api/registros/turno/${tid}`).then(handleResponse);

export const batchSave = (turno_id, registros) => fetch('/api/registros/batch-save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ turno_id, registros }),
}).then(handleResponse);

// ── Reportes ──────────────────────────────────────────────────
export const generarCorte = (gid, nombre_reporte) =>
  fetch(`/api/grupos/${gid}/reportes/generar-corte`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre_reporte }),
  }).then(async (res) => {
    if (!res.ok) { const b = await res.json(); throw new Error(b.error); }
    return res.blob(); // descarga directa
  });

export const exportarMatriz = (gid) =>
  fetch(`/api/grupos/${gid}/exportar/matriz-completa`).then(async (res) => {
    if (!res.ok) { const b = await res.json(); throw new Error(b.error); }
    return res.blob();
  });

export const getAuditoria = (gid) =>
  fetch(`/api/grupos/${gid}/auditoria`).then(handleResponse);
