import { useState, useEffect } from 'react';

const TIPOS = [
  { value: 'C',  label: 'C  — Clase',            grupo: 'clase'  },
  { value: 'CP', label: 'CP — Clase Práctica',    grupo: 'clase'  },
  { value: 'PL', label: 'PL — Práctica de Lab.',  grupo: 'clase'  },
  { value: 'PP', label: 'PP — Prueba Parcial',    grupo: 'prueba' },
  { value: 'PF', label: 'PF — Prueba Final',      grupo: 'prueba' },
  { value: 'PE', label: 'PE — Prueba Extra',      grupo: 'prueba' },
  { value: 'EM', label: 'EM — Examen',            grupo: 'prueba' },
];

const HOY = new Date().toISOString().slice(0, 10);

export default function ModalTurno({ grupoId, turno, onGuardado, onCerrar, createTurno, updateTurno }) {
  const editando = Boolean(turno);

  const [tipo,     setTipo]     = useState(turno?.tipo         ?? 'C');
  const [fecha,    setFecha]    = useState(turno?.fecha ? turno.fecha.slice(0, 10) : HOY);
  const [tema,     setTema]     = useState(turno?.descripcion  ?? '');
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (turno) {
      setTipo(turno.tipo);
      setFecha(turno.fecha ? turno.fecha.slice(0, 10) : HOY);
      setTema(turno.descripcion ?? '');
    }
  }, [turno]);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const payload = { tipo, fecha, descripcion: tema.trim() || null };
      if (editando) {
        await updateTurno(grupoId, turno.id, payload);
      } else {
        await createTurno(grupoId, payload);
      }
      onGuardado();
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
          <h2 className="font-semibold text-slate-800">
            {editando ? 'Editar Turno' : 'Nuevo Turno'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {/* Formulario */}
        <form onSubmit={guardar} className="px-6 py-5 flex flex-col gap-4">

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo de turno *</label>
            <div className="grid grid-cols-2 gap-2">
              {['clase', 'prueba'].map(g => (
                <div key={g} className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {g === 'clase' ? 'Clases' : 'Evaluaciones'}
                  </span>
                  {TIPOS.filter(t => t.grupo === g).map(t => (
                    <label
                      key={t.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors
                        ${tipo === t.value
                          ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                    >
                      <input
                        type="radio"
                        name="tipo"
                        value={t.value}
                        checked={tipo === t.value}
                        onChange={() => setTipo(t.value)}
                        className="sr-only"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Tema */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Tema <span className="text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={tema}
              onChange={e => setTema(e.target.value)}
              placeholder="Ej: Introducción a álgebra lineal"
              maxLength={200}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || !fecha}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {cargando ? 'Guardando…' : editando ? 'Actualizar' : 'Crear Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
