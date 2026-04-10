// ============================================================
// Tests: ModalEstudiante component
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModalEstudiante from '../components/ModalEstudiante.jsx';

describe('ModalEstudiante', () => {
  const defaultProps = {
    grupoId: 1,
    onGuardado: vi.fn(),
    onCerrar: vi.fn(),
    createEstudiante: vi.fn().mockResolvedValue({}),
    bulkImportEstudiantes: vi.fn().mockResolvedValue({ importados: 1, duplicados: 0, errores: 0 }),
  };

  it('renderiza en modo manual por defecto', () => {
    render(<ModalEstudiante {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Apellidos/i)).toBeInTheDocument();
    expect(screen.getByText('Agregar')).toBeInTheDocument();
  });

  it('cambia a modo Excel al hacer clic en tab', async () => {
    const user = userEvent.setup();
    render(<ModalEstudiante {...defaultProps} />);
    await user.click(screen.getByText(/Importar Excel/i));
    expect(screen.getByText('Importar')).toBeInTheDocument();
  });

  it('valida nombre vacío', async () => {
    const user = userEvent.setup();
    render(<ModalEstudiante {...defaultProps} />);
    // El botón "Agregar" está deshabilitado cuando el input está vacío
    const btn = screen.getByText('Agregar');
    expect(btn).toBeDisabled();
  });

  it('rechaza caracteres inválidos en nombre', async () => {
    const user = userEvent.setup();
    render(<ModalEstudiante {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Apellidos/i);
    await user.type(input, 'Test<script>');
    await user.click(screen.getByText('Agregar'));
    expect(screen.getByText(/solo puede contener letras/i)).toBeInTheDocument();
  });

  it('llama createEstudiante con nombre válido', async () => {
    const user = userEvent.setup();
    const mockCreate = vi.fn().mockResolvedValue({});
    render(<ModalEstudiante {...defaultProps} createEstudiante={mockCreate} />);
    const input = screen.getByPlaceholderText(/Apellidos/i);
    await user.type(input, 'García López Ana');
    await user.click(screen.getByText('Agregar'));
    expect(mockCreate).toHaveBeenCalledWith(1, { nombre: 'García López Ana' });
  });

  it('muestra error si createEstudiante falla', async () => {
    const user = userEvent.setup();
    const mockCreate = vi.fn().mockRejectedValue(new Error('Ya existe'));
    render(<ModalEstudiante {...defaultProps} createEstudiante={mockCreate} />);
    const input = screen.getByPlaceholderText(/Apellidos/i);
    await user.type(input, 'Test Nombre');
    await user.click(screen.getByText('Agregar'));
    expect(await screen.findByText(/Ya existe/)).toBeInTheDocument();
  });

  it('muestra resumen tras importación exitosa', async () => {
    const user = userEvent.setup();
    const mockImport = vi.fn().mockResolvedValue({
      exito: true,
      importados: 3,
      duplicados: 1,
      errores: 0,
    });
    render(<ModalEstudiante {...defaultProps} bulkImportEstudiantes={mockImport} />);
    await user.click(screen.getByText(/Importar Excel/i));

    // Simular selección de archivo
    const input = document.querySelector('input[type="file"]');
    const file = new File(['content'], 'estudiantes.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(input, file);
    await user.click(screen.getByText('Importar'));

    expect(await screen.findByText('Importación completada')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // importados
    expect(screen.getByText('1')).toBeInTheDocument(); // duplicados
  });

  it('muestra tabla de duplicados en error estructurado', async () => {
    const user = userEvent.setup();
    const mockImport = vi.fn().mockResolvedValue({
      exito: false,
      error: 'El archivo contiene nombres duplicados',
      errores: [
        { fila: 3, valor: 'Juan Pérez', razon: 'Duplicado con fila 1' },
      ],
    });
    render(<ModalEstudiante {...defaultProps} bulkImportEstudiantes={mockImport} />);
    await user.click(screen.getByText(/Importar Excel/i));

    const input = document.querySelector('input[type="file"]');
    const file = new File(['content'], 'estudiantes.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(input, file);
    await user.click(screen.getByText('Importar'));

    const matches = await screen.findAllByText(/nombres duplicados/i);
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Duplicado con fila 1')).toBeInTheDocument();
  });

  it('cierra modal al hacer clic en ×', async () => {
    const user = userEvent.setup();
    render(<ModalEstudiante {...defaultProps} />);
    await user.click(screen.getByText('×'));
    expect(defaultProps.onCerrar).toHaveBeenCalled();
  });
});
