// Modal de confirmación genérico para eliminar entidades
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
  const btnClass = variante === 'peligro'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-amber-500 hover:bg-amber-600 text-white';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-5 flex flex-col gap-4">
          <h2 className="font-semibold text-slate-800 text-lg">{titulo}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{mensaje}</p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">❌ {error}</p>
          )}

          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={onCerrar}
              disabled={cargando}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={cargando}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 ${btnClass}`}
            >
              {cargando ? 'Procesando…' : labelConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
