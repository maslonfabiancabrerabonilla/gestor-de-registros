import { useEffect, useState } from 'react';
import { useNavigate }         from 'react-router-dom';
import { getGrupos, deleteGrupo } from '../services/api.js';
import ModalCrearGrupo         from '../components/ModalCrearGrupo.jsx';

export default function PageGrupos() {
  const navigate = useNavigate();

  const [grupos,        setGrupos]        = useState([]);
  const [cargando,      setCargando]      = useState(true);
  const [error,         setError]         = useState('');
  const [modalAbierto,  setModalAbierto]  = useState(false);
  const [eliminando,    setEliminando]    = useState(null); // id del grupo que se está eliminando

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

  const handleEliminar = async (grupo) => {
    if (!window.confirm(`¿Eliminar "${grupo.nombre}"? Se borrarán todos sus datos.`)) return;
    setEliminando(grupo.id);
    try {
      await deleteGrupo(grupo.id);
      setGrupos(prev => prev.filter(g => g.id !== grupo.id));
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setEliminando(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sistema de Gestión Docente</h1>
          <p className="text-xs text-slate-500">Universidad de Ciencias Informáticas</p>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-3xl mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-700">Mis Grupos</h2>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <span className="text-lg leading-none">+</span> Nuevo Grupo
          </button>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="text-center py-16 text-slate-400">Cargando grupos...</div>
        )}

        {error && !cargando && (
          <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
            ❌ {error}
          </div>
        )}

        {/* Lista de grupos */}
        {!cargando && !error && grupos.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium">No tienes grupos aún.</p>
            <p className="text-sm">Crea el primero con el botón de arriba.</p>
          </div>
        )}

        {!cargando && grupos.length > 0 && (
          <ul className="flex flex-col gap-3">
            {grupos.map(grupo => (
              <li
                key={grupo.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between px-5 py-4 group"
              >
                {/* Info del grupo */}
                <button
                  className="flex-1 text-left"
                  onClick={() => navigate(`/grupos/${grupo.id}`)}
                >
                  <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition">
                    {grupo.nombre}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {grupo.asignatura}
                    {grupo.semestre && <span className="ml-2 text-slate-400">· {grupo.semestre}</span>}
                  </p>
                </button>

                {/* Acciones */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/grupos/${grupo.id}`)}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition"
                  >
                    Abrir →
                  </button>
                  <button
                    onClick={() => handleEliminar(grupo)}
                    disabled={eliminando === grupo.id}
                    className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                  >
                    {eliminando === grupo.id ? '...' : 'Eliminar'}
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
    </div>
  );
}
