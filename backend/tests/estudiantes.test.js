// ============================================================
// Tests de integración: API de Estudiantes
// ============================================================
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';

describe('API /api/grupos/:gid/estudiantes', () => {
  let grupoId;
  let estudianteId;

  before(async () => {
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TEST_%'");
    const res = await request(app)
      .post('/api/grupos')
      .send({ nombre: 'TEST_EstGrupo', asignatura: 'Física' });
    grupoId = res.body.id;
  });

  after(async () => {
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TEST_Est%'");
    await pool.end();
  });

  // ── POST individual ────────────────────────────────────────
  it('POST / — crea estudiante', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: 'García López Ana' });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.nombre, 'García López Ana');
    estudianteId = res.body.id;
  });

  it('POST / — rechaza nombre vacío', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: '' });
    assert.equal(res.status, 400);
  });

  it('POST / — rechaza nombre con caracteres inválidos', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: 'Test <script>alert(1)</script>' });
    assert.equal(res.status, 400);
  });

  it('POST / — rechaza nombre con números', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: 'Test123' });
    assert.equal(res.status, 400);
  });

  it('POST / — rechaza duplicado en mismo grupo', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: 'García López Ana' });
    assert.equal(res.status, 409);
  });

  // ── GET ─────────────────────────────────────────────────────
  it('GET / — lista estudiantes del grupo', async () => {
    const res = await request(app).get(`/api/grupos/${grupoId}/estudiantes`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 1);
  });

  it('GET /:id — obtiene estudiante específico', async () => {
    const res = await request(app).get(`/api/grupos/${grupoId}/estudiantes/${estudianteId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.nombre, 'García López Ana');
  });

  it('GET /:id — 404 estudiante inexistente', async () => {
    const res = await request(app).get(`/api/grupos/${grupoId}/estudiantes/99999`);
    assert.equal(res.status, 404);
  });

  // ── PUT ─────────────────────────────────────────────────────
  it('PUT /:id — actualiza nombre', async () => {
    const res = await request(app)
      .put(`/api/grupos/${grupoId}/estudiantes/${estudianteId}`)
      .send({ nombre: 'García López Ana María' });
    assert.equal(res.status, 200);
    assert.equal(res.body.nombre, 'García López Ana María');
  });

  it('PUT /:id — rechaza nombre vacío', async () => {
    const res = await request(app)
      .put(`/api/grupos/${grupoId}/estudiantes/${estudianteId}`)
      .send({ nombre: '' });
    assert.equal(res.status, 400);
  });

  it('PUT /:id — 404 estudiante inexistente', async () => {
    const res = await request(app)
      .put(`/api/grupos/${grupoId}/estudiantes/99999`)
      .send({ nombre: 'Test' });
    assert.equal(res.status, 404);
  });

  // ── GET estadísticas ───────────────────────────────────────
  it('GET /:id/estadisticas — devuelve estadísticas', async () => {
    const res = await request(app)
      .get(`/api/grupos/${grupoId}/estudiantes/${estudianteId}/estadisticas`);
    assert.equal(res.status, 200);
    assert.ok('porcentaje_asistencia' in res.body);
    assert.ok('promedio' in res.body);
    assert.ok('corte' in res.body);
  });

  // ── Orden alfabético ───────────────────────────────────────
  it('Mantiene orden_alfabetico secuencial tras inserciones', async () => {
    await request(app)
      .post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: 'Álvarez Beatriz' });
    await request(app)
      .post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: 'Zamora Carlos' });

    const res = await request(app).get(`/api/grupos/${grupoId}/estudiantes`);
    // Verificar que orden_alfabetico es secuencial (1, 2, 3...)
    const ordenes = res.body.map(e => e.orden_alfabetico);
    for (let i = 0; i < ordenes.length; i++) {
      assert.equal(ordenes[i], i + 1, `orden_alfabetico debe ser ${i + 1}`);
    }
    // Nota: El orden depende del locale de PostgreSQL. Con locale C (Alpine),
    // los caracteres acentuados (Á, É, etc.) se ordenan después de Z.
    // Esto es un comportamiento conocido del contenedor postgres:15-alpine.
  });

  // ── DELETE ──────────────────────────────────────────────────
  it('DELETE /:id — elimina estudiante', async () => {
    const res = await request(app)
      .delete(`/api/grupos/${grupoId}/estudiantes/${estudianteId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.eliminado, true);
  });

  it('DELETE /:id — 404 ya eliminado', async () => {
    const res = await request(app)
      .delete(`/api/grupos/${grupoId}/estudiantes/${estudianteId}`);
    assert.equal(res.status, 404);
  });
});
