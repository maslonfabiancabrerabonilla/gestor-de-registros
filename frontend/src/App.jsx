import { Routes, Route, Navigate } from 'react-router-dom';
import PageGrupos    from './pages/PageGrupos.jsx';
import PageRegistros from './pages/PageRegistros.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/"               element={<PageGrupos />} />
      <Route path="/grupos/:id"     element={<PageRegistros />} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  );
}
