import { db } from './db.js';

// Estado global de la administración
let activeTab = 'blog';
let isShowingSourceCode = false;
let quillInstance = null;

// Elementos del DOM - Login
const loginView = document.getElementById('login-view');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Elementos del DOM - General Admin
const adminView = document.getElementById('admin-view');
const adminUsernameDisplay = document.getElementById('admin-username-display');
const logoutNavItem = document.getElementById('logout-nav-item');
const btnLogout = document.getElementById('btn-logout');

// Elementos del DOM - Tabs
const tabBlogBtn = document.getElementById('tab-blog-btn');
const tabCalendarBtn = document.getElementById('tab-calendar-btn');
const tabScheduleBtn = document.getElementById('tab-schedule-btn');
const tabBlogContent = document.getElementById('tab-blog-content');
const tabCalendarContent = document.getElementById('tab-calendar-content');
const tabScheduleContent = document.getElementById('tab-schedule-content');

// Elementos del DOM - Horario
const scheduleForm = document.getElementById('schedule-form');
const scheduleIdInput = document.getElementById('schedule-id');
const scheduleDayInput = document.getElementById('schedule-day');
const scheduleStartTimeInput = document.getElementById('schedule-start-time');
const scheduleEndTimeInput = document.getElementById('schedule-end-time');
const scheduleSubjectInput = document.getElementById('schedule-subject');
const scheduleTeacherInput = document.getElementById('schedule-teacher');
const scheduleNotesInput = document.getElementById('schedule-notes');
const scheduleListContainer = document.getElementById('schedule-list-container');
const formScheduleTitle = document.getElementById('form-schedule-title');
const btnSaveSchedule = document.getElementById('btn-save-schedule');
const btnClearSchedule = document.getElementById('btn-clear-schedule');

// Elementos del DOM - Formularios & Contenedores Blog
const blogForm = document.getElementById('blog-form');
const postIdInput = document.getElementById('post-id');
const postTitleInput = document.getElementById('post-title');
const postCategoryInput = document.getElementById('post-category');
const postDateInput = document.getElementById('post-date');
const postAuthorInput = document.getElementById('post-author');
const postExcerptInput = document.getElementById('post-excerpt');
const editorContainer = document.getElementById('editor-container');
const htmlEditorTextarea = document.getElementById('html-editor-textarea');
const btnToggleHtml = document.getElementById('btn-toggle-html');
const postsListContainer = document.getElementById('posts-list-container');
const formBlogTitle = document.getElementById('form-blog-title');
const btnSavePost = document.getElementById('btn-save-post');
const btnClearPost = document.getElementById('btn-clear-post');

// Elementos del DOM - Formularios & Contenedores Eventos
const eventForm = document.getElementById('event-form');
const eventIdInput = document.getElementById('event-id');
const eventTitleInput = document.getElementById('event-title');
const eventSubjectInput = document.getElementById('event-subject');
const eventDateInput = document.getElementById('event-date');
const eventDescriptionInput = document.getElementById('event-description');
const eventsListContainer = document.getElementById('events-list-container');
const formEventTitle = document.getElementById('form-event-title');
const btnSaveEvent = document.getElementById('btn-save-event');
const btnClearEvent = document.getElementById('btn-clear-event');

// Elementos del DOM - Adjuntos de Eventos
const eventAttachmentInput = document.getElementById('event-attachment');
const eventQuizInput = document.getElementById('event-quiz-file');
const attachmentStatus = document.getElementById('attachment-status');
const quizStatus = document.getElementById('quiz-status');

// Variables de estado de archivos temporales
let currentAttachment = { name: '', data: '' };
let currentQuiz = { name: '', data: '' };

