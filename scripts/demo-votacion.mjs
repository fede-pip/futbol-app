// Deja en el grupo demo (proyecto de PRUEBAS) un partido con la votación abierta, para probar la pantalla.
// Uso: node scripts/demo-votacion.mjs <gid>
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { asignarVotaciones } from '../src/lib/logica.js';
const env = Object.fromEntries(readFileSync('.env.development.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1)]));
const config = { apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID };
const gid = process.argv[2];
const uids = []; let A;
for (let i = 0; i < 10; i++) {
  const app = initializeApp(config, `v${i}`); const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, `demo+${i}@example.com`, 'demo-123456');
  uids.push(auth.currentUser.uid); if (i === 0) A = getFirestore(app);
}
const pid = 'votar-' + Date.now().toString(36);
await setDoc(doc(A, 'grupos', gid, 'partidos', pid), {
  estado: 'votando', fechaHora: Timestamp.now(), fechaFin: Timestamp.now(), lugar: 'Cancha demo', formato: '5 vs 5', cupo: 10,
  inscriptos: uids, listaEspera: [], cena: [], invitados: {}, creadoEn: Timestamp.now(),
  equipos: { oscuro: uids.slice(0, 5), blanco: uids.slice(5), publicado: true }, marcador: { oscuro: 4, blanco: 3 },
  eventos: {}, asignaciones: asignarVotaciones(uids)
});
await updateDoc(doc(A, 'grupos', gid), { partidoActivo: pid });
console.log('Listo', pid);
process.exit(0);
