import { CONFIG } from './config.js';

// Semilla de datos iniciales para el modo local (localStorage)
const defaultEvents = [
  {
    id: 'ev-1',
    date: '2026-06-08',
    title: 'Llevar material',
    description: '40 pinzas de ropa pequeñas (perros de ropa) que deben ser enviadas por la directiva del curso.',
    subject: 'lenguaje'
  },
  {
    id: 'ev-2',
    date: '2026-06-09',
    title: 'Prueba: Quiz 1',
    description: 'Quiz 1: Numbers up to 30.',
    subject: 'math'
  },
  {
    id: 'ev-3',
    date: '2026-06-09',
    title: 'Arte - IPC: Llevar material',
    description: 'Témperas roja, azul y amarilla; 3 pinceles (cualquier tamaño); mezclador escolar (o plato/tapa de plástico); y delantal o ropa vieja para ensuciar.',
    subject: 'arte'
  },
  {
    id: 'ev-4',
    date: '2026-06-10',
    title: 'Prueba Plan Lector',
    description: 'Libro del Plan Lector: "Adela y los calcetines desaparecidos".',
    subject: 'lenguaje'
  },
  {
    id: 'ev-5',
    date: '2026-06-12',
    title: 'Prueba de Inglés',
    description: 'Contenidos de "Fun with friends" unit 3.',
    subject: 'ingles'
  }
];

const defaultPosts = [
  {
    id: 'post-1',
    title: '🌟 Bienvenidos al Portal de la Comunidad CPDV',
    excerpt: 'Nos complace presentar nuestra nueva plataforma oficial. Un espacio dinámico para estar conectados y coordinados.',
    content: `
      <p>Estimados apoderados y miembros de nuestra comunidad,</p>
      <p>Les damos una cálida bienvenida a nuestro <strong>Portal de la Comunidad CPDV</strong>. Este sitio ha sido diseñado para facilitar la comunicación y organización de todas nuestras actividades escolares.</p>
      <h3>¿Qué encontrarás en este portal?</h3>
      <ul>
        <li><strong>Calendario Interactivo:</strong> Eventos, pruebas, paseos y entregas importantes siempre actualizados.</li>
        <li><strong>Sección de Lecturas (Blog):</strong> Artículos útiles, recomendaciones académicas, minutas de reuniones y avisos del curso.</li>
        <li><strong>Enlaces Rápidos:</strong> Acceso directo al grupo de WhatsApp, lista de útiles y más.</li>
      </ul>
      <p>Esperamos que esta herramienta sea de gran utilidad para todos. Si tienen sugerencias, no duden en contactar a la directiva.</p>
    `,
    date: '2026-06-06',
    author: 'Directiva de Curso',
    category: 'Avisos'
  },
  {
    id: 'post-2',
    title: '🦁 Tips para el Paseo al Buin Zoo (15 de Junio)',
    excerpt: 'Se acerca nuestro gran paseo escolar. Aquí detallamos los aspectos clave que debes considerar para que sea una gran jornada.',
    content: `
      <p>¡El lunes 15 de junio visitaremos el <strong>Buin Zoo</strong>! Para asegurar que todos los niños disfruten al máximo y de manera segura, solicitamos tener en cuenta las siguientes recomendaciones:</p>
      <ol>
        <li><strong>Puntualidad:</strong> Estar en el colegio a las <strong>08:15 AM</strong>. El bus saldrá puntualmente a las 08:30 AM.</li>
        <li><strong>Vestimenta:</strong> Los alumnos deben asistir con el buzo del colegio, zapatillas cómodas para caminar, gorro para el sol y bloqueador solar aplicado desde el hogar.</li>
        <li><strong>Alimentación:</strong> Enviar una mochila pequeña con colación fría, agua en botella reutilizable (idealmente térmica) y una fruta o snack saludable.</li>
        <li><strong>Regreso:</strong> La hora estimada de llegada de vuelta al colegio es a las <strong>16:00 hrs</strong>. Por favor estar atentos a los avisos en el grupo de WhatsApp.</li>
      </ol>
      <p><em>Nota: No se recomienda que los alumnos lleven dinero ni aparatos tecnológicos de valor. El colegio no se responsabiliza por pérdidas.</em></p>
    `,
    date: '2026-06-05',
    author: 'Comité Organizador',
    category: 'Actividades'
  }
];

class Database {
  constructor() {
    this.useApi = CONFIG.dataSource === 'api';
    this.useSupabase = false;
    this.supabaseClient = null;

    if (!this.useApi && CONFIG.supabase && CONFIG.supabase.url && CONFIG.supabase.anonKey) {
      this.useSupabase = true;
    }
  }