// Inicializar Aplicación
async function initAdmin() {
  // Inicializar base de datos
  await db.init();

  // Verificar si está autenticado
  const authenticated = await db.isAuthenticated();
  if (authenticated) {
    showDashboard(await db.getCurrentUser());
  } else {
    showLogin();
  }

  // Escuchador de Login
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Escuchador de Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  // Escuchadores de Tabs
  if (tabBlogBtn && tabCalendarBtn && tabScheduleBtn) {
    tabBlogBtn.addEventListener('click', () => switchTab('blog'));
    tabCalendarBtn.addEventListener('click', () => switchTab('calendar'));
    tabScheduleBtn.addEventListener('click', () => switchTab('schedule'));
  }

  // Escuchador de Horario Form
  if (scheduleForm) {
    scheduleForm.addEventListener('submit', handleScheduleFormSubmit);
  }
}

// Mostrar Vista de Login
function showLogin() {
  if (loginView) loginView.style.display = 'block';
  if (adminView) adminView.style.display = 'none';
  if (logoutNavItem) logoutNavItem.style.display = 'none';
  
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
}

// Mostrar Vista del Panel
async function showDashboard(user) {
  if (loginView) loginView.style.display = 'none';
  if (adminView) adminView.style.display = 'block';
  if (logoutNavItem) logoutNavItem.style.display = 'block';
  
  if (adminUsernameDisplay && user) {
    adminUsernameDisplay.textContent = user.email || 'Admin';
  }

  // Verificar e informar sobre la integración de Google Calendar
  const gcalWarningBox = document.getElementById('gcal-warning-box');
  if (gcalWarningBox) {
    if (db.isGoogleCalendarEnabled()) {
      gcalWarningBox.style.display = 'block';
    } else {
      gcalWarningBox.style.display = 'none';
    }
  }

  // Verificar si está usando el modo local (localStorage) por fallo de la base de datos o por fallback activo
  const localStorageWarningBox = document.getElementById('local-storage-warning-box');
  if (localStorageWarningBox) {
    if ((!db.useApi && !db.useSupabase) || db.isFallbackActive) {
      localStorageWarningBox.style.display = 'block';
    } else {
      localStorageWarningBox.style.display = 'none';
    }
  }

  // Inicializar Editor Quill si no existe
  initQuillEditor();

  // Cargar las fechas por defecto para hoy
  resetBlogForm();
  resetEventForm();
  resetScheduleForm();

  // Cargar Listados de forma concurrente
  await Promise.all([
    refreshBlogList(),
    refreshEventList(),
    refreshScheduleList()
  ]);
}

// Manejar Inicio de Sesión
async function handleLogin(e) {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const result = await db.login(username, password);
    if (result.success) {
      showToast('Acceso correcto. Bienvenido.', 'success');
      showDashboard(result.user);
    } else {
      showToast(result.error || 'Credenciales incorrectas.', 'error');
    }
  } catch (err) {
    console.error("Error en login:", err);
    showToast('Ocurrió un error al intentar iniciar sesión.', 'error');
  }
}

// Manejar Cierre de Sesión
async function handleLogout() {
  await db.logout();
  showToast('Sesión cerrada correctamente.', 'success');
  showLogin();
}

// Cambiar de Pestaña (Tabs)
function switchTab(tab) {
  activeTab = tab;
  
  // Ocultar todos los contenidos y remover activo de todos los botones
  tabBlogBtn?.classList.remove('active');
  tabCalendarBtn?.classList.remove('active');
  tabScheduleBtn?.classList.remove('active');
  
  tabBlogContent?.classList.remove('active');
  tabCalendarContent?.classList.remove('active');
  tabScheduleContent?.classList.remove('active');

  if (tab === 'blog') {
    tabBlogBtn?.classList.add('active');
    tabBlogContent?.classList.add('active');
  } else if (tab === 'calendar') {
    tabCalendarBtn?.classList.add('active');
    tabCalendarContent?.classList.add('active');
  } else if (tab === 'schedule') {
    tabScheduleBtn?.classList.add('active');
    tabScheduleContent?.classList.add('active');
  }
}

