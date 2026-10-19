// Crea en el proyecto de PRUEBAS un grupo con jugadores y un partido para ver la app con datos.
// Uso: node scripts/demo-dev.mjs   (imprime el email y la contraseña del admin de prueba)
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
const env = Object.fromEntries(readFileSync('.env.development.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1)]));
const config = { apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID };
const nombres = ['Demo Admin', 'Nico Ferrari', 'Juani Rossi', 'Tomás Vega', 'Agus Díaz', 'Lucho Pérez', 'Mati Sosa', 'Pablo Quiroga', 'Dami León', 'Santi Ramos'];
const clave = 'demo-123456';
let n = 0;
async function usuario(nombre, i) {
  const app = initializeApp(config, `d${n++}`);
  const auth = getAuth(app);
  const mail = `demo+${i}@example.com`;
  try { await createUserWithEmailAndPassword(auth, mail, clave); } catch (e) { if (e.code !== 'auth/email-already-in-use') throw e; await signInWithEmailAndPassword(auth, mail, clave); }
  const db = getFirestore(app);
  await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { nombre, apodo: '', foto: '', creadoEn: Timestamp.now() });
  await setDoc(doc(db, 'privado', auth.currentUser.uid), { onboarding: { anterior: true, avisos: true } }, { merge: true });
  return { app, db, uid: auth.currentUser.uid, mail, nombre, call: (f, d) => httpsCallable(getFunctions(app, 'southamerica-east1'), f)(d).then(r => r.data) };
}
const us = [];
for (let i = 0; i < nombres.length; i++) us.push(await usuario(nombres[i], i));
const A = us[0];
const { gid } = await A.call('crearGrupo', { nombre: 'Los Lunes (demo)' });
const cod = (await getDoc(doc(A.db, 'grupos', gid))).data().codigo;
for (const u of us.slice(1)) await u.call('unirsePorCodigo', { codigo: cod });
const pid = 'demo-' + Date.now().toString(36);
const manana = new Date(Date.now() + 26 * 3600e3);
await setDoc(doc(A.db, 'grupos', gid, 'partidos', pid), {
  estado: 'abierto', fechaHora: Timestamp.fromDate(manana), lugar: 'Muni Fútbol', formato: '6 vs 6', cupo: 12,
  inscriptos: [us[0].uid, us[1].uid, us[2].uid, us[3].uid, us[4].uid], listaEspera: [], cena: [us[1].uid, us[3].uid], invitados: {}, equipos: null, eventos: {}, creadoEn: Timestamp.now()
});
await updateDoc(doc(A.db, 'grupos', gid), { partidoActivo: pid });
console.log(JSON.stringify({ admin: A.mail, clave, jugador: us[5].mail, gid }));
process.exit(0);
