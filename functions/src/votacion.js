import { onCall } from 'firebase-functions/v2/https';
import { db, FieldValue, Timestamp, HttpsError, REGION, requireMiembro, requireAdmin } from './util.js';
import { ATTRS, actualizarNiveles, paresDeTerna } from './compartido/logica.js';
import { esInvitado, esUid, statsVacias, calcularMvps, resultadoJugador, puntosDe, agregarRacha, rachaGanadora, ranking } from './puro.js';
import { disparar, ONESIGNAL_API_KEY } from './avisos.js';

const opts = { region: REGION, cors: true, maxInstances: 20 };

// Registra los votos de una persona. El servidor guarda solo totales: nadie (ni el admin)
// puede saber quién votó qué.
export const votar = onCall(opts, async req => {
  const { uid, gref } = await requireMiembro(req, req.data?.gid);
  const pid = String(req.data?.pid || '');
  const notas = req.data?.notas || {};
  const mvp = req.data?.mvp;
  const pref = gref.collection('partidos').doc(pid);
  const vref = pref.collection('votos').doc(uid);
  const aref = gref.collection('agregados').doc(pid);

  await db.runTransaction(async tx => {
    const [ps, vs] = await Promise.all([tx.get(pref), tx.get(vref)]);
    if (!ps.exists) throw new HttpsError('not-found', 'No encontramos el partido.');
    const p = ps.data();
    if (p.estado !== 'votando') throw new HttpsError('failed-precondition', 'La votación no está abierta.');
    if (p.fechaFin && Date.now() > p.fechaFin.toMillis() + 24 * 3600e3) throw new HttpsError('failed-precondition', 'Se terminó el plazo para votar.');
    if (!(p.inscriptos || []).includes(uid)) throw new HttpsError('permission-denied', 'Solo votan quienes jugaron.');
    if (vs.exists) throw new HttpsError('already-exists', 'Ya enviaste tus votos.');
    const ternas = (p.asignaciones || {})[uid] || [];
    if (!ternas.length) throw new HttpsError('failed-precondition', 'No tenés compañeros asignados para votar.');
    // Por cada terna y cada atributo: quién fue el que más, el que menos (el del medio queda implícito)
    // o nada si no los vio. El servidor verifica que sean justo los tres que le tocaban.
    for (let t = 0; t < ternas.length; t++) {
      const trio = ternas[t].j;
      const nt = notas[String(t)];
      if (!nt || typeof nt !== 'object') throw new HttpsError('invalid-argument', 'Faltan votos de un grupo de compañeros.');
      for (const a of ATTRS) {
        const v = nt[a.key];
        if (v === null) continue;
        if (!v || !trio.includes(v.mas) || !trio.includes(v.menos) || v.mas === v.menos) throw new HttpsError('invalid-argument', 'Voto inválido en ' + a.label + '.');
      }
    }
    if (!mvp || mvp === uid || !(p.inscriptos || []).includes(mvp)) throw new HttpsError('invalid-argument', 'Elegí un MVP entre tus compañeros.');

    const inc = FieldValue.increment;
    const cuenta = {};
    ternas.forEach((tr, t) => {
      for (const a of ATTRS) {
        const v = notas[String(t)][a.key];
        if (!v) continue;
        const medio = tr.j.find(x => x !== v.mas && x !== v.menos);
        for (const { g, p: pe } of paresDeTerna({ mas: v.mas, medio, menos: v.menos })) {
          cuenta[a.key] = cuenta[a.key] || {};
          const k = `${g}__${pe}`;
          cuenta[a.key][k] = (cuenta[a.key][k] || 0) + 1;
        }
      }
    });
    const paresAg = {};
    for (const [attr, m] of Object.entries(cuenta)) paresAg[attr] = Object.fromEntries(Object.entries(m).map(([k, n]) => [k, inc(n)]));
    tx.set(aref, { pares: paresAg, mvp: { [mvp]: inc(1) }, votaron: inc(1) }, { merge: true });
    tx.create(vref, { ts: Timestamp.now() });
  });
  return { ok: true };
});

