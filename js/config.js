// Configuración global de la aplicación CPDV Portal
export const CONFIG = {
  siteName: "CPDV - Portal de la Comunidad",
  
  // Credenciales por defecto para el modo administrador local (localStorage)
  localAdmin: {
    username: "admin",
    password: "admin123" // Puedes cambiar esto para el uso local
  },

  // Para persistencia en la nube en Netlify, configura tus claves de Supabase aquí:
  // Puedes obtener una base de datos Postgres gratuita en https://supabase.com
  supabase: {
    url: "", // ej. "https://xxxxxx.supabase.co"
    anonKey: "" // ej. "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },

  // Integración con Google Calendar (Lectura pública de actividades)
  googleCalendar: {
    enabled: false, // Cambiar a true para activar la lectura desde Google Calendar
    calendarId: "", // ej. "tu-calendario@group.calendar.google.com" o "primary"
    apiKey: "" // Tu API Key obtenida de Google Cloud Console
  }
};
