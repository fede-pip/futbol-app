import { useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { db, llamar, mensajeError } from '../lib/firebase.js';
import { useColl } from '../data/hooks.js';
import { actualizarGrupo, guardarAviso } from '../data/acciones.js';
import {
  AUD, CAT_DEF, GRUPOS_AV, MUESTRA, PLANTILLAS, VARS_DESC, catalogoPorId, llenar, quienTxt
} from '../lib/catalogo.js';
import { haceCuanto } from '../lib/fechas.js';
import { LOGO } from '../assets/logo.js';
import { Btn, Campo, Card, CardB, HbTabs, Hint, Icono, Pill, Switch, useToast } from '../components/ui.jsx';
import { useSesion } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';
import { BarraSuperior } from '../app/Shell.jsx';

// Lo que el grupo cambió sobre el aviso original del catálogo.
const efectivo = (c, g) => {
  const o = (g.avisos && g.avisos[c.id]) || {};
  return { ...c, on: o.on ?? c.on, titulo: o.titulo ?? c.titulo, cuerpo: o.cuerpo ?? c.cuerpo, cuando: o.cuando ?? c.opts[c.sel || 0], quien: o.quien && o.quien.length ? o.quien : c.quien };
};

function Push({ titulo, cuerpo }) {
  return (
    <div className="push" aria-label="Así se ve en el celular"><span className="pi"><img src={LOGO} alt="" /></span>
      <div className="grow"><div className="pm"><span>App8</span><span>ahora</span></div>
        <div className="pt">{llenar(titulo) || 'Título del aviso'}</div><div className="pc">{llenar(cuerpo) || 'Escribí el mensaje'}</div></div></div>
  );
}

function ChipsVars({ claves, onInsertar }) {
  const desc = k => Object.values(VARS_DESC).map(g => g[k]).find(Boolean) || '';
  return <div className="chips">{claves.map(k => <button type="button" key={k} className="vchip" title={desc(k)} onClick={() => onInsertar(`{${k}}`)}>{`{${k}}`}</button>)}</div>;
}

export function AvisosAdmin() {
  const { gid, grupo, partido } = useSesion();
  const { ir } = useNav();
  const toast = useToast();
  const [tab, setTab] = useState('auto');
  const [env, setEnv] = useState({ titulo: '', cuerpo: '', aud: ['noanot'] });
  const [campo, setCampo] = useState('cuerpo');
  const [confirma, setConfirma] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const hist = useColl(query(collection(db, `grupos/${gid}/avisosHistorial`), orderBy('cuando', 'desc'), limit(30)), gid);

  const lista = CAT_DEF.map(c => efectivo(c, grupo));
  const silencio = grupo.silencio || { on: true, desde: 23, hasta: 8 };
  const maxDia = grupo.maxDia ?? 3;

  const ejecutar = async fn => { setError(''); try { await fn(); } catch (e) { setError(mensajeError(e)); } };
  const alternar = c => ejecutar(() => guardarAviso(gid, c.id, { ...((grupo.avisos || {})[c.id] || {}), on: !c.on }));

  // Cuánta gente alcanza cada selección (aproximado, según el partido de hoy).
  const miembros = grupo.miembros.filter(u => !u.startsWith('l_'));
  const insc = partido ? (partido.inscriptos || []).filter(u => !u.startsWith('inv_') && !u.startsWith('l_')) : [];
  const cuantos = k => ({ todos: miembros.length, anot: insc.length, noanot: miembros.filter(u => !insc.includes(u)).length, espera: partido ? (partido.listaEspera || []).length : 0,
    cena: partido ? (partido.cena || []).filter(u => !u.startsWith('inv_')).length : 0, novotaron: null, admins: grupo.admins.filter(u => !u.startsWith('l_')).length }[k]);
  const alcance = Math.min(miembros.length, env.aud.reduce((s, k) => s + (cuantos(k) || 0), 0));

  const insertar = t => setEnv(e => ({ ...e, [campo]: e[campo] + (e[campo] && !e[campo].endsWith(' ') ? ' ' : '') + t }));
  const alternarAud = k => setEnv(e => ({ ...e, aud: e.aud.includes(k) ? e.aud.filter(x => x !== k) : [...e.aud, k] }));
  const vacio = !(env.titulo.trim() && env.cuerpo.trim() && env.aud.length);

  async function enviar() {
    setCargando(true); setError('');
    try {
      await llamar('enviarAvisoManual', { gid, titulo: env.titulo, cuerpo: env.cuerpo, aud: env.aud });
      setEnv({ titulo: '', cuerpo: '', aud: ['noanot'] }); setConfirma(false); setTab('hist'); toast('Aviso enviado');
    } catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  }

  return (
    <div className="scr">
      <BarraSuperior atras="Grupo" onAtras={() => ir('grupo')} />
      <div><h2 className="t">Avisos del grupo</h2><p className="lead" style={{ marginTop: 2 }}>Lo que la app le avisa a tu gente y cuándo.</p></div>
      <HbTabs items={[{ id: 'auto', label: 'Automáticos' }, { id: 'enviar', label: 'Enviar ahora' }, { id: 'hist', label: 'Historial' }]} cur={tab} onSel={t => { setTab(t); setConfirma(false); }} />
      {error ? <div className="error" role="alert">{error}</div> : null}

      {tab === 'auto' ? (
        <>
          <Hint><b>{lista.filter(c => c.on).length} de {lista.length} avisos activos.</b> Tocá uno para cambiar el texto, el momento o los destinatarios. Todos llegan a la bandeja de la app; el push depende de que cada persona lo haya activado.</Hint>
          {GRUPOS_AV.map((g, gi) => (
            <div key={g} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="gt">{g}</div>
              <Card>
                {lista.filter(c => c.g === gi).map(c => (
                  <div className={`av-r ${c.on ? '' : 'off'}`} key={c.id}>
                    <button className="body" onClick={() => ir('avisoEdit', c.id)}>
                      <span className="ti"><Icono n={c.ic} /></span>
                      <div className="grow"><b>{c.t}{c.nuevo ? <> <span className="pill nuevo">Nuevo</span></> : null}</b><small>{c.cuando} · {quienTxt(c.quien)}</small></div>
                      <Icono n="chev" style={{ color: 'var(--text-3)' }} />
                    </button>
                    <Switch on={c.on} label={`Activar ${c.t}`} onChange={() => alternar(c)} />
                  </div>
                ))}
              </Card>
            </div>
          ))}
          <div className="gt">Reglas generales</div>
          <Card>
            <div className="av-r"><span className="ti"><Icono n="moon" /></span><div className="grow"><b>Horario silencioso</b><small>No enviar push entre las {silencio.desde}:00 y las {String(silencio.hasta).padStart(2, '0')}:00, salvo cambios y cancelaciones.</small></div>
              <Switch on={silencio.on} label="Horario silencioso" onChange={v => ejecutar(() => actualizarGrupo(gid, { silencio: { ...silencio, on: v } }))} /></div>
            <div className="av-r"><span className="ti"><Icono n="bell" /></span><div className="grow"><b>Máximo de push por persona y por día</b><small>Si se supera, el resto queda solo en la bandeja.</small></div>
              <div className="stepper"><button className="round" aria-label="Menos" onClick={() => ejecutar(() => actualizarGrupo(gid, { maxDia: Math.max(1, maxDia - 1) }))}><Icono n="minus" /></button><span className="v">{maxDia}</span><button className="round" aria-label="Más" onClick={() => ejecutar(() => actualizarGrupo(gid, { maxDia: Math.min(10, maxDia + 1) }))}><Icono n="plus" /></button></div></div>
          </Card>
        </>
      ) : null}

      {tab === 'enviar' ? (
        <>
          <Hint icono="send"><b>Un aviso puntual.</b> Para cosas que no tienen un aviso automático: cambios de último momento, que falta gente, la cena.</Hint>
          <div><div className="cap" style={{ marginBottom: 6 }}>Empezar desde una plantilla</div>
            <div className="chips">{PLANTILLAS.map(p => <button key={p.n} className="chip" onClick={() => { setEnv({ titulo: p.t, cuerpo: p.c, aud: [...p.aud] }); setConfirma(false); }}>{p.n}</button>)}</div></div>
          <Campo label="Título" id="e-t" value={env.titulo} maxLength={60} onFocus={() => setCampo('titulo')} onChange={e => setEnv({ ...env, titulo: e.target.value })} placeholder="Ej: Faltan 2 para el lunes" />
          <div className="field"><label htmlFor="e-c">Mensaje</label><textarea id="e-c" value={env.cuerpo} maxLength={160} onFocus={() => setCampo('cuerpo')} onChange={e => setEnv({ ...env, cuerpo: e.target.value })} placeholder="Escribí el mensaje" /></div>
          <CardB><div className="cap" style={{ marginBottom: 8 }}>Tocá para insertar un dato del partido</div><ChipsVars claves={['dia', 'hora', 'lugar', 'faltan', 'restantes', 'cena', 'faltan_votar', 'horas_restantes']} onInsertar={insertar} /></CardB>
          <div><div className="cap" style={{ marginBottom: 6 }}>Para quién</div>
            <div className="chips">{Object.keys(AUD).filter(k => k !== 'persona').map(k => <button key={k} className={`chip ${env.aud.includes(k) ? 'on' : ''}`} aria-pressed={env.aud.includes(k)} onClick={() => { alternarAud(k); setConfirma(false); }}>{AUD[k][0]} {cuantos(k) !== null ? <span className="small num">{cuantos(k)}</span> : null}</button>)}</div></div>
          <div><div className="cap" style={{ marginBottom: 6 }}>Así lo van a ver</div><Push titulo={env.titulo} cuerpo={env.cuerpo} /></div>
          {confirma ? (
            <div className="confirm"><b>¿Enviar ahora?</b><span className="muted">Sale en este momento y no se puede deshacer.</span>
              <div className="row"><Btn onClick={() => setConfirma(false)}>Cancelar</Btn><Btn v="pri" disabled={cargando} onClick={enviar}>{cargando ? 'Enviando…' : 'Enviar'}</Btn></div></div>
          ) : <Btn v="pri" disabled={vacio} onClick={() => setConfirma(true)}><Icono n="send" />Enviar{alcance ? ` a unas ${alcance} personas` : ''}</Btn>}
        </>
      ) : null}

      {tab === 'hist' ? (
        hist === undefined ? null : hist.length === 0 ? <div className="lista-vacia">Todavía no se envió ningún aviso.</div> : (
          hist.map(h => (
            <CardB key={h.id}><div className="row sp"><b>{h.titulo}</b><Pill t={h.auto ? '' : 'tint'}>{h.auto ? 'Automático' : 'Manual'}</Pill></div>
              <div className="muted" style={{ marginTop: 4 }}>{haceCuanto(h.cuando)}{h.quien ? ` · ${h.quien}` : ''}</div>
              <div className="row" style={{ marginTop: 10, gap: 8 }}><Pill t="ok">{h.conPush} con push</Pill><Pill>{h.n} en la bandeja</Pill></div></CardB>
          ))
        )
      ) : null}
    </div>
  );
}

export function AvisoEdit() {
  const { gid, grupo } = useSesion();
  const { param, ir } = useNav();
  const toast = useToast();
  const base = catalogoPorId[param];
  const c = base ? efectivo(base, grupo) : null;
  const [ed, setEd] = useState(() => c ? { titulo: c.titulo, cuerpo: c.cuerpo, cuando: c.cuando, quien: [...c.quien] } : null);
  const [campo, setCampo] = useState('cuerpo');
  const [todas, setTodas] = useState(false);
  const [error, setError] = useState('');
  if (!c) return <div className="scr"><BarraSuperior atras onAtras={() => ir('avisosAdmin')} /><div className="lista-vacia">No encontramos ese aviso.</div></div>;

  const insertar = t => setEd(e => ({ ...e, [campo]: e[campo] + (e[campo] && !e[campo].endsWith(' ') ? ' ' : '') + t }));
  const alternar = k => setEd(e => ({ ...e, quien: e.quien.includes(k) ? e.quien.filter(x => x !== k) : [...e.quien, k] }));
  async function guardar() {
    if (!ed.quien.length) return setError('Elegí al menos un destinatario.');
    try { await guardarAviso(gid, c.id, { ...((grupo.avisos || {})[c.id] || {}), titulo: ed.titulo, cuerpo: ed.cuerpo, cuando: ed.cuando, quien: ed.quien }); toast('Cambios guardados'); ir('avisosAdmin'); }
    catch (e) { setError(mensajeError(e)); }
  }

  return (
    <div className="scr">
      <BarraSuperior atras="Avisos" onAtras={() => ir('avisosAdmin')} />
      <div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}><h2 className="t">{c.t}</h2>{c.nuevo ? <span className="pill nuevo">Nuevo</span> : null}{c.critico ? <Pill t="warn">Importante</Pill> : null}</div>
        <p className="lead" style={{ marginTop: 4 }}>{ed.cuando} · {quienTxt(ed.quien)}</p>{c.aviso ? <p className="small" style={{ marginTop: 6 }}>{c.aviso}</p> : null}
      </div>
      <div><div className="cap" style={{ marginBottom: 6 }}>Así lo van a ver</div><Push titulo={ed.titulo} cuerpo={ed.cuerpo} /></div>
      <Campo label="Título" id="a-t" value={ed.titulo} maxLength={60} onFocus={() => setCampo('titulo')} onChange={e => setEd({ ...ed, titulo: e.target.value })} />
      <div className="field"><label htmlFor="a-c">Mensaje</label><textarea id="a-c" value={ed.cuerpo} maxLength={160} onFocus={() => setCampo('cuerpo')} onChange={e => setEd({ ...ed, cuerpo: e.target.value })} /></div>
      <CardB>
        <div className="cap" style={{ marginBottom: 8 }}>Tocá para insertar un dato</div><ChipsVars claves={c.vars} onInsertar={insertar} />
        <Btn v="ghost" sm style={{ marginTop: 8 }} onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : 'Ver todos los datos'}</Btn>
        {todas ? Object.entries(VARS_DESC).map(([g, vs]) => <div key={g}><div className="cap" style={{ margin: '10px 0 6px' }}>{g}</div><ChipsVars claves={Object.keys(vs)} onInsertar={insertar} /></div>) : null}
      </CardB>
      <CardB><div className="cap" style={{ marginBottom: 8 }}>Cuándo sale</div>
        <div className="chips">{c.opts.map(o => <button key={o} className={`chip ${ed.cuando === o ? 'on' : ''}`} aria-pressed={ed.cuando === o} onClick={() => setEd({ ...ed, cuando: o })}>{o}</button>)}</div></CardB>
      <CardB><div className="cap" style={{ marginBottom: 8 }}>Quién lo recibe</div>
        <div className="chips">{Object.keys(AUD).map(k => <button key={k} className={`chip ${ed.quien.includes(k) ? 'on' : ''}`} aria-pressed={ed.quien.includes(k)} onClick={() => alternar(k)}>{AUD[k][0]}</button>)}</div></CardB>
      {error ? <div className="error" role="alert">{error}</div> : null}
      <Btn v="pri" onClick={guardar}>Guardar cambios</Btn>
      <Btn v="ghost" onClick={() => setEd({ titulo: base.titulo, cuerpo: base.cuerpo, cuando: base.opts[base.sel || 0], quien: [...base.quien] })}>Volver al texto original</Btn>
    </div>
  );
}
