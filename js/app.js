import { db } from './db.js';

// Nombres de meses en español
const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Estado global de la vista pública
let currentYear;
let currentMonth;
let eventsList = [];
let postsList = [];

// Elementos del DOM
const daysContainer = document.getElementById('days-container');
const monthYearDisplay = document.getElementById('month-year-display');
const upcomingEventsList = document.getElementById('upcoming-events-list');
const blogPostsGrid = document.getElementById('blog-posts-grid');

// Elementos del Modal de Evento
const eventModal = document.getElementById('event-modal');
const eventModalTitle = document.getElementById('event-modal-title');
const eventModalDate = document.getElementById('event-modal-date');
const eventModalDescription = document.getElementById('event-modal-description');
const closeEventModalBtn = document.getElementById('close-event-modal');

// Elementos del Modal de Blog
const blogModal = document.getElementById('blog-modal');
const blogModalTitle = document.getElementById('blog-modal-title');
const blogModalDate = document.getElementById('blog-modal-date');
const blogModalAuthor = document.getElementById('blog-modal-author');
const blogModalCategory = document.getElementById('blog-modal-category');
const blogModalBody = document.getElementById('blog-modal-body');
const closeBlogModalBtn = document.getElementById('close-blog-modal');

// Navegación Activa
const navLinks = document.querySelectorAll('.nav-link');

// Inicializar la aplicación
async function initApp() {
  // Inicializar base de datos (localStorage o Supabase)
  await db.init();

  // Establecer fecha por defecto (usando la fecha actual de la máquina)
  const today = new Date();
  
  // Si estamos en 2026 por el mock, forzamos a junio para visualizar de inmediato,
  // si no, usamos el mes corriente.
  if (today.getFullYear() === 2026) {
    currentYear = 2026;
    currentMonth = 5; // Junio es 5 (0-indexed)
  } else {
    // Si no es 2026, usamos la fecha real del sistema del usuario
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
  }

  // Cargar datos
  await refreshData();

  // Escuchadores de eventos para la navegación del calendario
  document.getElementById('prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  // Escuchadores de cierre de modals
  closeEventModalBtn.addEventListener('click', () => closeAllModals());
  closeBlogModalBtn.addEventListener('click', () => closeAllModals());

  window.addEventListener('click', (e) => {
    if (e.target === eventModal || e.target === blogModal) {
      closeAllModals();
    }
  });

  // Manejar links de navegación activa
  setupNavigationHighlighting();
}

// Cargar y actualizar datos de la base de datos
async function refreshData() {
  try {
    eventsList = await db.getEvents();
    postsList = await db.getPosts();

    renderCalendar();
    renderUpcomingEvents();
    renderBlogPosts();
  } catch (error) {
    console.error("Error cargando los datos del portal:", error);
    showToast("Error al cargar los datos. Usando almacenamiento local.", "error");
  }
}

// Renderizar la grilla de días del calendario
function renderCalendar() {
  if (!daysContainer) return;
  daysContainer.innerHTML = '';
  monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  // Primer día del mes (0 = Domingo, 1 = Lunes, etc.)
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  // Último día del mes (ej. 30, 31)
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Rellenar días vacíos antes del primer día del mes
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDiv = document.createElement('div');
    emptyDiv.classList.add('day', 'empty');
    daysContainer.appendChild(emptyDiv);
  }

  const today = new Date();

  // Rellenar los días del mes
  for (let day = 1; day <= lastDay; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.classList.add('day');
    
    const dayNumberSpan = document.createElement('span');
    dayNumberSpan.classList.add('day-number');
    dayNumberSpan.textContent = day;
    dayDiv.appendChild(dayNumberSpan);

    // Formatear fecha clave YYYY-MM-DD
    const monthString = String(currentMonth + 1).padStart(2, '0');
    const dayString = String(day).padStart(2, '0');
    const dateKey = `${currentYear}-${monthString}-${dayString}`;

    // Marcar si es hoy
    if (currentYear === today.getFullYear() && 
        currentMonth === today.getMonth() && 
        day === today.getDate()) {
      dayDiv.classList.add('today');
    }

    // Filtrar eventos para este día específico
    const dayEvents = eventsList.filter(e => e.date === dateKey);

    if (dayEvents.length > 0) {
      dayDiv.classList.add('has-event');
      
      const indicatorsContainer = document.createElement('div');
      indicatorsContainer.classList.add('event-indicators');
      
      // Mostrar hasta 3 puntos indicadores de eventos
      dayEvents.slice(0, 3).forEach(() => {
        const indicator = document.createElement('div');
        indicator.classList.add('event-indicator');
        indicatorsContainer.appendChild(indicator);
      });
      
      dayDiv.appendChild(indicatorsContainer);

      // Evento de clic en día con eventos
      dayDiv.addEventListener('click', () => {
        showEventDetails(dayEvents, dateKey);
      });
    } else {
      // Evento de clic en día común
      dayDiv.addEventListener('click', () => {
        showToast(`No hay eventos programados para el ${day} de ${monthNames[currentMonth]}.`, "info");
      });
    }

    daysContainer.appendChild(dayDiv);
  }
}

// Mostrar detalles del evento en el Modal
function showEventDetails(events, dateString) {
  const [y, m, d] = dateString.split('-');
  const formattedDate = `${parseInt(d)} de ${monthNames[parseInt(m) - 1]} de ${y}`;
  
  eventModalDate.textContent = formattedDate;
  
  if (events.length === 1) {
    eventModalTitle.textContent = events[0].title;
    eventModalDescription.textContent = events[0].description;
  } else {
    eventModalTitle.textContent = "Múltiples Actividades";
    eventModalDescription.innerHTML = events.map(e => {
      return `<div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <h4 style="margin-bottom: 8px; font-size: 1.1rem; color: var(--primary);">${e.title}</h4>
        <p style="font-size: 0.95rem;">${e.description}</p>
      </div>`;
    }).join('');
  }
  
  eventModal.style.display = 'flex';
  eventModal.setAttribute('aria-hidden', 'false');
}

