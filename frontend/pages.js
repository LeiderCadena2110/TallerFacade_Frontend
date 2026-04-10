/* ═══════════════════════════════════════
   pages.js — Lógica y renderizado de cada
   página conectada al backend
   ═══════════════════════════════════════ */

/* ══ DASHBOARD ══════════════════════════ */
async function loadDashboard() {
  try {
    const data = await API.getDashboard();

    document.getElementById('statCitas').textContent          = data.proximasCitas     ?? '—';
    document.getElementById('statPrescripciones').textContent = data.prescripcionesActivas ?? '—';
    document.getElementById('statResultados').textContent     = data.resultadosPendientes  ?? '—';
    document.getElementById('statVisitas').textContent        = data.visitasEsteAnio       ?? '—';

    renderProximasCitas(data.proximasCitasList  || []);
    renderUltimosResultados(data.ultimosResultados || []);

  } catch (err) {
    console.warn('Dashboard: usando datos de ejemplo', err);
  }
}

/* ══ CITAS ══════════════════════════════ */
async function loadCitas() {
  try {
    const citas = await API.getCitas();
    renderCitas(citas);
  } catch (err) {
    console.warn('Citas: usando datos de ejemplo', err);
  }
}

function renderProximasCitas(citas) {
  const container = document.getElementById('proximasCitasList');
  if (!container) return;
  if (!citas.length) { container.innerHTML = '<p style="color:var(--muted);font-size:.875rem">No hay citas próximas.</p>'; return; }

  container.innerHTML = citas.map(c => `
    <div class="appt-item">
      <div class="appt-date">
        <div class="day">${new Date(c.fecha).getDate()}</div>
        <div class="month">${new Date(c.fecha).toLocaleString('es', {month:'short'})}</div>
      </div>
      <div class="appt-divider"></div>
      <div class="appt-info">
        <strong>${c.medico} – ${c.especialidad}</strong>
        <span>${c.hora} · ${c.tipo}</span>
      </div>
      <span class="badge ${badgeClass(c.estado)}">${c.estado}</span>
    </div>
  `).join('');
}

function renderCitas(citas) {
  const container = document.getElementById('allCitasList');
  if (!container) return;
  if (!citas.length) { container.innerHTML = '<p style="color:var(--muted);font-size:.875rem">No tienes citas registradas.</p>'; return; }

  container.innerHTML = citas.map(c => `
    <div class="appt-item">
      <div class="appt-date">
        <div class="day">${new Date(c.fecha).getDate()}</div>
        <div class="month">${new Date(c.fecha).toLocaleString('es', {month:'short'})}</div>
      </div>
      <div class="appt-divider"></div>
      <div class="appt-info">
        <strong>${c.medico} – ${c.especialidad}</strong>
        <span>${c.hora} · ${c.tipo}${c.consultorio ? ' · ' + c.consultorio : ''}</span>
      </div>
      <span class="badge ${badgeClass(c.estado)}">${c.estado}</span>
    </div>
  `).join('');
}

/* ══ AGENDAR CITA ═══════════════════════ */
let selectedTime = null;

async function loadScheduleForm() {
  try {
    const especialidades = await API.getEspecialidades();
    const select = document.getElementById('specialtySelect');
    select.innerHTML = '<option value="">Selecciona especialidad…</option>';
    especialidades.forEach(e => {
      select.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
    });
  } catch (err) {
    console.warn('Schedule: no se pudo cargar especialidades', err);
  }
}