  async init() {
    // Si la configuración indica API, probamos la conexión
    if (this.useApi) {
      try {
        const response = await fetch('/api/posts');
        if (response.ok) {
          console.log("Conectado con éxito a Netlify Functions Serverless.");
          return;
        } else {
          throw new Error(`Código de estado de la API: ${response.status}`);
        }
      } catch (err) {
        console.warn("No se pudo establecer conexión con la API en /api/. Cayendo en modo local (localStorage).", err);
        this.useApi = false;
        // Habilitar Supabase como segunda opción o localStorage por defecto
        if (CONFIG.supabase && CONFIG.supabase.url && CONFIG.supabase.anonKey) {
          this.useSupabase = true;
        }
      }
    }

    if (this.useSupabase) {
      if (window.supabase) {
        this.supabaseClient = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
        try {
          const { error } = await this.supabaseClient.from('posts').select('count', { count: 'exact', head: true });
          if (error) throw error;
        } catch (err) {
          console.warn("Fallo de conexión en Supabase. Cayendo en localStorage.", err);
          this.useSupabase = false;
          this._initLocalStorage();
        }
      } else {
        this.useSupabase = false;
        this._initLocalStorage();
      }
    } else {
      this._initLocalStorage();
    }
  }

  _initLocalStorage() {
    const currentVersion = '2'; // Cambiar versión para forzar actualización de actividades
    const storedVersion = localStorage.getItem('cpdv_events_version');

    if (storedVersion !== currentVersion) {
      localStorage.setItem('cpdv_events', JSON.stringify(defaultEvents));
      localStorage.setItem('cpdv_events_version', currentVersion);
    } else if (!localStorage.getItem('cpdv_events')) {
      localStorage.setItem('cpdv_events', JSON.stringify(defaultEvents));
    }
    
    if (!localStorage.getItem('cpdv_posts')) {
      localStorage.setItem('cpdv_posts', JSON.stringify(defaultPosts));
    }
  }

