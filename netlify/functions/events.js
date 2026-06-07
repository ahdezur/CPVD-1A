const { getPool } = require('./utils/db-client');
const { verifyToken } = require('./utils/auth-helper');

exports.handler = async (event, context) => {
  const method = event.httpMethod;
  const pool = getPool();

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // --- LEER EVENTOS (GET) ---
  if (method === 'GET') {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM events ORDER BY date ASC, created_at ASC');
      client.release();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    } catch (err) {
      console.error("Error al obtener eventos de PostgreSQL:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al obtener las actividades de la base de datos.' })
      };
    }
  }

  // --- GUARDAR / ACTUALIZAR EVENTO (POST) ---
  if (method === 'POST') {
    // Validar sesión
    const decoded = verifyToken(event.headers);
    if (!decoded) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado. Acceso restringido a administradores.' })
      };
    }

    try {
      const { id, title, date, description } = JSON.parse(event.body || '{}');

      if (!title || !date || !description) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Título, fecha y descripción son obligatorios.' })
        };
      }

      const client = await pool.connect();
      let queryResult;

      if (id) {
        // ACTUALIZAR
        const query = `
          UPDATE events 
          SET title = $1, date = $2, description = $3 
          WHERE id = $4 
          RETURNING *
        `;
        const values = [title, date, description, id];
        queryResult = await client.query(query, values);
      } else {
        // CREAR NUEVO
        const query = `
          INSERT INTO events (title, date, description) 
          VALUES ($1, $2, $3) 
          RETURNING *
        `;
        const values = [title, date, description];
        queryResult = await client.query(query, values);
      }

      client.release();

      if (queryResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Actividad no encontrada.' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(queryResult.rows[0])
      };
    } catch (err) {
      console.error("Error al guardar evento en PostgreSQL:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al guardar la actividad en la base de datos.' })
      };
    }
  }

  // --- ELIMINAR EVENTO (DELETE) ---
  if (method === 'DELETE') {
    // Validar sesión
    const decoded = verifyToken(event.headers);
    if (!decoded) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado. Acceso restringido a administradores.' })
      };
    }

    try {
      // Obtener el ID de los parámetros de consulta (?id=...) o del cuerpo
      let id = event.queryStringParameters ? event.queryStringParameters.id : null;
      if (!id && event.body) {
        const parsed = JSON.parse(event.body);
        id = parsed.id;
      }

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'El ID de la actividad es obligatorio.' })
        };
      }

      const client = await pool.connect();
      const query = 'DELETE FROM events WHERE id = $1 RETURNING id';
      const result = await client.query(query, [id]);
      client.release();

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Actividad no encontrada para eliminar.' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Actividad eliminada correctamente del calendario.' })
      };
    } catch (err) {
      console.error("Error al eliminar evento de PostgreSQL:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al eliminar la actividad de la base de datos.' })
      };
    }
  }

  // Método no soportado
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: `Método ${method} no permitido.` })
  };
};
