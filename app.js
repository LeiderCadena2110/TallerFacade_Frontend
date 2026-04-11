/* ═══════════════════════════════════════
   app.js — Navegación, tabs, toast y utils
   ═══════════════════════════════════════ */

/* Mapa de páginas → índice del nav-item */
const PAGE_NAV_INDEX = {
  dashboard:     0,
  appointments:  1,
  schedule:      2,
  history:       3,
  labs:          4,
  prescriptions: 5
};

/* ── Navegación entre páginas ─────────── */
function navigate(page) {
  /* Ocultar todas las páginas */
  document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));

  /* Mostrar la página destino */
  const el = document.getElementById('page-' + page);
  if (el) el.classList.remove('hidden');

  /* Actualizar estado activo en el sidebar */
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const items = document.querySelectorAll('.nav-item');
  const idx   = PAGE_NAV_INDEX[page];
  if (items[idx]) items[idx].classList.add('active');

  window.scrollTo(0, 0);

  /* Cargar datos de la página si es necesario */
  loadPageData(page);
}

/* Carga de datos según la página activa */
async function loadPageData(page) {
  try {
    switch (page) {
      case 'dashboard':    await loadDashboard();     break;
      case 'appointments': await loadCitas();         break;
      case 'history':      await loadHistoria();      break;
      case 'labs':         await loadLaboratorios();  break;
      case 'prescriptions':await loadPrescripciones();break;
      case 'schedule':     await loadScheduleForm();  break;
    }
  } catch (err) {
    console.error('Error cargando página:', err);
  }
}

/* ── Tabs internos (historia clínica) ─── */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  const el = document.getElementById('tab-' + name);
  if (el) el.classList.add('active');
}

/* ── Toast ────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

/* ── Modal ────────────────────────────── */
function closeModal() {
  document.getElementById('confirmModal').classList.add('hidden');
}

/* ── Formato de fechas ────────────────── */
function formatFecha(dateStr) {
  return new Date(dateStr + 'T00:00').toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/* ── Inicialización ───────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  /* Fecha mínima en el selector de citas */
  const dateInput = document.getElementById('dateInput');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

  /* Verificar sesión guardada */
  checkSession();
});
