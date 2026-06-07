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

// Elementos del Modal de Cuestionario
const quizModal = document.getElementById('quiz-modal');
const quizModalTitle = document.getElementById('quiz-modal-title');
const quizEventTitle = document.getElementById('quiz-event-title');
const quizIframe = document.getElementById('quiz-iframe');
const closeQuizModalBtn = document.getElementById('close-quiz-modal');

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
  if (closeQuizModalBtn) {
    closeQuizModalBtn.addEventListener('click', () => closeAllModals());
  }

  window.addEventListener('click', (e) => {
    if (e.target === eventModal || e.target === blogModal || e.target === quizModal) {
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
  // Ajustar primer día del mes para que empiece en lunes (Lunes = 0, Domingo = 6)
  const startOffset = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
  // Último día del mes
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Rellenar días vacíos antes del primer día del mes
  for (let i = 0; i < startOffset; i++) {
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
      
      // Aplicar color de fondo según la asignatura del primer evento
      const firstEvent = dayEvents[0];
      if (firstEvent.subject) {
        dayDiv.classList.add(`subject-${firstEvent.subject}`);
      }

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
const subjectIcons = {
  lenguaje: "📖",
  science: "🔬",
  math: "🔢",
  musica: "🎵",
  ingles: "🇬🇧",
  ef: "🏃🏽",
  religion: "🕊️",
  consejo: "🤝",
  tecnologia: "💻",
  arte: "🎨"
};

// Mostrar detalles del evento en el Modal
function openQuizModal(fileName, eventTitle, htmlContent) {
  if (!quizModal || !quizIframe) return;
  
  if (quizEventTitle) {
    quizEventTitle.textContent = eventTitle;
  }
  if (quizModalTitle) {
    quizModalTitle.innerHTML = `📝 Cuestionario: <span style="font-weight: normal; color: var(--text-muted); font-size: 1.1rem;">${fileName}</span>`;
  }
  
  // Inyectar el HTML directamente en el iframe
  quizIframe.srcdoc = htmlContent;
  
  quizModal.style.display = 'flex';
  quizModal.setAttribute('aria-hidden', 'false');
}

function showEventDetails(events, dateString) {
  const [y, m, d] = dateString.split('-');
  const formattedDate = `${parseInt(d)} de ${monthNames[parseInt(m) - 1]} de ${y}`;
  
  eventModalDate.textContent = formattedDate;

  const downloadAttachment = document.getElementById('event-download-attachment');
  const attachmentName = document.getElementById('event-attachment-name');
  const viewQuizBtn = document.getElementById('event-view-quiz');
  const quizName = document.getElementById('event-quiz-name');
  const attachmentsContainer = document.getElementById('event-modal-attachments');
  
  if (events.length === 1) {
    const ev = events[0];
    const icon = ev.subject ? subjectIcons[ev.subject] || '' : '';
    eventModalTitle.textContent = `${icon} ${ev.title}`;
    eventModalDescription.textContent = ev.description;

    let hasAttachments = false;
    
    if (ev.attachment_data && ev.attachment_name) {
      if (downloadAttachment && attachmentName) {
        downloadAttachment.href = ev.attachment_data;
        downloadAttachment.download = ev.attachment_name;
        attachmentName.textContent = ev.attachment_name;
        downloadAttachment.style.display = 'inline-flex';
      }
      hasAttachments = true;
    } else {
      if (downloadAttachment) downloadAttachment.style.display = 'none';
    }

    if (ev.quiz_data && ev.quiz_name) {
      if (viewQuizBtn && quizName) {
        quizName.textContent = ev.quiz_name;
        viewQuizBtn.style.display = 'inline-flex';
        viewQuizBtn.onclick = (evt) => {
          evt.preventDefault();
          openQuizModal(ev.quiz_name, ev.title, ev.quiz_data);
        };
      }
      hasAttachments = true;
    } else {
      if (viewQuizBtn) viewQuizBtn.style.display = 'none';
    }

    if (attachmentsContainer) {
      attachmentsContainer.style.display = hasAttachments ? 'flex' : 'none';
    }
  } else {
    eventModalTitle.textContent = "Múltiples Actividades";
    eventModalDescription.innerHTML = events.map(e => {
      const icon = e.subject ? subjectIcons[e.subject] || '' : '';
      
      const attachmentBtn = e.attachment_data && e.attachment_name 
        ? `<a href="${e.attachment_data}" download="${e.attachment_name}" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; margin-top: 8px; margin-right: 8px; text-align: left; text-decoration: none;"><span style="margin-right: 5px;">📎</span> Material de Referencia: <strong style="margin-left: 5px; word-break: break-all;">${e.attachment_name}</strong></a>` 
        : '';
        
      const quizBtn = e.quiz_data && e.quiz_name 
        ? `<button class="btn btn-primary btn-sm view-inline-quiz-btn" data-event-id="${e.id}" style="display: inline-flex; align-items: center; margin-top: 8px; background-color: var(--success); text-align: left; border: none; cursor: pointer; color: white; font-family: var(--font-body); font-size: 0.875rem;"><span style="margin-right: 5px;">📝</span> Ver Cuestionario: <strong style="margin-left: 5px; word-break: break-all;">${e.quiz_name}</strong></button>` 
        : '';
        
      const buttonsRow = (attachmentBtn || quizBtn) ? `<div class="event-modal-buttons-row">${attachmentBtn}${quizBtn}</div>` : '';

      return `<div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <h4 style="margin-bottom: 8px; font-size: 1.1rem; color: var(--primary);">${icon} ${e.title}</h4>
        <p style="font-size: 0.95rem; white-space: pre-line;">${e.description}</p>
        ${buttonsRow}
      </div>`;
    }).join('');

    // Configurar listeners de clic para los botones inline de ver cuestionario
    const inlineQuizBtns = eventModalDescription.querySelectorAll('.view-inline-quiz-btn');
    inlineQuizBtns.forEach(btn => {
      btn.addEventListener('click', (evt) => {
        evt.preventDefault();
        const evId = btn.getAttribute('data-event-id');
        const targetEvent = events.find(item => item.id == evId);
        if (targetEvent && targetEvent.quiz_data) {
          openQuizModal(targetEvent.quiz_name, targetEvent.title, targetEvent.quiz_data);
        }
      });
    });

    // Ocultar los botones globales del final del modal
    if (downloadAttachment) downloadAttachment.style.display = 'none';
    if (viewQuizBtn) viewQuizBtn.style.display = 'none';
    if (attachmentsContainer) attachmentsContainer.style.display = 'none';
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

    // Agregar clase de la asignatura si existe para colorear el borde izquierdo
    if (ev.subject) {
      li.classList.add(`subject-${ev.subject}`);
    }

    const [y, m, d] = ev.date.split('-');
    const dateObj = new Date(y, m - 1, d);
    const formattedDate = `${dateObj.getDate()} de ${monthNames[dateObj.getMonth()]}`;
    
    const icon = ev.subject ? subjectIcons[ev.subject] || '' : '';

    li.innerHTML = `
      <div class="event-date">${formattedDate}</div>
      <h4>${icon} ${ev.title}</h4>
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
  if (quizModal) {
    quizModal.style.display = 'none';
    quizModal.setAttribute('aria-hidden', 'true');
  }
  // Vaciar el iframe al cerrar para liberar memoria y detener cualquier script
  if (quizIframe) {
    quizIframe.removeAttribute('srcdoc');
    quizIframe.src = 'about:blank';
  }
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
