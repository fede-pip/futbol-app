import { useState } from 'react';
import { collection } from 'firebase/firestore';
import { db, mensajeError } from '../lib/firebase.js';
import { useColl } from '../data/hooks.js';
import {
  agregarInvitado, anotarse, bajarse, cancelarPartido, crearPartido, editarPartido, quitarInscripto, salirCena, sumarseCena
} from '../data/acciones.js';
import { FORMATOS } from '../lib/logica.js';
import { aFecha, aInputFecha, diaLargo, diaSemana, hora as horaTxt, mayus, titulo as tituloFecha } from '../lib/fechas.js';
import { Avatar, Btn, Card, CardB, Campo, Fila, HbTabs, Icono, Meter, Pill, Vacio, useToast } from '../components/ui.jsx';
import { useSesion, nombreDe } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';
import { BarraSuperior } from '../app/Shell.jsx';
import Equipos from './Equipos.jsx';
import Goles from './Goles.jsx';
import Votacion from './Votacion.jsx';

function proximoLunes() {
  const d = new Date(); const dias = (8 - d.getDay()) % 7 || 7; d.setDate(d.getDate() + dias); return aInputFecha(d);
}

function FormPartido({ inicial, onGuardar, onCancelar, etiqueta }) {
  const [fecha, setFecha] = useState(inicial ? inicial.fecha : proximoLunes());
  const [hora, setHora] = useState(inicial ? inicial.hora : '21:30');
  const [lugar, setLugar] = useState(inicial ? inicial.lugar : '');
  const [formato, setFormato] = useState(inicial ? inicial.formato : '6 vs 6');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  async function enviar(e) {
    e.preventDefault(); setError('');
    if (!fecha || !hora || lugar.trim().length < 2) return setError('Completá el día, la hora y el lugar.');
    const cupo = (FORMATOS.find(f => f.label === formato) || FORMATOS[1]).total;
    setCargando(true);
    try { await onGuardar({ fecha, hora, lugar, formato, cupo }); } catch (err) { setError(mensajeError(err)); }
    setCargando(false);
  }
  return (
    <form onSubmit={enviar} className="card card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="grid2">
        <Campo label="Día" id="p-fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        <Campo label="Hora" id="p-hora" type="time" value={hora} onChange={e => setHora(e.target.value)} />
      </div>
      <Campo label="Lugar" id="p-lugar" value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Cancha Palermo, Av. Libertador 1234" maxLength={120} />
      <div className="field"><label>Formato</label>
        <div className="chips">{FORMATOS.map(f => <button type="button" key={f.label} className={`chip ${formato === f.label ? 'on' : ''}`} aria-pressed={formato === f.label} onClick={() => setFormato(f.label)}>{f.label}</button>)}</div>
      </div>
      {error ? <div className="error" role="alert">{error}</div> : null}
      <Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Guardando…' : etiqueta}</Btn>
      {onCancelar ? <Btn type="button" v="ghost" onClick={onCancelar}>Cancelar</Btn> : null}
    </form>
  );
}