// Inicializar Editor de Texto Enriquecido Quill
function initQuillEditor() {
  if (quillInstance) return; // Ya inicializado
  
  if (typeof Quill === 'undefined') {
    console.error("Librería Quill no está cargada. Asegúrate de estar conectado a internet.");
    return;
  }

  const toolbarOptions = [
    [{ 'header': [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'image'],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ];

  quillInstance = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
      toolbar: toolbarOptions
    },
    placeholder: 'Escribe el contenido de tu lectura aquí...'
  });

  // Alternancia de código fuente HTML nativo
  if (btnToggleHtml && htmlEditorTextarea && editorContainer) {
    btnToggleHtml.addEventListener('click', () => {
      const qlToolbar = document.querySelector('.ql-toolbar');
      
      if (!isShowingSourceCode) {
        // Pasar del modo Visual a modo HTML Código
        const content = quillInstance.root.innerHTML;
        htmlEditorTextarea.value = content;
        
        editorContainer.style.display = 'none';
        if (qlToolbar) qlToolbar.style.display = 'none';
        htmlEditorTextarea.style.display = 'block';
        
        btnToggleHtml.textContent = '👁️ Ver Editor Visual';
        btnToggleHtml.classList.add('btn-primary');
        isShowingSourceCode = true;
      } else {
        // Pasar del modo HTML Código al modo Visual
        const content = htmlEditorTextarea.value;
        quillInstance.root.innerHTML = content;
        
        htmlEditorTextarea.style.display = 'none';
        editorContainer.style.display = 'block';
        if (qlToolbar) qlToolbar.style.display = 'block';
        
        btnToggleHtml.textContent = 'Code </> (Ver Código HTML)';
        btnToggleHtml.classList.remove('btn-primary');
        isShowingSourceCode = false;
      }
    });
  }
}

// --- LOGICA DE BLOG (TAB 1) ---

async function refreshBlogList() {
  if (!postsListContainer) return;
  postsListContainer.innerHTML = '';

  try {
    const posts = await db.getPosts();
    if (posts.length === 0) {
      postsListContainer.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 20px;">No hay lecturas registradas.</p>';
      return;
    }

    posts.forEach(post => {
      const item = document.createElement('div');
      item.classList.add('admin-list-item');
      item.innerHTML = `
        <div class="item-info">
          <h4>${post.title}</h4>
          <p>📅 ${post.date} | Categoria: <strong>${post.category}</strong> | Autor: ${post.author || 'Admin'}</p>
        </div>
        <div class="item-actions">
          <button class="btn btn-secondary btn-sm edit-post-btn" data-id="${post.id}">Editar</button>
          <button class="btn btn-danger btn-sm delete-post-btn" data-id="${post.id}">Eliminar</button>
        </div>
      `;

      // Eventos de botones
      item.querySelector('.edit-post-btn').addEventListener('click', () => editPost(post));
      item.querySelector('.delete-post-btn').addEventListener('click', () => deletePost(post.id));

      postsListContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Error obteniendo posts:", err);
  }
}

// Enviar Formulario de Blog
if (blogForm) {
  blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = postIdInput.value;
    const title = postTitleInput.value.trim();
    const category = postCategoryInput.value;
    const date = postDateInput.value;
    const author = postAuthorInput.value.trim() || 'Administrador';
    const excerpt = postExcerptInput.value.trim();
    
    // Obtener contenido según el modo activo
    let content = '';
    if (isShowingSourceCode) {
      content = htmlEditorTextarea.value;
    } else if (quillInstance) {
      content = quillInstance.root.innerHTML;
    }

    if (!content || content === '<p><br></p>') {
      showToast('Por favor escribe algo de contenido para el artículo.', 'error');
      return;
    }

    const postData = { id, title, category, date, author, excerpt, content };

    try {
      await db.savePost(postData);
      showToast(id ? 'Publicación actualizada correctamente.' : 'Publicación creada con éxito.', 'success');
      resetBlogForm();
      await refreshBlogList();
    } catch (err) {
      console.error("Error guardando post:", err);
      showToast('Error al guardar el artículo.', 'error');
    }
  });
}

