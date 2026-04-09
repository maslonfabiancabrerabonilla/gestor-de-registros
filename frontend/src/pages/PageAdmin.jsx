import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate }            from 'react-router-dom';
import { getGrupo, getAuditoria, getEstudiantes } from '../services/api.js';

const ACCION_LABEL = {
  crear_turno:            'Turno creado',
  editar_turno:           'Turno editado',
  soft_delete_turno:      'Turno eliminado',
  batch_save:             'Registros guardados',
  bulk_import:            'Importación masiva',
  editar_grupo:           'Grupo editado',
  hard_delete_estudiante: 'Estudiante eliminado (permanente)',
  soft_delete_estudiante: 'Estudiante eliminado',
};

function formatTimestamp(ts) {
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PageAdmin() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [grupo,       setGrupo]       = useState(null);
  const [auditoria,   setAuditoria]   = useState([]);
  const [eliminados,  setEliminados]  = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [error,       setError]       = useState('');
  const [seccion,     setSeccion]     = useState('auditoria'); // 'auditoria' | 'eliminados'

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [grupoData, audData, todosEst] = await Promise.all([
        getGrupo(id),
        getAuditoria(id),
        getEstudiantes(id, false), // todos, incluyendo soft-deleted
      ]);
      setGrupo(grupoData);
      setAuditoria(audData);
      setEliminados(todosEst.filter(e => e.deleted_at !== null));
    } catch (err) {
      if (err.message?.includes('404')) navigate('/');
      else setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id, navigate]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Cargando administración...</div>
      </div>
    );
  }

  const secciones = [
    { key: 'auditoria',  label: 'Historial de auditoría', icon: '📋' },
    { key: 'eliminados', label: 'Estudiantes eliminados',  icon: '🗑' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <button
          onClick={() => navigate(`/grupos/${id}`)}
          className="text-sm text-blue-600 hover:underline mb-1 block"
        >
          &larr; Volver a {grupo?.nombre ?? 'Registros'}
        </button>
        <h1 className="text-xl font-bold text-slate-800">Administración</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {grupo?.nombre} · {grupo?.asignatura}
        </p>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-6 flex gap-1">
        {secciones.map(s => (
          <button
            key={s.key}
            onClick={() => setSeccion(s.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              seccion === s.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
        <button
          onClick={cargar}
          className="ml-auto text-xs text-blue-500 hover:underline self-center"
        >
          Recargar
        </button>
      </div>

      {/* Contenido */}
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
            <button onClick={cargar} className="underline ml-2">Reintentar</button>
          </div>
        )}

        {/* ── Auditoría ──────────────────────────────────── */}
        {seccion === 'auditoria' && (
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-3">
              Últimas 200 acciones registradas
            </h2>
            {auditoria.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">No hay registros de auditoría aún.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Fecha</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Acción</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoria.map((log, i) => (
                      <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-4 py-2.5 border-b border-slate-100">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                            {ACCION_LABEL[log.accion] ?? log.accion}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs border-b border-slate-100 max-w-xs">
                          {log.detalles ? (
                            <details className="cursor-pointer">
                              <summary className="hover:text-slate-700">Ver detalles</summary>
                              <pre className="mt-1 bg-slate-100 rounded p-2 text-[11px] overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.detalles, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Estudiantes eliminados ─────────────────────── */}
        {seccion === 'eliminados' && (
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-1">
              Estudiantes eliminados (soft delete)
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Estos estudiantes fueron eliminados pero sus registros históricos se conservan en la base de datos.
            </p>
            {eliminados.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">No hay estudiantes eliminados en este grupo.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">#</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Nombre</th>
                      <th className="px-4 py-3 font-semibold text-slate-600 border-b border-slate-200">Eliminado el</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eliminados.map((est, i) => (
                      <tr key={est.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="px-4 py-2.5 text-slate-400 border-b border-slate-100">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-600 line-through border-b border-slate-100">
                          {est.nombre}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 border-b border-slate-100">
                          {formatTimestamp(est.deleted_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
