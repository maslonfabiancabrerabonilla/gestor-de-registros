import { useState } from 'react';

// Modal para agregar un solo estudiante o importar Excel masivo
export default function ModalEstudiante({ grupoId, onGuardado, onCerrar, createEstudiante, bulkImportEstudiantes }) {
  const [modo,        setModo]        = useState('manual'); // 'manual' | 'excel'
  const [nombre,      setNombre]      = useState('');
  const [archivo,     setArchivo]     = useState(null);
  const [cargando,    setCargando]    = useState(false);
  const [error,       setError]       = useState('');
  const [resultado,   setResultado]   = useState(null); // para mostrar resumen de importación

  const guardarManual = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError('');
    setCargando(true);
    try {
      await createEstudiante(grupoId, { nombre: nombre.trim() });
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
      // res = { importados, duplicados, errores, ... }
      setResultado(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Agregar Estudiantes</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {resultado ? (
          /* ── Resumen de importación ──────────────────────── */
          <div className="px-6 py-5 flex flex-col gap-4">
            <p className="text-slate-700 font-medium">Importación completada</p>
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
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Importar más
              </button>
              <button
                onClick={onGuardado}
                className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Tabs ─────────────────────────────────────── */}
            <div className="flex border-b border-slate-100">
              {['manual', 'excel'].map(m => (
                <button
                  key={m}
                  onClick={() => { setModo(m); setError(''); }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors
                    ${modo === m
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {m === 'manual' ? '✏️ Manual' : '📊 Importar Excel'}
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
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargando || !nombre.trim()}
                      className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {cargando ? 'Guardando…' : 'Agregar'}
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
                      className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-4 file:border-0 file:bg-blue-50 file:text-blue-700 file:rounded-lg file:text-xs file:font-medium hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCerrar} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={cargando || !archivo}
                      className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {cargando ? 'Importando…' : 'Importar'}
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
