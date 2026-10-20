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

// Recupera las fotos de la versión anterior (guardadas en app8_users/{dni}.foto) para quienes ya pasaron a una cuenta
// nueva y no la tienen en su perfil ni en sus grupos. Sin "aplicar" solo cuenta cuántas se podrían recuperar.
export const recuperarFotos = onCall({ region: REGION, cors: true, timeoutSeconds: 300 }, async req => {
  const quien = requireSuper(req);
  const aplicar = !!req.data?.aplicar;
  const snap = await db.collection('app8_users').get();
  let conFoto = 0, aRecuperar = 0;
  const nombres = [];
  for (const d of snap.docs) {
    const u = d.data();
    const foto = typeof u.foto === 'string' ? u.foto.trim() : '';
    if (!foto || !u.nuevoUid || foto.length > 30000) continue;
    conFoto++;
    const uid = u.nuevoUid;
    const us = await db.doc(`usuarios/${uid}`).get();
    let falta = false;
    if (us.exists && !us.data().foto) { falta = true; if (aplicar) await us.ref.update({ foto }); }
    const gs = await db.collection('grupos').where('miembros', 'array-contains', uid).get();
    for (const g of gs.docs) {
      const jr = g.ref.collection('jugadores').doc(uid);
      const j = await jr.get();
      if (j.exists && !j.data().foto) { falta = true; if (aplicar) await jr.update({ foto }); }
    }
    if (falta) { aRecuperar++; nombres.push(u.nombre || 'Jugador'); }
  }
  console.log(`recuperarFotos: ${aplicar ? 'aplicado' : 'simulación'}, con foto ${conFoto}, a recuperar ${aRecuperar}, por ${quien}`);
  return { aplicado: aplicar, conFoto, aRecuperar, nombres };
});
