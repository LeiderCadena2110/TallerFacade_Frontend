/* ═══════════════════════════════════════
   auth.js — Login, registro y logout
   ═══════════════════════════════════════ */

/* Cambia entre las pestañas Login / Registro */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1))
  );
  document.getElementById('loginForm').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

/* Login con el backend */
async function login() {
  const pacienteId = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!pacienteId || !password) {
    showToast('⚠ Completa todos los campos');
    return;
  }

  try {
    const data = await API.login(pacienteId);

    /* Guardar datos del usuario */
    localStorage.setItem('usuario', JSON.stringify(data));

    /* Actualizar nombre en la UI */
    const nombre = data?.nombreCompleto || 'Paciente';
    document.getElementById('sidebarUserName').textContent  = nombre;
    document.getElementById('sidebarUserInitials').textContent = iniciales(nombre);
    document.getElementById('dashboardGreeting').textContent   = `Buenos días, ${nombre.split(' ')[0]} 👋`;

    /* Mostrar app */
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('appPage').classList.remove('hidden');
    navigate('dashboard');

  } catch (err) {
    showToast('⚠ ' + err.message);
  }
}

/* Registro con el backend */
async function register() {
  const nombre    = document.getElementById('regNombre').value.trim();
  const documento = document.getElementById('regDocumento').value.trim();
  const email     = document.getElementById('regEmail').value.trim();
  const password  = document.getElementById('regPassword').value;
  const confirm   = document.getElementById('regConfirm').value;

  if (!nombre || !documento || !email || !password) {
    showToast('⚠ Completa todos los campos');
    return;
  }
  if (password !== confirm) {
    showToast('⚠ Las contraseñas no coinciden');
    return;
  }

  try {
    const data = await API.register({ nombre, documento, email, password });
    showToast(`✓ Cuenta creada. Tu ID de paciente es ${data.id}`);
    switchAuthTab('login');
  } catch (err) {
    showToast('⚠ ' + err.message);
  }
}

/* Cerrar sesión */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  document.getElementById('appPage').classList.add('hidden');
  document.getElementById('authPage').classList.remove('hidden');
}

/* Comprobar sesión activa al cargar la página */
function checkSession() {
  const token = localStorage.getItem('token');
  if (token) {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nombre  = usuario?.nombre || 'Paciente';
    document.getElementById('sidebarUserName').textContent     = nombre;
    document.getElementById('sidebarUserInitials').textContent = iniciales(nombre);
    document.getElementById('dashboardGreeting').textContent   = `Buenos días, ${nombre.split(' ')[0]} 👋`;
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('appPage').classList.remove('hidden');
    navigate('dashboard');
  }
}

/* Helper: obtener iniciales */
function iniciales(nombre) {
  return nombre.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}
