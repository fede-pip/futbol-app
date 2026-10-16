import { defineSecret } from 'firebase-functions/params';
import { db, FieldValue, Timestamp, URL_APP, inicioDelDiaArg } from './util.js';
import { catalogoPorId, categoriaDe, llenar } from './compartido/catalogo.js';
import { esUid, varsPartido, horaDe } from './puro.js';

export const ONESIGNAL_API_KEY = defineSecret('ONESIGNAL_API_KEY');
const ONESIGNAL_APP_ID = '3fb550f4-3eb2-4006-bd3d-77f2951d94fe';

// Envía un push por OneSignal. Nunca lanza: un push fallido no debe romper el flujo.
export async function enviarPush(ids, titulo, cuerpo, data = {}) {
  const lista = [...new Set((ids || []).filter(Boolean))];
  if (!lista.length) return false;
  let key = '';
  try { key = ONESIGNAL_API_KEY.value(); } catch (e) { console.warn('push OneSignal: no se pudo leer la clave'); return false; }
  if (!key || key === 'pendiente') { console.warn('push OneSignal: falta la clave (ONESIGNAL_API_KEY)'); return false; }
  try {
    const r = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${key}` },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID, include_player_ids: lista, target_channel: 'push',
        headings: { en: titulo, es: titulo }, contents: { en: cuerpo, es: cuerpo }, data, url: URL_APP
      })
    });
    const cuerpoRta = await r.text().catch(() => '');
    // Se registra el resultado para poder ver por qué no llega un push (clave inválida, dispositivos sin suscripción, etc.).
    console.log(`push OneSignal: ${r.status} destinos=${lista.length} ${cuerpoRta.slice(0, 300)}`);
    return r.ok;
  } catch (e) { console.warn(`push OneSignal: falló la llamada: ${e.message}`); return false; }
}

// ---- Quiénes reciben un aviso ----
async function uidsVotaron(gid, pid) {
  const s = await db.collection(`grupos/${gid}/partidos/${pid}/votos`).get();
  return new Set(s.docs.map(d => d.id));
}

export async function audiencia(gid, g, quien, ctx = {}) {
  const p = ctx.partido || {};
  const out = new Set();
  for (const k of quien) {
    if (k === 'todos') (g.miembros || []).forEach(u => out.add(u));
    else if (k === 'anot') (p.inscriptos || []).forEach(u => out.add(u));
    else if (k === 'noanot') (g.miembros || []).filter(u => !(p.inscriptos || []).includes(u)).forEach(u => out.add(u));
    else if (k === 'espera') (p.listaEspera || []).forEach(u => out.add(u));
    else if (k === 'cena') (p.cena || []).forEach(u => out.add(u));
    else if (k === 'admins') (g.admins || []).forEach(u => out.add(u));
    else if (k === 'persona') (ctx.personaUids || (ctx.personaUid ? [ctx.personaUid] : [])).forEach(u => out.add(u));
    else if (k === 'novotaron' && p.id) {
      const votaron = await uidsVotaron(gid, p.id);
      (p.inscriptos || []).filter(u => esUid(u) && !votaron.has(u)).forEach(u => out.add(u));
    }
  }
  const excluir = new Set(ctx.excluir || []);
  return [...out].filter(u => esUid(u) && !excluir.has(u));
}

// ---- Entrega a cada persona: bandeja siempre, push si corresponde ----
export async function entregar(gid, g, { tipo, titulo, cuerpo, uids, ctx = {}, critico = false, auto = true }) {
  const p = ctx.partido || {};
  const inicioDia = inicioDelDiaArg();
  const maxDia = g.maxDia ?? 3;
  const silencio = g.silencio ?? { on: true, desde: 23, hasta: 8 };
  const horaAhora = Number(horaDe(new Date()).slice(0, 2));
  const enSilencio = silencio.on && (silencio.desde > silencio.hasta
    ? horaAhora >= silencio.desde || horaAhora < silencio.hasta
    : horaAhora >= silencio.desde && horaAhora < silencio.hasta);
  const cat = categoriaDe(tipo);
  let enviados = 0, conPush = 0, sinDispositivo = 0, porPreferencias = 0;

  await Promise.all(uids.map(async uid => {
    const [perfil, priv] = await Promise.all([db.doc(`usuarios/${uid}`).get(), db.doc(`privado/${uid}`).get()]);
    const nombre = (perfil.data()?.apodo || perfil.data()?.nombre || '').split(' ')[0];
    const equipo = p.equipos ? ((p.equipos.oscuro || []).includes(uid) ? 'Oscuro' : (p.equipos.blanco || []).includes(uid) ? 'Blanco' : '') : '';
    const vars = { ...(ctx.vars || {}), destinatario: nombre, ...(equipo ? { mi_equipo: equipo } : {}), ...(ctx.varsPorUid?.[uid] || {}) };
    const t = llenar(titulo, vars, true).replace(/\s+/g, ' ').trim();
    const c = llenar(cuerpo, vars, true).replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (ctx.coalesce) {
      const rec = await db.collection(`privado/${uid}/avisos`).where('creadoEn', '>=', Timestamp.fromMillis(Date.now() - ctx.coalesce * 60000)).get();
      if (rec.docs.some(d => d.data().tipo === tipo)) return; // ya recibió uno hace poco: no se agrega otro
    }

    const id = `${tipo}_${ctx.clave || p.id || 'x'}`;
    try {
      await db.doc(`privado/${uid}/avisos/${id}`).create({
        tipo, titulo: t, cuerpo: c, gid, pid: p.id || null, creadoEn: Timestamp.now(), leido: false
      });
    } catch (e) {
      if (e.code === 6 || /ALREADY_EXISTS/.test(String(e.message))) return; // ya se envió
      throw e;
    }
    enviados++;

    const prefs = priv.data()?.prefs || {};
    if (!critico && cat && prefs[cat] === false) { porPreferencias++; return; }
    if (!critico && prefs.silencio !== false && enSilencio) { porPreferencias++; return; }
    if (!critico) {
      const hoy = await db.collection(`privado/${uid}/avisos`).where('creadoEn', '>=', Timestamp.fromDate(inicioDia)).count().get();
      if (hoy.data().count > maxDia) return;
    }
    const ids = (priv.data()?.dispositivos || []).map(d => d.id).filter(Boolean);
    if (!ids.length) sinDispositivo++;
    if (ids.length && await enviarPush(ids, t, c, { tipo, gid, pid: p.id || null })) conPush++;
  }));

  console.log(`entregar ${tipo}: destinatarios=${uids.length} enBandeja=${enviados} sinDispositivo=${sinDispositivo} sinPushPorPreferencias=${porPreferencias} push=${conPush}`);
  if (enviados) {
    await db.collection(`grupos/${gid}/avisosHistorial`).add({
      tipo, titulo: llenar(titulo, ctx.vars || {}, true).replace(/\s+/g, ' ').trim(), n: enviados, conPush,
      auto, cuando: Timestamp.now(), quien: ctx.quienTxt || ''
    });
  }
  return { enviados, conPush };
}

// Dispara un aviso del catálogo: respeta lo que el grupo activó, cambió o apagó.
export async function disparar(gid, tipo, ctx = {}) {
  const def = catalogoPorId[tipo];
  if (!def) return { enviados: 0 };
  const gs = await db.doc(`grupos/${gid}`).get();
  if (!gs.exists) return { enviados: 0 };
  const g = gs.data();
  const cfg = (g.avisos && g.avisos[tipo]) || {};
  if ((cfg.on ?? def.on) === false) return { enviados: 0 };
  const quien = cfg.quien && cfg.quien.length ? cfg.quien : def.quien;
  const uids = ctx.uidsFijos ? ctx.uidsFijos.filter(esUid) : await audiencia(gid, g, quien, ctx);
  if (!uids.length) return { enviados: 0 };
  const vars = ctx.partido ? varsPartido(g, ctx.partido, ctx.vars) : { comunidad: g.nombre, ...(ctx.vars || {}) };
  return entregar(gid, g, {
    tipo, titulo: cfg.titulo ?? def.titulo, cuerpo: cfg.cuerpo ?? def.cuerpo, uids,
    ctx: { ...ctx, vars }, critico: !!def.critico
  });
}
