// Singleton del pool de conexiones PostgreSQL.
// Importado por todas las rutas para reutilizar el mismo pool.
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: false },
  }),
});

pool.on('error', (err) => {
  console.error('Error inesperado en pool PostgreSQL:', err.message);
});

export default pool;
