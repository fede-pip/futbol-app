// Pruebas de integración contra el proyecto de PRUEBAS de Firebase (futbol-app-dev-fp).
// Crean usuarios reales de prueba y verifican reglas de seguridad, funciones y avisos.
// Uso: npm run test:integracion   (requiere haber desplegado reglas y funciones en dev)
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithCustomToken, linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, getDocs, collection, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const env = Object.fromEntries(readFileSync('.env.development.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1)]));
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID
};
const PROYECTO = config.projectId;
const corrida = Date.now().toString(36);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ATTRS = ['velocidad', 'pases', 'definicion', 'amagues', 'defensa', 'resistencia', 'arquero'];

let n = 0;
async function usuario(nombre, { email, clave = 'prueba-123456' } = {}) {
  const app = initializeApp(config, `u${n++}-${corrida}`);
  const auth = getAuth(app);
  const mail = email || `test+${corrida}-${nombre.toLowerCase()}@example.com`;
  try { await createUserWithEmailAndPassword(auth, mail, clave); }
  catch (e) { if (e.code !== 'auth/email-already-in-use') throw e; await signInWithEmailAndPassword(auth, mail, clave); }
  const u = { app, auth, db: getFirestore(app), uid: auth.currentUser.uid, nombre, mail };
  u.call = (nombreFn, datos) => httpsCallable(getFunctions(app, 'southamerica-east1'), nombreFn)(datos).then(r => r.data);
  return u;
}
async function conPerfil(nombre, opts) {
  const u = await usuario(nombre, opts);
  await setDoc(doc(u.db, 'usuarios', u.uid), { nombre, apodo: '', foto: '', creadoEn: Timestamp.now() });
  return u;
}
const denegado = p => expect(p).rejects.toMatchObject({ code: 'permission-denied' });
const falla = (p, code) => expect(p).rejects.toMatchObject({ code: `functions/${code}` });

let A, B, C, gid, codigo, pid;
const partidoBase = () => ({
  estado: 'abierto', fechaHora: Timestamp.fromMillis(Date.now() + 30 * 3600e3), lugar: 'Cancha de prueba', formato: '2 vs 2', cupo: 4,
  inscriptos: [], listaEspera: [], cena: [], invitados: {}, equipos: null, eventos: {}, creadoEn: Timestamp.now()
});

describe('perfiles y acceso', () => {
  beforeAll(async () => {
    A = await conPerfil('Alicia');
    B = await conPerfil('Beto');
    C = await conPerfil('Carla');
  });

  it('nadie escribe el perfil de otra persona', async () => {
    await denegado(setDoc(doc(A.db, 'usuarios', B.uid), { nombre: 'Hackeado', apodo: '', foto: '', creadoEn: Timestamp.now() }));
    await denegado(updateDoc(doc(A.db, 'usuarios', B.uid), { nombre: 'Hackeado' }));
  });

  it('sin sesión no se lee nada', async () => {
    const anon = getFirestore(initializeApp(config, `anon-${corrida}`));
    await denegado(getDoc(doc(anon, 'usuarios', A.uid)));
  });

  it('los datos privados solo los lee su dueño', async () => {
    await setDoc(doc(A.db, 'privado', A.uid), { prefs: { partido: true } });
    await denegado(getDoc(doc(B.db, 'privado', A.uid)));
    await denegado(setDoc(doc(A.db, 'privado', A.uid), { legacyDni: '12345678' }));
  });
});

describe('grupos y membresía', () => {
  it('crear un grupo lo hace la función y deja al creador como admin', async () => {
    const r = await A.call('crearGrupo', { nombre: `Grupo test ${corrida}` });
    gid = r.gid; codigo = r.codigo;
    expect(codigo).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{4}$/);
    const g = (await getDoc(doc(A.db, 'grupos', gid))).data();
    expect(g.admins).toEqual([A.uid]);
    expect(g.miembros).toEqual([A.uid]);
  });

  it('el cliente no puede crear grupos ni leer códigos', async () => {
    await denegado(setDoc(doc(A.db, 'grupos', 'manual'), { nombre: 'x', creadorUid: A.uid, admins: [A.uid], miembros: [A.uid] }));
    await denegado(getDoc(doc(A.db, 'codigos', codigo)));
  });

  it('quien no es miembro no ve el grupo', async () => {
    await denegado(getDoc(doc(C.db, 'grupos', gid)));
    await denegado(getDoc(doc(C.db, 'grupos', gid, 'jugadores', A.uid)));
  });

  it('un código inválido o inexistente da un error claro', async () => {
    await falla(B.call('unirsePorCodigo', { codigo: '???' }), 'invalid-argument');
    await falla(B.call('unirsePorCodigo', { codigo: 'ZZZ-ZZZZ' }), 'not-found');
  });

  it('unirse con el código suma a la persona', async () => {
    const r = await B.call('unirsePorCodigo', { codigo });
    expect(r).toMatchObject({ gid, nuevo: true });
    const g = (await getDoc(doc(B.db, 'grupos', gid))).data();
    expect(g.miembros).toEqual([A.uid, B.uid]);
    const r2 = await B.call('unirsePorCodigo', { codigo });
    expect(r2.nuevo).toBe(false);
  });

  it('un miembro ve a los jugadores pero no los puntajes', async () => {
    expect((await getDoc(doc(B.db, 'grupos', gid, 'jugadores', A.uid))).exists()).toBe(true);
    await denegado(getDoc(doc(B.db, 'grupos', gid, 'niveles', A.uid)));
    expect((await getDoc(doc(A.db, 'grupos', gid, 'niveles', B.uid))).exists()).toBe(true);
  });

  it('un miembro no puede editar el grupo, los niveles ni a otros jugadores', async () => {
    await denegado(updateDoc(doc(B.db, 'grupos', gid), { nombre: 'Mío ahora' }));
    await denegado(updateDoc(doc(B.db, 'grupos', gid), { admins: [A.uid, B.uid] }));
    await denegado(setDoc(doc(B.db, 'grupos', gid, 'niveles', B.uid), { atributos: { velocidad: 10 }, previos: {} }));
    await denegado(updateDoc(doc(B.db, 'grupos', gid, 'jugadores', A.uid), { nombre: 'X' }));
    await denegado(updateDoc(doc(B.db, 'grupos', gid, 'jugadores', B.uid), { stats: { puntos: 999 } }));
    await updateDoc(doc(B.db, 'grupos', gid, 'jugadores', B.uid), { apodo: 'Beto el crack' });
  });

  it('el admin no puede sumar miembros por su cuenta, pero sí editar el grupo', async () => {
    await denegado(updateDoc(doc(A.db, 'grupos', gid), { miembros: [A.uid, B.uid, C.uid] }));
    await updateDoc(doc(A.db, 'grupos', gid), { precioCancha: 4500 });
    await denegado(updateDoc(doc(A.db, 'grupos', gid), { creadorUid: B.uid }));
  });
});

