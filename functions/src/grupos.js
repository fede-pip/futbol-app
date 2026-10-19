import { onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { db, Timestamp, HttpsError, REGION, URL_APP, requireAuth, requireAdmin, requireSuper, crearCodigoUnico, lotes } from './util.js';
import { statsVacias, hashPwdLegacy, deepReplace, cambio, varsPartido } from './puro.js';
import { AUD } from './compartido/catalogo.js';
import { disparar, entregar, audiencia, ONESIGNAL_API_KEY } from './avisos.js';

const opts = { region: REGION, cors: true };
const MAX_GRUPOS = 10;

export const crearGrupo = onCall(opts, async req => {
  const uid = requireAuth(req);
  const nombre = String(req.data?.nombre || '').trim();
  if (nombre.length < 2 || nombre.length > 60) throw new HttpsError('invalid-argument', 'Poné un nombre de entre 2 y 60 letras.');
  const foto = String(req.data?.foto || '').slice(0, 600);
  const perfil = await db.doc(`usuarios/${uid}`).get();
  if (!perfil.exists) throw new HttpsError('failed-precondition', 'Completá tu perfil antes de crear un grupo.');
  const cuantos = await db.collection('grupos').where('miembros', 'array-contains', uid).count().get();
  if (cuantos.data().count >= MAX_GRUPOS) throw new HttpsError('resource-exhausted', `Podés estar en hasta ${MAX_GRUPOS} grupos.`);

  const gref = db.collection('grupos').doc();
  const codigo = await crearCodigoUnico(gref.id);
  const p = perfil.data();
  const batch = db.batch();
  batch.set(gref, {
    nombre, foto, deporte: 'futbol', creadorUid: uid, admins: [uid], miembros: [uid], codigo,
    precioCancha: 0, pozo: 0, partidoActivo: null, avisos: {}, silencio: { on: true, desde: 23, hasta: 8 }, maxDia: 3,
    creadoEn: Timestamp.now()
  });
  batch.set(gref.collection('jugadores').doc(uid), { nombre: p.nombre, apodo: p.apodo || '', foto: p.foto || '', stats: statsVacias(), racha: '', tendencia: {}, desde: Timestamp.now() });
  batch.set(gref.collection('niveles').doc(uid), { atributos: {}, previos: {} });
  await batch.commit();
  return { gid: gref.id, codigo };
});

export const nuevoCodigo = onCall(opts, async req => {
  const { gref, g } = await requireAdmin(req, req.data?.gid);
  const codigo = await crearCodigoUnico(gref.id);
  if (g.codigo) await db.doc(`codigos/${g.codigo}`).delete().catch(() => {});
  await gref.update({ codigo });
  return { codigo };
});

export const unirsePorCodigo = onCall({ ...opts, secrets: [ONESIGNAL_API_KEY] }, async req => {
  const uid = requireAuth(req);
  const codigo = String(req.data?.codigo || '').trim().toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z0-9-]{5,12}$/.test(codigo)) throw new HttpsError('invalid-argument', 'Ese código no es válido.');
  const c = await db.doc(`codigos/${codigo}`).get();
  if (!c.exists) throw new HttpsError('not-found', 'No encontramos ese código. Revisá que esté bien escrito.');
  const gid = c.data().gid;
  const gref = db.doc(`grupos/${gid}`);
  const uref = db.doc(`usuarios/${uid}`);
  let nuevo = false, nombreGrupo = '';
  await db.runTransaction(async tx => {
    const [gs, us] = await Promise.all([tx.get(gref), tx.get(uref)]);
    if (!gs.exists) throw new HttpsError('not-found', 'Ese grupo ya no existe.');
    if (!us.exists) throw new HttpsError('failed-precondition', 'Completá tu perfil antes de unirte.');
    const g = gs.data();
    nombreGrupo = g.nombre;
    if ((g.miembros || []).includes(uid)) return;
    if ((g.miembros || []).length >= 60) throw new HttpsError('resource-exhausted', 'El grupo está completo.');
    const p = us.data();
    tx.update(gref, { miembros: [...g.miembros, uid] });
    tx.set(gref.collection('jugadores').doc(uid), { nombre: p.nombre, apodo: p.apodo || '', foto: p.foto || '', stats: statsVacias(), racha: '', tendencia: {}, desde: Timestamp.now() });
    tx.set(gref.collection('niveles').doc(uid), { atributos: {}, previos: {} });
    nuevo = true;
  });
  if (nuevo) {
    const nombre = ((await uref.get()).data()?.nombre || '').split(' ')[0];
    await disparar(gid, 'nuevo_miembro', { personaUid: uid, excluir: [uid], vars: { nombre }, clave: uid });
    await disparar(gid, 'bienvenida', { personaUids: [uid], clave: uid });
  }
  return { gid, nombre: nombreGrupo, nuevo };
});

