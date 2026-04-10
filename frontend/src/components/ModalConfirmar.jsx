// Modal de confirmación genérico para eliminar entidades
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function ModalConfirmar({
  titulo,
  mensaje,
  labelConfirmar = 'Eliminar',
  variante = 'peligro', // 'peligro' | 'advertencia'
  cargando,
  error,
  onConfirmar,
  onCerrar,
}) {
  const esPeligro = variante === 'peligro';
  const btnClass = esPeligro
    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/25'
    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25';
  const accentColor = esPeligro ? 'from-red-500 to-red-600' : 'from-amber-400 to-amber-500';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-modal overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${accentColor}`} />
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${esPeligro ? 'bg-red-100' : 'bg-amber-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${esPeligro ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-lg">{titulo}</h2>
              <p className="text-sm text-slate-600 leading-relaxed mt-1">{mensaje}</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>
          )}

          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={onCerrar}
              disabled={cargando}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={cargando}
              className={`flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-xl transition disabled:opacity-50 ${btnClass}`}
            >
              {cargando ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</> : labelConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
