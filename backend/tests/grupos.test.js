// ============================================================
// Tests de integración: API de Grupos
// Ejecutar: docker exec docente_api node --test tests/
// Requiere BD PostgreSQL activa
// ============================================================
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';

describe('API /api/grupos', () => {
  let createdId;

  before(async () => {
    // Limpiar datos de test previos
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TGRP_%'");
  });

  after(async () => {
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TGRP_%'");
    await pool.end();
  });

  // ── POST ────────────────────────────────────────────────────
  it('POST / — crea un grupo correctamente', async () => {
    const res = await request(app)
      .post('/api/grupos')
      .send({ nombre: 'TGRP_Grupo1', asignatura: 'Matemáticas', semestre: '2025-1' });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.nombre, 'TGRP_Grupo1');
    assert.equal(res.body.asignatura, 'Matemáticas');
    createdId = res.body.id;
  });

  it('POST / — rechaza sin nombre', async () => {
    const res = await request(app)
      .post('/api/grupos')
      .send({ asignatura: 'Física' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST / — rechaza sin asignatura', async () => {
    const res = await request(app)
      .post('/api/grupos')
      .send({ nombre: 'TGRP_SinAsig' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST / — rechaza nombre duplicado', async () => {
    const res = await request(app)
      .post('/api/grupos')
      .send({ nombre: 'TGRP_Grupo1', asignatura: 'Física' });
    assert.equal(res.status, 409);
  });

  it('POST / — rechaza total_clases_planificadas negativo', async () => {
    const res = await request(app)
      .post('/api/grupos')
      .send({ nombre: 'TGRP_Neg', asignatura: 'Bio', total_clases_planificadas: -5 });
    assert.equal(res.status, 400);
  });

  it('POST / — rechaza total_clases_planificadas mayor a 60', async () => {
    const res = await request(app)
      .post('/api/grupos')
      .send({ nombre: 'TGRP_Exceso', asignatura: 'Bio', total_clases_planificadas: 61 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /60/);
  });

  it('POST / — crea turnos plantilla con total_clases_planificadas', async () => {
    const res = await request(app)
      .post('/api/grupos')
      .send({ nombre: 'TGRP_ConTurnos', asignatura: 'Chem', total_clases_planificadas: 3 });
    assert.equal(res.status, 201);
    const turnosRes = await request(app).get(`/api/grupos/${res.body.id}/turnos`);
    assert.equal(turnosRes.body.length, 3);
  });

  // ── GET ─────────────────────────────────────────────────────
  it('GET / — lista grupos', async () => {
    const res = await request(app).get('/api/grupos');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
  });

  it('GET /:id — obtiene un grupo específico', async () => {
    const res = await request(app).get(`/api/grupos/${createdId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.nombre, 'TGRP_Grupo1');
  });

  it('GET /:id — 404 grupo inexistente', async () => {
    const res = await request(app).get('/api/grupos/99999');
    assert.equal(res.status, 404);
  });

  // ── PUT ─────────────────────────────────────────────────────
  it('PUT /:id — actualiza nombre', async () => {
    const res = await request(app)
      .put(`/api/grupos/${createdId}`)
      .send({ nombre: 'TGRP_Grupo1_Mod' });
    assert.equal(res.status, 200);
    assert.equal(res.body.nombre, 'TGRP_Grupo1_Mod');
  });

  it('PUT /:id — 400 sin campos', async () => {
    const res = await request(app)
      .put(`/api/grupos/${createdId}`)
      .send({});
    assert.equal(res.status, 400);
  });

  it('PUT /:id — 404 grupo inexistente', async () => {
    const res = await request(app)
      .put('/api/grupos/99999')
      .send({ nombre: 'X' });
    assert.equal(res.status, 404);
  });

  // ── DELETE ──────────────────────────────────────────────────
  it('DELETE /:id — elimina grupo', async () => {
    const res = await request(app).delete(`/api/grupos/${createdId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.eliminado, true);
  });

  it('DELETE /:id — 404 ya eliminado', async () => {
    const res = await request(app).delete(`/api/grupos/${createdId}`);
    assert.equal(res.status, 404);
  });
});
