// Formatos de fecha en hora de Buenos Aires.
const TZ = 'America/Argentina/Buenos_Aires';
const f = (o, d) => new Intl.DateTimeFormat('es-AR', { timeZone: TZ, ...o }).format(d);

export const aFecha = t => (t && t.toDate ? t.toDate() : t ? new Date(t) : null);
export const diaLargo = d => f({ weekday: 'long', day: 'numeric', month: 'long' }, d);
export const diaCorto = d => f({ weekday: 'short', day: 'numeric', month: 'short' }, d);
export const diaSemana = d => f({ weekday: 'long' }, d);
export const hora = d => f({ hour: '2-digit', minute: '2-digit', hour12: false }, d);
export const fechaCorta = d => f({ day: 'numeric', month: 'short', year: 'numeric' }, d);
export const mayus = s => (s || '').replace(/^./, c => c.toUpperCase());

export function titulo(d) { // "Lunes 19, 21:30"
  return `${mayus(f({ weekday: 'long', day: 'numeric' }, d))}, ${hora(d)}`;
}
export function horasHasta(d) { return d ? (d.getTime() - Date.now()) / 3600e3 : null; }
export function faltan(d) {
  const h = horasHasta(d);
  if (h === null) return '';
  if (h < 0) return 'Ya pasó';
  if (h < 1) return 'Falta menos de una hora';
  if (h < 24) return `Faltan ${Math.round(h)} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? 'Falta 1 día' : `Faltan ${dias} días`;
}
export function haceCuanto(t) {
  const d = aFecha(t);
  if (!d) return '';
  const min = (Date.now() - d.getTime()) / 60000;
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${Math.floor(min)} min`;
  const h = min / 60;
  if (h < 24) return `Hace ${Math.floor(h)} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? 'Ayer' : `Hace ${dias} días`;
}
// Fecha y hora del formulario → Date (Argentina no usa horario de verano: -03:00).
export const desdeFormulario = (fecha, horaTxt) => new Date(`${fecha}T${horaTxt}:00-03:00`);
export const aInputFecha = d => f({ year: 'numeric', month: '2-digit', day: '2-digit' }, d).split('/').reverse().join('-');
