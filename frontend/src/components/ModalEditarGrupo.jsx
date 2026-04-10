// Modal para editar datos de un grupo existente
import { useState } from 'react';
import { updateGrupo } from '../services/api.js';
import { MAX_TURNOS }  from '../constants.js';
import { Pencil, Loader2 } from 'lucide-react';

export default function ModalEditarGrupo({ grupo, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    nombre:     grupo.nombre,
    asignatura: grupo.asignatura,
    semestre:   grupo.semestre ?? '',
    total_clases_planificadas: grupo.total_clases_planificadas ?? '',
  });
  const [error, setError]       = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim())     return setError('El nombre del grupo es obligatorio.');
    if (!form.asignatura.trim()) return setError('La asignatura es obligatoria.');

    const tcpVal = form.total_clases_planificadas !== '' ? parseInt(form.total_clases_planificadas, 10) : null;
    if (tcpVal !== null && tcpVal > MAX_TURNOS)
      return setError(`El total de clases planificadas no puede superar ${MAX_TURNOS}.`);

    setCargando(true);
    try {
      const payload = {
        nombre:     form.nombre.trim(),
        asignatura: form.asignatura.trim(),
        semestre:   form.semestre.trim() || null,
        total_clases_planificadas: form.total_clases_planificadas !== ''
          ? parseInt(form.total_clases_planificadas, 10)
          : null,
      };
      const actualizado = await updateGrupo(grupo.id, payload);
      onGuardado(actualizado);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-modal">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-indigo-100 rounded-xl p-2.5">
            <Pencil className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Editar Grupo</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del grupo <span className="text-red-500">*</span>
            </label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent input-glow transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Asignatura <span className="text-red-500">*</span>
            </label>
            <input
              name="asignatura"
              value={form.asignatura}
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent input-glow transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Semestre
            </label>
            <input
              name="semestre"
              value={form.semestre}
              onChange={handleChange}
              placeholder="Ej: 2026-1"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent input-glow transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Total de clases planificadas
              <span className="ml-1 text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              name="total_clases_planificadas"
              type="number"
              min="1"
              max={MAX_TURNOS}
              value={form.total_clases_planificadas}
              onChange={handleChange}
              placeholder="Ej: 20"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent input-glow transition"
            />
            <p className="text-xs text-slate-400 mt-1">Define el denominador para calcular el % de asistencia.</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition shadow-md shadow-indigo-500/25"
            >
              {cargando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
