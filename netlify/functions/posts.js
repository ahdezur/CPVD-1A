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

  // --- LEER POSTS (GET) ---
  if (method === 'GET') {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM posts ORDER BY date DESC, created_at DESC');
      client.release();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    } catch (err) {
      console.error("Error al obtener posts de PostgreSQL:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al obtener las publicaciones de la base de datos.' })
      };
    }
  }

  // --- GUARDAR / ACTUALIZAR POST (POST) ---
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
      const { id, title, excerpt, content, date, author, category, image_data } = JSON.parse(event.body || '{}');

      if (!title || !content || !date) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Título, contenido y fecha son obligatorios.' })
        };
      }

      const client = await pool.connect();
      let queryResult;

      if (id) {
        // ACTUALIZAR
        const query = `
          UPDATE posts 
          SET title = $1, excerpt = $2, content = $3, date = $4, author = $5, category = $6, image_data = $7
          WHERE id = $8 
          RETURNING *
        `;
        const values = [title, excerpt, content, date, author || 'Administrador', category || 'General', image_data || '', id];
        queryResult = await client.query(query, values);
      } else {
        // CREAR NUEVO
        const query = `
          INSERT INTO posts (title, excerpt, content, date, author, category, image_data) 
          VALUES ($1, $2, $3, $4, $5, $6, $7) 
          RETURNING *
        `;
        const values = [title, excerpt, content, date, author || 'Administrador', category || 'General', image_data || ''];
        queryResult = await client.query(query, values);
      }

      client.release();

      if (queryResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Publicación no encontrada.' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(queryResult.rows[0])
      };
    } catch (err) {
      console.error("Error al guardar post en PostgreSQL:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al guardar la publicación en la base de datos.' })
      };
    }
  }

  // --- ELIMINAR POST (DELETE) ---
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
          body: JSON.stringify({ error: 'El ID de la publicación es obligatorio.' })
        };
      }

      const client = await pool.connect();
      const query = 'DELETE FROM posts WHERE id = $1 RETURNING id';
      const result = await client.query(query, [id]);
      client.release();

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Publicación no encontrada para eliminar.' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Publicación eliminada correctamente.' })
      };
    } catch (err) {
      console.error("Error al eliminar post de PostgreSQL:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al eliminar la publicación de la base de datos.' })
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
