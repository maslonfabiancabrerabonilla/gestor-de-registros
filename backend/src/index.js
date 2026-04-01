// ============================================================
// backend/src/index.js — Entry point SGD-UCI Backend
// ============================================================

import express   from 'express';
import cors      from 'cors';
import helmet    from 'helmet';
import dotenv    from 'dotenv';

import pool              from './db.js';
import gruposRouter      from './routes/grupos.js';
import estudiantesRouter from './routes/estudiantes.js';
import turnosRouter      from './routes/turnos.js';
import registrosRouter   from './routes/registros.js';
import reportesRouter    from './routes/reportes.js';

dotenv.config();

const app  = express();
const port = process.env.PORT || 5000;

// ── Middlewares globales ──────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/grupos',    gruposRouter);       // CRUD grupos
app.use('/api/grupos',    estudiantesRouter);  // CRUD + bulk-import + estadísticas
app.use('/api/grupos',    turnosRouter);       // CRUD turnos
app.use('/api/registros', registrosRouter);    // batch-save
app.use('/api/grupos',    reportesRouter);     // reportes + exportaciones + auditoría

// ── Health check ──────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: result.rows[0].now, database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// ── Middleware global de errores ──────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

// ── Iniciar servidor ──────────────────────────────────────────
const server = app.listen(port, () => {
  console.log(`✓ Servidor en puerto ${port}`);
  console.log(`✓ BD: ${process.env.POSTGRES_DB ?? 'configurada'}`);
});

// ── Graceful shutdown ─────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM: cerrando servidor...');
  server.close(() => pool.end(() => process.exit(0)));
});
