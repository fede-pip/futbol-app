import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { db, REGION } from './util.js';
import { disparar, ONESIGNAL_API_KEY } from './avisos.js';
import { esInvitado, esUid } from './puro.js';

const base = { document: 'grupos/{gid}/partidos/{pid}', region: REGION, secrets: [ONESIGNAL_API_KEY] };
const lista = (a, b) => (a || []).filter(x => !(b || []).includes(x));
const millis = t => (t && t.toMillis ? t.toMillis() : t ? new Date(t).getTime() : 0);

async function nombreDe(p, id) {
  if (esInvitado(id)) return (p.invitados?.[id]?.nombre || 'Un invitado').split(' ')[0];
  const s = await db.doc(`usuarios/${id}`).get();
  return (s.data()?.apodo || s.data()?.nombre || 'Alguien').split(' ')[0];
}

export const alCrearPartido = onDocumentCreated(base, async ev => {
  const { gid, pid } = ev.params;
  const p = { id: pid, ...ev.data.data() };
  if (p.estado !== 'abierto') return;
  await disparar(gid, 'partido_nuevo', { partido: p, clave: pid });
});

// Si alguien se baja y hay lista de espera, sube el primero.
async function promoverDeEspera(gid, pid) {
  const pref = db.doc(`grupos/${gid}/partidos/${pid}`);
  return db.runTransaction(async tx => {
    const s = await tx.get(pref);
    const p = s.data();
    if (!p || p.estado !== 'abierto') return null;
    const espera = p.listaEspera || [];
    if (!espera.length || (p.inscriptos || []).length >= p.cupo) return null;
    const [primero, ...resto] = espera;
    tx.update(pref, { inscriptos: [...(p.inscriptos || []), primero], listaEspera: resto });
    return primero;
  });
}

export const alActualizarPartido = onDocumentUpdated(base, async ev => {
  const { gid, pid } = ev.params;
  const a = ev.data.before.data(), b = ev.data.after.data();
  const p = { id: pid, ...b };
  const gs = await db.doc(`grupos/${gid}`).get();
  if (!gs.exists) return;

  // --- Estado ---
  if (a.estado !== b.estado) {
    if (b.estado === 'votando') await disparar(gid, 'votaciones', { partido: p, clave: pid, vars: { horas_restantes: '24' } });
    if (b.estado === 'cancelado') await disparar(gid, 'cancelado', { partido: p, clave: pid });
    return;
  }
  if (b.estado !== 'abierto') return;

  // --- Inscripciones ---
  const altas = lista(b.inscriptos, a.inscriptos);
  const bajas = lista(a.inscriptos, b.inscriptos);
  for (const x of altas) {
    const nombre = await nombreDe(b, x);
    const restantes = Math.max(0, (b.cupo || 0) - (b.inscriptos || []).length);
    const comun = { partido: p, excluir: esUid(x) ? [x] : [], vars: { nombre }, clave: `${pid}_${x}` };
    if (restantes === 0) await disparar(gid, 'cupo_completo', { ...comun, clave: pid });
    else if (restantes <= 3) await disparar(gid, 'pocos_lugares', { ...comun, coalesce: 30 });
    else await disparar(gid, 'inscripcion', { ...comun, coalesce: 30 });
  }
  for (const x of bajas) {
    const nombre = await nombreDe(a, x);
    const promovido = await promoverDeEspera(gid, pid);
    if (promovido) {
      const fresco = (await db.doc(`grupos/${gid}/partidos/${pid}`).get()).data();
      await disparar(gid, 'lista_espera', { partido: { id: pid, ...fresco }, personaUids: [promovido], clave: `${pid}_${promovido}` });
    }
    const horas = (millis(b.fechaHora) - Date.now()) / 3600e3;
    if (esUid(x) && horas > 0 && horas < 24) {
      const faltan = Math.max(0, (b.cupo || 0) - (b.inscriptos || []).length + (promovido ? 0 : 0));
      await disparar(gid, 'baja', { partido: p, vars: { nombre, faltan: String(faltan) }, clave: `${pid}_${x}` });
    }
  }

  // --- Cena ---
  for (const x of lista(b.cena, a.cena)) {
    const nombre = await nombreDe(b, x);
    await disparar(gid, 'tercer_tiempo', { partido: p, excluir: esUid(x) ? [x] : [], vars: { nombre }, clave: `${pid}_${x}`, coalesce: 30 });
  }

  // --- Equipos ---
  if (!a.equipos?.publicado && b.equipos?.publicado) {
    await disparar(gid, 'equipos', { partido: p, clave: pid });
  } else if (a.equipos?.publicado && b.equipos?.publicado) {
    const movidos = [
      ...lista(b.equipos.oscuro, a.equipos.oscuro).filter(x => (a.equipos.blanco || []).includes(x)),
      ...lista(b.equipos.blanco, a.equipos.blanco).filter(x => (a.equipos.oscuro || []).includes(x))
    ].filter(esUid);
    if (movidos.length) await disparar(gid, 'cambio_equipo', { partido: p, personaUids: movidos, clave: `${pid}_${Date.now()}` });
  }

  // --- Cambio de horario o lugar ---
  if ((millis(a.fechaHora) !== millis(b.fechaHora) || a.lugar !== b.lugar) && (b.inscriptos || []).length) {
    await disparar(gid, 'cambio_partido', { partido: p, clave: `${pid}_${Date.now()}` });
  }
});
