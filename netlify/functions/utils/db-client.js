const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("La variable de entorno DATABASE_URL no está configurada.");
    }
    
    pool = new Pool({
      connectionString,
      ssl: {
        // Obligatorio para conexiones seguras con Neon, Supabase, Render, etc.
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

module.exports = { getPool };
