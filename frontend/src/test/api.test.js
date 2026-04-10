// ============================================================
// Tests: API service (handleResponse + bulkImport)
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Import after mock
const api = await import('../services/api.js');

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getGrupos', () => {
    it('devuelve datos en respuesta exitosa', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 1, nombre: 'Grupo A' }]),
      });
      const result = await api.getGrupos();
      expect(result).toEqual([{ id: 1, nombre: 'Grupo A' }]);
      expect(mockFetch).toHaveBeenCalledWith('/api/grupos');
    });

    it('lanza error con body.error en respuesta fallida', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'nombre es obligatorio' }),
      });
      await expect(api.getGrupos()).rejects.toThrow('nombre es obligatorio');
    });

    it('lanza HTTP status si no hay body.error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('no json')),
      });
      await expect(api.getGrupos()).rejects.toThrow('HTTP 500');
    });
  });

  describe('createGrupo', () => {
    it('envía POST con JSON correcto', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, nombre: 'Nuevo' }),
      });
      await api.createGrupo({ nombre: 'Nuevo', asignatura: 'Math' });
      expect(mockFetch).toHaveBeenCalledWith('/api/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Nuevo', asignatura: 'Math' }),
      });
    });
  });

  describe('bulkImportEstudiantes', () => {
    it('devuelve datos estructurados en errores de duplicados', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({
          exito: false,
          error: 'Duplicados',
          errores: [{ fila: 2, valor: 'Juan', razon: 'Duplicado con fila 1' }],
        }),
      });
      const result = await api.bulkImportEstudiantes(1, new File([''], 'test.xlsx'));
      expect(result.exito).toBe(false);
      expect(result.errores).toHaveLength(1);
      expect(result.errores[0].fila).toBe(2);
    });

    it('lanza error para errores sin datos estructurados', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Archivo vacío' }),
      });
      await expect(api.bulkImportEstudiantes(1, new File([''], 'test.xlsx')))
        .rejects.toThrow('Archivo vacío');
    });

    it('devuelve resumen en importación exitosa', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exito: true, importados: 5, duplicados: 0, errores: 0 }),
      });
      const result = await api.bulkImportEstudiantes(1, new File([''], 'test.xlsx'));
      expect(result.importados).toBe(5);
    });
  });

  describe('batchSave', () => {
    it('envía turno_id y registros', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ exito: true, registros_guardados: 2 }),
      });
      const registros = [
        { estudiante_id: 1, asistencia: 'A', calificacion: 5 },
        { estudiante_id: 2, asistencia: 'F' },
      ];
      const result = await api.batchSave(10, registros);
      expect(result.registros_guardados).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith('/api/registros/batch-save', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  describe('handleResponse lee body.mensaje', () => {
    it('usa body.mensaje como fallback de body.error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ mensaje: 'Duplicado' }),
      });
      await expect(api.getGrupos()).rejects.toThrow('Duplicado');
    });
  });
});
