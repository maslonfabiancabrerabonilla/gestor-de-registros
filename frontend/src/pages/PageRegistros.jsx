// Vista de registros de un grupo: grilla estudiantes × turnos con edición inline
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate }            from 'react-router-dom';
import {
  getGrupo, getEstudiantes, getTurnos, getRegistrosTurno,
  createTurno, updateTurno, deleteTurno,
  createEstudiante, updateEstudiante, deleteEstudiante, bulkImportEstudiantes,
  batchSave, generarCorte, exportarMatriz,
} from '../services/api.js';
import { TIPOS_CLASE }         from '../constants.js';
import { descargarBlob }       from '../utils/descargarBlob.js';
import TablaRegistros          from '../components/TablaRegistros.jsx';
import ModalTurno              from '../components/ModalTurno.jsx';
import ModalEstudiante         from '../components/ModalEstudiante.jsx';
import ModalEditarEstudiante   from '../components/ModalEditarEstudiante.jsx';
import ModalConfirmar          from '../components/ModalConfirmar.jsx';
import { ArrowLeft, UserPlus, CalendarPlus, Download, Settings, FileSpreadsheet, RefreshCw, Loader2 } from 'lucide-react';

export default function PageRegistros() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [grupo,        setGrupo]        = useState(null);
  const [estudiantes,  setEstudiantes]  = useState([]);
  const [turnos,       setTurnos]       = useState([]);
  const [registrosMap, setRegistrosMap] = useState({});
  const [cargando,     setCargando]     = useState(true);
  const [error,        setError]        = useState('');

  const [modalTurno,         setModalTurno]         = useState(false);
  const [turnoEditar,        setTurnoEditar]        = useState(null);
  const [turnoEliminar,      setTurnoEliminar]      = useState(null);
  const [modalEstudiante,    setModalEstudiante]    = useState(false);
  const [estudianteEditar,   setEstudianteEditar]   = useState(null);
  const [estudianteEliminar, setEstudianteEliminar] = useState(null);

  const [errModal,      setErrModal]      = useState('');
  const [cargandoModal, setCargandoModal] = useState(false);
  const [exportando,    setExportando]    = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [grupoData, estudiantesData, turnosData] = await Promise.all([
        getGrupo(id), getEstudiantes(id), getTurnos(id),
      ]);
      setGrupo(grupoData);
      setEstudiantes(estudiantesData);
      setTurnos(turnosData);

      if (turnosData.length > 0) {
        const resultados = await Promise.all(turnosData.map(t => getRegistrosTurno(t.id)));
        const mapa = {};
        turnosData.forEach((t, i) => {
          mapa[t.id] = {};
          resultados[i].forEach(reg => { mapa[t.id][reg.estudiante_id] = reg; });
        });
        setRegistrosMap(mapa);
      } else {
        setRegistrosMap({});
      }
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('no encontrado')) {
        navigate('/');
      } else {
        setError(err.message);
      }
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevoTurno  = () => { setTurnoEditar(null); setModalTurno(true); };
  const abrirEditarTurno = (t) => { setTurnoEditar(t);   setModalTurno(true); };
  const cerrarModalTurno = () => { setModalTurno(false);  setTurnoEditar(null); };

  const confirmarEliminarTurno = (t) => { setErrModal(''); setTurnoEliminar(t); };
  const ejecutarEliminarTurno  = async () => {
    setCargandoModal(true); setErrModal('');
    try {
      await deleteTurno(id, turnoEliminar.id);
      setTurnoEliminar(null);
      cargar();
    } catch (err) { setErrModal(err.message); }
    finally { setCargandoModal(false); }
  };

  const confirmarEliminarEst = (est) => { setErrModal(''); setEstudianteEliminar(est); };
  const abrirEditarEstudiante = (est) => { setEstudianteEditar(est); };
  const ejecutarEliminarEst  = async () => {
    setCargandoModal(true); setErrModal('');
    try {
      await deleteEstudiante(id, estudianteEliminar.id);
      setEstudianteEliminar(null);
      cargar();
    } catch (err) { setErrModal(err.message); }
    finally { setCargandoModal(false); }
  };

  const exportarExcel = async (tipo) => {
    if (exportando) return;
    setExportando(true);
    try {
      if (tipo === 'corte') {
        const blob = await generarCorte(id, `Reporte_${grupo?.nombre ?? id}`);
        descargarBlob(blob, `reporte_corte_${id}.xlsx`);
      } else {
        const blob = await exportarMatriz(id);
        descargarBlob(blob, `matriz_completa_${id}.xlsx`);
      }
    } catch (err) { setError(err.message); }
    finally { setExportando(false); }
  };

  const resumen = {
    estudiantes:  estudiantes.length,
    turnos:       turnos.length,
    turnosClase:  turnos.filter(t => TIPOS_CLASE.includes(t.tipo)).length,
    turnosPrueba: turnos.filter(t => !TIPOS_CLASE.includes(t.tipo)).length,
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm">Cargando datos del grupo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">

      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-2 flex items-center justify-between gap-3 flex-wrap shadow-lg shadow-indigo-500/20">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition" title="Mis Grupos">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white tracking-tight truncate">{grupo?.nombre}</h1>
            <p className="text-[11px] text-blue-200 truncate">
              {grupo?.asignatura}
              {grupo?.semestre && <span className="ml-1">&middot; {grupo.semestre}</span>}
              <span className="ml-2 text-blue-300/80">
                {resumen.estudiantes} est. &middot; {resumen.turnos} turnos
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={cargar} className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition" title="Recargar">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setModalEstudiante(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white/15 text-white border border-white/20 rounded-lg hover:bg-white/25 transition"
          ><UserPlus className="w-3.5 h-3.5" /> Estudiantes</button>
          {(!grupo?.total_clases_planificadas || turnos.length < grupo.total_clases_planificadas) && (
            <button
              onClick={abrirNuevoTurno}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white text-indigo-700 font-medium rounded-lg hover:bg-indigo-50 transition shadow-md shadow-indigo-900/20"
            ><CalendarPlus className="w-3.5 h-3.5" /> Turno</button>
          )}
          <div className="relative group">
            <button
              disabled={exportando}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white/15 text-white border border-white/20 rounded-lg hover:bg-white/25 transition disabled:opacity-50"
            ><Download className="w-3.5 h-3.5" /> {exportando ? '...' : 'Exportar'}</button>
            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-30">
              <button onClick={() => exportarExcel('corte')} className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition">
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" /> Reporte de corte
              </button>
              <button onClick={() => exportarExcel('matriz')} className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition">
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" /> Matriz completa
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate(`/grupos/${id}/admin`)}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Administración"
          ><Settings className="w-3.5 h-3.5" /></button>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-3 md:p-4 flex flex-col">
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
            <span>{error}</span>
            <button onClick={cargar} className="underline text-red-600 ml-auto">Reintentar</button>
          </div>
        )}
        <TablaRegistros
          estudiantes={estudiantes}
          turnos={turnos}
          registrosMap={registrosMap}
          onBatchSave={(turnoId, registros) => batchSave(turnoId, registros).then(cargar)}
          onEditarTurno={abrirEditarTurno}
          onEliminarTurno={confirmarEliminarTurno}
          onEliminarEstudiante={confirmarEliminarEst}
          onEditarEstudiante={abrirEditarEstudiante}
          totalClasesPlanificadas={grupo?.total_clases_planificadas ?? null}
        />
      </main>

      {modalTurno && (
        <ModalTurno
          grupoId={id}
          turno={turnoEditar}
          createTurno={createTurno}
          updateTurno={updateTurno}
          onGuardado={() => { cerrarModalTurno(); cargar(); }}
          onCerrar={cerrarModalTurno}
        />
      )}

      {turnoEliminar && (
        <ModalConfirmar
          titulo="Eliminar Turno"
          mensaje={`Eliminar el Turno T${turnoEliminar.numero_turno} (${turnoEliminar.tipo})? Se borrarán también todos sus registros.`}
          labelConfirmar="Eliminar Turno"
          cargando={cargandoModal}
          error={errModal}
          onConfirmar={ejecutarEliminarTurno}
          onCerrar={() => { setTurnoEliminar(null); setErrModal(''); }}
        />
      )}

      {modalEstudiante && (
        <ModalEstudiante
          grupoId={id}
          createEstudiante={createEstudiante}
          bulkImportEstudiantes={bulkImportEstudiantes}
          onGuardado={() => { setModalEstudiante(false); cargar(); }}
          onCerrar={() => setModalEstudiante(false)}
        />
      )}

      {estudianteEditar && (
        <ModalEditarEstudiante
          grupoId={id}
          estudiante={estudianteEditar}
          updateEstudiante={updateEstudiante}
          onGuardado={() => { setEstudianteEditar(null); cargar(); }}
          onCerrar={() => setEstudianteEditar(null)}
        />
      )}

      {estudianteEliminar && (
        <ModalConfirmar
          titulo="Eliminar Estudiante"
          mensaje={`Eliminar a "${estudianteEliminar.nombre}"? Sus registros se conservarán en el historial.`}
          labelConfirmar="Eliminar Estudiante"
          cargando={cargandoModal}
          error={errModal}
          onConfirmar={ejecutarEliminarEst}
          onCerrar={() => { setEstudianteEliminar(null); setErrModal(''); }}
        />
      )}

    </div>
  );
}