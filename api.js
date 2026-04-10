/* ═══════════════════════════════════════
   api.js — Configuración y llamadas al backend
   Se conecta al backend TallerFacade_Backend y normaliza respuestas
   ═══════════════════════════════════════ */

const API = {
  BASE_URL: window.BACKEND_URL || 'https://<tu-backend>.railway.app/api/clinica',

  /* Cabeceras comunes */
  headers() {
    return {
      'Content-Type': 'application/json'
    };
  },

  getPacienteId() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario?.id || null;
  },

  async login(pacienteId) {
    const res = await fetch(`${this.BASE_URL}/login`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ pacienteId })
    });
    if (!res.ok) throw new Error('Paciente no encontrado');
    return res.json();
  },

  async register(data) {
    const body = {
      nombreCompleto: data.nombre,
      numeroDocumento: data.documento,
      correoElectronico: data.email,
      telefono: data.telefono || '',
      listaAlergias: data.alergias || []
    };

    const res = await fetch(`${this.BASE_URL}/paciente`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Error al registrar paciente');
    return res.json();
  },

  async getHistoria() {
    const pacienteId = this.getPacienteId();
    if (!pacienteId) throw new Error('No se ha iniciado sesión');

    const res = await fetch(`${this.BASE_URL}/historia/${pacienteId}`, {
      headers: this.headers()
    });
    if (!res.ok) throw new Error('Error al obtener la historia clínica');
    return res.json();
  },

  normalizeCita(c) {
    const fechaObj = new Date(c.fechaHora);
    return {
      id: c.id,
      fecha: fechaObj.toISOString(),
      hora: fechaObj.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      medico: c.nombreMedico || '',
      especialidad: c.especialidad || '',
      tipo: c.tipo || 'Consulta',
      estado: c.estado || 'Confirmada',
      recordatorio: c.recordatorio || ''
    };
  },

  async getCitas() {
    const historia = await this.getHistoria();
    const citas = historia.citasPasadas || [];
    return citas
      .map(c => this.normalizeCita(c))
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  },

  async crearCita(data) {
    const fechaHora = `${data.fecha}T${data.hora}:00`;
    const body = {
      pacienteId: this.getPacienteId(),
      medicoId: data.medicoId,
      especialidad: data.especialidad,
      fechaHora
    };

    const res = await fetch(`${this.BASE_URL}/cita`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Error al crear la cita');
    return this.normalizeCita(await res.json());
  },

  async cancelarCita(id) {
    throw new Error('Cancelación de citas no está disponible en este backend');
  },

  async getEspecialidades() {
    const res = await fetch(`${this.BASE_URL}/medicos`, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener especialidades');
    const medicos = await res.json();
    const especialidades = medicos.map(m => ({ id: m.especialidad, nombre: m.especialidad }));
    const uniques = new Map(especialidades.map(e => [e.id, e]));
    return Array.from(uniques.values());
  },

  async getMedicosPorEspecialidad(especialidad) {
    const url = `${this.BASE_URL}/medicos${especialidad ? `?especialidad=${encodeURIComponent(especialidad)}` : ''}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error('Error al obtener médicos');
    const medicos = await res.json();
    return medicos.map(m => ({
      id: m.id,
      nombre: m.nombreCompleto,
      especialidad: m.especialidad,
      rating: m.rating || 4
    }));
  },

  async getHorariosDisponibles(medicoId, fecha) {
    const res = await fetch(`${this.BASE_URL}/disponibilidad?medicoId=${encodeURIComponent(medicoId)}&fecha=${encodeURIComponent(fecha)}`, {
      headers: this.headers()
    });
    if (!res.ok) throw new Error('Error al obtener horarios');
    const horarios = await res.json();
    return horarios.map(h => ({ hora: h, disponible: true }));
  },

  async getConsultas() {
    const historia = await this.getHistoria();
    return (historia.citasPasadas || []).map(c => ({
      fecha: new Date(c.fechaHora).toLocaleDateString('es'),
      medico: c.nombreMedico || '',
      especialidad: c.especialidad || '',
      notas: c.estado ? `Estado: ${c.estado}` : 'Consulta registrada'
    }));
  },

  async getPrescripciones() {
    const historia = await this.getHistoria();
    return (historia.prescripciones || []).flatMap(p => {
      const medicamento = p.medicamentos?.[0];
      return [{
        fecha: p.fechaEmision ? new Date(p.fechaEmision).toLocaleDateString('es') : '',
        medicamento: medicamento?.nombre || 'Medicamento',
        dosis: medicamento?.dosis || '',
        instrucciones: medicamento ? `${medicamento.frecuencia} por ${medicamento.duracion}` : 'Tomar según indicaciones',
        medico: p.medico || '',
        activo: true,
        frecuencia: medicamento?.frecuencia || '',
        via: 'Oral',
        tipo: 'Receta'
      }];
    });
  },

  async getLaboratorios() {
    const historia = await this.getHistoria();
    return (historia.resultadosLaboratorio || []).map(l => {
      const resultados = Object.values(l.resultados || {}).map(r => ({
        nombre: r.nombre,
        valor: r.valor,
        unidad: r.unidad,
        referencia: `${r.valorMinimo ?? '-'} - ${r.valorMaximo ?? '-'}`,
        estado: r.dentroRango ? 'Normal' : (r.valor > (r.valorMaximo ?? r.valor) ? 'Alto' : 'Bajo'),
        alerta: !r.dentroRango,
        flecha: !r.dentroRango ? (r.valor > (r.valorMaximo ?? r.valor) ? '↑' : '↓') : ''
      }));

      return {
        id: l.id,
        nombre: l.tipoExamen || 'Examen de laboratorio',
        fecha: l.fechaSolicitud ? new Date(l.fechaSolicitud).toLocaleDateString('es') : '',
        resumen: l.estado || '',
        alerta: l.estado && l.estado.toLowerCase() !== 'normal',
        resultados
      };
    });
  },

  async getDashboard() {
    const historia = await this.getHistoria();
    const ahora = new Date();
    const proximasCitas = (historia.citasPasadas || [])
      .map(c => ({ ...c, fechaHora: new Date(c.fechaHora) }))
      .filter(c => c.fechaHora > ahora)
      .sort((a, b) => a.fechaHora - b.fechaHora);

    const proximasCitasList = proximasCitas.slice(0, 4).map(c => ({
      fecha: c.fechaHora.toISOString(),
      hora: c.fechaHora.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      medico: c.nombreMedico || '',
      especialidad: c.especialidad || '',
      tipo: 'Consulta',
      estado: c.estado || 'Confirmada'
    }));

    const ultimosResultados = (historia.resultadosLaboratorio || [])
      .flatMap(l => Object.values(l.resultados || {}).map(r => ({
        nombre: r.nombre,
        valor: r.valor,
        unidad: r.unidad,
        referencia: `${r.valorMinimo ?? '-'} - ${r.valorMaximo ?? '-'}`,
        estado: r.dentroRango ? 'Normal' : (r.valor > (r.valorMaximo ?? r.valor) ? 'Alto' : 'Bajo')
      })))
      .slice(0, 4);

    return {
      proximasCitas: proximasCitas.length,
      prescripcionesActivas: (historia.prescripciones || []).length,
      resultadosPendientes: (historia.resultadosLaboratorio || []).length,
      visitasEsteAnio: (historia.citasPasadas || []).filter(c => new Date(c.fechaHora).getFullYear() === ahora.getFullYear()).length,
      proximasCitasList,
      ultimosResultados
    };
  }
};
