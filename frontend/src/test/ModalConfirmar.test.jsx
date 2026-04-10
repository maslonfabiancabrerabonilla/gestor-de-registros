// ============================================================
// Tests: ModalConfirmar component
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalConfirmar from '../components/ModalConfirmar.jsx';

describe('ModalConfirmar', () => {
  const defaultProps = {
    titulo: '¿Eliminar grupo?',
    mensaje: 'Esta acción no se puede deshacer.',
    onConfirmar: vi.fn(),
    onCerrar: vi.fn(),
  };

  it('renderiza título y mensaje', () => {
    render(<ModalConfirmar {...defaultProps} />);
    expect(screen.getByText('¿Eliminar grupo?')).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
  });

  it('llama onConfirmar al hacer clic en botón', async () => {
    const user = userEvent.setup();
    render(<ModalConfirmar {...defaultProps} />);
    await user.click(screen.getByText('Eliminar'));
    expect(defaultProps.onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('llama onCerrar al hacer clic en Cancelar', async () => {
    const user = userEvent.setup();
    render(<ModalConfirmar {...defaultProps} />);
    await user.click(screen.getByText('Cancelar'));
    expect(defaultProps.onCerrar).toHaveBeenCalledTimes(1);
  });

  it('muestra label personalizado en botón confirmar', () => {
    render(<ModalConfirmar {...defaultProps} labelConfirmar="Sí, eliminar" />);
    expect(screen.getByText('Sí, eliminar')).toBeInTheDocument();
  });

  it('muestra error cuando se proporciona', () => {
    render(<ModalConfirmar {...defaultProps} error="Fallo al eliminar" />);
    expect(screen.getByText(/Fallo al eliminar/)).toBeInTheDocument();
  });

  it('deshabilita botones cuando cargando', () => {
    render(<ModalConfirmar {...defaultProps} cargando={true} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => expect(btn).toBeDisabled());
  });

  it('aplica estilo peligro por defecto', () => {
    render(<ModalConfirmar {...defaultProps} />);
    const btn = screen.getByText('Eliminar');
    expect(btn.className).toContain('bg-red-600');
  });

  it('aplica estilo advertencia si variante es advertencia', () => {
    render(<ModalConfirmar {...defaultProps} variante="advertencia" />);
    const btn = screen.getByText('Eliminar');
    expect(btn.className).toContain('bg-amber-500');
  });
});
