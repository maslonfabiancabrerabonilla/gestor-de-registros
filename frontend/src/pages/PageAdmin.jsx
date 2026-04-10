// Panel de administración: historial de auditoría de un grupo
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate }            from 'react-router-dom';
import { getGrupo, getAuditoria } from '../services/api.js';
import { ArrowLeft, Shield, RefreshCw, Loader2, ClipboardList } from 'lucide-react';

const ACCION_LABEL = {
  crear_turno:            'Turno creado',
  editar_turno:           'Turno editado',
  delete_turno:           'Turno eliminado',
  batch_save:             'Registros guardados',
  bulk_import:            'Importación masiva',
  editar_grupo:           'Grupo editado',
  delete_estudiante:      'Estudiante eliminado',
  // Legado (acciones anteriores en audit_log)
  soft_delete_turno:      'Turno eliminado',
  hard_delete_estudiante: 'Estudiante eliminado',
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
  const [cargando,    setCargando]    = useState(true);
  const [error,       setError]       = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [grupoData, audData] = await Promise.all([
        getGrupo(id),
        getAuditoria(id),
      ]);
      setGrupo(grupoData);
      setAuditoria(audData);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm">Cargando administración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 px-6 py-5 shadow-lg shadow-slate-900/20">
        <button
          onClick={() => navigate(`/grupos/${id}`)}
          className="flex items-center gap-1 text-sm text-slate-300 hover:text-white transition mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a {grupo?.nombre ?? 'Registros'}
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Administración</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              {grupo?.nombre} · {grupo?.asignatura}
            </p>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-6 py-2.5 flex items-center gap-1">
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <ClipboardList className="w-4 h-4 text-indigo-400" /> Historial de auditoría
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-1 ml-auto text-xs text-indigo-500 hover:text-indigo-700 transition"
        >
          <RefreshCw className="w-3 h-3" /> Recargar
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
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-3">
            Últimas 200 acciones registradas
          </h2>
            {auditoria.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">No hay registros de auditoría aún.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm shadow-slate-200/50">
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
      </main>
    </div>
  );
}
