import { onCall } from 'firebase-functions/v2/https';
import { db, Timestamp, REGION, ES_PROD, requireSuper, crearCodigoUnico, lotes, HttpsError } from './util.js';
import {
  esInvitado, statsVacias, hashPwdLegacy, parseResultadoLegacy, cupoDeFormato, puntosDe,
  agregarRacha, fechaYHoraArg
} from './puro.js';
import { ATTRS, calcProm } from './compartido/logica.js';
import { CAT_DEF } from './compartido/catalogo.js';

const opts = { region: REGION, cors: true, timeoutSeconds: 540, memory: '1GiB' };
const L = dni => `l_${dni}`;
const mapId = id => (esInvitado(id) || String(id).startsWith('l_') ? id : L(id));
const mapKeys = (o, f) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [f(k), v]));
const unicos = a => [...new Set(a)];

function equiposNuevos(eq, publicado = true) {
  if (!eq) return null;
  return { oscuro: (eq.oscuro || []).map(mapId), blanco: (eq.blanco || []).map(mapId), publicado: eq.publicado ?? publicado };
}
const invitadosNuevos = inv => Object.fromEntries(Object.entries(inv || {}).filter(([id]) => esInvitado(id))
  .map(([id, d]) => [id, { nombre: d.nombre || 'Invitado', nivel: Math.round((calcProm(d.atributos) || 5) * 2) / 2 }]));

function partidoHistorico(h) {
  const fechaHora = h.fecha ? Timestamp.fromDate(new Date(h.fecha)) : Timestamp.now();
  const r = parseResultadoLegacy(h.resultado) || { golesO: 0, golesB: 0 };
  const equipos = equiposNuevos(h.equipos);
  const jugadores = unicos([...(h.jugadores || []).map(mapId), ...Object.keys(h.invitados || {}).filter(esInvitado),
    ...(equipos ? [...equipos.oscuro, ...equipos.blanco] : [])]);
  return {
    estado: 'cerrado', fechaHora, lugar: h.lugar || '', formato: h.formato || '', cupo: cupoDeFormato(h.formato) || jugadores.length,
    inscriptos: jugadores, listaEspera: [], cena: [], invitados: invitadosNuevos(h.invitados), equipos,
    eventos: mapKeys(h.eventos, mapId), marcador: { oscuro: r.golesO, blanco: r.golesB },
    resultado: { texto: h.resultado || '', golesO: r.golesO, golesB: r.golesB },
    mvps: (h.mvps && h.mvps.length ? h.mvps : h.mvp ? [h.mvp] : []).map(mapId), fechaCierre: fechaHora, migrado: true
  };
}

function statsDe(user) {
  const s = statsVacias();
  let racha = '';
  for (const e of user.historial || []) {
    s.partidos++; s.goles += e.eventos?.goles || 0; s.amarillas += e.eventos?.amarillas || 0;
    if (e.mvp) s.mvps++;
    if (e.resultado === 'ganado') s.ganados++; else if (e.resultado === 'empatado') s.empatados++; else if (e.resultado === 'perdido') s.perdidos++;
    s.puntos += puntosDe(e.resultado);
    racha = agregarRacha(racha, e.resultado);
  }
  if (!s.partidos && user.partidos) { s.partidos = user.partidos; s.goles = user.goles || 0; }
  return { stats: s, racha };
}