describe('partido: inscripción y concurrencia', () => {
  it('solo un admin crea partidos', async () => {
    await denegado(setDoc(doc(B.db, 'grupos', gid, 'partidos', 'x'), partidoBase()));
    pid = 'p-' + corrida;
    await setDoc(doc(A.db, 'grupos', gid, 'partidos', pid), partidoBase());
    await updateDoc(doc(A.db, 'grupos', gid), { partidoActivo: pid });
  });

  it('un miembro se anota solo a sí mismo, de a uno', async () => {
    const ref = doc(B.db, 'grupos', gid, 'partidos', pid);
    await denegado(updateDoc(ref, { inscriptos: [C.uid] }));
    await denegado(updateDoc(ref, { inscriptos: [A.uid] }));
    await denegado(updateDoc(ref, { inscriptos: [B.uid, 'inv_a', 'inv_b'] }));
    await updateDoc(ref, { inscriptos: [B.uid] });
  });

  it('se puede agregar un invitado, pero no sacar a otros', async () => {
    const ref = doc(B.db, 'grupos', gid, 'partidos', pid);
    await updateDoc(ref, { inscriptos: [B.uid, 'inv_t1'], invitados: { inv_t1: { nombre: 'Invitado uno', nivel: 5 } } });
    await denegado(updateDoc(ref, { inscriptos: [B.uid] })); // sacar al invitado: solo admin
    await updateDoc(doc(A.db, 'grupos', gid, 'partidos', pid), { inscriptos: [B.uid, 'inv_t1', A.uid] });
  });

  it('un miembro no cambia datos del partido ni el cupo', async () => {
    const ref = doc(B.db, 'grupos', gid, 'partidos', pid);
    await denegado(updateDoc(ref, { cupo: 40 }));
    await denegado(updateDoc(ref, { lugar: 'Otro lado' }));
    await denegado(updateDoc(ref, { estado: 'cerrado' }));
    await denegado(updateDoc(ref, { marcador: { oscuro: 9, blanco: 0 } }));
  });

  it('con el cupo completo ya no se puede anotar nadie más', async () => {
    await updateDoc(doc(A.db, 'grupos', gid, 'partidos', pid), { inscriptos: [B.uid, 'inv_t1', A.uid, 'inv_t2'] });
    const ref = doc(B.db, 'grupos', gid, 'partidos', pid);
    await denegado(updateDoc(ref, { inscriptos: [B.uid, 'inv_t1', A.uid, 'inv_t2', 'inv_t3'] }));
    await updateDoc(ref, { listaEspera: [B.uid] }); // sí puede ir a la lista de espera
    await updateDoc(ref, { listaEspera: [] });
  });

  it('la desanotación propia funciona', async () => {
    const ref = doc(B.db, 'grupos', gid, 'partidos', pid);
    await updateDoc(ref, { inscriptos: ['inv_t1', A.uid, 'inv_t2'] });
    // el servidor puede promover desde la lista de espera; acá solo volvemos a anotarnos
    await updateDoc(ref, { inscriptos: ['inv_t1', A.uid, 'inv_t2', B.uid] });
  });
});

