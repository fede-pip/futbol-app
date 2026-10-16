import { onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { HttpsError, REGION, requireSuper, URL_APP } from './util.js';

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
