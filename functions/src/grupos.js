import { onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { db, Timestamp, FieldValue, HttpsError, REGION, URL_APP, SUPER_EMAILS, requireAuth, requireAdmin, requireSuper, crearCodigoUnico, lotes } from './util.js';
import { statsVacias, hashPwdLegacy, deepReplace, cambio, varsPartido, esPendiente, esUid } from './puro.js';
import { AUD } from './compartido/catalogo.js';
import { disparar, entregar, audiencia, ONESIGNAL_API_KEY } from './avisos.js';

const opts = { region: REGION, cors: true, maxInstances: 20 };
const MAX_GRUPOS = 10;
const HORA = 3600000;

// Intentos fallidos por hora: se cuentan en un documento aparte (cerrado al cliente).
async function leerIntentos(ref) {
  const i = (await ref.get()).data() || { n: 0, desde: Date.now() };
  return { n: i.n, desde: i.desde, vigente: Date.now() - i.desde < HORA };
}
const sumarFallo = (ref, i) => ref.set({ n: i.vigente ? i.n + 1 : 1, desde: i.vigente ? i.desde : Date.now() });


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
  const iCod = db.doc(`intentosCodigo/${uid}`);
  const ic = await leerIntentos(iCod);
  if (ic.vigente && ic.n >= 10) throw new HttpsError('resource-exhausted', 'Demasiados intentos con códigos. Probá de nuevo en una hora.');
  const c = await db.doc(`codigos/${codigo}`).get();
  if (!c.exists) {
    await sumarFallo(iCod, ic);
    throw new HttpsError('not-found', 'No encontramos ese código. Revisá que esté bien escrito.');
  }
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
  const actual = await uref.get();
  if (!actual.exists) {
    await uref.set({ nombre: ld.nombre || 'Jugador', apodo: ld.apodo || '', foto: ld.foto || '', creadoEn: Timestamp.now() });
  } else if (!actual.data().foto && ld.foto && String(ld.foto).length <= 30000) {
    await uref.update({ foto: ld.foto }); // trae la foto de la versión anterior si todavía no tiene una
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

  throw new HttpsError('failed-precondition', 'El ingreso con DNI y clave ya no está disponible. Pedí que te unan a tu historial desde la app.');
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


// Borra un grupo con todo lo que tiene (partidos, jugadores, niveles, invitados) y su código. Solo el creador.
async function borrarGrupoCompleto(gref, g) {
  if (g.codigo) await db.doc(`codigos/${g.codigo}`).delete().catch(() => {});
  await db.recursiveDelete(gref);
}
export const borrarGrupo = onCall(opts, async req => {
  const uid = requireAuth(req);
  const gid = String(req.data?.gid || '');
  if (!gid) throw new HttpsError('invalid-argument', 'Falta el grupo.');
  if (req.data?.confirmar !== 'BORRAR') throw new HttpsError('invalid-argument', 'Escribí BORRAR para confirmar.');
  const gref = db.doc(`grupos/${gid}`);
  const gs = await gref.get();
  if (!gs.exists) throw new HttpsError('not-found', 'El grupo no existe.');
  const g = gs.data();
  if (g.creadorUid !== uid) throw new HttpsError('permission-denied', 'Solo quien creó el grupo puede borrarlo.');
  await borrarGrupoCompleto(gref, g);
  console.log(`borrarGrupo: ${gid} por ${uid}`);
  return { ok: true };
});

// Borra la cuenta de quien la pide: su perfil, sus datos privados y su acceso. En los grupos deja el historial
// sin su nombre; si era creador y hay más gente, el rol pasa a otra persona; si quedaba solo, se borra el grupo.
export const borrarMiCuenta = onCall({ ...opts, timeoutSeconds: 300 }, async req => {
  const uid = requireAuth(req);
  if (req.data?.confirmar !== 'BORRAR') throw new HttpsError('invalid-argument', 'Escribí BORRAR para confirmar.');
  const gs = await db.collection('grupos').where('miembros', 'array-contains', uid).get();
  for (const gd of gs.docs) {
    const g = gd.data();
    const otros = (g.miembros || []).filter(m => m !== uid);
    if (g.creadorUid === uid && otros.length === 0) { await borrarGrupoCompleto(gd.ref, g); continue; }
    if (g.creadorUid === uid && otros.every(m => esPendiente(m))) {
      throw new HttpsError('failed-precondition', `Sos quien creó "${g.nombre}" y los demás todavía no entraron con su cuenta. Borrá el grupo desde Grupo, o esperá a que otra persona entre, y después borrá tu cuenta.`);
    }
    const admins = (g.admins || []).filter(a => a !== uid);
    let creadorUid = g.creadorUid;
    if (creadorUid === uid) {
      creadorUid = admins.find(a => !esPendiente(a)) || otros.find(m => !esPendiente(m));
      if (!admins.includes(creadorUid)) admins.push(creadorUid);
    }
    await gd.ref.update({ miembros: otros, admins, creadorUid });
    // Se quita de lo que está abierto y el historial queda a nombre de "Jugador anterior".
    const abiertos = await gd.ref.collection('partidos').where('estado', '==', 'abierto').get();
    for (const pd of abiertos.docs) await pd.ref.update({ inscriptos: FieldValue.arrayRemove(uid), cena: FieldValue.arrayRemove(uid), listaEspera: FieldValue.arrayRemove(uid) });
    await gd.ref.collection('jugadores').doc(uid).set({ nombre: 'Jugador anterior', apodo: '', foto: '' }, { merge: true });
    await gd.ref.collection('niveles').doc(uid).delete().catch(() => {});
  }
  await Promise.all([`intentosVinculo/${uid}`, `intentosCodigo/${uid}`, `usuarios/${uid}`].map(r => db.doc(r).delete().catch(() => {})));
  await db.recursiveDelete(db.doc(`privado/${uid}`));
  try { await getAuth().deleteUser(uid); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
  console.log(`borrarMiCuenta: ${uid}`);
  return { ok: true };
});


// ---------- Pedir que te unan a tu historial anterior ----------
// Reemplaza al ingreso con DNI y clave: la persona crea su cuenta normal y pide que la unan a su jugador de antes.
// Un admin del grupo (que la conoce) o el dueño de la plataforma lo confirma. Nadie recibe información sobre los DNI.
const nombreCorto = n => { const p = String(n || 'Jugador').split(' ').filter(Boolean); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : (p[0] || 'Jugador'); };

export const solicitarVinculo = onCall(opts, async req => {
  const uid = requireAuth(req);
  const dni = String(req.data?.dni || '').replace(/\D/g, '');
  if (dni.length < 6 || dni.length > 9) throw new HttpsError('invalid-argument', 'Revisá el DNI: tiene que tener entre 6 y 9 números.');
  if ((await db.doc(`privado/${uid}`).get()).data()?.legacyDni) throw new HttpsError('failed-precondition', 'Tu cuenta ya tiene un historial unido.');
  // Hasta 5 pedidos por hora por cuenta: evita usar esto para probar DNI.
  const ic = db.doc(`intentosSolicitud/${uid}`);
  const i = await leerIntentos(ic);
  if (i.vigente && i.n >= 5) throw new HttpsError('resource-exhausted', 'Hiciste varios pedidos seguidos. Probá de nuevo en una hora.');
  await sumarFallo(ic, i);

  // La respuesta es siempre la misma exista o no el DNI, para no revelar quién jugaba antes.
  const l = await db.doc(`app8_users/${dni}`).get();
  const ld = l.exists ? l.data() : null;
  if (ld && (!ld.nuevoUid || ld.nuevoUid === uid)) {
    const gs = await db.collection('grupos').where('miembros', 'array-contains', `l_${dni}`).get();
    const gids = gs.docs.map(d => d.id);
    const perfil = (await db.doc(`usuarios/${uid}`).get()).data() || {};
    await db.doc(`solicitudesVinculo/${uid}`).set({ uid, dni, nombreAnterior: ld.nombre || 'Jugador', solicitante: perfil.nombre || '', gids, estado: 'pendiente', creadoEn: Timestamp.now() });
    // Aviso en la bandeja de los admins de esos grupos.
    const admins = new Set();
    gs.docs.forEach(d => (d.data().admins || []).filter(a => esUid(a)).forEach(a => admins.add(a)));
    for (const a of admins) {
      await db.doc(`privado/${a}/avisos/solicitud_${uid}`).create({
        tipo: 'solicitud_vinculo', titulo: `${perfil.nombre || 'Alguien'} pide unirse a su historial`,
        cuerpo: `Dice ser ${nombreCorto(ld.nombre)} de la versión anterior. Confirmalo en Grupo → Pedidos para unir cuentas.`,
        gid: gids[0] || null, pid: null, creadoEn: Timestamp.now(), leido: false
      }).catch(() => {});
    }
  }
  return { ok: true };
});

async function pedidosDe(gid) {
  const q = await db.collection('solicitudesVinculo').where('gids', 'array-contains', gid).get();
  return q.docs.map(d => d.data()).filter(x => x.estado === 'pendiente');
}
async function conEmail(items) {
  const auth = getAuth();
  return Promise.all(items.map(async x => {
    let email = '';
    try { email = (await auth.getUser(x.uid)).email || ''; } catch { /* la cuenta ya no existe */ }
    return { uid: x.uid, nombreAnterior: x.nombreAnterior, dniFin: x.dni.slice(-3), solicitante: x.solicitante, email, creadoEn: x.creadoEn?.toMillis?.() || 0 };
  }));
}

// Pedidos pendientes: los de un grupo (si sos admin de ese grupo) o todos (si sos el dueño de la plataforma).
export const listarSolicitudes = onCall(opts, async req => {
  if (req.data?.todos) {
    requireSuper(req);
    const q = await db.collection('solicitudesVinculo').get();
    return { pedidos: await conEmail(q.docs.map(d => d.data()).filter(x => x.estado === 'pendiente')) };
  }
  const { gref } = await requireAdmin(req, req.data?.gid);
  return { pedidos: await conEmail(await pedidosDe(gref.id)) };
});

export const resolverSolicitud = onCall(opts, async req => {
  const quien = requireAuth(req);
  const uid = String(req.data?.uid || '');
  const aprobar = !!req.data?.aprobar;
  const sref = db.doc(`solicitudesVinculo/${uid}`);
  const ss = await sref.get();
  if (!ss.exists || ss.data().estado !== 'pendiente') throw new HttpsError('not-found', 'Ese pedido ya no está pendiente.');
  const x = ss.data();
  // Puede resolverlo un admin de alguno de los grupos del jugador anterior, o el dueño de la plataforma.
  const t = req.auth.token || {};
  const esDueno = !!t.email_verified && SUPER_EMAILS.includes(String(t.email || '').toLowerCase());
  let esAdminDelGrupo = false;
  if (!esDueno) {
    for (const gid of x.gids || []) {
      const g = (await db.doc(`grupos/${gid}`).get()).data();
      if (g && (g.admins || []).includes(quien)) { esAdminDelGrupo = true; break; }
    }
  }
  if (!esDueno && !esAdminDelGrupo) throw new HttpsError('permission-denied', 'Solo un admin del grupo puede resolver este pedido.');
  if (quien === uid) throw new HttpsError('permission-denied', 'No podés aprobar tu propio pedido.');

  if (!aprobar) {
    await sref.update({ estado: 'rechazada', resueltoPor: quien, resueltoEn: Timestamp.now() });
    return { ok: true, aprobada: false };
  }
  const l = await db.doc(`app8_users/${x.dni}`).get();
  if (!l.exists) throw new HttpsError('not-found', 'No encontramos al jugador anterior.');
  const ld = l.data();
  if (ld.nuevoUid && ld.nuevoUid !== uid) throw new HttpsError('already-exists', 'Ese jugador anterior ya está unido a otra cuenta.');
  const previo = (await db.doc(`privado/${uid}`).get()).data()?.legacyDni;
  if (previo && previo !== x.dni) throw new HttpsError('already-exists', 'Esa cuenta ya tiene otro historial unido.');
  const r = await completarVinculo(uid, x.dni, ld);
  await sref.update({ estado: 'aprobada', resueltoPor: quien, resueltoEn: Timestamp.now() });
  await db.doc(`privado/${uid}/avisos/vinculo_${uid}`).set({
    tipo: 'vinculo', titulo: 'Recuperamos tu historial', cuerpo: 'Un admin confirmó que sos vos. Tus partidos, goles y MVP ya están en tu cuenta.',
    gid: r.grupos[0]?.id || null, pid: null, creadoEn: Timestamp.now(), leido: false
  }).catch(() => {});
  console.log(`resolverSolicitud: aprobada ${uid} <- ${x.dni.slice(0, 2)}***${x.dni.slice(-2)} por ${quien}`);
  return { ok: true, aprobada: true, nombre: ld.nombre || 'Jugador', grupos: r.grupos };
});