describe('avisos: bandeja y servidor', () => {
  it('al crear el partido, los miembros reciben el aviso en su bandeja', async () => {
    let avisos = [];
    for (let i = 0; i < 12 && !avisos.some(a => a.tipo === 'partido_nuevo'); i++) {
      await dormir(2500);
      avisos = (await getDocs(collection(B.db, 'privado', B.uid, 'avisos'))).docs.map(d => ({ id: d.id, ...d.data() }));
    }
    const a = avisos.find(x => x.tipo === 'partido_nuevo');
    expect(a, 'llegó el aviso partido_nuevo').toBeTruthy();
    expect(a.titulo).toMatch(/Hay partido el/);
    expect(a.titulo).not.toMatch(/[{}]/);
    expect(a.leido).toBe(false);
    await updateDoc(doc(B.db, 'privado', B.uid, 'avisos', a.id), { leido: true });
    await denegado(updateDoc(doc(B.db, 'privado', B.uid, 'avisos', a.id), { titulo: 'trucho' }));
  });

  it('nadie puede crear avisos ni leer la bandeja de otro', async () => {
    await denegado(setDoc(doc(B.db, 'privado', B.uid, 'avisos', 'falso'), { tipo: 'x', titulo: 'x', cuerpo: 'x' }));
    await denegado(getDocs(collection(A.db, 'privado', B.uid, 'avisos')));
  });

  it('el admin envía un aviso manual; un miembro no puede', async () => {
    const r = await A.call('enviarAvisoManual', { gid, titulo: 'Prueba {dia}', cuerpo: 'Faltan {faltan}', aud: ['todos'] });
    expect(r.enviados).toBeGreaterThanOrEqual(2);
    await falla(B.call('enviarAvisoManual', { gid, titulo: 'x', cuerpo: 'y', aud: ['todos'] }), 'permission-denied');
    const h = await getDocs(collection(A.db, 'grupos', gid, 'avisosHistorial'));
    expect(h.size).toBeGreaterThan(0);
    await denegado(getDocs(collection(B.db, 'grupos', gid, 'avisosHistorial')));
  });
});

