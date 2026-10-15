import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

if (!getApps().length) initializeApp();
export const db = getFirestore();
export { FieldValue, Timestamp, HttpsError };

export const PROYECTO = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '';
export const ES_PROD = PROYECTO === 'futbol-app-5818a';
// Los disparadores de Firestore deben estar en la región de la base de datos.
// Producción usa nam5 (EE.UU.); pruebas está en São Paulo.
export const REGION = ES_PROD ? 'us-central1' : 'southamerica-east1';
export const URL_APP = 'https://meanoto.com.ar';
export const SUPER_EMAILS = ['fede@inmetricswetrust.com', 'hola@inmetricswetrust.com'];

export function requireAuth(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Iniciá sesión para continuar.');
  return req.auth.uid;
}

export async function requireAdmin(req, gid) {
  const uid = requireAuth(req);
  if (!gid || typeof gid !== 'string') throw new HttpsError('invalid-argument', 'Falta el grupo.');
  const gref = db.doc(`grupos/${gid}`);
  const snap = await gref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'El grupo no existe.');
  const g = snap.data();
  if (!(g.admins || []).includes(uid)) throw new HttpsError('permission-denied', 'Solo un admin puede hacer esto.');
  return { uid, gref, g };
}

export async function requireMiembro(req, gid) {
  const uid = requireAuth(req);
  const gref = db.doc(`grupos/${gid}`);
  const snap = await gref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'El grupo no existe.');
  const g = snap.data();
  if (!(g.miembros || []).includes(uid)) throw new HttpsError('permission-denied', 'No sos parte de este grupo.');
  return { uid, gref, g };
}

export function requireSuper(req) {
  const uid = requireAuth(req);
  const t = req.auth.token || {};
  if (!t.email_verified || !SUPER_EMAILS.includes(String(t.email || '').toLowerCase())) {
    throw new HttpsError('permission-denied', 'Solo el administrador de la plataforma.');
  }
  return uid;
}

// Escribe en lotes de hasta 400 operaciones.
export async function lotes(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + 400)) op(batch);
    await batch.commit();
  }
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0, O, 1, I
export function codigoAleatorio() {
  let s = '';
  for (let i = 0; i < 7; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

export async function crearCodigoUnico(gid) {
  for (let i = 0; i < 10; i++) {
    const codigo = codigoAleatorio();
    try {
      await db.doc(`codigos/${codigo}`).create({ gid });
      return codigo;
    } catch (e) { /* ya existe: probar otro */ }
  }
  throw new HttpsError('internal', 'No se pudo generar un código. Intentá de nuevo.');
}

export const inicioDelDiaArg = () => {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  return new Date(`${hoy}T00:00:00-03:00`);
};
