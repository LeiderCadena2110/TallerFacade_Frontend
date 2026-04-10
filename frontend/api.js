/* ═══════════════════════════════════════
   api.js — Configuración y llamadas al backend
   Cambia BASE_URL por la URL de tu backend
   ═══════════════════════════════════════ */

const API = {
  BASE_URL: 'http://localhost:8080/api',  // ← Cambia esto por tu URL en producción

  /* Cabeceras comunes */
  headers() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  /* ── Auth ─────────────────────────── */
  async login(email, password) {
    const res = await fetch(`${this.BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Credenciales incorrectas');
    return res.json(); // { token, usuario: { nombre, ... } }
  },

  async register(data) {
    const res = await fetch(`${this.BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al registrar');
    return res.json();
  },

  /* ── Citas ───────────────────────── */
  async getCitas() {
    const res = await fetch(`${this.BASE_URL}/citas`, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener citas');
    return res.json();
  },

  async crearCita(data) {
    const res = await fetch(`${this.BASE_URL}/citas`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear la cita');
    return res.json();
  },

  async cancelarCita(id) {
    const res = await fetch(`${this.BASE_URL}/citas/${id}`, {
      method: 'DELETE',
      headers: this.headers()
    });
    if (!res.ok) throw new Error('Error al cancelar la cita');
    return res.json();
  },

  /* ── Médicos / Especialidades ──────── */
  async getEspecialidades() {
    const res = await fetch(`${this.BASE_URL}/especialidades`, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener especialidades');
    return res.json();
  },

  async getMedicosPorEspecialidad(especialidadId) {
    const res = await fetch(`${this.BASE_URL}/medicos?especialidad=${especialidadId}`, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener médicos');
    return res.json();
  },

  async getHorariosDisponibles(medicoId, fecha) {
    const res = await fetch(`${this.BASE_URL}/medicos/${medicoId}/horarios?fecha=${fecha}`, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener horarios');
    return res.json();
  },

  /* ── Historia clínica ──────────────── */
  async getConsultas() {
    const res = await fetch(`${this.BASE_URL}/historia/consultas`, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener consultas');
    return res.json();
  },

  async getPrescripciones() {
    const res = await fetch(`${this.BASE_URL}/historia/prescripciones`, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener prescripciones');
    return res.json();
  },

  /* ── Laboratorios ──────────────────── */
  async getLaboratorios() {
    const res = await fetch(`${this.BASE_URL}/laboratorios`, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener laboratorios');
    return res.json();
  },

  /* ── Dashboard ─────────────────────── */
  async getDashboard() {
    const res = await fetch(`${this.BASE_URL}/dashboard`, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener dashboard');
    return res.json();
  }
};