// Pasa a una persona real (uid) todo lo que estaba a nombre de su perfil pendiente (l_DNI).
async function reasignarJugador(desde, hacia) {
  const gs = await db.collection('grupos').where('miembros', 'array-contains', desde).get();
  const out = [];
  for (const gd of gs.docs) {
    const gref = gd.ref;
    const ops = [];
    for (const col of ['jugadores', 'niveles']) {
      const s = await gref.collection(col).doc(desde).get();
      if (s.exists) {
        ops.push(b => b.set(gref.collection(col).doc(hacia), s.data(), { merge: true }));
        ops.push(b => b.delete(s.ref));
      }
    }
    const g2 = deepReplace(gd.data(), desde, hacia);
    g2.miembros = [...new Set(g2.miembros)];
    g2.admins = [...new Set(g2.admins)];
    ops.push(b => b.set(gref, g2));
    const ps = await gref.collection('partidos').get();
    for (const pd of ps.docs) {
      const d = pd.data(), d2 = deepReplace(d, desde, hacia);
      if (cambio(d, d2)) ops.push(b => b.set(pd.ref, d2));
    }
    await lotes(ops);
    out.push({ id: gd.id, nombre: gd.data().nombre });
  }
  return out;
}

// Deja a la persona (uid) como dueña del perfil anterior (DNI): perfil, vínculo y reasignación de datos.
async function completarVinculo(uid, dni, ld) {
  const lref = db.doc(`app8_users/${dni}`);
  const uref = db.doc(`usuarios/${uid}`);
  if (!(await uref.get()).exists) {
    await uref.set({ nombre: ld.nombre || 'Jugador', apodo: ld.apodo || '', foto: ld.foto || '', creadoEn: Timestamp.now() });
  }
  await db.doc(`privado/${uid}`).set({ legacyDni: dni, onboarding: { anterior: true } }, { merge: true });
  await lref.update({ nuevoUid: uid, vinculadoEn: Timestamp.now() });
  const grupos = await reasignarJugador(`l_${dni}`, uid);
  return { nombre: ld.nombre, grupos };
}

