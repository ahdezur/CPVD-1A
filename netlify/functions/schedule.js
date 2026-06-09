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

  // --- LEER HORARIO (GET) ---
  if (method === 'GET') {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM schedule ORDER BY day_of_week ASC, start_time ASC');
      client.release();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    } catch (err) {
      console.error("Error al obtener horario de PostgreSQL:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al obtener el horario de clases de la base de datos.' })
      };
    }
  }

  // --- GUARDAR / ACTUALIZAR BLOQUE (POST) ---
  if (method === 'POST') {
    // Validar sesión del administrador
    const decoded = verifyToken(event.headers);
    if (!decoded) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado. Acceso restringido a administradores.' })
      };
    }

    try {
      const { id, day_of_week, start_time, end_time, subject, teacher, notes } = JSON.parse(event.body || '{}');

      if (!day_of_week || !start_time || !end_time || !subject) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Día, hora de inicio, hora de término y asignatura son obligatorios.' })
        };
      }

      const client = await pool.connect();
      let queryResult;

      if (id) {
        // ACTUALIZAR REGISTRO EXISTENTE
        const query = `
          UPDATE schedule 
          SET day_of_week = $1, start_time = $2, end_time = $3, subject = $4, teacher = $5, notes = $6
          WHERE id = $7 
          RETURNING *
        `;
        const values = [day_of_week, start_time, end_time, subject, teacher || '', notes || '', id];
        queryResult = await client.query(query, values);
      } else {
        // INSERTAR NUEVO REGISTRO
        const query = `
          INSERT INTO schedule (day_of_week, start_time, end_time, subject, teacher, notes) 
          VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING *
        `;
        const values = [day_of_week, start_time, end_time, subject, teacher || '', notes || ''];
        queryResult = await client.query(query, values);
      }

      client.release();

      if (queryResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Bloque de horario no encontrado.' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(queryResult.rows[0])
      };
    } catch (err) {
      console.error("Error al guardar bloque de horario en PostgreSQL:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al guardar el bloque de horario en la base de datos.' })
      };
    }
  }

  // --- ELIMINAR BLOQUE (DELETE) ---
  if (method === 'DELETE') {
    // Validar sesión del administrador
    const decoded = verifyToken(event.headers);
    if (!decoded) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado. Acceso restringido a administradores.' })
      };
    }

    try {
      let id = event.queryStringParameters ? event.queryStringParameters.id : null;
      if (!id && event.body) {
        const parsed = JSON.parse(event.body);
        id = parsed.id;
      }

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'El ID del bloque de horario es obligatorio.' })
        };
      }

      const client = await pool.connect();
      const query = 'DELETE FROM schedule WHERE id = $1 RETURNING id';
      const result = await client.query(query, [id]);
      client.release();

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Bloque de horario no encontrado para eliminar.' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Bloque de horario eliminado correctamente.' })
      };
    } catch (err) {
      console.error("Error al eliminar bloque de horario de PostgreSQL:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al eliminar el bloque de horario de la base de datos.' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: `Método ${method} no permitido.` })
  };
};