function Inscripcion() {
  const { uid, gid, partido: p, jugadores, esAdmin } = useSesion();
  const toast = useToast();
  const registrados = useColl(collection(db, `grupos/${gid}/invitados`), gid) || [];
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(false);
  const [confirmaCancelar, setConfirmaCancelar] = useState(false);
  const [nomInv, setNomInv] = useState('');
  const [nivelInv, setNivelInv] = useState(5);
  const [cargando, setCargando] = useState(false);

  async function ejecutar(fn) { setError(''); setCargando(true); try { await fn(); } catch (e) { setError(mensajeError(e)); } setCargando(false); }

  if (!p) {
    return esAdmin ? (
      <>
        <div><h2 className="t">Armá el partido</h2><p className="lead" style={{ marginTop: 2 }}>Avisamos a todo el grupo apenas lo crees.</p></div>
        <FormPartido etiqueta="Crear partido" onGuardar={d => crearPartido(gid, d)} />
      </>
    ) : <Vacio titulo="Todavía no hay partido" texto="Cuando el admin lo cree te avisamos." />;
  }

  const d = aFecha(p.fechaHora);
  const insc = p.inscriptos || [];
  const cupo = p.cupo;
  const anotado = insc.includes(uid);
  const espera = p.listaEspera || [];
  const enEspera = espera.indexOf(uid);
  const lleno = insc.length >= cupo;
  const cena = p.cena || [];
  const yoCena = cena.includes(uid);
  const mensajeWA = encodeURIComponent(`⚽ ${tituloFecha(d)} en ${p.lugar}. Vamos ${insc.length} de ${cupo}. Anotate en Me Anoto: ${location.origin}`);

  if (editando) return (
    <>
      <h2 className="t">Editar partido</h2>
      <FormPartido etiqueta="Guardar cambios" inicial={{ fecha: aInputFecha(d), hora: horaTxt(d), lugar: p.lugar, formato: p.formato }}
        onGuardar={async datos => { await editarPartido(gid, p, datos); setEditando(false); }} onCancelar={() => setEditando(false)} />
      <p className="small">Si cambiás el día, la hora o el lugar, avisamos a los anotados.</p>
    </>
  );

  return (
    <>
      <div><h2 className="t">{mayus(diaLargo(d))}, {horaTxt(d)}</h2><p className="lead" style={{ marginTop: 2 }}>{p.lugar} · {p.formato}</p></div>
      <Card>
        <div className="card-h"><h3 className="t">Anotados</h3><b className="num">{insc.length}/{cupo}</b></div>
        <div style={{ padding: '10px 16px 4px' }}><Meter pct={(insc.length / cupo) * 100} claro /></div>
        <div style={{ paddingTop: 4 }}>
          {insc.length === 0 ? <div className="lista-vacia">Nadie anotado todavía. ¡Sé el primero!</div> : null}
          {insc.map(id => (
            <div className="todo-r" key={id} style={{ minHeight: 52, paddingBlock: 8 }}>
              <Avatar nombre={nombreDe(id, jugadores, p)} foto={jugadores[id] && jugadores[id].foto} yo={id === uid} />
              <span className="grow" style={{ fontWeight: 550 }}>{nombreDe(id, jugadores, p)}</span>
              {id === uid ? <Pill t="tint">Vos</Pill> : id.startsWith('inv_') ? <Pill>Invitado</Pill> : null}
              {esAdmin ? <button className="iconbtn" style={{ width: 36, height: 36 }} aria-label={`Sacar a ${nombreDe(id, jugadores, p)}`} onClick={() => ejecutar(() => quitarInscripto(gid, p, id))}><Icono n="minus" /></button> : null}
            </div>
          ))}
        </div>
      </Card>

      {anotado
        ? <Btn disabled={cargando} onClick={() => ejecutar(() => bajarse(gid, p, uid))}>Me bajo</Btn>
        : enEspera >= 0
          ? <Btn disabled={cargando} onClick={() => ejecutar(() => bajarse(gid, p, uid))}>Salir de la lista de espera (puesto {enEspera + 1})</Btn>
          : <Btn v="pri" disabled={cargando} onClick={() => ejecutar(async () => { await anotarse(gid, p, uid); toast(lleno ? 'Quedaste en la lista de espera.' : `¡Anotado! Nos vemos el ${diaSemana(d)}.`); })}>{lleno ? 'Sumarme a la lista de espera' : 'Me anoto'}</Btn>}
      {error ? <div className="error" role="alert">{error}</div> : null}
      {espera.length ? <Card><Fila icono="clock" titulo={`Lista de espera: ${espera.length}`} sub="Si alguien se baja, sube el primero y le avisamos." /></Card> : null}

      <Card>
        <Fila icono="food" titulo="Tercer tiempo" sub={yoCena ? `Estás anotado. Somos ${cena.length} para comer.` : `¿Te quedás a comer? Somos ${cena.length}.`}
          derecha={<button className={`chip ${yoCena ? 'on' : ''}`} aria-pressed={yoCena} onClick={() => ejecutar(() => (yoCena ? salirCena(gid, p, uid) : sumarseCena(gid, p, uid)))}>{yoCena ? 'Me quedo' : 'Sumarme'}</button>} />
      </Card>

      <CardB>
        <h3 className="t" style={{ marginBottom: 4 }}>Traer un invitado</h3>
        <p className="muted" style={{ marginBottom: 12 }}>Si ya vino antes, elegilo de la lista y se conserva su nivel.</p>
        {registrados.length ? (
          <div className="field" style={{ marginBottom: 10 }}><label htmlFor="inv-prev">Invitado que ya vino</label>
            <select id="inv-prev" className="select" value="" onChange={e => { const r = registrados.find(x => x.id === e.target.value); if (r) { setNomInv(r.nombre); setNivelInv(r.nivel); } }}>
              <option value="">Elegir…</option>{registrados.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select></div>
        ) : null}
        <Campo label="Nombre" id="inv-nombre" value={nomInv} onChange={e => setNomInv(e.target.value)} placeholder="Amigo de Juan" maxLength={60} />
        <div className="field" style={{ margin: '10px 0 12px' }}><label htmlFor="inv-nivel">Nivel (para equilibrar los equipos): <b>{nivelInv}</b></label>
          <input id="inv-nivel" type="range" min="1" max="10" step="0.5" value={nivelInv} onChange={e => setNivelInv(e.target.value)} style={{ accentColor: 'var(--primary)', minHeight: 32 }} /></div>
        <Btn disabled={cargando || nomInv.trim().length < 2} onClick={() => ejecutar(async () => { await agregarInvitado(gid, p, { nombre: nomInv, nivel: nivelInv, registrados }); setNomInv(''); setNivelInv(5); })}><Icono n="plus" />Agregar invitado</Btn>
      </CardB>

      <Btn onClick={() => window.open(`https://wa.me/?text=${mensajeWA}`, '_blank', 'noopener')}><Icono n="share" />Compartir por WhatsApp</Btn>

      {esAdmin ? (
        <Card>
          <div className="card-h"><h3 className="t">Solo admin</h3><Pill t="tint"><Icono n="shield" />Admin</Pill></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Btn onClick={() => setEditando(true)}><Icono n="edit" />Editar día, hora o lugar</Btn>
            {confirmaCancelar ? (
              <div className="confirm"><b>¿Cancelar el partido?</b><span className="muted">Se avisa a todo el grupo y se cierra. No se puede deshacer.</span>
                <div className="row"><Btn onClick={() => setConfirmaCancelar(false)}>No, volver</Btn><Btn v="pri" disabled={cargando} onClick={() => ejecutar(() => cancelarPartido(gid, p))}>Sí, cancelar</Btn></div></div>
            ) : <Btn v="ghost" onClick={() => setConfirmaCancelar(true)}><Icono n="trash" />Cancelar el partido</Btn>}
          </div>
        </Card>
      ) : null}
    </>
  );
}

export default function Partido() {
  const { partido, esAdmin } = useSesion();
  const { param, ir } = useNav();
  const tab = param || 'inscripcion';
  const votando = partido && partido.estado === 'votando';
  const tabs = [
    { id: 'inscripcion', label: 'Inscripción' },
    { id: 'equipos', label: 'Equipos' },
    ...(esAdmin ? [{ id: 'goles', label: 'Goles' }] : []),
    { id: 'votar', label: 'Votación', badge: votando ? '!' : '' }
  ];
  return (
    <div className="scr">
      <BarraSuperior titulo="Partido" />
      {partido ? <HbTabs items={tabs} cur={tab} onSel={t => ir('partido', t)} /> : null}
      {tab === 'equipos' && partido ? <Equipos /> : tab === 'goles' && partido && esAdmin ? <Goles /> : tab === 'votar' && partido ? <Votacion /> : <Inscripcion />}
    </div>
  );
}
