import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

// OneSignal se inicializa una sola vez en index.html. Acá solo se pide permiso y se
// guarda el ID de suscripción de este dispositivo.
export const pushDisponible = () => typeof window !== 'undefined' && 'Notification' in window;
export const estadoPermiso = () => (pushDisponible() ? window.Notification.permission : 'unsupported'); // default | granted | denied
export const esIPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
export const esAppInstalada = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export async function activarPush(uid) {
  try {
    const OS = window.OneSignal;
    if (!OS || !OS.Notifications) return { ok: false, motivo: 'no-listo' };
    if (!OS.Notifications.permission) await OS.Notifications.requestPermission();
    if (!OS.Notifications.permission) return { ok: false, motivo: estadoPermiso() === 'denied' ? 'denegado' : 'no-concedido' };
    for (let i = 0; i < 12; i++) {
      const id = OS.User && OS.User.PushSubscription && OS.User.PushSubscription.id;
      if (id) {
        await setDoc(doc(db, 'privado', uid), { dispositivos: arrayUnion({ id }) }, { merge: true });
        return { ok: true };
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    return { ok: false, motivo: 'sin-id' };
  } catch (e) { return { ok: false, motivo: 'error' }; }
}

// Si ya hay permiso, registra el dispositivo en silencio (por ejemplo al abrir la app).
export async function registrarSiHayPermiso(uid) {
  if (estadoPermiso() === 'granted') return activarPush(uid);
  return { ok: false };
}