// Editar Publicación (cargar en formulario)
function editPost(post) {
  // Asegurarnos de estar en modo visual al editar
  if (isShowingSourceCode && btnToggleHtml) {
    btnToggleHtml.click(); 
  }

  postIdInput.value = post.id;
  postTitleInput.value = post.title;
  postCategoryInput.value = post.category || 'Avisos';
  postDateInput.value = post.date;
  postAuthorInput.value = post.author || '';
  postExcerptInput.value = post.excerpt || '';
  
  if (quillInstance) {
    quillInstance.root.innerHTML = post.content || '';
  }
  if (htmlEditorTextarea) {
    htmlEditorTextarea.value = post.content || '';
  }

  if (formBlogTitle) formBlogTitle.textContent = '📝 Editar Publicación';
  if (btnSavePost) btnSavePost.textContent = 'Actualizar Publicación';
  
  // Hacer scroll suave hacia el formulario
  blogForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Eliminar Publicación
async function deletePost(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta publicación del blog? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    await db.deletePost(id);
    showToast('Publicación eliminada correctamente.', 'success');
    await refreshBlogList();
    
    // Si estábamos editando la publicación eliminada, limpiamos el formulario
    if (postIdInput.value === id) {
      resetBlogForm();
    }
  } catch (err) {
    console.error("Error eliminando post:", err);
    showToast('No se pudo eliminar la publicación.', 'error');
  }
}

// Resetear Formulario de Blog
function resetBlogForm() {
  if (blogForm) blogForm.reset();
  if (postIdInput) postIdInput.value = '';
  
  if (quillInstance) {
    quillInstance.root.innerHTML = '';
  }
  if (htmlEditorTextarea) {
    htmlEditorTextarea.value = '';
  }

  // Si está el editor de código activo, devolver a visual
  if (isShowingSourceCode && btnToggleHtml) {
    btnToggleHtml.click();
  }

  // Poner fecha de hoy por defecto
  const today = new Date();
  if (postDateInput) {
    postDateInput.value = today.toISOString().split('T')[0];
  }

  if (formBlogTitle) formBlogTitle.textContent = '✍️ Crear Nueva Publicación';
  if (btnSavePost) btnSavePost.textContent = 'Guardar Publicación';
}

if (btnClearPost) {
  btnClearPost.addEventListener('click', resetBlogForm);
}


// --- LOGICA DE CALENDARIO (TAB 2) ---

// Helpers para actualizar el estado visual de los archivos con opción de Quitar
function updateAttachmentStatus(isExisting = false) {
  if (!attachmentStatus) return;
  if (currentAttachment.name) {
    const label = isExisting ? 'Archivo existente' : 'Archivo seleccionado';
    attachmentStatus.innerHTML = `${label}: ${currentAttachment.name} <a href="#" id="remove-attachment-btn" style="color: var(--danger); margin-left: 8px; font-weight: normal; text-decoration: underline;">Quitar</a>`;
    attachmentStatus.style.display = 'block';
    
    const removeBtn = document.getElementById('remove-attachment-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentAttachment = { name: '', data: '' };
        attachmentStatus.style.display = 'none';
        if (eventAttachmentInput) eventAttachmentInput.value = '';
      });
    }
  } else {
    attachmentStatus.style.display = 'none';
  }
}

function updateQuizStatus(isExisting = false) {
  if (!quizStatus) return;
  if (currentQuiz.name) {
    const label = isExisting ? 'Cuestionario existente' : 'Cuestionario seleccionado';
    quizStatus.innerHTML = `${label}: ${currentQuiz.name} <a href="#" id="remove-quiz-btn" style="color: var(--danger); margin-left: 8px; font-weight: normal; text-decoration: underline;">Quitar</a>`;
    quizStatus.style.display = 'block';
    
    const removeBtn = document.getElementById('remove-quiz-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentQuiz = { name: '', data: '' };
        quizStatus.style.display = 'none';
        if (eventQuizInput) eventQuizInput.value = '';
      });
    }
  } else {
    quizStatus.style.display = 'none';
  }
}

