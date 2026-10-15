import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, Timestamp, REGION } from './util.js';
import { disparar, ONESIGNAL_API_KEY } from './avisos.js';
import { catalogoPorId } from './compartido/catalogo.js';
import { parseHoras, esUid, esInvitado, TZ } from './puro.js';

const opcionesProg = (schedule) => ({ schedule, timeZone: TZ, region: REGION, secrets: [ONESIGNAL_API_KEY], timeoutSeconds: 300 });

// Horas configuradas para un aviso (lo que eligió el grupo o el valor por defecto).
function horasDe(g, tipo) {
  const def = catalogoPorId[tipo];
  const cfg = (g.avisos && g.avisos[tipo]) || {};
  const txt = cfg.cuando || def.opts[def.sel || 0];
  return { activo: (cfg.on ?? def.on) !== false, txt, h: parseHoras(txt) };
}

// Corre cada 10 minutos: avisos que dependen del reloj. Cada uno se entrega una sola vez
// (el ID del aviso es fijo para el partido, así que repetir la corrida no duplica nada).
export const programados = onSchedule(opcionesProg('every 10 minutes'), async () => {
  const ahora = Date.now();
  const grupos = new Map();
  const grupoDe = async gid => {
    if (!grupos.has(gid)) grupos.set(gid, (await db.doc(`grupos/${gid}`).get()).data());
    return grupos.get(gid);
  };

  // ---- Partidos abiertos en las próximas 49 horas ----
  const abiertos = await db.collectionGroup('partidos')
    .where('estado', '==', 'abierto')
    .where('fechaHora', '>', Timestamp.fromMillis(ahora))
    .where('fechaHora', '<', Timestamp.fromMillis(ahora + 49 * 3600e3)).get();
  for (const d of abiertos.docs) {
    const gid = d.ref.parent.parent.id;
    const g = await grupoDe(gid);
    if (!g) continue;
    const p = { id: d.id, ...d.data() };
    const horas = (p.fechaHora.toMillis() - ahora) / 3600e3;
    const anot = (p.inscriptos || []).length;

    const r24 = horasDe(g, 'recordatorio_24h');
    if (r24.activo && r24.h && horas <= r24.h) await disparar(gid, 'recordatorio_24h', { partido: p, clave: p.id });
    const fj = horasDe(g, 'faltan_jugadores');
    if (fj.activo && fj.h && horas <= fj.h && anot < p.cupo) await disparar(gid, 'faltan_jugadores', { partido: p, clave: p.id });
    const r2 = horasDe(g, 'recordatorio_2h');
    if (r2.activo && r2.h && horas <= r2.h) await disparar(gid, 'recordatorio_2h', { partido: p, clave: p.id });
    const ep = horasDe(g, 'equipos_pendientes');
    if (ep.activo && ep.h && horas <= ep.h && !p.equipos?.publicado && anot >= 2) await disparar(gid, 'equipos_pendientes', { partido: p, clave: p.id });
  }

  // ---- Votaciones en curso ----
  const votando = await db.collectionGroup('partidos').where('estado', '==', 'votando').get();
  for (const d of votando.docs) {
    const gid = d.ref.parent.parent.id;
    const g = await grupoDe(gid);
    if (!g || !d.data().fechaFin) continue;
    const p = { id: d.id, ...d.data() };
    const cierra = p.fechaFin.toMillis() + 24 * 3600e3;
    const horasLeft = (cierra - ahora) / 3600e3;
    const votos = await d.ref.collection('votos').get();
    const jugadores = (p.inscriptos || []).filter(esUid);
    const faltan = jugadores.filter(u => !votos.docs.some(v => v.id === u)).length;
    const vars = { votaron: String(votos.size), faltan_votar: String(faltan), horas_restantes: String(Math.max(0, Math.ceil(horasLeft))), anotados: String((p.inscriptos || []).length) };

    const vp = horasDe(g, 'votos_pendientes');
    if (vp.activo && horasLeft > 0) {
      const tramos = /12/.test(vp.txt) ? [12, 3] : [3];
      for (const t of tramos) if (horasLeft <= t) await disparar(gid, 'votos_pendientes', { partido: p, vars, clave: `${p.id}_${t}` });
    }
    if ((faltan === 0 || horasLeft <= 0) && horasDe(g, 'votos_admin').activo) {
      await disparar(gid, 'votos_admin', { partido: p, vars, clave: p.id });
    }
  }
});

// Domingos 20:00: resumen para quienes jugaron en la semana.
export const resumenSemanal = onSchedule(opcionesProg('0 20 * * 0'), async () => {
  const desde = Timestamp.fromMillis(Date.now() - 7 * 24 * 3600e3);
  const gs = await db.collection('grupos').get();
  for (const gd of gs.docs) {
    const g = gd.data();
    if (((g.avisos || {}).resumen?.on ?? catalogoPorId.resumen.on) === false) continue;
    const ps = await gd.ref.collection('partidos').where('estado', '==', 'cerrado').where('fechaHora', '>=', desde).get();
    if (!ps.size) continue;
    const jugs = await gd.ref.collection('jugadores').get();
    const orden = jugs.docs.map(j => ({ id: j.id, ...j.data() })).sort((a, b) => (b.stats?.puntos || 0) - (a.stats?.puntos || 0));
    const uids = new Set();
    const porUid = {};
    for (const pd of ps.docs) for (const id of pd.data().inscriptos || []) if (esUid(id) && !esInvitado(id)) { uids.add(id); porUid[id] = (porUid[id] || 0) + 1; }
    const varsPorUid = {};
    uids.forEach(u => { varsPorUid[u] = { partidos: String(porUid[u]), goles: String(orden.find(j => j.id === u)?.stats?.goles || 0), posicion: String(orden.findIndex(j => j.id === u) + 1) }; });
    const semana = new Date().toISOString().slice(0, 10);
    await disparar(gd.id, 'resumen', { uidsFijos: [...uids], varsPorUid, clave: semana });
  }
});