// Para el dueño de la plataforma: deja a una persona con su historial anterior (DNI) y un acceso con email, sin pedirle
// la clave de antes. Si ya creó una cuenta con ese email, se la une. Si no, se le crea el acceso y se devuelve un enlace
// para que elija su contraseña (se lo manda el dueño por WhatsApp).
export const vincularManual = onCall(opts, async req => {
  const quien = requireSuper(req);
  const dni = String(req.data?.dni || '').replace(/\D/g, '');
  const email = String(req.data?.email || '').trim().toLowerCase();
  if (dni.length < 6 || dni.length > 9 || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError('invalid-argument', 'Completá el DNI y un email válido.');
  const l = await db.doc(`app8_users/${dni}`).get();
  if (!l.exists) throw new HttpsError('not-found', `No encontramos una cuenta anterior con el DNI ${dni}.`);
  const ld = l.data();
  const auth = getAuth();
  let u = null, creado = false;
  try { u = await auth.getUserByEmail(email); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
  if (!u) {
    // No hay cuenta con ese email: se le crea el acceso (o se completa el que ya tenía por DNI, sin email).
    const uidDni = `d${dni}`;
    let existente = null;
    try { existente = await auth.getUser(uidDni); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
    if (existente && existente.email) throw new HttpsError('already-exists', `Esa persona ya tiene un acceso con el email ${existente.email}.`);
    u = existente ? await auth.updateUser(uidDni, { email, emailVerified: false })
      : await auth.createUser({ uid: uidDni, email, displayName: ld.nombre || 'Jugador' });
    creado = true;
  }
  // Si ya había entrado con el DNI (cuenta sin email), su historial está en esa cuenta: se pasa a esta.
  let desde = null;
  if (ld.nuevoUid && ld.nuevoUid !== u.uid) {
    const du = await auth.getUser(ld.nuevoUid).catch(() => null);
    if (!du || du.email) throw new HttpsError('already-exists', 'Esa cuenta anterior ya se pasó a otra cuenta con email.');
    desde = ld.nuevoUid;
  }
  const previo = (await db.doc(`privado/${u.uid}`).get()).data()?.legacyDni;
  if (previo && previo !== dni) throw new HttpsError('already-exists', 'Esa cuenta con email ya tiene otro historial vinculado.');
  const r = await completarVinculo(u.uid, dni, ld);
  let grupos = r.grupos;
  if (desde) {
    grupos = await reasignarJugador(desde, u.uid);
    await auth.updateUser(desde, { disabled: true }).catch(() => {}); // la cuenta por DNI queda sin uso
  }
  const enlace = await auth.generatePasswordResetLink(email, { url: URL_APP });
  console.log(`vincularManual: DNI ${dni.slice(0, 2)}***${dni.slice(-2)} -> ${u.uid} (${creado ? 'acceso creado' : 'cuenta existente'}) por ${quien}`);
  return { nombre: ld.nombre || 'Jugador', grupos, creado, enlace };
});

// Quien ya entraba con Google en la versión anterior tiene su cuenta vinculada (app8_uid_map):
// la reconocemos y solo le pedimos que confirme que es él o ella.
async function cuentaAnteriorDeGoogle(uid) {
  const m = await db.doc(`app8_uid_map/${uid}`).get();
  if (!m.exists) return null;
  const dni = String(m.data().dni || '');
  const l = dni ? await db.doc(`app8_users/${dni}`).get() : null;
  if (!l || !l.exists) return null;
  const ld = l.data();
  if (ld.nuevoUid && ld.nuevoUid !== uid) return null;
  return { dni, ld };
}

export const buscarCuentaAnterior = onCall(opts, async req => {
  const uid = requireAuth(req);
  if ((await db.doc(`privado/${uid}`).get()).data()?.legacyDni) return { encontrada: false };
  const c = await cuentaAnteriorDeGoogle(uid);
  if (!c) return { encontrada: false };
  return { encontrada: true, nombre: c.ld.nombre || 'Jugador', dniParcial: `•••${c.dni.slice(-3)}` };
});

export const vincularCuentaAnterior = onCall(opts, async req => {
  const uid = requireAuth(req);

  // Camino 1: confirmó que es la cuenta de Google que ya tenía vinculada.
  if (req.data?.confirmarGoogle) {
    if (req.auth.token?.firebase?.sign_in_provider !== 'google.com') throw new HttpsError('permission-denied', 'Para esto tenés que ingresar con Google.');
    const c = await cuentaAnteriorDeGoogle(uid);
    if (!c) throw new HttpsError('not-found', 'No encontramos una cuenta anterior vinculada a tu Google.');
    return completarVinculo(uid, c.dni, c.ld);
  }

  // Camino 2: DNI y clave de siempre.
  const dni = String(req.data?.dni || '').replace(/\D/g, '');
  const clave = String(req.data?.clave || '');
  if (dni.length < 6 || dni.length > 9 || !clave) throw new HttpsError('invalid-argument', 'Completá tu DNI y tu clave.');

  // Máximo 5 intentos fallidos por hora y por persona.
  const iref = db.doc(`intentosVinculo/${uid}`);
  const ahora = Date.now();
  const i = (await iref.get()).data() || { n: 0, desde: ahora };
  const vigente = ahora - i.desde < 3600000;
  if (vigente && i.n >= 5) throw new HttpsError('resource-exhausted', 'Demasiados intentos. Probá de nuevo en una hora.');

  const l = await db.doc(`app8_users/${dni}`).get();
  const ld = l.exists ? l.data() : null;
  if (!ld || !ld.passHash || ld.passHash !== hashPwdLegacy(clave)) {
    await iref.set({ n: vigente ? i.n + 1 : 1, desde: vigente ? i.desde : ahora });
    throw new HttpsError('permission-denied', 'El DNI o la clave no coinciden.');
  }
  if (ld.nuevoUid && ld.nuevoUid !== uid) throw new HttpsError('already-exists', 'Esa cuenta ya se pasó a otro usuario.');
  await iref.delete().catch(() => {});
  return completarVinculo(uid, dni, ld);
});

// Ingreso de quien jugaba con DNI: una última vez con DNI y clave de siempre. Se le devuelve un
// acceso temporal y la app le pide que agregue un email, que pasa a ser su forma de entrar.
// Cuando la cuenta ya tiene email, este camino se cierra (la clave vieja es débil y no debe quedar
// como puerta trasera).
export const ingresarConDni = onCall(opts, async req => {
  const dni = String(req.data?.dni || '').replace(/\D/g, '');
  const clave = String(req.data?.clave || '');
  if (dni.length < 6 || dni.length > 9 || !clave) throw new HttpsError('invalid-argument', 'Completá tu DNI y tu clave.');

  // Máximo 5 intentos fallidos por hora por DNI.
  const iref = db.doc(`intentosDni/${dni}`);
  const ahora = Date.now();
  const i = (await iref.get()).data() || { n: 0, desde: ahora };
  const vigente = ahora - i.desde < 3600000;
  if (vigente && i.n >= 5) throw new HttpsError('resource-exhausted', 'Demasiados intentos con ese DNI. Probá de nuevo en una hora.');

  const lref = db.doc(`app8_users/${dni}`);
  const l = await lref.get();
  const ld = l.exists ? l.data() : null;
  if (!ld || !ld.passHash || ld.passHash !== hashPwdLegacy(clave)) {
    await iref.set({ n: vigente ? i.n + 1 : 1, desde: vigente ? i.desde : ahora });
    throw new HttpsError('permission-denied', 'El DNI o la clave no coinciden.');
  }

  const uid = `d${dni}`;
  if (ld.nuevoUid && ld.nuevoUid !== uid) throw new HttpsError('failed-precondition', 'Esa cuenta ya pasó a email. Ingresá con tu email.');
  const auth = getAuth();
  let existente = null;
  try { existente = await auth.getUser(uid); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
  if (existente && existente.email) throw new HttpsError('failed-precondition', 'Esa cuenta ya pasó a email. Ingresá con tu email.');
  if (!existente) await auth.createUser({ uid, displayName: ld.nombre || 'Jugador' });

  await iref.delete().catch(() => {});
  await completarVinculo(uid, dni, ld); // crea el perfil y le devuelve su lugar en los grupos (se puede repetir sin problema)
  const token = await auth.createCustomToken(uid);
  return { token, nombre: ld.nombre || 'Jugador' };
});

export const enviarAvisoManual = onCall({ ...opts, secrets: [ONESIGNAL_API_KEY] }, async req => {
  const { g, gref } = await requireAdmin(req, req.data?.gid);
  const gid = gref.id;
  const titulo = String(req.data?.titulo || '').trim().slice(0, 60);
  const cuerpo = String(req.data?.cuerpo || '').trim().slice(0, 160);
  const aud = (Array.isArray(req.data?.aud) ? req.data.aud : []).filter(k => AUD[k] && k !== 'persona');
  if (!titulo || !cuerpo || !aud.length) throw new HttpsError('invalid-argument', 'Completá el título, el mensaje y para quién es.');
  let partido = null;
  if (g.partidoActivo) {
    const s = await db.doc(`grupos/${gid}/partidos/${g.partidoActivo}`).get();
    if (s.exists) partido = { id: s.id, ...s.data() };
  }
  const ctx = { partido, clave: `manual_${Date.now()}`, quienTxt: aud.map(k => AUD[k][0]).join(', ') };
  const uids = await audiencia(gid, g, aud, ctx);
  if (!uids.length) throw new HttpsError('failed-precondition', 'No hay nadie en esa selección.');
  const vars = partido ? varsPartido(g, partido) : { comunidad: g.nombre };
  const r = await entregar(gid, g, { tipo: 'manual', titulo, cuerpo, uids, ctx: { ...ctx, vars }, auto: false });
  return r;
});
