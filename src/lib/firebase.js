import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// La configuración de Firebase es pública por diseño; lo que protege los datos son las reglas.
const PROD = {
  apiKey: 'AIzaSyBkdakeLAzmp7zGz99nPswuqjtELSAOe8s', authDomain: 'futbol-app-5818a.firebaseapp.com',
  projectId: 'futbol-app-5818a', storageBucket: 'futbol-app-5818a.firebasestorage.app',
  messagingSenderId: '861046895576', appId: '1:861046895576:web:1e64b31f951194fbfaf8ad'
};
const DEV = {
  apiKey: 'AIzaSyAW41FWonGwPVNEQwuK3tcN9SZPVzM_m38', authDomain: 'futbol-app-dev-fp.firebaseapp.com',
  projectId: 'futbol-app-dev-fp', storageBucket: 'futbol-app-dev-fp.firebasestorage.app',
  messagingSenderId: '132423966478', appId: '1:132423966478:web:519436aa2eb23563ee815f'
};

// Solo el dominio de producción usa los datos reales. Las vistas previas de Vercel y
// localhost usan el proyecto de pruebas, así nunca se tocan datos reales sin querer.
function elegirConfig() {
  const e = import.meta.env;
  if (e.VITE_FIREBASE_PROJECT_ID) {
    return { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID,
      storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: e.VITE_FIREBASE_APP_ID };
  }
  const host = typeof location !== 'undefined' ? location.hostname : '';
  return host === 'futbol-app-puce.vercel.app' ? PROD : DEV;
}

export const config = elegirConfig();
export const esProduccion = config.projectId === PROD.projectId;
export const REGION_FUNCIONES = esProduccion ? 'us-central1' : 'southamerica-east1';

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const proveedorGoogle = new GoogleAuthProvider();
const funciones = getFunctions(app, REGION_FUNCIONES);

export async function llamar(nombre, datos = {}) {
  const r = await httpsCallable(funciones, nombre)(datos);
  return r.data;
}

const ERRORES_AUTH = {
  'auth/invalid-credential': 'El email o la contraseña no coinciden.',
  'auth/wrong-password': 'El email o la contraseña no coinciden.',
  'auth/user-not-found': 'El email o la contraseña no coinciden.',
  'auth/invalid-email': 'Ese email no parece válido.',
  'auth/email-already-in-use': 'Ya hay una cuenta con ese email. Probá ingresar.',
  'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  'auth/network-request-failed': 'No hay conexión. Revisá tu internet.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permitila y probá de nuevo.',
  'auth/unauthorized-domain': 'Este sitio todavía no está autorizado para ingresar con Google. Usá tu email.'
};
export function mensajeError(e) {
  if (!e) return '';
  if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return '';
  if (ERRORES_AUTH[e.code]) return ERRORES_AUTH[e.code];
  if (e.code === 'permission-denied') return 'No tenés permiso para hacer esto.';
  if (String(e.code).startsWith('functions/')) return e.message && e.message !== 'INTERNAL' ? e.message : 'Algo salió mal. Probá de nuevo.';
  if (e.code === 'unavailable') return 'No hay conexión. Probá de nuevo en un momento.';
  return 'Algo salió mal. Probá de nuevo.';
}
