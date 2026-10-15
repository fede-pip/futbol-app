// Escrituras de la app. Todo lo que requiere confianza (unirse, votar, cerrar) pasa por funciones del servidor.
import {
  arrayRemove, arrayUnion, collection, doc, getDoc, setDoc, Timestamp, updateDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { asignarVotaciones, uid as nuevoId } from '../lib/logica.js';

const refGrupo = gid => doc(db, 'grupos', gid);
export const refPartido = (gid, pid) => doc(db, `grupos/${gid}/partidos/${pid}`);

// ---- Inscripción ----
export function anotarse(gid, p, uid) {
  const lleno = (p.inscriptos || []).length >= p.cupo;
  return updateDoc(refPartido(gid, p.id), lleno ? { listaEspera: arrayUnion(uid) } : { inscriptos: arrayUnion(uid) });
}
export const bajarse = (gid, p, uid) =>
  updateDoc(refPartido(gid, p.id), { inscriptos: arrayRemove(uid), listaEspera: arrayRemove(uid), cena: arrayRemove(uid) });
export const sumarseCena = (gid, p, uid) => updateDoc(refPartido(gid, p.id), { cena: arrayUnion(uid) });
export const salirCena = (gid, p, uid) => updateDoc(refPartido(gid, p.id), { cena: arrayRemove(uid) });
export const quitarInscripto = (gid, p, id) =>
  updateDoc(refPartido(gid, p.id), { inscriptos: arrayRemove(id), cena: arrayRemove(id) });

const normalizar = s => (s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
export async function agregarInvitado(gid, p, { nombre, nivel, registrados }) {
  // Reutiliza el invitado si ya vino antes (mismo nombre): así no se duplican y se conserva su nivel.
  const previo = (registrados || []).find(i => normalizar(i.nombre) === normalizar(nombre));
  const id = previo ? previo.id : `inv_${nuevoId()}`;
  const niv = Number(nivel) || 5;
  if (!previo) await setDoc(doc(db, `grupos/${gid}/invitados/${id}`), { nombre: nombre.trim(), nivel: niv, creadoEn: Timestamp.now() });
  await updateDoc(refPartido(gid, p.id), { [`invitados.${id}`]: { nombre: nombre.trim(), nivel: previo ? previo.nivel : niv }, inscriptos: arrayUnion(id) });
  return id;
}

// ---- Partido (admin) ----
export async function crearPartido(gid, { fecha, hora, lugar, formato, cupo }) {
  const pref = doc(collection(db, `grupos/${gid}/partidos`));
  await setDoc(pref, {
    estado: 'abierto', fechaHora: Timestamp.fromDate(new Date(`${fecha}T${hora}:00-03:00`)), lugar: lugar.trim(), formato, cupo,
    inscriptos: [], listaEspera: [], cena: [], invitados: {}, equipos: null, eventos: {}, creadoEn: Timestamp.now()
  });
  await updateDoc(refGrupo(gid), { partidoActivo: pref.id });
  return pref.id;
}
export function editarPartido(gid, p, { fecha, hora, lugar, formato, cupo }) {
  return updateDoc(refPartido(gid, p.id), { fechaHora: Timestamp.fromDate(new Date(`${fecha}T${hora}:00-03:00`)), lugar: lugar.trim(), formato, cupo });
}
export async function cancelarPartido(gid, p) {
  const b = writeBatch(db);
  b.update(refPartido(gid, p.id), { estado: 'cancelado' });
  b.update(refGrupo(gid), { partidoActivo: null });
  await b.commit();
}
export const guardarEquipos = (gid, p, oscuro, blanco, publicado) =>
  updateDoc(refPartido(gid, p.id), { equipos: { oscuro, blanco, publicado: !!publicado } });
export const guardarMarcador = (gid, p, oscuro, blanco) => updateDoc(refPartido(gid, p.id), { marcador: { oscuro, blanco } });
export const guardarEvento = (gid, p, id, clave, n) => updateDoc(refPartido(gid, p.id), { [`eventos.${id}.${clave}`]: Math.max(0, n) });
export function finalizarPartido(gid, p) {
  const jugadores = (p.inscriptos || []).filter(id => !id.startsWith('inv_'));
  return updateDoc(refPartido(gid, p.id), { estado: 'votando', fechaFin: Timestamp.now(), asignaciones: asignarVotaciones(jugadores) });
}

// ---- Grupo (admin) ----
export const actualizarGrupo = (gid, datos) => updateDoc(refGrupo(gid), datos);
export const guardarNiveles = (gid, id, atributos) => setDoc(doc(db, `grupos/${gid}/niveles/${id}`), { atributos }, { merge: true });
export const guardarAviso = (gid, tipo, cfg) => updateDoc(refGrupo(gid), { [`avisos.${tipo}`]: cfg });
export async function quitarMiembro(gid, g, id) {
  return updateDoc(refGrupo(gid), { miembros: arrayRemove(id), admins: arrayRemove(id) });
}
export const ponerAdmin = (gid, id) => updateDoc(refGrupo(gid), { admins: arrayUnion(id) });
export const sacarAdmin = (gid, id) => updateDoc(refGrupo(gid), { admins: arrayRemove(id) });

// ---- Persona ----
export async function guardarPerfil(uid, { nombre, apodo, foto }, gids = []) {
  const datos = { nombre: nombre.trim(), apodo: (apodo || '').trim(), foto: foto || '' };
  await updateDoc(doc(db, 'usuarios', uid), datos);
  await Promise.all(gids.map(g => updateDoc(doc(db, `grupos/${g}/jugadores/${uid}`), datos).catch(() => {})));
}
export async function crearPerfil(uid, { nombre, foto = '' }) {
  await setDoc(doc(db, 'usuarios', uid), { nombre: nombre.trim(), apodo: '', foto, creadoEn: Timestamp.now() });
}
export const guardarPrefs = (uid, prefs) => setDoc(doc(db, 'privado', uid), { prefs }, { merge: true });
export const marcarOnboarding = (uid, clave) => setDoc(doc(db, 'privado', uid), { onboarding: { [clave]: true } }, { merge: true });
export const marcarLeido = (uid, id) => updateDoc(doc(db, `privado/${uid}/avisos/${id}`), { leido: true });
export async function marcarTodosLeidos(uid, avisos) {
  const b = writeBatch(db);
  avisos.filter(a => !a.leido).forEach(a => b.update(doc(db, `privado/${uid}/avisos/${a.id}`), { leido: true }));
  await b.commit();
}
export async function existeInvitado(gid, id) { return (await getDoc(doc(db, `grupos/${gid}/invitados/${id}`))).exists(); }
export const borrarEquipos = (gid, p) => updateDoc(refPartido(gid, p.id), { equipos: null });
