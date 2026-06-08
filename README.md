# Portal Escolar CPDV - Calendario y Blog de la Comunidad

Portal oficial interactivo para la comunidad escolar CPDV. Diseñado para registrar y visualizar el calendario de actividades, pruebas, paseos, y lecturas importantes del curso.

## Características principales

- 📅 **Calendario Interactivo:** Vista detallada de actividades escolares mes a mes con transiciones fluidas.
- 📚 **Blog y Lecturas:** Artículos, circulares y recomendaciones para el curso, con editor enriquecido y soporte para código HTML personalizado.
- 🔑 **Administración Protegida:** Panel privado para gestionar y editar tanto lecturas como actividades del calendario.
- ⚡ **Servidor Serverless:** API interna desarrollada en Netlify Functions conectada a PostgreSQL de forma segura.
- 🎨 **Diseño Premium:** Estilos responsivos modernos con sombreados, variables HSL, fuentes elegantes y transiciones dinámicas.

## Despliegue rápido en Netlify

1. Vincula este repositorio de GitHub en tu panel de Netlify.
2. Habilita una base de datos PostgreSQL (ej: Netlify Postgres / Neon) y ejecuta el script de creación de tablas.
3. Agrega las siguientes Variables de Entorno en el sitio de Netlify:
   - `DATABASE_URL`: Cadena de conexión de tu base de datos Postgres.
   - `JWT_SECRET`: Cadena secreta para firmar tokens de sesión.
   - `ADMIN_USERNAME`: Nombre de usuario del administrador (por defecto: `admin`).
   - `ADMIN_PASSWORD`: Contraseña del administrador (por defecto: `admin123`).

---
Creado para la comunidad escolar 1ºA CPDV. Actualizado en Junio de 2026.
