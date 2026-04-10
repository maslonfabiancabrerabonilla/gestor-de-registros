// ============================================================
// Tests de integración: API de Reportes y Exportación
// ============================================================
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';

describe('API /api/grupos/:gid/reportes y exportar', () => {
  let grupoId;

  before(async () => {
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TEST_%'");

    // Crear grupo con estudiantes, turnos y registros
    const g = await request(app).post('/api/grupos')
      .send({ nombre: 'TEST_RepGrupo', asignatura: 'Geografía', semestre: '2025-1' });
    grupoId = g.body.id;

    const e1 = await request(app).post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: 'Martínez Luis' });

    const t1 = await request(app).post(`/api/grupos/${grupoId}/turnos`)
      .send({ tipo: 'C', fecha: '2025-03-01' });

    await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: t1.body.id,
        registros: [{ estudiante_id: e1.body.id, asistencia: 'A', calificacion: 4 }],
      });
  });

  after(async () => {
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TEST_Rep%' OR nombre LIKE 'TEST_Vacio%'");
    await pool.end();
  });

  // ── Generar corte evaluativo ───────────────────────────────
  it('POST /reportes/generar-corte — genera Excel', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/reportes/generar-corte`)
      .send({})
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('spreadsheetml'));
    assert.ok(res.body.length > 100); // Buffer con contenido xlsx
  });

  it('POST /reportes/generar-corte — 404 grupo inexistente', async () => {
    const res = await request(app)
      .post('/api/grupos/99999/reportes/generar-corte')
      .send({});
    assert.equal(res.status, 404);
  });

  it('POST /reportes/generar-corte — 400 grupo sin turnos', async () => {
    const g2 = await request(app).post('/api/grupos')
      .send({ nombre: 'TEST_VacioRep', asignatura: 'X' });
    const res = await request(app)
      .post(`/api/grupos/${g2.body.id}/reportes/generar-corte`)
      .send({});
    assert.equal(res.status, 400);
  });

  // ── Exportar matriz completa ───────────────────────────────
  it('GET /exportar/matriz-completa — genera Excel', async () => {
    const res = await request(app)
      .get(`/api/grupos/${grupoId}/exportar/matriz-completa`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('spreadsheetml'));
  });

  it('GET /exportar/matriz-completa — 404 grupo inexistente', async () => {
    const res = await request(app)
      .get('/api/grupos/99999/exportar/matriz-completa');
    assert.equal(res.status, 404);
  });

  // ── Auditoría ──────────────────────────────────────────────
  it('GET /auditoria — lista últimas acciones', async () => {
    const res = await request(app)
      .get(`/api/grupos/${grupoId}/auditoria`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
    // Verificar estructura
    assert.ok('accion' in res.body[0]);
    assert.ok('timestamp' in res.body[0]);
  });
});