// Configurar escuchadores para la subida de archivos
if (eventAttachmentInput) {
  eventAttachmentInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      currentAttachment = { name: '', data: '' };
      if (attachmentStatus) attachmentStatus.style.display = 'none';
      return;
    }
    
    // Validar tamaño máximo de 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('El archivo supera el límite permitido de 5MB.', 'error');
      eventAttachmentInput.value = '';
      currentAttachment = { name: '', data: '' };
      if (attachmentStatus) attachmentStatus.style.display = 'none';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      currentAttachment = {
        name: file.name,
        data: evt.target.result
      };
      updateAttachmentStatus(false);
    };
    reader.onerror = function() {
      showToast('Error al leer el archivo.', 'error');
      eventAttachmentInput.value = '';
      currentAttachment = { name: '', data: '' };
      if (attachmentStatus) attachmentStatus.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
}

if (eventQuizInput) {
  eventQuizInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      currentQuiz = { name: '', data: '' };
      if (quizStatus) quizStatus.style.display = 'none';
      return;
    }
    
    // Validar tamaño máximo de 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('El archivo supera el límite permitido de 5MB.', 'error');
      eventQuizInput.value = '';
      currentQuiz = { name: '', data: '' };
      if (quizStatus) quizStatus.style.display = 'none';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      currentQuiz = {
        name: file.name,
        data: evt.target.result
      };
      updateQuizStatus(false);
    };
    reader.onerror = function() {
      showToast('Error al leer el cuestionario de práctica.', 'error');
      eventQuizInput.value = '';
      currentQuiz = { name: '', data: '' };
      if (quizStatus) quizStatus.style.display = 'none';
    };
    reader.readAsText(file);
  });
}

const friendlySubjects = {
  lenguaje: "📖 Lenguaje",
  science: "🔬 Science",
  math: "🔢 Math",
  musica: "🎵 Música",
  ingles: "🇬🇧 Inglés",
  ef: "🏃🏽 Educación Física",
  religion: "🕊️ Religión",
  consejo: "🤝 Consejo de Curso",
  tecnologia: "💻 Tecnología",
  arte: "🎨 Arte"
};

async function refreshEventList() {
  if (!eventsListContainer) return;
  eventsListContainer.innerHTML = '';

  try {
    const events = await db.getEvents();
    if (events.length === 0) {
      eventsListContainer.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 20px;">No hay actividades programadas.</p>';
      return;
    }

    events.forEach(ev => {
      const item = document.createElement('div');
      item.classList.add('admin-list-item');
      
      const subjectLabel = ev.subject ? friendlySubjects[ev.subject] || ev.subject : 'Actividad General';
      
      item.innerHTML = `
        <div class="item-info">
          <h4>${ev.title}</h4>
          <p>📅 ${ev.date} | Asignatura: <strong>${subjectLabel}</strong> | ${ev.description.substring(0, 80)}${ev.description.length > 80 ? '...' : ''}</p>
        </div>
        <div class="item-actions">
          <button class="btn btn-secondary btn-sm edit-event-btn" data-id="${ev.id}">Editar</button>
          <button class="btn btn-danger btn-sm delete-event-btn" data-id="${ev.id}">Eliminar</button>
        </div>
      `;

      // Eventos de botones
      item.querySelector('.edit-event-btn').addEventListener('click', () => editEvent(ev));
      item.querySelector('.delete-event-btn').addEventListener('click', () => deleteEvent(ev.id));

      eventsListContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Error obteniendo eventos:", err);
  }
}

// Enviar Formulario de Calendario
if (eventForm) {
  eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = eventIdInput.value;
    const title = eventTitleInput.value.trim();
    const subject = eventSubjectInput.value;
    const date = eventDateInput.value;
    const description = eventDescriptionInput.value.trim();

    const eventData = { 
      id, 
      title, 
      date, 
      description, 
      subject,
      attachment_name: currentAttachment.name,
      attachment_data: currentAttachment.data,
      quiz_name: currentQuiz.name,
      quiz_data: currentQuiz.data
    };

    try {
      await db.saveEvent(eventData);
      showToast(id ? 'Actividad actualizada con éxito.' : 'Nueva actividad programada.', 'success');
      resetEventForm();
      await refreshEventList();
    } catch (err) {
      console.error("Error guardando evento:", err);
      showToast('Error al guardar la actividad.', 'error');
    }
  });
}

