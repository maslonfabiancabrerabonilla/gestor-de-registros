// Página principal: listado de grupos con acciones CRUD
import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getGrupos, deleteGrupo } from '../services/api.js';
import ModalCrearGrupo         from '../components/ModalCrearGrupo.jsx';
import ModalEditarGrupo        from '../components/ModalEditarGrupo.jsx';
import ModalConfirmar          from '../components/ModalConfirmar.jsx';
import { Plus, ArrowRight, Pencil, Settings, Trash2, GraduationCap, BookOpen, FolderOpen } from 'lucide-react';

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
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between shadow-lg shadow-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Sistema de Gestión Docente</h1>
            <p className="text-xs text-blue-100">Universidad de las Ciencias Informáticas</p>
          </div>
        </div>
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
    </div>
  );
}
