// Funciones puras (sin Firebase) usadas por las Cloud Functions. Tienen tests en tests/puro.test.js.
export const TZ = 'America/Argentina/Buenos_Aires';

// Hash de contraseña de la versión anterior de App8. Solo se usa para verificar
// cuentas viejas durante la migración; no se usa para cuentas nuevas.
export function hashPwdLegacy(p) {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (Math.imul(31, h) + p.charCodeAt(i)) | 0;
  return h.toString(36);
}

export const esInvitado = id => typeof id === 'string' && id.startsWith('inv_');
export const esPendiente = id => typeof id === 'string' && id.startsWith('l_');
// ID de una persona con cuenta real (no invitado, no perfil pendiente de vincular)
export const esUid = id => typeof id === 'string' && id.length > 0 && !esInvitado(id) && !esPendiente(id);

// Reemplaza un ID en todo un documento: valores de texto y nombres de campo.
export function deepReplace(valor, desde, hacia) {
  if (typeof valor === 'string') return valor === desde ? hacia : valor;
  if (Array.isArray(valor)) return valor.map(v => deepReplace(v, desde, hacia));
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    const out = {};
    for (const [k, v] of Object.entries(valor)) out[k === desde ? hacia : k] = deepReplace(v, desde, hacia);
    return out;
  }
  return valor;
}
export const cambio = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

export function parseHoras(txt) {
  const m = /(\d+)\s*h/i.exec(txt || '');
  return m ? Number(m[1]) : null;
}

export function cupoDeFormato(label) {
  const m = /(\d+)\s*vs\s*(\d+)/i.exec(label || '');
  return m ? Number(m[1]) + Number(m[2]) : 0;
}

// "Oscuro gano 4-3" | "Blanco gano 5-2" | "Empate 2-2"
export function parseResultadoLegacy(texto) {
  const m = /(\d+)\s*-\s*(\d+)/.exec(texto || '');
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  if (/^empate/i.test(texto)) return { golesO: a, golesB: b };
  if (/^blanco/i.test(texto)) return { golesO: b, golesB: a };
  return { golesO: a, golesB: b };
}

export function resultadoJugador(equipos, id, golesO, golesB) {
  if (!equipos) return 'jugado';
  const enO = (equipos.oscuro || []).includes(id), enB = (equipos.blanco || []).includes(id);
  if (!enO && !enB) return 'jugado';
  if (golesO === golesB) return 'empatado';
  return (enO && golesO > golesB) || (enB && golesB > golesO) ? 'ganado' : 'perdido';
}
export const puntosDe = r => (r === 'ganado' ? 3 : r === 'empatado' ? 1 : 0);
export const letraDe = r => (r === 'ganado' ? 'G' : r === 'empatado' ? 'E' : r === 'perdido' ? 'P' : '');
export const agregarRacha = (racha, r) => (((racha || '') + letraDe(r)).slice(-10));
export function rachaGanadora(racha) {
  let n = 0;
  for (let i = (racha || '').length - 1; i >= 0 && racha[i] === 'G'; i--) n++;
  return n;
}
export const rachaDeHistorial = historial => (historial || []).reduce((r, h) => agregarRacha(r, h.resultado), '');

export function statsVacias() {
  return { partidos: 0, goles: 0, amarillas: 0, mvps: 0, ganados: 0, empatados: 0, perdidos: 0, puntos: 0 };
}

// Más votos gana; empate se resuelve por goles del partido; si sigue, MVP compartido.
export function calcularMvps(mvpConteo, golesPorId) {
  const ids = Object.keys(mvpConteo || {});
  if (!ids.length) return [];
  const max = Math.max(...ids.map(i => mvpConteo[i]));
  const empatados = ids.filter(i => mvpConteo[i] === max);
  if (empatados.length === 1) return empatados;
  const g = i => (golesPorId && golesPorId[i]) || 0;
  const maxG = Math.max(...empatados.map(g));
  return empatados.filter(i => g(i) === maxG);
}

export function ranking(jugadores) {
  // jugadores: [{id, puntos, goles}] → { id: posición }
  const orden = [...jugadores].sort((a, b) => b.puntos - a.puntos || b.goles - a.goles || String(a.id).localeCompare(String(b.id)));
  return Object.fromEntries(orden.map((j, i) => [j.id, i + 1]));
}

// ---- Fechas en hora de Buenos Aires ----
const fmt = (opts, d) => new Intl.DateTimeFormat('es-AR', { timeZone: TZ, ...opts }).format(d);
export const diaDe = d => fmt({ weekday: 'long' }, d);
export const horaDe = d => fmt({ hour: '2-digit', minute: '2-digit', hour12: false }, d);
export const fechaLarga = d => fmt({ weekday: 'long', day: 'numeric', month: 'long' }, d);
export const fechaYHoraArg = (fecha, hora) => new Date(`${fecha}T${hora || '00:00'}:00-03:00`);

export function varsPartido(g, p, extra = {}) {
  const d = p.fechaHora && p.fechaHora.toDate ? p.fechaHora.toDate() : p.fechaHora ? new Date(p.fechaHora) : null;
  const anot = (p.inscriptos || []).length;
  const cupo = p.cupo || 0;
  const r = p.resultado || {};
  return {
    comunidad: g.nombre, lugar: p.lugar || '', formato: p.formato || '', cupo: String(cupo),
    anotados: String(anot), restantes: String(Math.max(0, cupo - anot)), faltan: String(Math.max(0, cupo - anot)),
    en_espera: String((p.listaEspera || []).length), cena: String((p.cena || []).length),
    ...(d ? { dia: diaDe(d), hora: horaDe(d), fecha: fechaLarga(d) } : {}),
    ...(p.marcador ? { golesO: String(p.marcador.oscuro ?? 0), golesB: String(p.marcador.blanco ?? 0) } : {}),
    ...(r.texto ? { resultado: r.texto } : {}),
    precio: g.precioCancha ? `$${g.precioCancha}` : '', pozo: g.pozo ? `$${g.pozo}` : '',
    ...extra
  };
}
