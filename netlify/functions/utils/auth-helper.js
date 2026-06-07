const jwt = require('jsonwebtoken');

// Clave secreta para firmar tokens. Cambiar en Netlify Env Variables
const JWT_SECRET = process.env.JWT_SECRET || 'cpdv_default_jwt_secret_key_123_456';

/**
 * Verifica si el token Bearer en los headers es válido.
 * Devuelve el payload decodificado si es válido, de lo contrario null.
 */
function verifyToken(headers) {
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { verifyToken, JWT_SECRET };
