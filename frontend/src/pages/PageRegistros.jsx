import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate }            from 'react-router-dom';
import {
  getGrupo, getEstudiantes, getTurnos, getRegistrosTurno,
  createTurno, updateTurno, deleteTurno,
  createEstudiante, deleteEstudiante, bulkImportEstudiantes,
  batchSave, generarCorte, exportarMatriz,
} from '../services/api.js';
import TablaRegistros  from '../components/TablaRegistros.jsx';
import ModalTurno      from '../components/ModalTurno.jsx';
import ModalEstudiante from '../components/ModalEstudiante.jsx';
import ModalConfirmar  from '../components/ModalConfirmar.jsx';

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = nombreArchivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

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
    turnosClase:  turnos.filter(t => ['C','CP','PL'].includes(t.tipo)).length,
    turnosPrueba: turnos.filter(t => ['PP','PF','PE','EM'].includes(t.tipo)).length,
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Cargando datos del grupo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:underline mb-1 block">
            &larr; Mis Grupos
          </button>
          <h1 className="text-xl font-bold text-slate-800">{grupo?.nombre}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {grupo?.asignatura}
            {grupo?.semestre && <span className="ml-1 text-slate-400">&middot; {grupo.semestre}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModalEstudiante(true)}
            className="px-3 py-2 text-sm bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-blue-300 hover:text-blue-700 transition"
          >+ Agregar Estudiantes</button>
          <button
            onClick={abrirNuevoTurno}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >+ Nuevo Turno</button>
          <div className="relative group">
            <button
              disabled={exportando}
              className="px-3 py-2 text-sm bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-green-400 hover:text-green-700 transition disabled:opacity-50"
            >{exportando ? 'Exportando...' : 'Exportar'}</button>
            <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-30">
              <button onClick={() => exportarExcel('corte')} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                Reporte de corte
              </button>
              <button onClick={() => exportarExcel('matriz')} className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50">
                Matriz completa
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center gap-5 text-sm text-slate-500 flex-wrap">
        <span><span className="font-semibold text-slate-700">{resumen.estudiantes}</span> estudiantes</span>
        <span className="text-slate-300">|</span>
        <span>
          <span className="font-semibold text-slate-700">{resumen.turnos}</span> turnos
          {resumen.turnos > 0 && <span className="ml-1 text-slate-400">({resumen.turnosClase} clases &middot; {resumen.turnosPrueba} pruebas)</span>}
        </span>
        <button onClick={cargar} className="ml-auto text-xs text-blue-500 hover:underline">Recargar</button>
      </div>

      <main className="flex-1 p-4 md:p-6">
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
          mensaje={`Eliminar el Turno T${turnoEliminar.numero_turno} (${turnoEliminar.tipo})? Se borraran tambien todos sus registros.`}
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

      {estudianteEliminar && (
        <ModalConfirmar
          titulo="Eliminar Estudiante"
          mensaje={`Eliminar a "${estudianteEliminar.nombre}"? Sus registros se conservaran en el historial.`}
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