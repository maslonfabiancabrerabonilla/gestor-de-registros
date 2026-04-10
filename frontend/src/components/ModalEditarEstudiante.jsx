// Modal para renombrar un estudiante existente
import { useState } from 'react';
import { UserPen, X, Loader2 } from 'lucide-react';

const NOMBRE_REGEX = /^[\p{L}\s\-.]+$/u;

export default function ModalEditarEstudiante({ grupoId, estudiante, updateEstudiante, onGuardado, onCerrar }) {
  const [nombre,   setNombre]   = useState(estudiante.nombre);
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');

  const guardar = async (e) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    if (!NOMBRE_REGEX.test(nombreLimpio)) {
      setError('El nombre solo puede contener letras, espacios, guiones y puntos.');
      return;
    }
    if (nombreLimpio === estudiante.nombre) { onCerrar(); return; }

    setError('');
    setCargando(true);
    try {
      await updateEstudiante(grupoId, estudiante.id, { nombre: nombreLimpio });
      onGuardado();
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-modal">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 rounded-xl p-2">
              <UserPen className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Editar Estudiante</h2>
          </div>
          <button onClick={onCerrar} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={guardar} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Nombre completo *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError(''); }}
              maxLength={150}
              required
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 input-glow transition"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>
          )}

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || !nombre.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/25 transition"
            >
              {cargando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : 'Guardar'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