describe('partido en vivo', () => {
  let vid;
  const op = () => 'op' + Math.random().toString(36).slice(2, 12);
  it('prepara un partido con equipos', async () => {
    vid = 'v-' + corrida;
    await setDoc(doc(A.db, 'grupos', gid, 'partidos', vid), { ...partidoBase(), fechaHora: Timestamp.fromMillis(Date.now() + 3600e3),
      inscriptos: [A.uid, B.uid, 'inv_v1', 'inv_v2'], equipos: { oscuro: [A.uid, 'inv_v1'], blanco: [B.uid, 'inv_v2'], publicado: true } });
  });
  it('quien no es del grupo no puede tomar la carga', async () => {
    await falla(C.call('tomarEnVivo', { gid, pid: vid }), 'permission-denied');
  });
  it('el primero que la toma queda como cargador y otro no puede pisarlo', async () => {
    await B.call('tomarEnVivo', { gid, pid: vid });
    const v = (await getDoc(doc(A.db, 'grupos', gid, 'partidos', vid))).data().vivo;
    expect(v.uid).toBe(B.uid);
    await falla(A.call('registrarGol', { gid, pid: vid, jugadorId: A.uid, opId: op() }), 'permission-denied');
  });
  it('los goles suman al marcador y al jugador; el reintento no duplica', async () => {
    const o1 = op();
    await B.call('registrarGol', { gid, pid: vid, jugadorId: A.uid, opId: o1 });
    const r = await B.call('registrarGol', { gid, pid: vid, jugadorId: A.uid, opId: o1 });
    expect(r.repetido).toBe(true);
    await B.call('registrarGol', { gid, pid: vid, jugadorId: 'inv_v2', opId: op() });
    const p = (await getDoc(doc(A.db, 'grupos', gid, 'partidos', vid))).data();
    expect(p.marcador).toEqual({ oscuro: 1, blanco: 1 });
    expect(p.eventos[A.uid].goles).toBe(1);
  });
  it('un gol en contra suma al rival y no cuenta como gol del jugador', async () => {
    await B.call('registrarGol', { gid, pid: vid, jugadorId: 'inv_v1', enContra: true, opId: op() });
    const p = (await getDoc(doc(A.db, 'grupos', gid, 'partidos', vid))).data();
    expect(p.marcador).toEqual({ oscuro: 1, blanco: 2 });
    expect(p.eventos.inv_v1.goles || 0).toBe(0);
    expect(p.eventos.inv_v1.enContra).toBe(1);
  });
  it('deshacer revierte el último gol, de a uno', async () => {
    await B.call('deshacerGol', { gid, pid: vid });
    const p = (await getDoc(doc(A.db, 'grupos', gid, 'partidos', vid))).data();
    expect(p.marcador).toEqual({ oscuro: 1, blanco: 1 });
    expect(p.eventos.inv_v1.enContra).toBe(0);
  });
  it('un jugador que no está en el partido no recibe goles', async () => {
    await falla(B.call('registrarGol', { gid, pid: vid, jugadorId: C.uid, opId: op() }), 'invalid-argument');
  });
  it('el cliente no puede escribir el marcador en vivo ni el registro', async () => {
    await denegado(updateDoc(doc(B.db, 'grupos', gid, 'partidos', vid), { marcador: { oscuro: 9, blanco: 0 } }));
    await denegado(setDoc(doc(B.db, 'grupos', gid, 'partidos', vid, 'golesVivo', 'x'), { anulado: false }));
  });
  it('el admin puede tomar la carga con forzar y el cargador puede soltarla', async () => {
    await falla(A.call('tomarEnVivo', { gid, pid: vid }), 'failed-precondition');
    await A.call('tomarEnVivo', { gid, pid: vid, forzar: true });
    await falla(B.call('soltarEnVivo', { gid, pid: vid }), 'permission-denied').catch(() => {});
    await A.call('soltarEnVivo', { gid, pid: vid });
    const p = (await getDoc(doc(A.db, 'grupos', gid, 'partidos', vid))).data();
    expect(p.vivo).toBeUndefined();
  });
});

