import { CONFIG } from './config.js';

// Semilla de datos iniciales para el modo local
const defaultEvents = [
  {
    id: 'ev-1',
    date: '2026-06-12',
    title: '🎨 Entrega de Proyecto de Arte',
    description: 'Llevar la maqueta terminada utilizando materiales reciclados. Se evalúa en clases.'
  },
  {
    id: 'ev-2',
    date: '2026-06-15',
    title: '🦁 Paseo Escolar al Buin Zoo',
    description: 'Salida en bus desde el colegio a las 08:30 AM. Llevar colación fría, agua, gorro para el sol y bloqueador solar. Regreso estimado a las 16:00 hrs.'
  },
  {
    id: 'ev-3',
    date: '2026-06-19',
    title: '📐 Prueba de Matemáticas',
    description: 'Contenidos: Geometría básica, perímetros y áreas de figuras simples.'
  },
  {
    id: 'ev-4',
    date: '2026-06-24',
    title: '🎂 Celebración de Cumpleaños del Mes',
    description: 'Festejo conjunto de los compañeros que cumplen años en junio. Organización de la directiva para las sorpresas.'
  },
  {
    id: 'ev-5',
    date: '2026-07-03',
    title: '🌳 Jornada Cultural al Aire Libre',
    description: 'Actividad interactiva de reconocimiento de flora y fauna local. Llevar calzado cómodo.'
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
    this.supabaseClient = null;
    this.useSupabase = false;

    // Verificar si Supabase está configurado en config.js
    if (CONFIG.supabase && CONFIG.supabase.url && CONFIG.supabase.anonKey) {
      this.useSupabase = true;
    }
  }

  async init() {
    if (this.useSupabase) {
      if (window.supabase) {
        this.supabaseClient = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
        // Verificar conexión
        try {
          const { error } = await this.supabaseClient.from('posts').select('count', { count: 'exact', head: true });
          if (error) {
            console.warn("Error de conexión con Supabase. Asegúrate de haber creado las tablas posts y events. Cayendo en modo localStorage como respaldo.", error);
            this.useSupabase = false;
            this._initLocalStorage();
          }
        } catch (err) {
          console.warn("Fallo en la inicialización de Supabase. Cayendo en modo localStorage.", err);
          this.useSupabase = false;
          this._initLocalStorage();
        }
      } else {
        console.warn("Librería de Supabase no cargada en el DOM. Cayendo en modo localStorage.");
        this.useSupabase = false;
        this._initLocalStorage();
      }
    } else {
      this._initLocalStorage();
    }
  }

  _initLocalStorage() {
    if (!localStorage.getItem('cpdv_events')) {
      localStorage.setItem('cpdv_events', JSON.stringify(defaultEvents));
    }
    if (!localStorage.getItem('cpdv_posts')) {
      localStorage.setItem('cpdv_posts', JSON.stringify(defaultPosts));
    }
  }

  // --- MÉTODOS DE BLOG (POSTS) ---

  async getPosts() {
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
    if (this.useSupabase) {
      if (post.id) {
        // Actualizar
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
        // Crear nuevo
        const { data, error } = await this.supabaseClient
          .from('posts')
          .insert([{
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            date: post.date,
            author: post.author,
            category: post.category
          }])
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
        // Obtenemos los eventos ordenados por hora de inicio. singleEvents=true expande eventos recurrentes
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
    if (this.useSupabase) {
      if (event.id) {
        const { data, error } = await this.supabaseClient
          .from('events')
          .update({
            date: event.date,
            title: event.title,
            description: event.description
          })
          .eq('id', event.id)
          .select();
        if (error) throw error;
        return data[0];
      } else {
        const { data, error } = await this.supabaseClient
          .from('events')
          .insert([{
            date: event.date,
            title: event.title,
            description: event.description
          }])
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
    if (this.useSupabase) {
      // En Supabase el nombre de usuario debe ser un email
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
        return { success: false, error: 'Credenciales inválidas. Verifica tu usuario y contraseña en el modo local.' };
      }
    }
  }

  async logout() {
    if (this.useSupabase) {
      await this.supabaseClient.auth.signOut();
    }
    sessionStorage.removeItem('cpdv_admin_logged');
    sessionStorage.removeItem('cpdv_admin_user');
  }

  async isAuthenticated() {
    if (this.useSupabase) {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      return !!session;
    } else {
      return sessionStorage.getItem('cpdv_admin_logged') === 'true';
    }
  }

  async getCurrentUser() {
    if (this.useSupabase) {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      return session ? session.user : null;
    } else {
      if (sessionStorage.getItem('cpdv_admin_logged') === 'true') {
        return { email: sessionStorage.getItem('cpdv_admin_user') };
      }
      return null;
    }
  }
}

export const db = new Database();
