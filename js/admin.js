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
const tabBlogContent = document.getElementById('tab-blog-content');
const tabCalendarContent = document.getElementById('tab-calendar-content');

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
  if (tabBlogBtn && tabCalendarBtn) {
    tabBlogBtn.addEventListener('click', () => switchTab('blog'));
    tabCalendarBtn.addEventListener('click', () => switchTab('calendar'));
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

  // Inicializar Editor Quill si no existe
  initQuillEditor();

  // Cargar las fechas por defecto para hoy
  resetBlogForm();
  resetEventForm();

  // Cargar Listados
  await refreshBlogList();
  await refreshEventList();
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
  if (tab === 'blog') {
    tabBlogBtn.classList.add('active');
    tabCalendarBtn.classList.remove('active');
    tabBlogContent.classList.add('active');
    tabCalendarContent.classList.remove('active');
  } else {
    tabBlogBtn.classList.remove('active');
    tabCalendarBtn.classList.add('active');
    tabBlogContent.classList.remove('active');
    tabCalendarContent.classList.add('active');
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

    const eventData = { id, title, date, description, subject };

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

// Iniciar
document.addEventListener('DOMContentLoaded', initAdmin);
