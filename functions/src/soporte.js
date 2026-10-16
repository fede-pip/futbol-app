import { onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { randomInt } from 'node:crypto';
import { db, HttpsError, REGION, requireSuper, URL_APP } from './util.js';
import { hashPwdLegacy } from './puro.js';

// Ayuda a alguien que no puede entrar: genera el enlace para elegir una contraseña nueva, sin depender de que le llegue el mail.
// Solo lo usa el dueño de la plataforma, que se lo manda a la persona por WhatsApp.
export const enlaceDeAcceso = onCall({ region: REGION, cors: true }, async req => {
  requireSuper(req);
  const uid = String(req.data?.uid || '');
  if (!uid) throw new HttpsError('invalid-argument', 'Falta la persona.');
  const auth = getAuth();
  let u;
  try { u = await auth.getUser(uid); } catch { throw new HttpsError('not-found', 'Esa persona todavía no tiene cuenta.'); }
  if (!u.email) throw new HttpsError('failed-precondition', 'Esa persona todavía no tiene un email asociado.');
  const proveedores = u.providerData.map(p => p.providerId);
  const enlace = await auth.generatePasswordResetLink(u.email, { url: URL_APP });
  console.log(`enlaceDeAcceso: generado para ${uid} por ${req.auth.uid}`);
  return { email: u.email, enlace, soloGoogle: proveedores.length > 0 && proveedores.every(p => p === 'google.com') };
});

// Para quien jugaba con DNI, todavía no pasó a email y no se acuerda de su clave de antes:
// se le pone una clave temporal en su cuenta anterior. Con ella hace el ingreso con DNI de siempre y elige su email y contraseña.
export const claveTemporalDni = onCall({ region: REGION, cors: true }, async req => {
  requireSuper(req);
  const dni = String(req.data?.dni || '').replace(/\D/g, '');
  if (dni.length < 6 || dni.length > 9) throw new HttpsError('invalid-argument', 'DNI inválido.');
  const lref = db.doc(`app8_users/${dni}`);
  const l = await lref.get();
  if (!l.exists) throw new HttpsError('not-found', 'No hay una cuenta anterior con ese DNI.');
  const ld = l.data();
  if (ld.nuevoUid && ld.nuevoUid !== `d${dni}`) throw new HttpsError('failed-precondition', 'Esa cuenta ya pasó a email: usá el enlace de acceso.');
  const clave = String(randomInt(100000, 1000000));
  await lref.update({ passHash: hashPwdLegacy(clave) });
  await db.doc(`intentosDni/${dni}`).delete().catch(() => {});
  console.log(`claveTemporalDni: reiniciada para el DNI ${dni.slice(0, 2)}***${dni.slice(-2)} por ${req.auth.uid}`);
  return { nombre: ld.nombre || 'Jugador', clave };
});
