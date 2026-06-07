const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./utils/auth-helper');

exports.handler = async (event, context) => {
  // Solo permitir peticiones POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Método no permitido. Utilizar POST.' })
    };
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}');

    if (!username || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Usuario y contraseña son obligatorios.' })
      };
    }

    // Configuración de credenciales de Netlify (variables de entorno)
    const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === expectedUsername && password === expectedPassword) {
      // Generar token JWT válido por 24 horas
      const token = jwt.sign(
        { email: username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          token,
          user: { email: username }
        })
      };
    } else {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Usuario o contraseña incorrectos.' })
      };
    }
  } catch (err) {
    console.error("Error en la autenticación serverless:", err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error interno del servidor en auth.' })
    };
  }
};