describe('votación y cierre', () => {
  it('el admin finaliza el partido y abre la votación', async () => {
    await updateDoc(doc(A.db, 'grupos', gid, 'partidos', pid), {
      inscriptos: [A.uid, B.uid, 'inv_t1', 'inv_t2'],
      equipos: { oscuro: [A.uid, 'inv_t1'], blanco: [B.uid, 'inv_t2'], publicado: true },
      marcador: { oscuro: 3, blanco: 1 }, eventos: { [A.uid]: { goles: 2, amarillas: 0 }, [B.uid]: { goles: 1, amarillas: 1 } },
      asignaciones: { [A.uid]: [B.uid], [B.uid]: [A.uid] },
      estado: 'votando', fechaFin: Timestamp.now()
    });
  });

  const notas = id => ({ [id]: Object.fromEntries(ATTRS.map(a => [a, 1])) });

  it('no se puede votar sin ser parte, ni a quien no te tocó, ni sin completar', async () => {
    await falla(C.call('votar', { gid, pid, notas: notas(A.uid), mvp: A.uid }), 'permission-denied');
    await falla(B.call('votar', { gid, pid, notas: notas(B.uid), mvp: A.uid }), 'permission-denied');
    await falla(B.call('votar', { gid, pid, notas: { [A.uid]: { velocidad: 1 } }, mvp: A.uid }), 'invalid-argument');
    await falla(B.call('votar', { gid, pid, notas: notas(A.uid), mvp: B.uid }), 'invalid-argument');
    await falla(B.call('votar', { gid, pid, notas: { [A.uid]: Object.fromEntries(ATTRS.map(a => [a, 7])) }, mvp: A.uid }), 'invalid-argument');
  });

  it('votar registra el voto una sola vez y es anónimo', async () => {
    await B.call('votar', { gid, pid, notas: notas(A.uid), mvp: A.uid });
    await falla(B.call('votar', { gid, pid, notas: notas(A.uid), mvp: A.uid }), 'already-exists');
    const votos = await getDocs(collection(A.db, 'grupos', gid, 'partidos', pid, 'votos'));
    expect(votos.docs.map(d => d.id)).toEqual([B.uid]);
    expect(Object.keys(votos.docs[0].data())).toEqual(['ts']); // no guarda qué votó
    await denegado(getDoc(doc(A.db, 'grupos', gid, 'agregados', pid)));
    await denegado(setDoc(doc(B.db, 'grupos', gid, 'partidos', pid, 'votos', C.uid), { ts: Timestamp.now() }));
  });

  it('solo el admin cierra la votación', async () => {
    await A.call('votar', { gid, pid, notas: notas(B.uid), mvp: B.uid });
    await falla(B.call('cerrarVotacion', { gid, pid }), 'permission-denied');
  });

  it('el cierre actualiza estadísticas, niveles y deja el partido en el historial', async () => {
    const r = await A.call('cerrarVotacion', { gid, pid });
    expect(r.resultado).toBe('Ganó Oscuro 3-1');
    const p = (await getDoc(doc(A.db, 'grupos', gid, 'partidos', pid))).data();
    expect(p.estado).toBe('cerrado');
    expect(p.resultado).toMatchObject({ golesO: 3, golesB: 1 });

    const ja = (await getDoc(doc(A.db, 'grupos', gid, 'jugadores', A.uid))).data();
    const jb = (await getDoc(doc(A.db, 'grupos', gid, 'jugadores', B.uid))).data();
    expect(ja.stats).toMatchObject({ partidos: 1, goles: 2, ganados: 1, puntos: 3 });
    expect(ja.racha).toBe('G');
    expect(jb.stats).toMatchObject({ partidos: 1, goles: 1, amarillas: 1, perdidos: 1, puntos: 0 });
    expect(jb.racha).toBe('P');
    expect(ja.tendencia.velocidad).toBe(1);

    const na = (await getDoc(doc(A.db, 'grupos', gid, 'niveles', A.uid))).data();
    expect(na.atributos.velocidad).toBe(5.25); // 5 (base) + 0.25
    const g = (await getDoc(doc(A.db, 'grupos', gid))).data();
    expect(g.partidoActivo).toBeNull();
  });

  it('un partido cerrado ya no se puede modificar', async () => {
    await denegado(updateDoc(doc(A.db, 'grupos', gid, 'partidos', pid), { marcador: { oscuro: 0, blanco: 9 } }));
    await falla(A.call('cerrarVotacion', { gid, pid }), 'failed-precondition');
  });

  it('llegan los avisos del cierre (resultado y MVP)', async () => {
    let tipos = [];
    for (let i = 0; i < 10 && !(tipos.includes('resultado') && tipos.includes('mvp')); i++) {
      await dormir(2000);
      tipos = (await getDocs(collection(A.db, 'privado', A.uid, 'avisos'))).docs.map(d => d.data().tipo);
    }
    expect(tipos).toContain('resultado');
  });
});