  // Helper para obtener cabeceras HTTP que incluyan el token JWT
  _getAuthHeaders() {
    const token = sessionStorage.getItem('cpdv_admin_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // --- MÉTODOS DE BLOG (POSTS) ---

  async getPosts() {
    if (this.useApi) {
      const response = await fetch('/api/posts');
      if (!response.ok) throw new Error("Error en la API de posts.");
      return await response.json();
    }
    
    if (this.useSupabase) {
      const { data, error } = await this.supabaseClient
        .from('posts')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      const posts = JSON.parse(localStorage.getItem('cpdv_posts') || '[]');
      return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  }

  async savePost(post) {
    if (this.useApi) {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify(post)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fallo al guardar en la API.");
      }
      return await response.json();
    }

    if (this.useSupabase) {
      if (post.id) {
        const { data, error } = await this.supabaseClient
          .from('posts')
          .update({
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            date: post.date,
            author: post.author,
            category: post.category
          })
          .eq('id', post.id)
          .select();
        if (error) throw error;
        return data[0];
      } else {
        const { data, error } = await this.supabaseClient
          .from('posts')
          .insert([post])
          .select();
        if (error) throw error;
        return data[0];
      }
    } else {
      const posts = JSON.parse(localStorage.getItem('cpdv_posts') || '[]');
      if (post.id) {
        const index = posts.findIndex(p => p.id === post.id);
        if (index !== -1) {
          posts[index] = { ...posts[index], ...post };
        }
      } else {
        post.id = 'post-' + Date.now();
        posts.push(post);
      }
      localStorage.setItem('cpdv_posts', JSON.stringify(posts));
      return post;
    }
  }

  async deletePost(id) {
    if (this.useApi) {
      const response = await fetch(`/api/posts?id=${id}`, {
        method: 'DELETE',
        headers: this._getAuthHeaders()
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fallo al eliminar en la API.");
      }
      return await response.json();
    }

    if (this.useSupabase) {
      const { error } = await this.supabaseClient
        .from('posts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } else {
      let posts = JSON.parse(localStorage.getItem('cpdv_posts') || '[]');
      posts = posts.filter(p => p.id !== id);
      localStorage.setItem('cpdv_posts', JSON.stringify(posts));
      return true;
    }
  }

  // --- MÉTODOS DE CALENDARIO (EVENTS) ---

  isGoogleCalendarEnabled() {
    return !!(CONFIG.googleCalendar && CONFIG.googleCalendar.enabled && CONFIG.googleCalendar.calendarId && CONFIG.googleCalendar.apiKey);
  }

  async getEvents() {
    if (this.isGoogleCalendarEnabled()) {
      try {
        const { calendarId, apiKey } = CONFIG.googleCalendar;
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&singleEvents=true&maxResults=250`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Google Calendar API response error: ${response.statusText}`);
        }
        const data = await response.json();
        
        return data.items.map(item => {
          let eventDate = '';
          if (item.start) {
            if (item.start.dateTime) {
              eventDate = item.start.dateTime.split('T')[0];
            } else if (item.start.date) {
              eventDate = item.start.date;
            }
          }
          return {
            id: item.id,
            date: eventDate,
            title: item.summary || 'Sin Título',
            description: item.description || 'Sin descripción adicional.'
          };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
      } catch (err) {
        console.warn("Error cargando Google Calendar API. Cayendo en almacenamiento configurado.", err);
      }
    }

    if (this.useApi) {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error("Error en la API de events.");
      return await response.json();
    }

    if (this.useSupabase) {
      const { data, error } = await this.supabaseClient
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    } else {
      const events = JSON.parse(localStorage.getItem('cpdv_events') || '[]');
      return events.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  }

  async saveEvent(event) {
    if (this.useApi) {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify(event)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fallo al guardar la actividad en la API.");
      }
      return await response.json();
    }

    if (this.useSupabase) {
      if (event.id) {
        const { data, error } = await this.supabaseClient
          .from('events')
          .update({
            date: event.date,
            title: event.title,
            description: event.description,
            subject: event.subject,
            attachment_name: event.attachment_name,
            attachment_data: event.attachment_data,
            quiz_name: event.quiz_name,
            quiz_data: event.quiz_data
          })
          .eq('id', event.id)
          .select();
        if (error) throw error;
        return data[0];
      } else {
        const { data, error } = await this.supabaseClient
          .from('events')
          .insert([event])
          .select();
        if (error) throw error;
        return data[0];
      }
    } else {
      const events = JSON.parse(localStorage.getItem('cpdv_events') || '[]');
      if (event.id) {
        const index = events.findIndex(e => e.id === event.id);
        if (index !== -1) {
          events[index] = { ...events[index], ...event };
        }
      } else {
        event.id = 'ev-' + Date.now();
        events.push(event);
      }
      localStorage.setItem('cpdv_events', JSON.stringify(events));
      return event;
    }
  }

  async deleteEvent(id) {
    if (this.useApi) {
      const response = await fetch(`/api/events?id=${id}`, {
        method: 'DELETE',
        headers: this._getAuthHeaders()
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fallo al eliminar la actividad en la API.");
      }
      return await response.json();
    }

    if (this.useSupabase) {
      const { error } = await this.supabaseClient
        .from('events')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } else {
      let events = JSON.parse(localStorage.getItem('cpdv_events') || '[]');
      events = events.filter(e => e.id !== id);
      localStorage.setItem('cpdv_events', JSON.stringify(events));
      return true;
    }
  }

  // --- AUTENTICACIÓN ---

  async login(username, password) {
    if (this.useApi) {
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
          sessionStorage.setItem('cpdv_admin_token', data.token);
          sessionStorage.setItem('cpdv_admin_logged', 'true');
          sessionStorage.setItem('cpdv_admin_user', data.user.email);
          return { success: true, user: data.user };
        } else {
          return { success: false, error: data.error || 'Fallo en la autenticación.' };
        }
      } catch (err) {
        console.error("Error al autenticar con la API serverless:", err);
        return { success: false, error: 'No se pudo contactar con el servidor de autenticación.' };
      }
    }

    if (this.useSupabase) {
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email: username,
        password: password
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, user: data.user };
    } else {
      if (username === CONFIG.localAdmin.username && password === CONFIG.localAdmin.password) {
        sessionStorage.setItem('cpdv_admin_logged', 'true');
        sessionStorage.setItem('cpdv_admin_user', username);
        return { success: true, user: { email: username } };
      } else {
        return { success: false, error: 'Credenciales locales inválidas.' };
      }
    }
  }

  async logout() {
    if (this.useApi) {
      // Borrar token localmente es suficiente ya que el token JWT es stateless
      sessionStorage.removeItem('cpdv_admin_token');
    }
    if (this.useSupabase) {
      await this.supabaseClient.auth.signOut();
    }
    sessionStorage.removeItem('cpdv_admin_logged');
    sessionStorage.removeItem('cpdv_admin_user');
  }

  async isAuthenticated() {
    if (this.useApi) {
      const token = sessionStorage.getItem('cpdv_admin_token');
      // Si hay un token y estamos marcados como logueados
      return !!token && sessionStorage.getItem('cpdv_admin_logged') === 'true';
    }
    
    if (this.useSupabase) {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      return !!session;
    } else {
      return sessionStorage.getItem('cpdv_admin_logged') === 'true';
    }
  }

  async getCurrentUser() {
    if (this.useApi || !this.useSupabase) {
      if (sessionStorage.getItem('cpdv_admin_logged') === 'true') {
        return { email: sessionStorage.getItem('cpdv_admin_user') };
      }
      return null;
    }
    
    if (this.useSupabase) {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      return session ? session.user : null;
    }
  }
}

export const db = new Database();