// Renderizar la barra lateral de próximos eventos
function renderUpcomingEvents() {
  if (!upcomingEventsList) return;
  upcomingEventsList.innerHTML = '';

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Filtrar eventos futuros o del día de hoy y ordenar cronológicamente
  let upcoming = eventsList
    .filter(e => e.date >= todayString)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Si no hay eventos futuros, mostrar los últimos eventos registrados ordenados cronológicamente
  if (upcoming.length === 0) {
    upcoming = [...eventsList]
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Tomar los 4 más próximos
  const limited = upcoming.slice(0, 4);

  if (limited.length === 0) {
    upcomingEventsList.innerHTML = '<li class="event-item">No hay actividades programadas.</li>';
    return;
  }

  limited.forEach(ev => {
    const li = document.createElement('li');
    li.classList.add('event-item');
    
    // Si contiene ciertas palabras clave, le damos un estilo acentuado
    if (ev.title.toLowerCase().includes('paseo') || ev.title.toLowerCase().includes('cumpleaños') || ev.title.toLowerCase().includes('celebración')) {
      li.classList.add('accent');
    }

    const [y, m, d] = ev.date.split('-');
    const dateObj = new Date(y, m - 1, d);
    const formattedDate = `${dateObj.getDate()} de ${monthNames[dateObj.getMonth()]}`;

    li.innerHTML = `
      <div class="event-date">${formattedDate}</div>
      <h4>${ev.title}</h4>
      <p>${ev.description.substring(0, 75)}${ev.description.length > 75 ? '...' : ''}</p>
    `;
    
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      showEventDetails([ev], ev.date);
    });

    upcomingEventsList.appendChild(li);
  });
}

// Renderizar las publicaciones del blog
function renderBlogPosts() {
  if (!blogPostsGrid) return;
  blogPostsGrid.innerHTML = '';

  if (postsList.length === 0) {
    blogPostsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No hay lecturas disponibles por el momento.</div>';
    return;
  }

  postsList.forEach(post => {
    const card = document.createElement('article');
    card.classList.add('card', 'blog-card');

    const formattedDate = formatSimpleDate(post.date);
    const catClass = (post.category || 'General').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    card.innerHTML = `
      <div class="blog-meta">
        <span class="blog-category ${catClass}">${post.category || 'General'}</span>
        <time datetime="${post.date}">${formattedDate}</time>
      </div>
      <h3>${post.title}</h3>
      <p class="excerpt">${post.excerpt || stripHTML(post.content).substring(0, 120) + '...'}</p>
      <a href="#blog-section" class="read-more" aria-label="Leer más sobre ${post.title}">
        Leer más &rarr;
      </a>
    `;

    // Clic para abrir lectura completa en el modal
    card.addEventListener('click', (e) => {
      e.preventDefault();
      showBlogReading(post);
    });

    blogPostsGrid.appendChild(card);
  });
}

// Mostrar el contenido completo de una lectura en el modal
function showBlogReading(post) {
  blogModalTitle.textContent = post.title;
  blogModalDate.textContent = formatSimpleDate(post.date);
  blogModalAuthor.textContent = post.author || 'Administrador';
  blogModalCategory.textContent = post.category || 'General';
  
  // Limpiar clases previas de categoría en el modal y asignar la nueva clase
  blogModalCategory.className = 'blog-category';
  const catClass = (post.category || 'General').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  blogModalCategory.classList.add(catClass);
  
  // Inyectar el HTML enriquecido guardado desde el panel admin
  blogModalBody.innerHTML = post.content;

  blogModal.style.display = 'flex';
  blogModal.setAttribute('aria-hidden', 'false');
}

// Cerrar todos los Modals abiertos
function closeAllModals() {
  eventModal.style.display = 'none';
  eventModal.setAttribute('aria-hidden', 'true');
  blogModal.style.display = 'none';
  blogModal.setAttribute('aria-hidden', 'true');
}

// Utilidad: Formatear fecha YYYY-MM-DD a "D de Mes, YYYY"
function formatSimpleDate(dateString) {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-');
  return `${parseInt(d)} de ${monthNames[parseInt(m) - 1]} de ${y}`;
}

// Utilidad: Limpiar HTML para resúmenes
function stripHTML(html) {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// Utilidad: Mostrar notificaciones flotantes (Toasts)
function showToast(message, type = "info") {
  const toast = document.createElement('div');
  toast.classList.add('toast', type);
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${message}`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Manejar resaltado dinámico de navegación
function setupNavigationHighlighting() {
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Si no es un link interno (#), no hacer e.preventDefault()
      if (link.getAttribute('href').startsWith('#')) {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    });
  });

  // Resaltado al hacer scroll
  window.addEventListener('scroll', () => {
    const calendarSec = document.getElementById('calendar-section');
    const blogSec = document.getElementById('blog-section');
    if (!calendarSec || !blogSec) return;

    const scrollPos = window.scrollY + 150;

    if (scrollPos >= blogSec.offsetTop) {
      document.getElementById('link-calendar').classList.remove('active');
      document.getElementById('link-blog').classList.add('active');
    } else {
      document.getElementById('link-calendar').classList.add('active');
      document.getElementById('link-blog').classList.remove('active');
    }
  });
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', initApp);
export { showToast };