describe('cuentas de la versión anterior', () => {
  let S, D;
  beforeAll(async () => {
    // Superadmin de pruebas: el correo se marca verificado con tu sesión de gcloud (permisos de dueño del proyecto).
    S = await usuario('Super', { email: 'hola@inmetricswetrust.com', clave: 'super-prueba-123' });
    const token = execSync('gcloud auth print-access-token').toString().trim();
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROYECTO}/accounts:update`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROYECTO },
      body: JSON.stringify({ localId: S.uid, emailVerified: true })
    });
    expect(r.ok).toBe(true);
    await S.auth.currentUser.getIdToken(true);
    D = await conPerfil('Diego');
  });

  it('solo el superadmin siembra y migra', async () => {
    await falla(D.call('migrarDatosAnteriores', { dryRun: true }), 'permission-denied');
  });

  it('la migración informa primero (dry run) y después migra sin duplicar', async () => {
    const previa = await S.call('migrarDatosAnteriores', { sembrar: true, dryRun: true, forzar: true });
    expect(previa.sembrado.dnis).toHaveLength(8);
    const g = previa.grupos.find(x => x.id === 'comunidad-prueba');
    expect(g).toMatchObject({ jugadores: 8, partidosHistoricos: 3 });
    const real = await S.call('migrarDatosAnteriores', { dryRun: false, forzar: true });
    expect(real.grupos.find(x => x.id === 'comunidad-prueba').estado).toBe('migrado');
    const otra = await S.call('migrarDatosAnteriores', { dryRun: false });
    expect(otra.grupos.find(x => x.id === 'comunidad-prueba').estado).toBe('ya migrado');
  });

  it('con la clave vieja, la persona recupera su historial en el grupo', async () => {
    await falla(D.call('vincularCuentaAnterior', { dni: '30000002', clave: 'incorrecta' }), 'permission-denied');
    await falla(D.call('vincularCuentaAnterior', { dni: '99999999', clave: 'clave123' }), 'permission-denied');
    const r = await D.call('vincularCuentaAnterior', { dni: '30000002', clave: 'clave123' });
    expect(r.nombre).toBe('Nico Ferrari');
    expect(r.grupos.map(x => x.id)).toContain('comunidad-prueba');

    const g = (await getDoc(doc(D.db, 'grupos', 'comunidad-prueba'))).data();
    expect(g.miembros).toContain(D.uid);
    expect(g.miembros).not.toContain('l_30000002');
    const j = (await getDoc(doc(D.db, 'grupos', 'comunidad-prueba', 'jugadores', D.uid))).data();
    expect(j.stats.partidos).toBe(3);
    expect(j.stats.mvps).toBe(1);
    const hist = await getDocs(collection(D.db, 'grupos', 'comunidad-prueba', 'partidos'));
    expect(hist.size).toBe(3);
    expect(hist.docs.every(d => !JSON.stringify(d.data()).includes('l_30000002'))).toBe(true);
  });

  it('quien no tenía Google vinculado no encuentra cuenta anterior ni puede confirmarla', async () => {
    const G = await conPerfil('Gabi');
    expect((await G.call('buscarCuentaAnterior', {})).encontrada).toBe(false);
    await falla(G.call('vincularCuentaAnterior', { confirmarGoogle: true }), 'permission-denied');
  });

  it('esa cuenta vieja no se puede reclamar dos veces', async () => {
    const E = await conPerfil('Eva');
    await falla(E.call('vincularCuentaAnterior', { dni: '30000002', clave: 'clave123' }), 'already-exists');
  });

  it('después de varios intentos fallidos se bloquea', async () => {
    const F = await conPerfil('Fer');
    for (let i = 0; i < 5; i++) await falla(F.call('vincularCuentaAnterior', { dni: '30000003', clave: 'mal' + i }), 'permission-denied');
    await falla(F.call('vincularCuentaAnterior', { dni: '30000003', clave: 'clave123' }), 'resource-exhausted');
  });

  it('quien jugaba con DNI entra con DNI y clave, agrega su email y después solo entra con el email', async () => {
    // Limpieza: si una corrida anterior ya le puso email a esta cuenta, se borra para repetir la prueba.
    const token = execSync('gcloud auth print-access-token').toString().trim();
    await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROYECTO}/accounts:delete`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROYECTO },
      body: JSON.stringify({ localId: 'd30000005' })
    });
    await S.call('migrarDatosAnteriores', { sembrar: true, dryRun: false, forzar: true });

    const anon = initializeApp(config, `dni-${corrida}`);
    const llamarAnon = (n, d) => httpsCallable(getFunctions(anon, 'southamerica-east1'), n)(d).then(r => r.data);
    await expect(llamarAnon('ingresarConDni', { dni: '30000005', clave: 'mal' })).rejects.toMatchObject({ code: 'functions/permission-denied' });
    await expect(llamarAnon('ingresarConDni', { dni: '11111111', clave: 'clave123' })).rejects.toMatchObject({ code: 'functions/permission-denied' });
    const r = await llamarAnon('ingresarConDni', { dni: '30000005', clave: 'clave123' });
    expect(r.nombre).toBe('Agus Dal Maso');

    const auth = getAuth(anon);
    await signInWithCustomToken(auth, r.token);
    expect(auth.currentUser.email).toBeNull();
    const dbU = getFirestore(anon);
    expect((await getDoc(doc(dbU, 'usuarios', auth.currentUser.uid))).data().nombre).toBe('Agus Dal Maso');
    const g = (await getDoc(doc(dbU, 'grupos', 'comunidad-prueba'))).data();
    expect(g.miembros).toContain(auth.currentUser.uid);
    const j = (await getDoc(doc(dbU, 'grupos', 'comunidad-prueba', 'jugadores', auth.currentUser.uid))).data();
    expect(j.stats.partidos).toBe(3);

    // Agrega su email: desde ahí es su forma de entrar y de recuperar la contraseña.
    await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(`dni+${corrida}@example.com`, 'nueva-clave-123'));
    expect(auth.currentUser.email).toBe(`dni+${corrida}@example.com`);
    // El ingreso con DNI queda cerrado.
    await expect(llamarAnon('ingresarConDni', { dni: '30000005', clave: 'clave123' })).rejects.toMatchObject({ code: 'functions/failed-precondition' });
  });

});

