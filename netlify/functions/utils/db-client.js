const pg = require('pg');
const { Pool } = pg;

// Configurar pg para devolver columnas DATE (OID 1082) como strings YYYY-MM-DD
// Esto evita que se conviertan en objetos Date de JS y cambien de zona horaria o formato
pg.types.setTypeParser(1082, function(val) {
  return val;
});

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
