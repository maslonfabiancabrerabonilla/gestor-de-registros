import { useState } from 'react';
import { createGrupo } from '../services/api.js';

export default function ModalCrearGrupo({ onCerrar, onCreado }) {
  const [form, setForm]     = useState({ nombre: '', asignatura: '', semestre: '', total_clases_planificadas: '' });
  const [error, setError]   = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim())     return setError('El nombre del grupo es obligatorio.');
    if (!form.asignatura.trim()) return setError('La asignatura es obligatoria.');

    setCargando(true);
    try {
      const payload = {
        ...form,
        total_clases_planificadas: form.total_clases_planificadas !== ''
          ? parseInt(form.total_clases_planificadas, 10)
          : null,
      };
      const nuevo = await createGrupo(payload);
      onCreado(nuevo);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    // Fondo oscuro
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">Nuevo Grupo</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del grupo <span className="text-red-500">*</span>
            </label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: Grupo A"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              placeholder="Ej: Estructuras de Datos"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              value={form.total_clases_planificadas}
              onChange={handleChange}
              placeholder="Ej: 20"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {cargando ? 'Creando...' : 'Crear Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