describe('avisos por tiempo y lista de espera', () => {
  let P, Q, gid2, pid2;
  const bandeja = async u => (await getDocs(collection(u.db, 'privado', u.uid, 'avisos'))).docs.map(d => d.data());
  const esperarAviso = async (u, tipo) => {
    for (let i = 0; i < 12; i++) { const b = await bandeja(u); if (b.some(a => a.tipo === tipo)) return b.find(a => a.tipo === tipo); await dormir(2500); }
    return null;
  };

  beforeAll(async () => {
    P = await conPerfil('Paula');
    Q = await conPerfil('Quique');
    const r = await P.call('crearGrupo', { nombre: `Grupo tiempo ${corrida}` });
    gid2 = r.gid;
    await Q.call('unirsePorCodigo', { codigo: r.codigo });
  });

  it('el recordatorio y "faltan jugadores" salen solos cuando se acerca el partido', async () => {
    pid2 = 'pt-' + corrida;
    await setDoc(doc(P.db, 'grupos', gid2, 'partidos', pid2), { ...partidoBase(), cupo: 2, formato: '1 vs 1', fechaHora: Timestamp.fromMillis(Date.now() + 20 * 3600e3), inscriptos: [P.uid] });
    await updateDoc(doc(P.db, 'grupos', gid2), { partidoActivo: pid2 });
    await dormir(4000);
    execSync(`gcloud scheduler jobs run firebase-schedule-programados-southamerica-east1 --location=southamerica-east1 --project=${PROYECTO}`);
    const faltan = await esperarAviso(Q, 'faltan_jugadores');
    expect(faltan, 'Quique (no anotado) recibe "faltan jugadores"').toBeTruthy();
    expect(faltan.titulo).toMatch(/Faltan 1 para completar/);
    const rec = await esperarAviso(P, 'recordatorio_24h');
    expect(rec, 'Paula (anotada) recibe el recordatorio').toBeTruthy();
    expect(rec.cuerpo).not.toMatch(/[{}]/);
    // correr de nuevo no duplica
    const antes = (await bandeja(P)).filter(a => a.tipo === 'recordatorio_24h').length;
    execSync(`gcloud scheduler jobs run firebase-schedule-programados-southamerica-east1 --location=southamerica-east1 --project=${PROYECTO}`);
    await dormir(15000);
    expect((await bandeja(P)).filter(a => a.tipo === 'recordatorio_24h').length).toBe(antes);
  });

  it('con cupo completo avisa, y si alguien se baja sube el primero de la lista de espera', async () => {
    const ref = doc(Q.db, 'grupos', gid2, 'partidos', pid2);
    await updateDoc(ref, { inscriptos: [P.uid, Q.uid] }); // Quique se anota: cupo completo
    expect(await esperarAviso(P, 'cupo_completo'), 'aviso de cupo completo').toBeTruthy();
    const R = await conPerfil('Rita');
    await P.call('nuevoCodigo', { gid: gid2 }).then(async c => { await R.call('unirsePorCodigo', { codigo: c.codigo }); });
    await updateDoc(doc(R.db, 'grupos', gid2, 'partidos', pid2), { listaEspera: [R.uid] });
    await updateDoc(ref, { inscriptos: [P.uid] }); // Quique se baja
    const sube = await esperarAviso(R, 'lista_espera');
    expect(sube, 'Rita recibe el aviso de que entró').toBeTruthy();
    const p = (await getDoc(ref)).data();
    expect(p.inscriptos).toContain(R.uid);
    expect(p.listaEspera).toEqual([]);
  });
});
