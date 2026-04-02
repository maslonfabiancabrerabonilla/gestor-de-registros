// Grilla principal: estudiantes (filas) × turnos (columnas)
// Celdas editables con cambios pendientes y guardado por turno
import { useState, useCallback } from 'react';

// ── Constantes de estilo ──────────────────────────────────────
const TIPO_COLOR = {
  C:  'bg-blue-100 text-blue-700',
  CP: 'bg-indigo-100 text-indigo-700',
  PL: 'bg-purple-100 text-purple-700',
  PP: 'bg-orange-100 text-orange-700',
  PF: 'bg-rose-100 text-rose-700',
  PE: 'bg-pink-100 text-pink-700',
  EM: 'bg-teal-100 text-teal-700',
};

const ASIST_BG = { A: 'bg-green-50', F: 'bg-red-50', NP: 'bg-slate-100' };

const CORTE_BADGE = {
  B: 'bg-green-100 text-green-800',
  R: 'bg-yellow-100 text-yellow-800',
  M: 'bg-red-100  text-red-800',
};

const TIPOS_CLASE = ['C', 'CP', 'PL'];

// ── Cálculo de estadísticas en el cliente ─────────────────────
function calcStats(est, turnos, registrosMap, totalClasesPlanificadas) {
  const turnosClase = turnos.filter(t => TIPOS_CLASE.includes(t.tipo));

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

function formatFecha(str) {
  if (!str) return '';
  // La fecha viene como "2026-04-01T00:00:00.000Z", tomamos solo la parte de fecha
  const d = new Date(str);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

// ── Componente ────────────────────────────────────────────────
// Props:
//   estudiantes, turnos, registrosMap — datos del servidor
//   onBatchSave(turno_id, registros)  — función async que llama a la API
//   onEditarTurno(turno)              — abre ModalTurno en modo edición
//   onEliminarTurno(turno)            — abre confirmación de borrado
export default function TablaRegistros({
  estudiantes,
  turnos,
  registrosMap,
  onBatchSave,
  onEditarTurno,
  onEliminarTurno,
  totalClasesPlanificadas,
}) {
  // cambios[turno_id][est_id] = { asistencia?, calificacion? }
  const [cambios,    setCambios]    = useState({});
  // guardando[turno_id] = true durante el fetch
  const [guardando,  setGuardando]  = useState({});
  // errorGuardado[turno_id] = mensaje
  const [errGuardar, setErrGuardar] = useState({});

  // ── Helpers de edición ────────────────────────────────────
  const setCelda = useCallback((turnoId, estId, campo, valor) => {
    setCambios(prev => ({
      ...prev,
      [turnoId]: {
        ...(prev[turnoId] ?? {}),
        [estId]: {
          ...(prev[turnoId]?.[estId] ?? {}),
          [campo]: valor,
        },
      },
    }));
  }, []);

  const tieneCambios = (turnoId) =>
    Object.keys(cambios[turnoId] ?? {}).length > 0;

  const guardarTurno = async (turnoId) => {
    setGuardando(prev => ({ ...prev, [turnoId]: true }));
    setErrGuardar(prev => ({ ...prev, [turnoId]: '' }));
    try {
      // Combinar valores actuales del mapa con los cambios locales
      const registros = estudiantes.map(est => {
        const base   = registrosMap[turnoId]?.[est.id] ?? {};
        const delta  = cambios[turnoId]?.[est.id] ?? {};
        const asist  = delta.asistencia  ?? base.asistencia  ?? null;
        const calif  = delta.calificacion ?? base.calificacion ?? null;
        return { estudiante_id: est.id, asistencia: asist, calificacion: calif };
      }).filter(r => r.asistencia !== null || r.calificacion !== null);

      await onBatchSave(turnoId, registros);

      // Limpiar cambios de este turno
      setCambios(prev => {
        const next = { ...prev };
        delete next[turnoId];
        return next;
      });
    } catch (err) {
      setErrGuardar(prev => ({ ...prev, [turnoId]: err.message }));
    } finally {
      setGuardando(prev => ({ ...prev, [turnoId]: false }));
    }
  };

  const descartarTurno = (turnoId) => {
    setCambios(prev => {
      const next = { ...prev };
      delete next[turnoId];
      return next;
    });
    setErrGuardar(prev => ({ ...prev, [turnoId]: '' }));
  };

  // ── Estado vacío ──────────────────────────────────────────
  if (!estudiantes.length && !turnos.length) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-5xl mb-4">📋</p>
        <p className="font-medium text-slate-600">El grupo está vacío.</p>
        <p className="text-sm mt-1">Agrega estudiantes y crea el primer turno para empezar.</p>
      </div>
    );
  }

  if (!estudiantes.length) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p className="text-5xl mb-4">👥</p>
        <p className="font-medium text-slate-600">No hay estudiantes en este grupo.</p>
        <p className="text-sm mt-1">Usa "Agregar Estudiantes" para importarlos.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="border-collapse text-sm min-w-full">

        {/* ── Cabecera ──────────────────────────────────────── */}
        <thead>
          {/* Fila 1: info de turno */}
          <tr className="bg-slate-50">
            <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-4 py-3 text-left font-semibold text-slate-700 min-w-[200px]">
              Estudiante
            </th>

            {turnos.length === 0 && (
              <th className="border-b border-slate-200 px-6 py-3 text-slate-400 font-normal italic text-xs">
                Sin turnos — crea uno con "+ Nuevo Turno"
              </th>
            )}

            {turnos.map(t => (
              <th key={t.id}
                className="border-b border-r border-slate-200 px-3 py-2 text-center font-medium text-slate-600 min-w-[120px]">
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_COLOR[t.tipo] ?? 'bg-slate-100'}`}>
                    T{t.numero_turno} {t.tipo}
                  </span>
                  <span className="text-xs text-slate-400">{formatFecha(t.fecha)}</span>
                  {t.descripcion && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[100px]" title={t.descripcion}>
                      {t.descripcion}
                    </span>
                  )}
                  {/* Acciones del turno */}
                  <div className="flex gap-1 mt-0.5">
                    <button
                      onClick={() => onEditarTurno?.(t)}
                      className="text-[10px] text-blue-500 hover:underline"
                      title="Editar turno"
                    >✏️</button>
                    <button
                      onClick={() => onEliminarTurno?.(t)}
                      className="text-[10px] text-red-400 hover:underline"
                      title="Eliminar turno"
                    >🗑</button>
                  </div>
                </div>
              </th>
            ))}

            {turnos.length > 0 && <>
              <th className="border-b border-r border-l border-slate-200 px-3 py-3 text-center font-semibold text-slate-500 text-xs min-w-[72px] bg-slate-100">
                % Asist.
              </th>
              <th className="border-b border-r border-slate-200 px-3 py-3 text-center font-semibold text-slate-500 text-xs min-w-[62px] bg-slate-100">
                Prom.
              </th>
              <th className="border-b border-slate-200 px-3 py-3 text-center font-semibold text-slate-500 text-xs min-w-[62px] bg-slate-100">
                Corte
              </th>
            </>}
          </tr>

          {/* Fila 2: Guardar / Descartar por turno */}
          {turnos.length > 0 && (
            <tr className="bg-white">
              <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-4 py-1 text-xs text-slate-400">
                Acciones rápidas
              </td>
              {turnos.map(t => (
                <td key={t.id} className="border-b border-r border-slate-200 px-2 py-1 text-center">
                  {tieneCambios(t.id) ? (
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => guardarTurno(t.id)}
                        disabled={guardando[t.id]}
                        className="text-[10px] px-2 py-0.5 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50 w-full"
                      >
                        {guardando[t.id] ? '…' : '💾 Guardar'}
                      </button>
                      <button
                        onClick={() => descartarTurno(t.id)}
                        disabled={guardando[t.id]}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 disabled:opacity-50 w-full"
                      >
                        Descartar
                      </button>
                      {errGuardar[t.id] && (
                        <span className="text-[9px] text-red-500 max-w-[100px] break-words">
                          {errGuardar[t.id]}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-200">—</span>
                  )}
                </td>
              ))}
              <td colSpan={3} className="border-b border-l border-slate-200 bg-slate-50" />
            </tr>
          )}
        </thead>

        {/* ── Cuerpo ────────────────────────────────────────── */}
        <tbody>
          {estudiantes.map((est, idx) => {
            const stats = calcStats(est, turnos, registrosMap, totalClasesPlanificadas);
            const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60';

            return (
              <tr key={est.id} className={`${rowBg} hover:bg-blue-50/30 transition-colors`}>

                {/* Nombre */}
                <td className={`sticky left-0 z-10 border-b border-r border-slate-200 px-4 py-2 font-medium text-slate-800 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-1.5">
                    {stats.alerta && (
                      <span title={`Inasistencias: ${(100 - stats.pct).toFixed(1)}%`} className="cursor-help">⚠️</span>
                    )}
                    {stats.esProvisional && stats.clasesDadas > 0 && (
                      <span title="Sin total planificado: % provisional basado en clases dadas" className="text-[10px] text-slate-400 font-normal">(prov.)</span>
                    )}
                    <span className="truncate max-w-[160px]" title={est.nombre}>{est.nombre}</span>
                  </div>
                </td>

                {/* Celdas de registros */}
                {turnos.map(t => {
                  const base  = registrosMap[t.id]?.[est.id] ?? {};
                  const delta = cambios[t.id]?.[est.id] ?? {};
                  const asist = delta.asistencia  ?? base.asistencia  ?? '';
                  const calif = delta.calificacion ?? base.calificacion ?? '';
                  const editado = Boolean(cambios[t.id]?.[est.id]);
                  const esPrueba = !TIPOS_CLASE.includes(t.tipo);

                  return (
                    <td key={t.id}
                      className={`border-b border-r border-slate-200 px-2 py-1.5 text-center align-middle
                        ${editado ? 'ring-2 ring-inset ring-amber-300' : ''}
                        ${asist ? (ASIST_BG[asist] ?? '') : ''}`}
                    >
                      <div className="flex flex-col items-center gap-1">

                        {/* Selector de asistencia: clases → A/F | pruebas → NP */}
                        {!esPrueba ? (
                          <select
                            value={asist}
                            onChange={e => setCelda(t.id, est.id, 'asistencia', e.target.value || null)}
                            className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white w-14 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                          >
                            <option value="">—</option>
                            <option value="A">A</option>
                            <option value="F">F</option>
                          </select>
                        ) : (
                          <select
                            value={asist}
                            onChange={e => setCelda(t.id, est.id, 'asistencia', e.target.value || null)}
                            className="text-xs border border-slate-200 rounded px-1 py-0.5 bg-white w-14 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                          >
                            <option value="">—</option>
                            <option value="NP">NP</option>
                          </select>
                        )}

                        {/* Input de calificación */}
                        <input
                          type="number"
                          min="0" max="5" step="0.1"
                          value={calif}
                          onChange={e => {
                            const v = e.target.value;
                            setCelda(t.id, est.id, 'calificacion',
                              v === '' ? null : parseFloat(v));
                          }}
                          placeholder="—"
                          className="text-xs border border-slate-200 rounded px-1 py-0.5 w-14 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                    </td>
                  );
                })}

                {/* Estadísticas */}
                {turnos.length > 0 && <>
                  <td className="border-b border-r border-l border-slate-200 px-3 py-2 text-center bg-slate-50">
                    <span className={`text-sm font-semibold ${
                      stats.clasesDadas === 0 ? 'text-slate-400' :
                      stats.pct >= 80 ? 'text-green-700' :
                      stats.pct >= 70 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {stats.clasesDadas > 0 ? `${stats.pct}%` : '—'}
                    </span>
                  </td>
                  <td className="border-b border-r border-slate-200 px-3 py-2 text-center bg-slate-50">
                    <span className={`text-sm font-semibold ${
                      stats.promedio == null  ? 'text-slate-400' :
                      stats.promedio >= 4    ? 'text-green-700' :
                      stats.promedio >= 3    ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {stats.promedio ?? '—'}
                    </span>
                  </td>
                  <td className="border-b border-slate-200 px-3 py-2 text-center bg-slate-50">
                    {stats.corte ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CORTE_BADGE[stats.corte]}`}>
                        {stats.corte}
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                </>}
              </tr>
            );
          })}
        </tbody>

        {/* ── Pie: totales por turno ────────────────────────── */}
        {turnos.length > 0 && (
          <tfoot>
            <tr className="bg-slate-100 text-xs text-slate-500 font-medium">
              <td className="sticky left-0 z-10 bg-slate-100 border-t border-r border-slate-200 px-4 py-2">
                {estudiantes.length} estudiantes
              </td>
              {turnos.map(t => {
                const asistidos = estudiantes.filter(
                  e => registrosMap[t.id]?.[e.id]?.asistencia === 'A'
                ).length;
                const conDatos = estudiantes.filter(e => registrosMap[t.id]?.[e.id]).length;
                return (
                  <td key={t.id} className="border-t border-r border-slate-200 px-2 py-2 text-center">
                    {conDatos > 0
                      ? `${asistidos}/${conDatos}`
                      : <span className="text-slate-300">—</span>}
                  </td>
                );
              })}
              <td colSpan={3} className="border-t border-l border-slate-200 px-3 py-2 text-center text-slate-400">
                Asistentes / Registrados
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
