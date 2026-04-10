// ============================================================
// Tests: App routing
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';

// Mock pages to avoid full rendering with API calls
vi.mock('../pages/PageGrupos.jsx', () => ({
  default: () => <div data-testid="page-grupos">PageGrupos</div>,
}));
vi.mock('../pages/PageRegistros.jsx', () => ({
  default: () => <div data-testid="page-registros">PageRegistros</div>,
}));
vi.mock('../pages/PageAdmin.jsx', () => ({
  default: () => <div data-testid="page-admin">PageAdmin</div>,
}));

describe('App Routing', () => {
  it('renderiza PageGrupos en ruta /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('page-grupos')).toBeInTheDocument();
  });

  it('renderiza PageRegistros en ruta /grupos/:id', () => {
    render(
      <MemoryRouter initialEntries={['/grupos/1']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('page-registros')).toBeInTheDocument();
  });

  it('renderiza PageAdmin en ruta /grupos/:id/admin', () => {
    render(
      <MemoryRouter initialEntries={['/grupos/1/admin']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('page-admin')).toBeInTheDocument();
  });

  it('redirige rutas desconocidas a /', () => {
    render(
      <MemoryRouter initialEntries={['/ruta-inexistente']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('page-grupos')).toBeInTheDocument();
  });
});
