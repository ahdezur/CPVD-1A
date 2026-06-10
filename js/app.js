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
let scheduleList = [];

// Elementos del DOM
const daysContainer = document.getElementById('days-container');
const monthYearDisplay = document.getElementById('month-year-display');
const upcomingEventsList = document.getElementById('upcoming-events-list');
const blogPostsGrid = document.getElementById('blog-posts-grid');
const scheduleDesktopBody = document.getElementById('schedule-desktop-body');
const scheduleMobileBody = document.getElementById('schedule-mobile-body');

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
const blogModalImageContainer = document.getElementById('blog-modal-image-container');
const blogModalImage = document.getElementById('blog-modal-image');

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
    // Cargar eventos, posts y horario de forma concurrente para acelerar la carga de la página
    const [events, posts, schedule] = await Promise.all([
      db.getEvents(),
      db.getPosts(),
      db.getSchedule()
    ]);
    eventsList = events;
    postsList = posts;
    scheduleList = schedule;

    renderCalendar();
    renderUpcomingEvents();
    renderBlogPosts();
    renderSchedule();
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

    // Ocultar botones globales al inicio mientras cargamos en segundo plano
    if (downloadAttachment) downloadAttachment.style.display = 'none';
    if (viewQuizBtn) viewQuizBtn.style.display = 'none';

    if (ev.attachment_name || ev.quiz_name) {
      if (attachmentsContainer) {
        attachmentsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">⏳ Cargando archivos adjuntos...</span>';
        attachmentsContainer.style.display = 'flex';
      }
      
      db.getEventById(ev.id).then(fullEv => {
        if (!attachmentsContainer) return;
        attachmentsContainer.innerHTML = ''; // Limpiar contenedor
        attachmentsContainer.style.flexWrap = 'wrap';

        let hasAttachments = false;
        
        // Renderizar múltiples adjuntos (o fallback simple)
        if (fullEv && fullEv.attachment_data) {
          let attachments = [];
          if (fullEv.attachment_data.trim().startsWith('[')) {
            try {
              attachments = JSON.parse(fullEv.attachment_data);
            } catch (err) {
              attachments = [{ name: fullEv.attachment_name || 'Material adjunto', data: fullEv.attachment_data }];
            }
          } else if (fullEv.attachment_name) {
            attachments = [{ name: fullEv.attachment_name, data: fullEv.attachment_data }];
          }

          attachments.forEach(att => {
            const dlBtn = document.createElement('a');
            dlBtn.href = att.data;
            dlBtn.download = att.name;
            dlBtn.className = 'btn btn-secondary';
            dlBtn.style.display = 'inline-flex';
            dlBtn.style.alignItems = 'center';
            dlBtn.style.gap = '6px';
            dlBtn.style.margin = '4px';
            dlBtn.innerHTML = `<span>📎</span> <strong>${att.name}</strong>`;
            attachmentsContainer.appendChild(dlBtn);
            hasAttachments = true;
          });
        }

        // Renderizar cuestionario
        if (fullEv && fullEv.quiz_data && fullEv.quiz_name) {
          const viewQuizBtnReal = document.createElement('button');
          viewQuizBtnReal.className = 'btn btn-primary';
          viewQuizBtnReal.style.backgroundColor = 'var(--success)';
          viewQuizBtnReal.style.border = 'none';
          viewQuizBtnReal.style.display = 'inline-flex';
          viewQuizBtnReal.style.alignItems = 'center';
          viewQuizBtnReal.style.gap = '6px';
          viewQuizBtnReal.style.margin = '4px';
          viewQuizBtnReal.innerHTML = `<span>📝</span> <strong>${fullEv.quiz_name}</strong> (Hacer Cuestionario)`;
          viewQuizBtnReal.onclick = (evt) => {
            evt.preventDefault();
            openQuizModal(fullEv.quiz_name, fullEv.title, fullEv.quiz_data);
          };
          attachmentsContainer.appendChild(viewQuizBtnReal);
          hasAttachments = true;
        }

        attachmentsContainer.style.display = hasAttachments ? 'flex' : 'none';
      }).catch(err => {
        console.error("Error al cargar archivos adjuntos:", err);
        if (attachmentsContainer) {
          attachmentsContainer.innerHTML = '<span style="color: var(--danger); font-size: 0.9rem;">⚠️ Error al cargar los archivos adjuntos.</span>';
        }
      });
    } else {
      if (attachmentsContainer) {
        attachmentsContainer.style.display = 'none';
      }
    }
  } else {
    eventModalTitle.textContent = "Múltiples Actividades";
    eventModalDescription.innerHTML = events.map(e => {
      const icon = e.subject ? subjectIcons[e.subject] || '' : '';
      
      let attachmentPlaceholders = '';
      if (e.attachment_name) {
        let names = [];
        if (e.attachment_name.trim().startsWith('[')) {
          try {
            names = JSON.parse(e.attachment_name);
          } catch(err) {
            names = [e.attachment_name];
          }
        } else {
          names = [e.attachment_name];
        }
        
        attachmentPlaceholders = names.map((name, idx) => {
          return `<a href="#" id="multi-attachment-${e.id}-${idx}" class="btn btn-secondary btn-sm disabled" style="display: inline-flex; align-items: center; margin-top: 8px; margin-right: 8px; text-align: left; text-decoration: none; opacity: 0.6; cursor: wait;"><span style="margin-right: 5px;">📎</span> Cargando... <strong>${name}</strong></a>`;
        }).join('');
      }
        
      const quizBtn = e.quiz_name 
        ? `<button id="multi-quiz-${e.id}" class="btn btn-primary btn-sm" disabled style="display: inline-flex; align-items: center; margin-top: 8px; background-color: var(--success); text-align: left; border: none; cursor: wait; color: white; opacity: 0.6; font-family: var(--font-body); font-size: 0.875rem;"><span style="margin-right: 5px;">📝</span> Cargando... <strong>${e.quiz_name}</strong></button>` 
        : '';
        
      const buttonsRow = (attachmentPlaceholders || quizBtn) ? `<div class="event-modal-buttons-row" style="display: flex; flex-wrap: wrap;">${attachmentPlaceholders}${quizBtn}</div>` : '';

      return `<div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <h4 style="margin-bottom: 8px; font-size: 1.1rem; color: var(--primary);">${icon} ${e.title}</h4>
        <p style="font-size: 0.95rem; white-space: pre-line;">${e.description}</p>
        ${buttonsRow}
      </div>`;
    }).join('');

    // Cargar los archivos adjuntos y cuestionarios para cada evento de forma asíncrona
    events.forEach(e => {
      if (e.attachment_name || e.quiz_name) {
        db.getEventById(e.id).then(fullEv => {
          if (!fullEv) return;
          
          // Renderizar archivos adjuntos
          let attachments = [];
          if (fullEv.attachment_data) {
            if (fullEv.attachment_data.trim().startsWith('[')) {
              try {
                attachments = JSON.parse(fullEv.attachment_data);
              } catch(err) {
                attachments = [{ name: fullEv.attachment_name, data: fullEv.attachment_data }];
              }
            } else if (fullEv.attachment_name) {
              attachments = [{ name: fullEv.attachment_name, data: fullEv.attachment_data }];
            }
          }

          attachments.forEach((att, idx) => {
            const dlBtn = document.getElementById(`multi-attachment-${e.id}-${idx}`);
            if (dlBtn && att.data) {
              dlBtn.href = att.data;
              dlBtn.download = att.name;
              dlBtn.style.opacity = '1';
              dlBtn.style.cursor = 'pointer';
              dlBtn.classList.remove('disabled');
              dlBtn.innerHTML = `<span style="margin-right: 5px;">📎</span> Material: <strong>${att.name}</strong>`;
            } else if (dlBtn) {
              dlBtn.style.display = 'none';
            }
          });
          
          const qzBtn = document.getElementById(`multi-quiz-${e.id}`);
          if (qzBtn && fullEv.quiz_data) {
            qzBtn.disabled = false;
            qzBtn.style.opacity = '1';
            qzBtn.style.cursor = 'pointer';
            qzBtn.innerHTML = `<span style="margin-right: 5px;">📝</span> Cuestionario: <strong>${fullEv.quiz_name}</strong>`;
            qzBtn.onclick = (evt) => {
              evt.preventDefault();
              openQuizModal(fullEv.quiz_name, fullEv.title, fullEv.quiz_data);
            };
          } else if (qzBtn) {
            qzBtn.style.display = 'none';
          }
        }).catch(err => {
          console.error(`Error al cargar adjuntos para evento de día múltiple con ID ${e.id}:`, err);
        });
      }
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

    // Previsualización de imagen si existe
    const imagePreviewHtml = post.image_data 
      ? `<div class="blog-card-image-preview" style="height: 160px; overflow: hidden; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border-color); background: #f8fafc; display: flex; align-items: center; justify-content: center;">
           <img src="${post.image_data}" alt="${post.title}" style="width: 100%; height: 100%; object-fit: cover;">
         </div>`
      : '';

    card.innerHTML = `
      ${imagePreviewHtml}
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
  
  // Cargar imagen en tamaño completo si existe
  if (post.image_data && blogModalImage && blogModalImageContainer) {
    blogModalImage.src = post.image_data;
    blogModalImageContainer.style.display = 'block';
  } else {
    if (blogModalImage) blogModalImage.src = '';
    if (blogModalImageContainer) blogModalImageContainer.style.display = 'none';
  }

  // Inyectar el HTML enriquecido guardado desde el panel admin
  blogModalBody.innerHTML = post.content;

  blogModal.style.display = 'flex';
  blogModal.setAttribute('aria-hidden', 'false');
}

// --- RENDERIZADO DEL HORARIO DE CLASES ---

// Nombres amigables de asignaturas para visualización
const subjectLabels = {
  lenguaje: "📖 Lenguaje",
  science: "🔬 Science & Society",
  math: "🔢 Math",
  musica: "🎵 Music",
  ingles: "🇬🇧 English",
  ef: "🏃🏽 Physics Education",
  religion: "🕊️ Religión",
  consejo: "🤝 Councelling",
  tecnologia: "💻 Technology",
  arte: "🎨 Arts",
  orientacion: "🧭 Orientación"
};

function renderSchedule() {
  if (!scheduleDesktopBody || !scheduleMobileBody) return;
  scheduleDesktopBody.innerHTML = '';
  scheduleMobileBody.innerHTML = '';

  const today = new Date();
  let currentDayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  // Si es fin de semana, por defecto mostramos el lunes (1)
  if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
    currentDayOfWeek = 1;
  }

  // --- RENDERIZAR VISTA ESCRITORIO (GRILLA) ---
  
  // Destacar la columna del día de hoy en el encabezado
  const dayHeaders = document.querySelectorAll('.schedule-grid-header .day-col');
  dayHeaders.forEach(header => {
    const dayNum = parseInt(header.getAttribute('data-day'));
    if (dayNum === currentDayOfWeek) {
      header.classList.add('active-today');
    } else {
      header.classList.remove('active-today');
    }
  });

  // Obtener bloques horarios únicos
  const timeSlots = [];
  const seenSlots = new Set();
  scheduleList.forEach(item => {
    const key = `${item.start_time}-${item.end_time}`;
    if (!seenSlots.has(key)) {
      seenSlots.add(key);
      timeSlots.push({ start: item.start_time, end: item.end_time });
    }
  });

  // Ordenar bloques por hora de inicio
  timeSlots.sort((a, b) => a.start.localeCompare(b.start));

  if (timeSlots.length === 0) {
    scheduleDesktopBody.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No hay bloques de horario configurados.</div>';
  } else {
    timeSlots.forEach(slot => {
      const row = document.createElement('div');
      row.classList.add('schedule-row');

      // Columna de hora
      const timeCell = document.createElement('div');
      timeCell.classList.add('schedule-time-cell');
      timeCell.innerHTML = `
        <span class="time-start">${slot.start}</span>
        <span class="time-end">${slot.end}</span>
      `;
      row.appendChild(timeCell);

      // Columnas por día (1 a 5)
      for (let day = 1; day <= 5; day++) {
        const cell = document.createElement('div');
        cell.classList.add('schedule-cell');

        if (day === currentDayOfWeek) {
          cell.classList.add('active-today');
        }

        // Buscar todas las asignaturas asignadas a este bloque y día
        const matchingClasses = scheduleList.filter(item => item.day_of_week === day && item.start_time === slot.start);

        if (matchingClasses.length > 0) {
          if (matchingClasses.length === 1) {
            const classItem = matchingClasses[0];
            cell.classList.add(`subject-${classItem.subject}`);
            const cleanSubject = subjectLabels[classItem.subject] || classItem.subject;
            cell.innerHTML = `
              <div class="subject-name">${cleanSubject}</div>
              ${classItem.teacher ? `<div class="teacher-name">${classItem.teacher}</div>` : ''}
              ${classItem.notes ? `<div class="class-notes" title="${classItem.notes}">${classItem.notes}</div>` : ''}
            `;
          } else {
            // Múltiples asignaturas en el mismo bloque y día (ej. electivos)
            const subjectColors = {
              lenguaje: "#4a90e2",
              science: "#7ed321",
              math: "#f5a623",
              musica: "#50e3c2",
              ingles: "#bd10e0",
              ef: "#e25c5c",
              religion: "#4a4a4a",
              consejo: "#7ed3c1",
              tecnologia: "#00c0f9",
              arte: "#9013fe",
              orientacion: "#ff9f43"
            };

            cell.style.display = 'flex';
            cell.style.flexDirection = 'column';
            cell.style.gap = '8px';
            cell.style.justifyContent = 'flex-start';
            cell.style.alignItems = 'stretch';

            cell.innerHTML = matchingClasses.map(classItem => {
              const cleanSubject = subjectLabels[classItem.subject] || classItem.subject;
              const color = subjectColors[classItem.subject] || 'var(--primary)';
              return `
                <div style="border-left: 3px solid ${color}; padding-left: 8px; text-align: left; width: 100%;">
                  <div class="subject-name" style="font-weight: 700; font-size: 0.85rem; margin-bottom: 2px;">${cleanSubject}</div>
                  ${classItem.teacher ? `<div class="teacher-name" style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 2px;">${classItem.teacher}</div>` : ''}
                  ${classItem.notes ? `<div class="class-notes" style="font-size: 0.7rem; padding: 2px 4px; border-left: 1.5px solid ${color}; display: inline-block;" title="${classItem.notes}">${classItem.notes}</div>` : ''}
                </div>
              `;
            }).join('<div style="border-top: 1px dashed var(--border-color); width: 100%;"></div>');
          }
        } else {
          cell.classList.add('empty-cell');
          cell.textContent = '-';
        }
        row.appendChild(cell);
      }

      scheduleDesktopBody.appendChild(row);
    });
  }

  // --- RENDERIZAR VISTA MÓVIL (TABS POR DÍA) ---
  const tabBtns = document.querySelectorAll('.schedule-tab-btn');
  
  // Limpiar listeners anteriores clonando los botones si es necesario,
  // pero como se vuelven a asignar en cada renderizado, añadimos un check sencillo
  tabBtns.forEach(btn => {
    // Clonar para limpiar eventos y evitar acumulaciones
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', () => {
      const day = parseInt(newBtn.getAttribute('data-day'));
      setActiveMobileDay(day);
    });
  });

  // Mostrar por defecto el día actual
  setActiveMobileDay(currentDayOfWeek);
}

function setActiveMobileDay(dayNum) {
  const tabBtns = document.querySelectorAll('.schedule-tab-btn');
  tabBtns.forEach(btn => {
    const day = parseInt(btn.getAttribute('data-day'));
    if (day === dayNum) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (!scheduleMobileBody) return;
  scheduleMobileBody.innerHTML = '';

  const dayClasses = scheduleList.filter(item => item.day_of_week === dayNum);

  if (dayClasses.length === 0) {
    scheduleMobileBody.innerHTML = '<div class="schedule-mobile-empty">No hay clases programadas para este día.</div>';
    return;
  }

  dayClasses.forEach(item => {
    const div = document.createElement('div');
    div.classList.add('schedule-mobile-item', `subject-${item.subject}`);
    
    const cleanSubject = subjectLabels[item.subject] || item.subject;

    div.innerHTML = `
      <div class="schedule-mobile-time">
        <span class="start">${item.start_time}</span>
        <span class="end">${item.end_time}</span>
      </div>
      <div class="schedule-mobile-info">
        <h4>${cleanSubject}</h4>
        ${item.teacher ? `<span class="teacher">${item.teacher}</span>` : ''}
        ${item.notes ? `<span class="notes">${item.notes}</span>` : ''}
      </div>
    `;
    
    scheduleMobileBody.appendChild(div);
  });
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
  // Limpiar imagen de blog para liberar memoria
  if (blogModalImage) {
    blogModalImage.src = '';
  }
  if (blogModalImageContainer) {
    blogModalImageContainer.style.display = 'none';
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
    const scheduleSec = document.getElementById('schedule-section');
    const blogSec = document.getElementById('blog-section');
    
    if (!calendarSec || !scheduleSec || !blogSec) return;

    const scrollPos = window.scrollY + 150;

    // Quitar clase activa de todos
    document.getElementById('link-calendar')?.classList.remove('active');
    document.getElementById('link-schedule')?.classList.remove('active');
    document.getElementById('link-blog')?.classList.remove('active');

    if (scrollPos >= blogSec.offsetTop) {
      document.getElementById('link-blog')?.classList.add('active');
    } else if (scrollPos >= scheduleSec.offsetTop) {
      document.getElementById('link-schedule')?.classList.add('active');
    } else {
      document.getElementById('link-calendar')?.classList.add('active');
    }
  });
}

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', initApp);
export { showToast };
