import { useState } from 'react';
import { UserPlus, Upload, X, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';

// Modal para agregar un solo estudiante o importar Excel masivo
const NOMBRE_REGEX = /^[\p{L}\s\-.]+$/u;

export default function ModalEstudiante({ grupoId, onGuardado, onCerrar, createEstudiante, bulkImportEstudiantes }) {
  const [modo,        setModo]        = useState('manual'); // 'manual' | 'excel'
  const [nombre,      setNombre]      = useState('');
  const [archivo,     setArchivo]     = useState(null);
  const [cargando,    setCargando]    = useState(false);
  const [error,       setError]       = useState('');
  const [resultado,   setResultado]   = useState(null); // para mostrar resumen de importación

  const guardarManual = async (e) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    if (!NOMBRE_REGEX.test(nombreLimpio)) {
      setError('El nombre solo puede contener letras, espacios, guiones y puntos.');
      return;
    }
    setError('');
    setCargando(true);
    try {
      await createEstudiante(grupoId, { nombre: nombreLimpio });
      onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const importarExcel = async (e) => {
    e.preventDefault();
    if (!archivo) { setError('Selecciona un archivo Excel.'); return; }
    setError('');
    setCargando(true);
    try {
      const res = await bulkImportEstudiantes(grupoId, archivo);
      if (res.exito === false) {
        // Respuesta estructurada de error (ej. duplicados en archivo)
        setResultado(res);
      } else {
        setResultado(res);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-modal">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 rounded-xl p-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Agregar Estudiantes</h2>
          </div>
          <button onClick={onCerrar} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {resultado ? (
          resultado.exito === false ? (
            /* ── Error estructurado (ej. duplicados en archivo) ── */
            <div className="px-6 py-5 flex flex-col gap-4">
              <p className="text-red-700 font-medium">⚠️ {resultado.error || 'Error en el archivo'}</p>
              {resultado.errores?.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-red-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-red-700">Fila</th>
                        <th className="text-left px-3 py-2 text-red-700">Nombre</th>
                        <th className="text-left px-3 py-2 text-red-700">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {resultado.errores.map((e, i) => (
                        <tr key={i} className="hover:bg-red-50/50">
                          <td className="px-3 py-1.5 text-red-600 font-mono">{e.fila}</td>
                          <td className="px-3 py-1.5 text-slate-700">{e.valor}</td>
                          <td className="px-3 py-1.5 text-slate-500">{e.razon}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-slate-500">
                Corrige los nombres duplicados en tu archivo Excel y vuelve a intentar.
              </p>
              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={() => { setResultado(null); setArchivo(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reintentar
                </button>
                <button
                  onClick={onCerrar}
                  className="px-5 py-2.5 text-sm font-medium bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
          /* ── Resumen de importación ──────────────────────── */
          <div className="px-6 py-5 flex flex-col gap-4">
            <p className="text-slate-700 font-medium">Importación completada</p>
            {resultado.mensaje && (
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                {resultado.mensaje}
              </p>
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-700">{resultado.importados ?? 0}</p>
                <p className="text-xs text-green-600">Importados</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-amber-600">{resultado.duplicados ?? 0}</p>
                <p className="text-xs text-amber-500">Duplicados</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-red-600">{resultado.errores ?? 0}</p>
                <p className="text-xs text-red-500">Errores</p>
              </div>
            </div>
            {resultado.advertencia && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ {resultado.advertencia}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => { setResultado(null); setArchivo(null); }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Importar más
              </button>
              <button
                onClick={onGuardado}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-indigo-500/25 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                Listo
              </button>
            </div>
          </div>
          )
        ) : (
          <>
            {/* ── Tabs ─────────────────────────────────────── */}
            <div className="flex border-b border-slate-100">
              {['manual', 'excel'].map(m => (
                <button
                  key={m}
                  onClick={() => { setModo(m); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors
                    ${modo === m
                      ? 'border-b-2 border-indigo-500 text-indigo-600'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {m === 'manual' ? <><UserPlus className="w-4 h-4" /> Manual</> : <><Upload className="w-4 h-4" /> Importar Excel</>}
                </button>
              ))}
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {modo === 'manual' ? (
                /* ── Formulario manual ─────────────────────── */
                <form onSubmit={guardarManual} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Apellidos, Nombre"
                      maxLength={150}
                      required
                      autoFocus
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 input-glow transition"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargando || !nombre.trim()}
                      className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/25 transition"
                    >
                      {cargando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : 'Agregar'}
                    </button>
                  </div>
                </form>
              ) : (
                /* ── Importación Excel ─────────────────────── */
                <form onSubmit={importarExcel} className="flex flex-col gap-4">
                  <p className="text-xs text-slate-500">
                    El archivo Excel debe tener una columna <strong>nombre</strong> (o similar) con los nombres completos de los estudiantes.
                    Serán ordenados alfabéticamente e ignorarán duplicados.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Archivo .xlsx / .xls *
                    </label>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-4 file:border-0 file:bg-indigo-50 file:text-indigo-700 file:rounded-xl file:text-xs file:font-medium hover:file:bg-indigo-100 cursor-pointer"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargando || !archivo}
                      className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/25 transition"
                    >
                      {cargando ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando…</> : <><Upload className="w-4 h-4" /> Importar</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
