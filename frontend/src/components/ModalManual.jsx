// Modal del manual de usuario con todas las secciones del sistema
import { HelpCircle, X } from 'lucide-react';

const MANUAL_SECCIONES = [
  {
    titulo: 'Grupos',
    items: [
      { termino: 'Crear grupo', desc: 'Usa el botón "Nuevo Grupo" para crear un nuevo registro perteneciente a una asignatura y grupo. Opcionalmente define el total de clases planificadas para habilitar el rastreo automático de asistencia.' },
      { termino: 'Editar / Eliminar', desc: 'Cada tarjeta de grupo tiene botones para editar (✏️) y eliminar (🗑️). Eliminar un grupo borra todos sus datos permanentemente.' },
      { termino: 'Semestre', desc: 'Campo opcional para identificar el periodo académico (ej. 2025-2).' },
    ],
  },
  {
    titulo: 'Estudiantes',
    items: [
      { termino: 'Alta manual', desc: 'Dentro de un grupo, pulsa "Estudiantes" para agregar uno a uno. Solo letras, espacios, guiones y puntos.' },
      { termino: 'Importación Excel', desc: 'En el mismo modal puedes subir un archivo .xlsx con los nombres en la primera columna. El sistema detecta duplicados automáticamente.' },
      { termino: 'Orden', desc: 'Los estudiantes se ordenan alfabéticamente de forma automática al crear, editar o importar.' },
    ],
  },
  {
    titulo: 'Turnos',
    items: [
      { termino: 'Tipos de turno', desc: 'C (Conferencias), CP (Clase Práctica), PL (Práctica de Laboratorio) cuentan para asistencia. PP (Prueba Parcial), PF (Prueba Final), PE (Prueba Especial o Extraordinario) y EM (Examen Mundial) son evaluaciones.' },
      { termino: 'Fecha', desc: 'Opcional al crear, pero obligatoria para poder registrar asistencia. Sin fecha el turno aparece como "Sin fecha".' },
      { termino: 'Límite', desc: 'Si el grupo tiene clases planificadas, no se pueden crear más turnos de los definidos.' },
    ],
  },
  {
    titulo: 'Registros',
    items: [
      { termino: 'Asistencia', desc: 'Selecciona A (Asistió), F (Faltó) o NP (No Presentó, solo en evaluaciones). Cada cambio queda pendiente hasta guardar.' },
      { termino: 'Calificación', desc: 'Entero de 2 a 5. Solo se puede asignar si el estudiante asistió (A).' },
      { termino: 'Guardar', desc: 'Pulsa el botón 💾 en la columna del turno para enviar los cambios. El guardado es atómico: o se guardan todos o ninguno.' },
      { termino: 'Celda amarilla', desc: 'Indica que hay un cambio pendiente sin guardar en esa celda.' },
    ],
  },
  {
    titulo: 'Estadísticas y Corte',
    items: [
      { termino: '% Asistencia', desc: 'Se calcula sobre los turnos tipo clase (C/CP/PL) con fecha. Si definiste clases planificadas, usa ese total como denominador.' },
      { termino: 'Promedio', desc: 'Media aritmética de todas las calificaciones registradas del estudiante.' },
      { termino: 'Corte B / R / M', desc: 'B (Bien): promedio ≥ 4.0 y asistencia ≥ 80%. R (Regular): promedio ≥ 3.0 y asistencia ≥ 70%. M (Mal): cualquier otro caso.' },
      { termino: '⚠️ Alerta', desc: 'Aparece cuando un estudiante supera el 20% de inasistencias (solo si hay clases planificadas definidas).' },
    ],
  },
  {
    titulo: 'Exportación',
    items: [
      { termino: 'Reporte de corte', desc: 'Genera un Excel con el corte evaluativo (B/R/M) de cada estudiante, coloreado. Incluye hoja de resumen estadístico.' },
      { termino: 'Matriz completa', desc: 'Exporta toda la grilla estudiantes × turnos tal como se ve en pantalla.' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { termino: 'Auditoría', desc: 'Desde el ícono ⚙️ de cada grupo accedes al historial de todas las acciones realizadas: creación de turnos, guardado de registros, importaciones, etc.' },
    ],
  },
];

export default function ModalManual({ onCerrar }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-modal">
        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-100 rounded-xl p-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Manual de Usuario — SGD-UCI</h2>
          </div>
          <button onClick={onCerrar} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {MANUAL_SECCIONES.map(sec => (
            <div key={sec.titulo}>
              <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">{sec.titulo}</h3>
              <dl className="space-y-1.5">
                {sec.items.map(item => (
                  <div key={item.termino} className="bg-slate-50 rounded-xl px-4 py-2.5">
                    <dt className="text-sm font-semibold text-slate-700">{item.termino}</dt>
                    <dd className="text-sm text-slate-500 mt-0.5">{item.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <p className="text-xs text-slate-400 text-center pt-2 pb-1">SGD-UCI v1.0 — Sistema de Gestión Docente</p>
        </div>
      </div>
    </div>
  );
}
