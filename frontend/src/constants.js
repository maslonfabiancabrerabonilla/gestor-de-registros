// ── Constantes compartidas del frontend ───────────────────────

/** Tipos de turno que cuentan como "clase" para calcular asistencia */
export const TIPOS_CLASE = ['C', 'CP', 'PL'];

/** Colores de badge por tipo de turno */
export const TIPO_COLOR = {
  C:  'bg-blue-100 text-blue-700',
  CP: 'bg-indigo-100 text-indigo-700',
  PL: 'bg-purple-100 text-purple-700',
  PP: 'bg-orange-100 text-orange-700',
  PF: 'bg-rose-100 text-rose-700',
  PE: 'bg-pink-100 text-pink-700',
  EM: 'bg-teal-100 text-teal-700',
};

/** Fondo de celda según valor de asistencia */
export const ASIST_BG = { A: 'bg-green-50', F: 'bg-red-50', NP: 'bg-slate-100' };

/** Badge de corte evaluativo */
export const CORTE_BADGE = {
  B: 'bg-green-100 text-green-800',
  R: 'bg-yellow-100 text-yellow-800',
  M: 'bg-red-100  text-red-800',
};
