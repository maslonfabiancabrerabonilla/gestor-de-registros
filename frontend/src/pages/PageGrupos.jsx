// Página principal: listado de grupos con acciones CRUD
import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getGrupos, deleteGrupo } from '../services/api.js';
import ModalCrearGrupo         from '../components/ModalCrearGrupo.jsx';
import ModalEditarGrupo        from '../components/ModalEditarGrupo.jsx';
import ModalConfirmar          from '../components/ModalConfirmar.jsx';
import { Plus, ArrowRight, Pencil, Settings, Trash2, GraduationCap, BookOpen, FolderOpen, HelpCircle, X } from 'lucide-react';

// ── Contenido del manual de usuario ──────────────────────────
const MANUAL_SECCIONES = [
  {
    titulo: 'Grupos',
    items: [
      { termino: 'Crear grupo', desc: 'Usa el botón "Nuevo Grupo" para registrar una asignatura. Opcionalmente define el total de clases planificadas para habilitar el rastreo automático de asistencia.' },
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
      { termino: 'Tipos de turno', desc: 'C (Clase), CP (Clase Práctica), PL (Práctica de Lab.) cuentan para asistencia. PP, PF, PE (Pruebas) y EM (Examen) son evaluaciones.' },
      { termino: 'Fecha', desc: 'Opcional al crear, pero obligatoria para poder registrar asistencia. Sin fecha el turno aparece como "Sin fecha".' },
      { termino: 'Límite', desc: 'Si el grupo tiene clases planificadas, no se pueden crear más turnos de los definidos.' },
    ],
  },
  {
    titulo: 'Registros (la grilla)',
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

export default function PageGrupos() {
  const navigate = useNavigate();

  const [grupos,        setGrupos]        = useState([]);
  const [cargando,      setCargando]      = useState(true);
  const [error,         setError]         = useState('');
  const [modalAbierto,    setModalAbierto]    = useState(false);
  const [grupoEditar,      setGrupoEditar]      = useState(null);
  const [grupoEliminar,   setGrupoEliminar]   = useState(null);
  const [eliminando,      setEliminando]      = useState(false);
  const [errModal,        setErrModal]        = useState('');
  const [manualAbierto,   setManualAbierto]   = useState(false);

  // ── Cargar grupos ──────────────────────────────────────────
  const cargarGrupos = () => {
    setCargando(true);
    getGrupos()
      .then(setGrupos)
      .catch(err => setError(err.message))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarGrupos(); }, []);

  // ── Handlers ───────────────────────────────────────────────
  const handleCreado = (nuevoGrupo) => {
    setGrupos(prev => [...prev, nuevoGrupo]);
    setModalAbierto(false);
  };

  const handleEditado = (grupoActualizado) => {
    setGrupos(prev => prev.map(g => g.id === grupoActualizado.id ? grupoActualizado : g));
    setGrupoEditar(null);
  };

  const confirmarEliminar = (grupo) => { setErrModal(''); setGrupoEliminar(grupo); };

  const ejecutarEliminar = async () => {
    setEliminando(true); setErrModal('');
    try {
      await deleteGrupo(grupoEliminar.id);
      setGrupos(prev => prev.filter(g => g.id !== grupoEliminar.id));
      setGrupoEliminar(null);
    } catch (err) {
      setErrModal(err.message);
    } finally {
      setEliminando(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-2 flex items-center justify-between gap-3 shadow-lg shadow-indigo-500/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-white/20 rounded-lg p-1.5">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white tracking-tight">Sistema de Gestión Docente</h1>
            <p className="text-[11px] text-blue-200">Universidad de las Ciencias Informáticas</p>
          </div>
        </div>
        <button
          onClick={() => setManualAbierto(true)}
          className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition"
          title="Manual de usuario"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </header>

      {/* Contenido */}
      <main className="max-w-3xl mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-700">Mis Grupos</h2>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30"
          >
            <Plus className="w-4 h-4" /> Nuevo Grupo
          </button>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="text-center py-16 text-slate-400">
            <div className="inline-block w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
            <p>Cargando grupos...</p>
          </div>
        )}

        {error && !cargando && (
          <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
            ❌ {error}
          </div>
        )}

        {/* Lista de grupos */}
        {!cargando && !error && grupos.length === 0 && (
          <div className="text-center py-20 text-slate-400 animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-4">
              <FolderOpen className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="font-medium text-slate-600">No tienes grupos aún.</p>
            <p className="text-sm mt-1">Crea el primero con el botón de arriba.</p>
          </div>
        )}

        {!cargando && grupos.length > 0 && (
          <ul className="flex flex-col gap-3">
            {grupos.map((grupo, i) => (
              <li
                key={grupo.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 flex items-center justify-between px-5 py-4 group animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Info del grupo */}
                <button
                  className="flex-1 text-left flex items-center gap-3"
                  onClick={() => navigate(`/grupos/${grupo.id}`)}
                >
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5 shadow-md shadow-indigo-500/20 group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition">
                      {grupo.nombre}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {grupo.asignatura}
                      {grupo.semestre && <span className="ml-2 text-slate-400">· {grupo.semestre}</span>}
                    </p>
                  </div>
                </button>

                {/* Acciones */}
                <div className="flex items-center gap-1.5 ml-4">
                  <button
                    onClick={() => navigate(`/grupos/${grupo.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Abrir
                  </button>
                  <button
                    onClick={() => setGrupoEditar(grupo)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Editar grupo"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/grupos/${grupo.id}/admin`)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Administración del grupo"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => confirmarEliminar(grupo)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Eliminar grupo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Modal crear grupo */}
      {modalAbierto && (
        <ModalCrearGrupo
          onCerrar={() => setModalAbierto(false)}
          onCreado={handleCreado}
        />
      )}

      {/* Modal editar grupo */}
      {grupoEditar && (
        <ModalEditarGrupo
          grupo={grupoEditar}
          onCerrar={() => setGrupoEditar(null)}
          onGuardado={handleEditado}
        />
      )}

      {/* Modal confirmar eliminar grupo */}
      {grupoEliminar && (
        <ModalConfirmar
          titulo="Eliminar grupo"
          mensaje={`¿Eliminar "${grupoEliminar.nombre}"? Se borrarán todos sus datos permanentemente.`}
          labelConfirmar="Eliminar"
          variante="peligro"
          cargando={eliminando}
          error={errModal}
          onConfirmar={ejecutarEliminar}
          onCerrar={() => { setGrupoEliminar(null); setErrModal(''); }}
        />
      )}

      {/* Modal manual de usuario */}
      {manualAbierto && (
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
              <button onClick={() => setManualAbierto(false)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
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
      )}
    </div>
  );
}
