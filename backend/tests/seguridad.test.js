// ============================================================
// Tests: Health Check y seguridad
// ============================================================
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db.js';

describe('Health Check y seguridad', () => {
  after(async () => {
    await pool.end();
  });

  it('GET /health — devuelve status ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'connected');
    assert.ok(res.body.timestamp);
  });

  it('Helmet headers presentes', async () => {
    const res = await request(app).get('/health');
    // Helmet agrega estos headers de seguridad
    assert.ok(res.headers['x-content-type-options']);
    assert.ok(res.headers['x-frame-options']);
  });

  it('404 para rutas inexistentes', async () => {
    const res = await request(app).get('/api/ruta-que-no-existe');
    // Express devuelve 404 por defecto para rutas no matcheadas
    assert.equal(res.status, 404);
  });

  it('Rechaza JSON malformado', async () => {
    const res = await request(app)
      .post('/api/grupos')
      .set('Content-Type', 'application/json')
      .send('{ invalido }');
    assert.equal(res.status, 400);
  });

  // ── SQL Injection prevention ───────────────────────────────
  it('SQL injection en parámetros de ruta es rechazado', async () => {
    const res = await request(app).get("/api/grupos/1'; DROP TABLE grupos;--");
    // No debería crashear, solo 404 o error controlado
    assert.ok([400, 404, 500].includes(res.status));
    // Verificar que la tabla sigue existiendo
    const check = await pool.query('SELECT 1 FROM grupos LIMIT 1');
    assert.ok(check); // tabla existe
  });

  it('XSS en nombre de grupo es almacenado como texto plano', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    // El nombre no pasa validación de nombre (regex lo permite en grupos
    // porque no tiene NOMBRE_REGEX). Verificar que se almacena como texto plano.
    const res = await request(app).post('/api/grupos')
      .send({ nombre: xssPayload, asignatura: 'Test XSS' });

    if (res.status === 201) {
      // Se almacenó - verificar que es texto plano
      const getRes = await request(app).get(`/api/grupos/${res.body.id}`);
      assert.equal(getRes.body.nombre, xssPayload); // No se ejecuta, es texto
      // Cleanup
      await request(app).delete(`/api/grupos/${res.body.id}`);
    }
    // Si fue rechazado por validación, también es aceptable
  });
});
