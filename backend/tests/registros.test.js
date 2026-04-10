// ============================================================
// Tests de integración: API de Registros (Batch Save)
// ============================================================
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';

describe('API /api/registros', () => {
  let grupoId, turnoClaseId, turnoPruebaId, est1Id, est2Id;

  before(async () => {
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TEST_%'");

    // Crear grupo, estudiantes, turnos
    const g = await request(app).post('/api/grupos')
      .send({ nombre: 'TEST_RegGrupo', asignatura: 'Historia' });
    grupoId = g.body.id;

    const e1 = await request(app).post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: 'Pérez Juan' });
    est1Id = e1.body.id;

    const e2 = await request(app).post(`/api/grupos/${grupoId}/estudiantes`)
      .send({ nombre: 'Rodríguez María' });
    est2Id = e2.body.id;

    const t1 = await request(app).post(`/api/grupos/${grupoId}/turnos`)
      .send({ tipo: 'C', fecha: '2025-03-01' });
    turnoClaseId = t1.body.id;

    const t2 = await request(app).post(`/api/grupos/${grupoId}/turnos`)
      .send({ tipo: 'PP', fecha: '2025-03-15' });
    turnoPruebaId = t2.body.id;
  });

  after(async () => {
    await pool.query("DELETE FROM grupos WHERE nombre LIKE 'TEST_Reg%' OR nombre LIKE 'TEST_Otro%'");
  });

  // ── Validaciones básicas ───────────────────────────────────
  it('POST /batch-save — rechaza sin turno_id', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({ registros: [{ estudiante_id: est1Id, asistencia: 'A' }] });
    assert.equal(res.status, 400);
  });

  it('POST /batch-save — rechaza sin registros', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({ turno_id: turnoClaseId, registros: [] });
    assert.equal(res.status, 400);
  });

  it('POST /batch-save — rechaza turno inexistente', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({ turno_id: 99999, registros: [{ estudiante_id: est1Id, asistencia: 'A' }] });
    assert.equal(res.status, 404);
  });

  // ── Validaciones de rango ──────────────────────────────────
  it('POST /batch-save — rechaza calificación fuera de rango (1)', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoClaseId,
        registros: [{ estudiante_id: est1Id, asistencia: 'A', calificacion: 1 }],
      });
    assert.equal(res.status, 400);
  });

  it('POST /batch-save — rechaza calificación fuera de rango (6)', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoClaseId,
        registros: [{ estudiante_id: est1Id, asistencia: 'A', calificacion: 6 }],
      });
    assert.equal(res.status, 400);
  });

  it('POST /batch-save — rechaza asistencia inválida', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoClaseId,
        registros: [{ estudiante_id: est1Id, asistencia: 'X' }],
      });
    assert.equal(res.status, 400);
  });

  // ── Regla: no calificar ausentes en clases ─────────────────
  it('POST /batch-save — rechaza calificación con falta en clase', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoClaseId,
        registros: [{ estudiante_id: est1Id, asistencia: 'F', calificacion: 3 }],
      });
    assert.equal(res.status, 400);
  });

  it('POST /batch-save — rechaza calificación sin asistencia en clase', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoClaseId,
        registros: [{ estudiante_id: est1Id, calificacion: 4 }],
      });
    assert.equal(res.status, 400);
  });

  // ── Regla: no calificar NP en pruebas ─────────────────────
  it('POST /batch-save — rechaza calificación con NP en prueba', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoPruebaId,
        registros: [{ estudiante_id: est1Id, asistencia: 'NP', calificacion: 3 }],
      });
    assert.equal(res.status, 400);
  });

  // ── Guardado exitoso en clase ──────────────────────────────
  it('POST /batch-save — guarda asistencia y calificación en clase', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoClaseId,
        registros: [
          { estudiante_id: est1Id, asistencia: 'A', calificacion: 5 },
          { estudiante_id: est2Id, asistencia: 'F' },
        ],
      });
    assert.equal(res.status, 200);
    assert.equal(res.body.exito, true);
    assert.equal(res.body.registros_guardados, 2);
  });

  // ── Guardado exitoso en prueba ─────────────────────────────
  it('POST /batch-save — guarda calificación en prueba', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoPruebaId,
        registros: [
          { estudiante_id: est1Id, asistencia: 'A', calificacion: 4 },
          { estudiante_id: est2Id, asistencia: 'NP' },
        ],
      });
    assert.equal(res.status, 200);
    assert.equal(res.body.registros_guardados, 2);
  });

  // ── Upsert (actualizar registro existente) ─────────────────
  it('POST /batch-save — actualiza registro al reenviar', async () => {
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoClaseId,
        registros: [
          { estudiante_id: est1Id, asistencia: 'A', calificacion: 3 },
        ],
      });
    assert.equal(res.status, 200);

    // Verificar que se actualizó
    const getRes = await request(app).get(`/api/registros/turno/${turnoClaseId}`);
    const reg = getRes.body.find(r => r.estudiante_id === est1Id);
    assert.equal(reg.calificacion, 3);
  });

  // ── GET registros de turno ─────────────────────────────────
  it('GET /turno/:id — obtiene registros de un turno', async () => {
    const res = await request(app).get(`/api/registros/turno/${turnoClaseId}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 2);
    // Debe incluir nombre del estudiante
    assert.ok(res.body[0].nombre);
  });

  // ── Turno sin fecha: bloqueado ─────────────────────────────
  it('POST /batch-save — rechaza turno sin fecha', async () => {
    const t = await request(app).post(`/api/grupos/${grupoId}/turnos`)
      .send({ tipo: 'C' }); // sin fecha
    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: t.body.id,
        registros: [{ estudiante_id: est1Id, asistencia: 'A' }],
      });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('sin fecha'));
  });

  // ── Estudiante de otro grupo: rechazado ────────────────────
  it('POST /batch-save — rechaza estudiantes de otro grupo', async () => {
    const otroGrupo = await request(app).post('/api/grupos')
      .send({ nombre: 'TEST_OtroGrupo', asignatura: 'Arte' });
    const otroEst = await request(app).post(`/api/grupos/${otroGrupo.body.id}/estudiantes`)
      .send({ nombre: 'Extraño Fulano' });

    const res = await request(app).post('/api/registros/batch-save')
      .send({
        turno_id: turnoClaseId,
        registros: [{ estudiante_id: otroEst.body.id, asistencia: 'A' }],
      });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('no pertenecen'));
  });
});