// Editar Evento (cargar en formulario)
function editEvent(ev) {
  eventIdInput.value = ev.id;
  eventTitleInput.value = ev.title;
  if (eventSubjectInput) {
    eventSubjectInput.value = ev.subject || '';
  }
  eventDateInput.value = ev.date;
  eventDescriptionInput.value = ev.description;

  // Cargar estado de adjuntos si existen
  currentAttachment = {
    name: ev.attachment_name || '',
    data: ev.attachment_data || ''
  };
  currentQuiz = {
    name: ev.quiz_name || '',
    data: ev.quiz_data || ''
  };

  updateAttachmentStatus(true);
  updateQuizStatus(true);

  if (eventAttachmentInput) eventAttachmentInput.value = '';
  if (eventQuizInput) eventQuizInput.value = '';

  if (formEventTitle) formEventTitle.textContent = '🗓️ Editar Actividad';
  if (btnSaveEvent) btnSaveEvent.textContent = 'Actualizar Actividad';

  // Desplazar al formulario
  eventForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Eliminar Evento
async function deleteEvent(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta actividad del calendario?')) {
    return;
  }

  try {
    await db.deleteEvent(id);
    showToast('Actividad eliminada correctamente del calendario.', 'success');
    await refreshEventList();

    // Si estábamos editando la actividad eliminada, limpiamos el formulario
    if (eventIdInput.value === id) {
      resetEventForm();
    }
  } catch (err) {
    console.error("Error al eliminar evento:", err);
    showToast('No se pudo eliminar la actividad.', 'error');
  }
}

// Resetear Formulario de Evento
function resetEventForm() {
  if (eventForm) eventForm.reset();
  if (eventIdInput) eventIdInput.value = '';
  if (eventSubjectInput) eventSubjectInput.value = '';

  // Limpiar variables de archivos y UI de estado
  currentAttachment = { name: '', data: '' };
  currentQuiz = { name: '', data: '' };

  if (eventAttachmentInput) eventAttachmentInput.value = '';
  if (eventQuizInput) eventQuizInput.value = '';

  if (attachmentStatus) {
    attachmentStatus.textContent = '';
    attachmentStatus.style.display = 'none';
  }
  if (quizStatus) {
    quizStatus.textContent = '';
    quizStatus.style.display = 'none';
  }

  const today = new Date();
  if (eventDateInput) {
    eventDateInput.value = today.toISOString().split('T')[0];
  }

  if (formEventTitle) formEventTitle.textContent = '🗓️ Programar Nueva Actividad';
  if (btnSaveEvent) btnSaveEvent.textContent = 'Programar Actividad';
}

if (btnClearEvent) {
  btnClearEvent.addEventListener('click', resetEventForm);
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

// --- LOGICA DE HORARIO (TAB 3) ---

const dayNames = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes"
};