async function filterDoctors() {
  const especialidadId = document.getElementById('specialtySelect').value;
  if (!especialidadId) return;

  try {
    const medicos = await API.getMedicosPorEspecialidad(especialidadId);
    const list = document.getElementById('doctorList');
    list.innerHTML = medicos.map((m, i) => `
      <div class="doctor-option ${i === 0 ? 'selected' : ''}" onclick="selectDoc(this)" data-id="${m.id}">
        <div class="avatar" style="background:var(--accent-bg);color:var(--accent-dark)">${iniciales(m.nombre)}</div>
        <div class="doc-info">
          <strong>${m.nombre}</strong>
          <span>${m.especialidad} · ${'★'.repeat(m.rating)}${'☆'.repeat(5 - m.rating)}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.warn('Médicos: usando lista estática', err);
  }
}

async function onDateOrDoctorChange() {
  const fecha    = document.getElementById('dateInput').value;
  const docEl    = document.querySelector('.doctor-option.selected');
  const medicoId = docEl?.dataset?.id;

  if (!fecha || !medicoId) return;

  try {
    const horarios = await API.getHorariosDisponibles(medicoId, fecha);
    const slotsEl  = document.getElementById('timeSlotsGrid');
    slotsEl.innerHTML = horarios.map(h => `
      <div class="time-slot ${h.disponible ? '' : 'disabled'}" onclick="${h.disponible ? 'selectTime(this)' : ''}">${h.hora}</div>
    `).join('');
  } catch (err) {
    console.warn('Horarios: usando slots estáticos', err);
  }
}

function selectDoc(el) {
  document.querySelectorAll('.doctor-option').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  onDateOrDoctorChange();
}

function selectTime(el) {
  document.querySelectorAll('.time-slot').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  selectedTime = el.textContent;
}

function confirmAppointment() {
  const fecha = document.getElementById('dateInput').value;
  if (!fecha)        { showToast('⚠ Selecciona una fecha');   return; }
  if (!selectedTime) { showToast('⚠ Selecciona un horario'); return; }

  const docEl    = document.querySelector('.doctor-option.selected .doc-info strong');
  const medico   = docEl?.textContent || 'Médico';

  document.getElementById('confirmDate').textContent   = formatFecha(fecha);
  document.getElementById('confirmTime').textContent   = selectedTime;
  document.getElementById('confirmMedico').textContent = medico;
  document.getElementById('confirmModal').classList.remove('hidden');
}

async function bookAppointment() {
  const fecha      = document.getElementById('dateInput').value;
  const docEl      = document.querySelector('.doctor-option.selected');
  const medicoId   = docEl?.dataset?.id;
  const tipo       = document.getElementById('tipoConsulta')?.value || 'Primera consulta';
  const motivo     = document.getElementById('motivoConsulta')?.value || '';

  try {
    await API.crearCita({ fecha, hora: selectedTime, medicoId, tipo, motivo });
    showToast('✓ ¡Cita agendada exitosamente!');
  } catch (err) {
    showToast('⚠ ' + err.message);
  }

  closeModal();
  setTimeout(() => navigate('appointments'), 1200);
}

/* ══ HISTORIA CLÍNICA ═══════════════════ */
async function loadHistoria() {
  try {
    const [consultas, prescripciones, laboratorios] = await Promise.all([
      API.getConsultas(),
      API.getPrescripciones(),
      API.getLaboratorios()
    ]);
    renderConsultas(consultas);
    renderPrescripcionesTab(prescripciones);
    renderLaboratoriosTab(laboratorios);
  } catch (err) {
    console.warn('Historia: usando datos de ejemplo', err);
  }
}

function renderConsultas(consultas) {
  const el = document.getElementById('tab-consultas');
  if (!el || !consultas.length) return;
  el.innerHTML = consultas.map(c => `
    <div class="record-item">
      <div class="record-date">${c.fecha}</div>
      <div class="record-body">
        <h4>${c.medico} · ${c.especialidad}</h4>
        <p>${c.notas}</p>
        <div style="margin-top:.5rem;display:flex;gap:.5rem;flex-wrap:wrap">
          <span class="badge badge-blue">${c.especialidad}</span>
          <span class="badge badge-green">Completada</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderPrescripcionesTab(prescripciones) {
  const el = document.getElementById('tab-prescripciones');
  if (!el || !prescripciones.length) return;
  el.innerHTML = prescripciones.map(p => `
    <div class="record-item">
      <div class="record-date">${p.fecha}</div>
      <div class="record-body">
        <h4>${p.medicamento} ${p.dosis}</h4>
        <p>${p.instrucciones}<br/>Prescrito por: ${p.medico}</p>
        <span class="badge ${p.activo ? 'badge-green' : 'badge-red'}" style="margin-top:.5rem">
          ${p.activo ? 'Activo' : 'Finalizado'}
        </span>
      </div>
    </div>
  `).join('');
}

function renderLaboratoriosTab(labs) {
  const el = document.getElementById('tab-laboratorios-h');
  if (!el || !labs.length) return;
  el.innerHTML = labs.map(l => `
    <div class="record-item">
      <div class="record-date">${l.fecha}</div>
      <div class="record-body">
        <h4>${l.nombre}</h4>
        <p>${l.resumen}</p>
        <span class="badge ${l.alerta ? 'badge-red' : 'badge-green'}" style="margin-top:.5rem">
          ${l.alerta ? 'Valores fuera de rango' : 'Valores normales'}
        </span>
      </div>
    </div>
  `).join('');
}

/* ══ LABORATORIOS ═══════════════════════ */
async function loadLaboratorios() {
  try {
    const labs = await API.getLaboratorios();
    renderLabResults(labs);
  } catch (err) {
    console.warn('Laboratorios: usando datos de ejemplo', err);
  }
}

function renderLabResults(labs) {
  const container = document.getElementById('labResultsContainer');
  if (!container || !labs.length) return;

  container.innerHTML = labs.map(l => `
    <div class="card" style="margin-bottom:1.5rem;border-left:4px solid ${l.alerta ? 'var(--red)' : 'var(--accent)'}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <div>
          <h3 style="font-size:1rem;font-weight:600">${l.nombre}</h3>
          <span style="font-size:.8rem;color:var(--muted)">${l.fecha} · Solicitado por ${l.medico}</span>
        </div>
        <span class="badge ${l.alerta ? 'badge-red' : 'badge-green'}">${l.resumenEstado}</span>
      </div>
      <table class="lab-table">
        <thead>
          <tr><th>Examen</th><th>Resultado</th><th>Referencia</th><th>Unidad</th><th>Estado</th></tr>
        </thead>
        <tbody>
          ${l.resultados.map(r => `
            <tr>
              <td>${r.nombre}</td>
              <td><${r.alerta ? 'strong' : 'span'}>${r.valor}</${r.alerta ? 'strong' : 'span'}></td>
              <td>${r.referencia}</td>
              <td>${r.unidad}</td>
              <td>
                <div class="lab-indicator">
                  <div class="indicator-dot ${indicatorClass(r.estado)}"></div>
                  <span style="color:${indicatorColor(r.estado)};${r.alerta ? 'font-weight:500' : ''}">
                    ${r.estado} ${r.flecha || ''}
                  </span>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');
}

/* ══ PRESCRIPCIONES ══════════════════════ */
async function loadPrescripciones() {
  try {
    const data = await API.getPrescripciones();
    renderPrescripcionesPagina(data);
  } catch (err) {
    console.warn('Prescripciones: usando datos de ejemplo', err);
  }
}

function renderPrescripcionesPagina(lista) {
  const activas   = lista.filter(p => p.activo);
  const historial = lista.filter(p => !p.activo);

  const badgeCount = document.getElementById('prescripcionesCount');
  if (badgeCount) badgeCount.textContent = `${activas.length} activo${activas.length !== 1 ? 's' : ''}`;

  const activasEl = document.getElementById('prescripcionesActivas');
  if (activasEl) activasEl.innerHTML = activas.map(p => `
    <div style="border:1.5px solid var(--green);border-radius:var(--radius-sm);padding:1rem 1.25rem;background:#f0fdf4">
      <div style="display:flex;align-items:flex-start;justify-content:space-between">
        <div>
          <h4 style="font-size:.95rem;font-weight:600">${p.medicamento} ${p.dosis}</h4>
          <p style="font-size:.825rem;color:var(--muted);margin-top:.25rem">${p.frecuencia} · ${p.via}</p>
          <p style="font-size:.8rem;color:var(--muted);margin-top:.15rem">${p.tipo} · ${p.medico} · ${p.fecha}</p>
        </div>
        <span class="badge badge-green">Activo</span>
      </div>
    </div>
  `).join('');

  const historialEl = document.getElementById('prescripcionesHistorial');
  if (historialEl) historialEl.innerHTML = historial.map(p => `
    <div style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:.875rem 1.25rem">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <h4 style="font-size:.875rem">${p.medicamento} ${p.dosis}</h4>
          <p style="font-size:.775rem;color:var(--muted)">${p.frecuencia} · ${p.fecha} · ${p.medico}</p>
        </div>
        <span class="badge badge-red">Finalizado</span>
      </div>
    </div>
  `).join('');
}

/* ══ DASHBOARD — últimos resultados ══════ */
function renderUltimosResultados(resultados) {
  const tbody = document.getElementById('dashResultadosTbody');
  if (!tbody || !resultados.length) return;
  tbody.innerHTML = resultados.map(r => `
    <tr>
      <td>${r.nombre}</td>
      <td>${r.valor} ${r.unidad}</td>
      <td>${r.referencia}</td>
      <td>
        <div class="lab-indicator">
          <div class="indicator-dot ${indicatorClass(r.estado)}"></div>
          ${r.estado}
        </div>
      </td>
    </tr>
  `).join('');
}

/* ══ HELPERS ═════════════════════════════ */
function badgeClass(estado) {
  const map = {
    'Confirmada': 'badge-blue',
    'Pendiente':  'badge-yellow',
    'Realizada':  'badge-green',
    'Cancelada':  'badge-red'
  };
  return map[estado] || 'badge-blue';
}

function indicatorClass(estado) {
  if (estado === 'Normal') return 'indicator-normal';
  if (estado === 'Alto')   return 'indicator-high';
  if (estado === 'Bajo')   return 'indicator-low';
  return 'indicator-normal';
}

function indicatorColor(estado) {
  if (estado === 'Normal') return 'var(--green)';
  if (estado === 'Alto')   return 'var(--red)';
  if (estado === 'Bajo')   return 'var(--yellow)';
  return 'var(--green)';
}
