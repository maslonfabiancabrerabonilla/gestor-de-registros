// ============================================================
// Tests de integración: API de Turnos
// ============================================================
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';

describe('API /api/grupos/:gid/turnos', () => {
  let grupoId;
  let turnoId;

  before(async () => {
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TEST_%'");
    const res = await request(app)
      .post('/api/grupos')
      .send({ nombre: 'TEST_TurnoGrupo', asignatura: 'Química' });
    grupoId = res.body.id;
  });

  after(async () => {
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TEST_Turno%'");
  });

  // ── POST ────────────────────────────────────────────────────
  it('POST / — crea turno tipo C', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/turnos`)
      .send({ tipo: 'C', fecha: '2025-03-01' });
    assert.equal(res.status, 201);
    assert.equal(res.body.tipo, 'C');
    assert.equal(res.body.numero_turno, 1);
    turnoId = res.body.id;
  });

  it('POST / — auto incrementa numero_turno', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/turnos`)
      .send({ tipo: 'CP', fecha: '2025-03-02' });
    assert.equal(res.status, 201);
    assert.equal(res.body.numero_turno, 2);
  });

  it('POST / — rechaza sin tipo', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/turnos`)
      .send({ fecha: '2025-03-03' });
    assert.equal(res.status, 400);
  });

  it('POST / — rechaza tipo inválido', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/turnos`)
      .send({ tipo: 'INVALIDO' });
    assert.equal(res.status, 400);
  });

  it('POST / — rechaza fecha duplicada', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/turnos`)
      .send({ tipo: 'C', fecha: '2025-03-01' });
    assert.equal(res.status, 409);
  });

  it('POST / — permite turno sin fecha', async () => {
    const res = await request(app)
      .post(`/api/grupos/${grupoId}/turnos`)
      .send({ tipo: 'PP' });
    assert.equal(res.status, 201);
    assert.equal(res.body.fecha, null);
  });

  // ── Todos los tipos válidos ───────────────────────────────
  for (const tipo of ['PL', 'PF', 'PE', 'EM']) {
    it(`POST / — acepta tipo ${tipo}`, async () => {
      const res = await request(app)
        .post(`/api/grupos/${grupoId}/turnos`)
        .send({ tipo });
      assert.equal(res.status, 201);
      assert.equal(res.body.tipo, tipo);
    });
  }

  // ── GET ─────────────────────────────────────────────────────
  it('GET / — lista turnos del grupo', async () => {
    const res = await request(app).get(`/api/grupos/${grupoId}/turnos`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 2);
  });

  // ── PUT ─────────────────────────────────────────────────────
  it('PUT /:id — actualiza fecha y tipo', async () => {
    const res = await request(app)
      .put(`/api/grupos/${grupoId}/turnos/${turnoId}`)
      .send({ fecha: '2025-04-01', tipo: 'PL' });
    assert.equal(res.status, 200);
    assert.equal(res.body.tipo, 'PL');
  });

  it('PUT /:id — 400 sin campos', async () => {
    const res = await request(app)
      .put(`/api/grupos/${grupoId}/turnos/${turnoId}`)
      .send({});
    assert.equal(res.status, 400);
  });

  it('PUT /:id — 404 turno inexistente', async () => {
    const res = await request(app)
      .put(`/api/grupos/${grupoId}/turnos/99999`)
      .send({ tipo: 'C' });
    assert.equal(res.status, 404);
  });

  // ── DELETE ──────────────────────────────────────────────────
  it('DELETE /:id — elimina turno y renumera', async () => {
    const res = await request(app)
      .delete(`/api/grupos/${grupoId}/turnos/${turnoId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.eliminado, true);

    // Verificar renumeración
    const turnosRes = await request(app).get(`/api/grupos/${grupoId}/turnos`);
    const nums = turnosRes.body.map(t => t.numero_turno);
    // Deben ser secuenciales empezando en 1
    for (let i = 0; i < nums.length; i++) {
      assert.equal(nums[i], i + 1);
    }
  });

  it('DELETE /:id — 404 turno ya eliminado', async () => {
    const res = await request(app)
      .delete(`/api/grupos/${grupoId}/turnos/${turnoId}`);
    assert.equal(res.status, 404);
  });

  // ── Límite de 60 turnos ─────────────────────────────────────
  it('POST / — rechaza turno cuando el grupo alcanza 60', async () => {
    // Crear grupo limpio para esta prueba
    const grp = await request(app)
      .post('/api/grupos')
      .send({ nombre: 'TEST_TurnoLimit60', asignatura: 'Límite' });
    const gid = grp.body.id;

    // Insertar 60 turnos directamente en BD (más rápido)
    for (let i = 1; i <= 60; i++) {
      await pool.query(
        `INSERT INTO turnos (grupo_id, numero_turno, tipo) VALUES ($1, $2, 'C')`,
        [gid, i]
      );
    }

    // El turno 61 debe ser rechazado
    const res = await request(app)
      .post(`/api/grupos/${gid}/turnos`)
      .send({ tipo: 'C' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /60/);
  });
});