async function refreshScheduleList() {
  if (!scheduleListContainer) return;
  scheduleListContainer.innerHTML = '';

  try {
    const schedule = await db.getSchedule();
    if (schedule.length === 0) {
      scheduleListContainer.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 20px;">No hay bloques de horario registrados.</p>';
      return;
    }

    schedule.forEach(item => {
      const div = document.createElement('div');
      div.classList.add('admin-list-item');
      
      const dayName = dayNames[item.day_of_week] || `Día ${item.day_of_week}`;
      const subjectLabel = friendlySubjects[item.subject] || item.subject;

      div.innerHTML = `
        <div class="item-info">
          <h4>${subjectLabel} (${dayName})</h4>
          <p>⏰ ${item.start_time} - ${item.end_time} | Profesor: <strong>${item.teacher || 'No asignado'}</strong> ${item.notes ? `| Notas: <em>${item.notes}</em>` : ''}</p>
        </div>
        <div class="item-actions">
          <button class="btn btn-secondary btn-sm edit-schedule-btn" data-id="${item.id}">Editar</button>
          <button class="btn btn-danger btn-sm delete-schedule-btn" data-id="${item.id}">Eliminar</button>
        </div>
      `;

      div.querySelector('.edit-schedule-btn').addEventListener('click', () => editScheduleItem(item));
      div.querySelector('.delete-schedule-btn').addEventListener('click', () => deleteScheduleItem(item.id));

      scheduleListContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Error obteniendo listado de horario:", err);
  }
}

function editScheduleItem(item) {
  if (scheduleIdInput) scheduleIdInput.value = item.id;
  if (scheduleDayInput) scheduleDayInput.value = item.day_of_week;
  if (scheduleStartTimeInput) scheduleStartTimeInput.value = item.start_time;
  if (scheduleEndTimeInput) scheduleEndTimeInput.value = item.end_time;
  if (scheduleSubjectInput) scheduleSubjectInput.value = item.subject;
  if (scheduleTeacherInput) scheduleTeacherInput.value = item.teacher || '';
  if (scheduleNotesInput) scheduleNotesInput.value = item.notes || '';

  if (formScheduleTitle) formScheduleTitle.textContent = '📝 Editar Bloque de Horario';
  if (btnSaveSchedule) btnSaveSchedule.textContent = 'Actualizar Bloque';
}

function resetScheduleForm() {
  if (scheduleIdInput) scheduleIdInput.value = '';
  if (scheduleDayInput) scheduleDayInput.value = '';
  if (scheduleStartTimeInput) scheduleStartTimeInput.value = '';
  if (scheduleEndTimeInput) scheduleEndTimeInput.value = '';
  if (scheduleSubjectInput) scheduleSubjectInput.value = '';
  if (scheduleTeacherInput) scheduleTeacherInput.value = '';
  if (scheduleNotesInput) scheduleNotesInput.value = '';

  if (formScheduleTitle) formScheduleTitle.textContent = '🕒 Crear Bloque de Horario';
  if (btnSaveSchedule) btnSaveSchedule.textContent = 'Guardar Bloque';
}

if (btnClearSchedule) {
  btnClearSchedule.addEventListener('click', resetScheduleForm);
}

async function handleScheduleFormSubmit(e) {
  e.preventDefault();

  const id = scheduleIdInput.value;
  const day_of_week = parseInt(scheduleDayInput.value, 10);
  const start_time = scheduleStartTimeInput.value;
  const end_time = scheduleEndTimeInput.value;
  const subject = scheduleSubjectInput.value;
  const teacher = scheduleTeacherInput.value.trim();
  const notes = scheduleNotesInput.value.trim();

  if (!day_of_week || !start_time || !end_time || !subject) {
    showToast('Por favor, rellene todos los campos obligatorios.', 'error');
    return;
  }

  const itemData = {
    day_of_week,
    start_time,
    end_time,
    subject,
    teacher,
    notes
  };

  if (id) {
    itemData.id = id;
  }

  try {
    await db.saveScheduleItem(itemData);
    showToast('Bloque de horario guardado con éxito.', 'success');
    resetScheduleForm();
    await refreshScheduleList();
  } catch (err) {
    console.error("Error al guardar bloque de horario:", err);
    showToast(err.message || 'Error al guardar el bloque de horario.', 'error');
  }
}

async function deleteScheduleItem(id) {
  if (!confirm('¿Está seguro de que desea eliminar este bloque de horario?')) return;

  try {
    await db.deleteScheduleItem(id);
    showToast('Bloque de horario eliminado con éxito.', 'success');
    await refreshScheduleList();
  } catch (err) {
    console.error("Error al eliminar bloque de horario:", err);
    showToast(err.message || 'Error al eliminar el bloque de horario.', 'error');
  }
}

// Iniciar
document.addEventListener('DOMContentLoaded', initAdmin);