// Cierra la votación: calcula resultado y MVP, actualiza niveles y estadísticas de todos
// y guarda el partido como historial. Todo en una sola transacción.
export const cerrarVotacion = onCall({ ...opts, secrets: [ONESIGNAL_API_KEY], timeoutSeconds: 120 }, async req => {
  const { gref } = await requireAdmin(req, req.data?.gid);
  const gid = gref.id;
  const pid = String(req.data?.pid || '');
  const pref = gref.collection('partidos').doc(pid);
  const aref = gref.collection('agregados').doc(pid);

  const salida = await db.runTransaction(async tx => {
    const ps = await tx.get(pref);
    if (!ps.exists) throw new HttpsError('not-found', 'No encontramos el partido.');
    const p = ps.data();
    if (p.estado !== 'votando') throw new HttpsError('failed-precondition', 'La votación ya está cerrada o todavía no se abrió.');
    const jugadoresIds = (p.inscriptos || []).filter(id => !esInvitado(id));
    const [as, todos, gs, ...niveles] = await Promise.all([
      tx.get(aref), tx.get(gref.collection('jugadores')), tx.get(gref),
      ...jugadoresIds.map(id => tx.get(gref.collection('niveles').doc(id)))
    ]);
    const jug = Object.fromEntries(todos.docs.map(d => [d.id, d.data()]));
    const ag = as.exists ? as.data() : {};
    const paresAg = ag.pares || {};
    const eventos = p.eventos || {};
    const golesPorId = Object.fromEntries(Object.entries(eventos).map(([k, v]) => [k, (v && v.goles) || 0]));
    const mvps = calcularMvps(ag.mvp || {}, golesPorId);

    let golesO, golesB;
    if (p.marcador) { golesO = p.marcador.oscuro || 0; golesB = p.marcador.blanco || 0; }
    else {
      const suma = ids => (ids || []).reduce((s, id) => s + (golesPorId[id] || 0), 0);
      golesO = suma(p.equipos?.oscuro); golesB = suma(p.equipos?.blanco);
    }
    const texto = golesO > golesB ? `Ganó Oscuro ${golesO}-${golesB}` : golesB > golesO ? `Ganó Blanco ${golesB}-${golesO}` : `Empate ${golesO}-${golesB}`;

    // Niveles nuevos por atributo, comparando a todos contra todos con las comparaciones votadas.
    const nivelesActuales = Object.fromEntries(jugadoresIds.map((id, i) => [id, niveles[i].exists ? (niveles[i].data().atributos || {}) : {}]));
    const nivelesNuevos = {};
    for (const a of ATTRS) {
      const act = Object.fromEntries(jugadoresIds.map(id => [id, nivelesActuales[id][a.key] || 5]));
      const pares = Object.entries(paresAg[a.key] || {}).flatMap(([k, n]) => {
        const [g, pe] = k.split('__');
        return act[g] !== undefined && act[pe] !== undefined ? Array.from({ length: n }, () => ({ g, p: pe })) : [];
      });
      nivelesNuevos[a.key] = actualizarNiveles(act, pares);
    }

    const antes = ranking(Object.entries(jug).map(([id, j]) => ({ id, puntos: j.stats?.puntos || 0, goles: j.stats?.goles || 0 })));
    const despues = { ...jug };
    const cambios = [];
    const cambiosVotacion = {}; // por jugador: flechitas por atributo y el resultado general (solo el sentido, sin números)
    jugadoresIds.forEach((id, i) => {
      const jd = jug[id] || { stats: statsVacias(), racha: '' };
      const nv = niveles[i].exists ? niveles[i].data() : { atributos: {}, previos: {} };
      const res = resultadoJugador(p.equipos, id, golesO, golesB);
      const ev = eventos[id] || {};
      const stats = { ...statsVacias(), ...jd.stats };
      stats.partidos += 1; stats.goles += ev.goles || 0; stats.amarillas += ev.amarillas || 0;
      if (mvps.includes(id)) stats.mvps += 1;
      if (res === 'ganado') stats.ganados += 1; else if (res === 'empatado') stats.empatados += 1; else if (res === 'perdido') stats.perdidos += 1;
      stats.puntos += puntosDe(res);
      const racha = agregarRacha(jd.racha, res);
      const actuales = { ...(nv.atributos || {}) };
      const nuevos = { ...actuales };
      const tendencia = {};
      let deltaTotal = 0;
      for (const a of ATTRS) {
        const nuevo = nivelesNuevos[a.key][id];
        if (nuevo !== undefined) {
          const antesV = actuales[a.key] || 5;
          nuevos[a.key] = nuevo;
          tendencia[a.key] = Math.abs(nuevo - antesV) < 0.02 ? 0 : Math.sign(nuevo - antesV);
          deltaTotal += nuevo - antesV;
        } else tendencia[a.key] = 0;
      }
      cambiosVotacion[id] = { attrs: tendencia, general: Math.abs(deltaTotal) < 0.05 ? 0 : Math.sign(deltaTotal) };
      tx.set(gref.collection('jugadores').doc(id), { stats, racha, tendencia }, { merge: true });
      tx.set(gref.collection('niveles').doc(id), { atributos: nuevos, previos: actuales }, { merge: true });
      despues[id] = { ...jd, stats, racha };
      cambios.push({ id, racha, stats });
    });
    tx.update(pref, { estado: 'cerrado', resultado: { texto, golesO, golesB }, mvps, cambiosVotacion, fechaCierre: Timestamp.now() });
    if (gs.data().partidoActivo === pid) tx.update(gref, { partidoActivo: null });
    if (as.exists) tx.delete(aref);

    const pos = ranking(Object.entries(despues).map(([id, j]) => ({ id, puntos: j.stats?.puntos || 0, goles: j.stats?.goles || 0 })));
    return { p: { id: pid, ...p, resultado: { texto, golesO, golesB }, marcador: { oscuro: golesO, blanco: golesB } }, texto, mvps, cambios, antes, pos };
  });

  // Avisos (fuera de la transacción: si fallan, el cierre ya quedó guardado).
  try {
    const { p, texto, mvps, cambios, antes, pos } = salida;
    const mvpNombre = mvps[0] ? (await gref.collection('jugadores').doc(mvps[0]).get()).data()?.nombre || '' : '';
    await disparar(gid, 'resultado', { partido: p, vars: { resultado: texto, mvp: mvpNombre }, clave: pid });
    const mvpUids = mvps.filter(esUid);
    if (mvpUids.length) await disparar(gid, 'mvp', { partido: p, personaUids: mvpUids, clave: pid, varsPorUid: Object.fromEntries(mvpUids.map(u => [u, { goles: String(p.eventos?.[u]?.goles || 0) }])) });
    const rachas = cambios.filter(c => esUid(c.id) && rachaGanadora(c.racha) >= 3);
    for (const c of rachas) await disparar(gid, 'racha', { partido: p, personaUids: [c.id], clave: `${pid}_${c.id}`, vars: { racha: String(rachaGanadora(c.racha)), puntos: String(c.stats.puntos), posicion: String(pos[c.id]) } });
    const movidos = cambios.filter(c => esUid(c.id) && antes[c.id] && antes[c.id] !== pos[c.id]);
    for (const c of movidos) await disparar(gid, 'posicion', { partido: p, personaUids: [c.id], clave: `${pid}_${c.id}`, vars: { posicion: String(pos[c.id]), puntos: String(c.stats.puntos), goles: String(c.stats.goles) } });
  } catch (e) { console.error('Avisos del cierre', e); }

  return { resultado: salida.texto, mvps: salida.mvps };
});
