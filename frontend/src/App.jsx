// Enrutador principal de la SPA — define las 3 rutas de la aplicación
import { Routes, Route, Navigate } from 'react-router-dom';
import PageGrupos    from './pages/PageGrupos.jsx';
import PageRegistros from './pages/PageRegistros.jsx';
import PageAdmin     from './pages/PageAdmin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/"                   element={<PageGrupos />} />
      <Route path="/grupos/:id"         element={<PageRegistros />} />
      <Route path="/grupos/:id/admin"   element={<PageAdmin />} />
      <Route path="*"                   element={<Navigate to="/" replace />} />
    </Routes>
  );
}