// Pasa los datos de la versión anterior (app8_*) al modelo nuevo. Cada jugador queda como
// perfil pendiente "l_DNI" hasta que esa persona entre con su email y vincule su cuenta.
// Por defecto solo informa qué haría (dryRun). No pisa grupos ya migrados salvo con forzar.
export async function ejecutarMigracion({ dryRun = true, forzar = false } = {}) {
  const users = new Map((await db.collection('app8_users').get()).docs.map(d => [d.id, d.data()]));
  const comms = await db.collection('app8_comunidades').get();
  const activos = new Map((await db.collection('app8_partidos').get()).docs.map(d => [d.id, d.data()]));
  const reporte = { usuariosAnteriores: users.size, grupos: [] };

  for (const cd of comms.docs) {
    const c = cd.data(), gid = cd.id;
    if (!forzar && (await db.doc(`grupos/${gid}`).get()).exists) { reporte.grupos.push({ id: gid, nombre: c.nombre, estado: 'ya migrado' }); continue; }
    const dnis = unicos([...(c.miembros || []), ...(c.admins || []), c.creadorDni].filter(Boolean));
    const hist = c.historialPartidos || [];
    const gref = db.doc(`grupos/${gid}`);
    const ops = [];

    const registro = {};
    for (const h of hist) for (const [id, d] of Object.entries(invitadosNuevos(h.invitados))) registro[id] = { ...d, creadoEn: Timestamp.now() };
    const vistos = new Set(dnis.map(L));
    const partidos = hist.map((h, i) => ({ id: h.partidoId || `h${i}`, data: partidoHistorico(h) }));
    partidos.forEach(p => p.data.inscriptos.forEach(id => { if (String(id).startsWith('l_')) vistos.add(id); }));

    const aviso = {};
    for (const [t, v] of Object.entries(c.notifConfig || {})) if (CAT_DEF.some(x => x.id === t) && v && v.activa === false) aviso[t] = { on: false };

    const grupo = {
      nombre: c.nombre || 'Grupo', foto: c.foto || '', deporte: 'futbol', creadorUid: L(c.creadorDni),
      admins: unicos((c.admins || []).concat(c.creadorDni).map(L)), miembros: dnis.map(L),
      precioCancha: c.precioCancha || 0, pozo: c.pozoAcumulado || 0, partidoActivo: null, avisos: aviso,
      silencio: { on: true, desde: 23, hasta: 8 }, maxDia: 3, creadoEn: Timestamp.fromMillis(c.creadoEn || Date.now()), migrado: true
    };

    for (const id of vistos) {
      const dni = id.slice(2), u = users.get(dni) || {};
      const { stats, racha } = statsDe(u);
      const at = u.atributos || {}, prev = u.atributosAnteriores || {};
      const tendencia = Object.fromEntries(ATTRS.map(a => [a.key, Math.sign((at[a.key] || 0) - (prev[a.key] || 0))]));
      const miembro = dnis.includes(dni);
      ops.push(b => b.set(gref.collection('jugadores').doc(id), { nombre: u.nombre || 'Jugador', apodo: u.apodo || '', foto: u.foto || '', stats, racha, tendencia, desde: Timestamp.now(), ...(miembro ? {} : { exMiembro: true }) }));
      ops.push(b => b.set(gref.collection('niveles').doc(id), { atributos: at, previos: prev }));
    }
    for (const [id, d] of Object.entries(registro)) ops.push(b => b.set(gref.collection('invitados').doc(id), d));
    for (const p of partidos) ops.push(b => b.set(gref.collection('partidos').doc(p.id), p.data));

    const a = c.partidoActivo && activos.get(c.partidoActivo);
    if (a) {
      const pid = c.partidoActivo;
      const inscriptos = (a.inscriptos || []).map(mapId);
      const nuevo = {
        estado: a.finalizado ? 'votando' : 'abierto',
        fechaHora: Timestamp.fromDate(a.fecha ? fechaYHoraArg(a.fecha, a.hora) : new Date()),
        lugar: a.lugar || '', formato: a.formato || '', cupo: cupoDeFormato(a.formato) || 12,
        inscriptos, listaEspera: [], cena: (a.cena || []).map(mapId), invitados: invitadosNuevos(a.invitados),
        equipos: equiposNuevos(a.equipos, false), eventos: mapKeys(a.eventos, mapId),
        ...(a.marcador ? { marcador: a.marcador } : {}),
        ...(a.fechaFin ? { fechaFin: Timestamp.fromDate(new Date(a.fechaFin)) } : {}),
        asignaciones: Object.fromEntries(Object.entries(a.votacionesAsignadas || {}).map(([k, v]) => [mapId(k), v.map(mapId)])),
        migrado: true
      };
      grupo.partidoActivo = pid;
      ops.push(b => b.set(gref.collection('partidos').doc(pid), nuevo));
      if (a.notasAtributos || a.mvpConteo) {
        ops.push(b => b.set(gref.collection('agregados').doc(pid), { notas: mapKeys(a.notasAtributos, mapId), mvp: mapKeys(a.mvpConteo, mapId) }));
      }
    }

    reporte.grupos.push({ id: gid, nombre: c.nombre, jugadores: vistos.size, partidosHistoricos: partidos.length, partidoActivo: !!a, estado: dryRun ? 'listo para migrar' : 'migrado' });
    if (!dryRun) {
      grupo.codigo = await crearCodigoUnico(gid);
      ops.push(b => b.set(gref, grupo));
      await lotes(ops);
    }
  }
  return { dryRun, ...reporte };
}

