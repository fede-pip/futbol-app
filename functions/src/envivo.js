import { onCall } from 'firebase-functions/v2/https';
import { db, FieldValue, Timestamp, HttpsError, REGION, requireMiembro } from './util.js';

// Modo "partido en vivo": una sola persona lleva la carga de goles mientras se juega.
// Todo pasa por acá (también lo va a usar una futura app de reloj): el servidor decide quién es el
// cargador, a qué equipo va cada gol y deja un registro para poder deshacer sin errores.
const opts = { region: REGION, cors: true, maxInstances: 20 };
const MAX_GOLES = 60; // tope por partido: evita marcadores inflados
const SIN_ACTIVIDAD_MS = 20 * 60e3; // si el cargador desaparece 20 minutos, otro puede tomar la posta
const ANTES_MS = 3 * 3600e3, DESPUES_MS = 12 * 3600e3;

const ladoDe = (p, id) => ((p.equipos?.oscuro || []).includes(id) ? 'oscuro' : (p.equipos?.blanco || []).includes(id) ? 'blanco' : null);
const otro = lado => (lado === 'oscuro' ? 'blanco' : 'oscuro');

async function cargarPartido(tx, gref, pid) {
  const pref = gref.collection('partidos').doc(String(pid || ''));
  const ps = await tx.get(pref);
  if (!ps.exists) throw new HttpsError('not-found', 'No encontramos el partido.');
  const p = ps.data();
  if (p.estado !== 'abierto') throw new HttpsError('failed-precondition', 'El partido ya no está abierto para cargar goles en vivo.');
  return { pref, p };
}
const esCargador = (p, uid) => p.vivo?.uid === uid;

export const tomarEnVivo = onCall(opts, async req => {
  const { uid, gref, g } = await requireMiembro(req, req.data?.gid);
  const forzar = !!req.data?.forzar && (g.admins || []).includes(uid);
  const salida = await db.runTransaction(async tx => {
    const { pref, p } = await cargarPartido(tx, gref, req.data?.pid);
    const ahora = Date.now(), f = p.fechaHora?.toMillis?.() || 0;
    if (ahora < f - ANTES_MS || ahora > f + DESPUES_MS) throw new HttpsError('failed-precondition', 'El modo en vivo se abre 3 horas antes del partido.');
    if (!(p.inscriptos || []).includes(uid) && !(g.admins || []).includes(uid)) throw new HttpsError('permission-denied', 'Solo quienes están anotados o los admins pueden cargar el partido en vivo.');
    const v = p.vivo;
    const vencido = v && ahora - (v.ultimaAccion?.toMillis?.() || 0) > SIN_ACTIVIDAD_MS;
    if (v && v.uid !== uid && !vencido && !forzar) {
      const us = await db.doc(`usuarios/${v.uid}`).get();
      throw new HttpsError('failed-precondition', `${us.data()?.apodo || us.data()?.nombre || 'Otra persona'} ya está cargando el partido en vivo.`);
    }
    if (!v || v.uid !== uid) tx.update(pref, { vivo: { uid, desde: Timestamp.now(), ultimaAccion: Timestamp.now() } });
    return { ok: true, tomado: !v || v.uid !== uid };
  });
  return salida;
});

export const soltarEnVivo = onCall(opts, async req => {
  const { uid, gref, g } = await requireMiembro(req, req.data?.gid);
  await db.runTransaction(async tx => {
    const { pref, p } = await cargarPartido(tx, gref, req.data?.pid);
    if (!p.vivo) return;
    if (!esCargador(p, uid) && !(g.admins || []).includes(uid)) throw new HttpsError('permission-denied', 'Solo quien lo está cargando puede soltarlo.');
    tx.update(pref, { vivo: FieldValue.delete() });
  });
  return { ok: true };
});

// Suma un gol (o uno en contra). opId evita duplicados si el toque se reintenta por mala señal.
export const registrarGol = onCall(opts, async req => {
  const { uid, gref } = await requireMiembro(req, req.data?.gid);
  const jugadorId = String(req.data?.jugadorId || '');
  const opId = String(req.data?.opId || '').slice(0, 40);
  const enContra = !!req.data?.enContra;
  if (!jugadorId || !/^[A-Za-z0-9_-]{6,40}$/.test(opId)) throw new HttpsError('invalid-argument', 'Faltan datos del gol.');
  return db.runTransaction(async tx => {
    const { pref, p } = await cargarPartido(tx, gref, req.data?.pid);
    if (!esCargador(p, uid)) throw new HttpsError('permission-denied', 'Tomá la carga en vivo para anotar goles.');
    if (!(p.inscriptos || []).includes(jugadorId)) throw new HttpsError('invalid-argument', 'Ese jugador no está en el partido.');
    const lref = pref.collection('golesVivo').doc(opId);
    const ls = await tx.get(lref);
    if (ls.exists) return { ok: true, repetido: true, marcador: p.marcador || { oscuro: 0, blanco: 0 } };
    const propio = ladoDe(p, jugadorId);
    if (!propio) throw new HttpsError('failed-precondition', 'Primero hay que publicar los equipos.');
    const lado = enContra ? otro(propio) : propio;
    const m = { oscuro: p.marcador?.oscuro || 0, blanco: p.marcador?.blanco || 0 };
    if (m.oscuro + m.blanco >= MAX_GOLES) throw new HttpsError('resource-exhausted', 'Ya se cargaron muchos goles en este partido. Si es correcto, que el admin lo ajuste.');
    m[lado] += 1;
    const clave = enContra ? 'enContra' : 'goles';
    const actual = p.eventos?.[jugadorId]?.[clave] || 0;
    tx.update(pref, { marcador: m, [`eventos.${jugadorId}.${clave}`]: actual + 1, 'vivo.ultimaAccion': Timestamp.now() });
    tx.create(lref, { ts: Timestamp.now(), uid, jugadorId, lado, enContra, anulado: false });
    return { ok: true, marcador: m };
  });
});

// Deshace el último gol cargado en vivo que no esté anulado.
export const deshacerGol = onCall(opts, async req => {
  const { uid, gref } = await requireMiembro(req, req.data?.gid);
  return db.runTransaction(async tx => {
    const { pref, p } = await cargarPartido(tx, gref, req.data?.pid);
    if (!esCargador(p, uid)) throw new HttpsError('permission-denied', 'Solo quien carga en vivo puede deshacer.');
    const q = await tx.get(pref.collection('golesVivo').orderBy('ts', 'desc').limit(30));
    const d = q.docs.find(z => !z.data().anulado);
    if (!d) throw new HttpsError('failed-precondition', 'No hay goles para deshacer.');
    const x = d.data();
    const m = { oscuro: p.marcador?.oscuro || 0, blanco: p.marcador?.blanco || 0 };
    m[x.lado] = Math.max(0, m[x.lado] - 1);
    const clave = x.enContra ? 'enContra' : 'goles';
    tx.update(pref, { marcador: m, [`eventos.${x.jugadorId}.${clave}`]: Math.max(0, (p.eventos?.[x.jugadorId]?.[clave] || 0) - 1), 'vivo.ultimaAccion': Timestamp.now() });
    tx.update(d.ref, { anulado: true });
    return { ok: true, marcador: m, jugadorId: x.jugadorId, enContra: x.enContra };
  });
});