export const migrarDatosAnteriores = onCall(opts, async req => {
  requireSuper(req);
  // `sembrar` solo existe fuera de producción: crea datos de la versión anterior para ensayar.
  const sembrado = req.data?.sembrar ? await sembrarDatosAnteriores() : null;
  return { ...(await ejecutarMigracion({ dryRun: req.data?.dryRun !== false, forzar: !!req.data?.forzar })), sembrado };
});

// SOLO PARA PRUEBAS: crea datos con el formato anterior para ensayar la migración.
export async function sembrarDatosAnteriores() {
  if (ES_PROD) throw new HttpsError('failed-precondition', 'Esta función no corre en producción.');
  const nombres = ['Fede Pipkin', 'Nico Ferrari', 'Juani Roca', 'Tomás Vega', 'Agus Dal Maso', 'Lucho Ibarra', 'Mati Sosa', 'Pablo Quiroga'];
  const dnis = nombres.map((_, i) => String(30000001 + i));
  const batch = db.batch();
  nombres.forEach((n, i) => {
    const attrs = Object.fromEntries(ATTRS.map(a => [a.key, 4 + ((i + a.key.length) % 5)]));
    batch.set(db.doc(`app8_users/${dnis[i]}`), {
      nombre: n, dni: dnis[i], apodo: '', foto: '', passHash: hashPwdLegacy('clave123'), atributos: attrs, atributosAnteriores: attrs,
      goles: i, partidos: 3, historial: [
        { fecha: '2026-09-21', mvp: i === 1, resultado: 'ganado', eventos: { goles: i % 3, amarillas: 0 } },
        { fecha: '2026-09-28', mvp: false, resultado: i % 2 ? 'perdido' : 'empatado', eventos: { goles: 0, amarillas: 1 } },
        { fecha: '2026-10-05', mvp: i === 2, resultado: 'ganado', eventos: { goles: 1, amarillas: 0 } }
      ]
    });
  });
  const hist = ['2026-09-21', '2026-09-28', '2026-10-05'].map((f, k) => ({
    partidoId: `h${k}`, fecha: `${f}T23:30:00.000Z`, lugar: 'Cancha Palermo', formato: '4 vs 4',
    equipos: { oscuro: dnis.slice(0, 4), blanco: dnis.slice(4), publicado: true },
    eventos: { [dnis[0]]: { goles: 2, amarillas: 0 }, [dnis[5]]: { goles: 1, amarillas: 1 } },
    mvp: dnis[1], mvps: [dnis[1]], jugadores: dnis, invitados: k === 0 ? { inv_demo1: { nombre: 'Amigo de Nico', atributos: { velocidad: 5 } } } : {},
    resultado: k === 1 ? 'Empate 2-2' : 'Oscuro gano 3-1'
  }));
  batch.set(db.doc('app8_comunidades/comunidad-prueba'), {
    nombre: 'Fútbol de los Lunes (prueba)', foto: '', creadorDni: dnis[0], admins: [dnis[0]], miembros: dnis,
    partidoActivo: null, historialPartidos: hist, precioCancha: 4500, pozoAcumulado: 0, creadoEn: Date.now()
  });
  await batch.commit();
  return { dnis, clave: 'clave123' };
}
