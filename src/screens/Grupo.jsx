import { useEffect, useState } from 'react';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db, llamar, mensajeError } from '../lib/firebase.js';
import { ATTRS, depurarInvitados, pl } from '../lib/logica.js';
import { useColl } from '../data/hooks.js';
import { actualizarGrupo, borrarInvitados, renombrarJugador, guardarNiveles, ponerAdmin, quitarMiembro, sacarAdmin } from '../data/acciones.js';
import { Avatar, Btn, Card, CardB, Fila, Hint, Icono, Pill, SelectorFoto } from '../components/ui.jsx';
import { useSesion } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';
import { BarraSuperior } from '../app/Shell.jsx';
import { GrupoElegir } from './Inicio1.jsx';
import { useToast } from '../components/ui.jsx';

function EditorNombre({ gid, id, j, onCerrar }) {
  const toast = useToast();
  const [nombre, setNombre] = useState(j.nombre || '');
  const [apodo, setApodo] = useState(j.apodo || '');
  const [foto, setFoto] = useState(j.foto || '');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  async function guardar(e) {
    e.preventDefault(); setError('');
    if (nombre.trim().length < 2) return setError('El nombre tiene que tener al menos 2 letras.');
    setCargando(true);
    try { await renombrarJugador(gid, id, { nombre, apodo, foto: foto !== (j.foto || '') ? foto : undefined }); toast('Nombre actualizado'); onCerrar(); }
    catch (err) { setError(mensajeError(err)); }
    setCargando(false);
  }
  return (
    <form onSubmit={guardar} style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SelectorFoto nombre={nombre} foto={foto} onCambio={setFoto} onError={setError} />
      <div className="field"><label htmlFor={`rn-${id}`}>Nombre</label><input id={`rn-${id}`} value={nombre} onChange={e => setNombre(e.target.value)} maxLength={60} autoComplete="off" /></div>
      <div className="field"><label htmlFor={`ra-${id}`}>Apodo (opcional)</label><input id={`ra-${id}`} value={apodo} onChange={e => setApodo(e.target.value)} maxLength={30} autoComplete="off" /></div>
      <p className="small">Cambia cómo se ve en este grupo. Si la persona edita su perfil, se actualiza con lo que ponga.</p>
      {error ? <div className="error" role="alert">{error}</div> : null}
      <div className="row"><Btn type="button" onClick={onCerrar}>Cancelar</Btn><Btn type="submit" v="pri" disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar'}</Btn></div>
    </form>
  );
}

function EditorNiveles({ gid, id, nombre, onCerrar }) {
  const [vals, setVals] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();
  useEffect(() => { getDoc(doc(db, `grupos/${gid}/niveles/${id}`)).then(s => setVals((s.data() && s.data().atributos) || {})).catch(() => setVals({})); }, [gid, id]);
  if (!vals) return <div className="lista-vacia">Cargando…</div>;
  async function guardar() {
    const at = {};
    ATTRS.forEach(a => { const v = parseFloat(vals[a.key]); if (v > 0) at[a.key] = Math.min(10, Math.max(1, v)); });
    try { await guardarNiveles(gid, id, at); toast('Niveles guardados'); onCerrar(); } catch (e) { setError(mensajeError(e)); }
  }
  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <p className="muted" style={{ marginBottom: 10 }}>Nivel de {nombre} de 1 a 10. Solo lo ven los admins.</p>
      <div className="nivel-grid">
        {ATTRS.map(a => (
          <div className="field" key={a.key}><label htmlFor={`n-${a.key}`}>{a.label}</label>
            <input id={`n-${a.key}`} type="number" inputMode="decimal" min="1" max="10" step="0.5" value={vals[a.key] ?? ''} onChange={e => setVals({ ...vals, [a.key]: e.target.value })} /></div>
        ))}
      </div>
      {error ? <div className="error" style={{ marginTop: 10 }}>{error}</div> : null}
      <div className="row" style={{ marginTop: 12 }}><Btn onClick={onCerrar}>Cancelar</Btn><Btn v="pri" onClick={guardar}>Guardar</Btn></div>
    </div>
  );
}

export default function Grupo() {
  const { uid, gid, grupo, grupos, elegirGrupo, jugadores, esAdmin, esCreador } = useSesion();
  const { ir } = useNav();
  const toast = useToast();
  const [abierto, setAbierto] = useState(null);   // id con panel abierto
  const [panel, setPanel] = useState('');          // 'niveles' | 'expulsar'
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(grupo.nombre);
  const [precio, setPrecio] = useState(grupo.precioCancha || 0);
  const [pozo, setPozo] = useState(grupo.pozo || 0);
  const [error, setError] = useState('');
  const [confirmaSalir, setConfirmaSalir] = useState(false);
  const [sumando, setSumando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [confBorrar, setConfBorrar] = useState('');
  const [limpiando, setLimpiando] = useState(false);
  const guardados = useColl(esAdmin ? collection(db, `grupos/${gid}/invitados`) : null, gid) || [];
  const { utiles: invitadosUtiles, sobrantes: invitadosSobrantes } = depurarInvitados(guardados, Object.values(jugadores).flatMap(j => [j.nombre, j.apodo]));

  async function ejecutar(fn, ok) { setError(''); try { await fn(); if (ok) toast(ok); } catch (e) { setError(mensajeError(e)); } }
  const copiar = async () => {
    try { await navigator.clipboard.writeText(grupo.codigo); toast('Código copiado'); } catch (e) { toast('Seleccioná el código para copiarlo'); }
  };
  const texto = encodeURIComponent(`Sumate a ${grupo.nombre} en Me Anoto. Entrá a ${location.origin} y usá el código ${grupo.codigo}`);
  const roles = [['Jugador', null, ['Anotarse y traer invitados', 'Votar después del partido', 'Ver estadísticas']],
    ['Admin', 'Admin', ['Crear el partido', 'Armar y publicar los equipos', 'Cargar resultado y goles', 'Cerrar la votación', 'Editar los avisos del grupo']],
    ['Creador', 'Creador', ['Todo lo del admin', 'Nombrar o quitar admins']]];

  if (sumando) return <GrupoElegir uid={uid} onVolver={() => setSumando(false)} onListo={id => { elegirGrupo(id); setSumando(false); ir('inicio'); }} />;

  return (
    <div className="scr">
      <BarraSuperior titulo="Grupo" />
      <div>
        <h3 className="t" style={{ marginBottom: 8 }}>Mis grupos</h3>
        <Card>
          {grupos.map(g => (
            <Fila key={g.id} icono={g.id === gid ? 'check' : 'users'} hecho={g.id === gid} titulo={g.nombre} sub={g.id === gid ? 'Es el que estás viendo' : 'Tocá para verlo'}
              onClick={g.id === gid ? undefined : () => { elegirGrupo(g.id); toast(`Ahora ves ${g.nombre}`); }} derecha={g.id === gid ? <Pill t="tint">Actual</Pill> : <Icono n="chev" />} />
          ))}
        </Card>
        <button className="choice" style={{ marginTop: 10 }} onClick={() => setSumando(true)}><span className="ti"><Icono n="plus" /></span><div className="grow"><b>Sumar otro grupo</b><span>Unirte con un código o crear uno nuevo.</span></div><Icono n="chev" /></button>
      </div>
      <section className="kpi pitch">
        <div className="lb">Tu grupo</div><div className="v">{grupo.nombre}</div>
        <div className="s"><span>{grupo.miembros.length} {pl(grupo.miembros.length, 'jugador', 'jugadores')}</span>{grupo.precioCancha ? <span>${grupo.precioCancha} por persona</span> : null}{grupo.pozo ? <span>Pozo: ${grupo.pozo}</span> : null}</div>
        <div className="row" style={{ marginTop: 14, gap: 0 }}>
          {grupo.miembros.slice(0, 6).map((id, i) => <span key={id} style={{ marginLeft: i ? -8 : 0, border: '2px solid #0e4d31', borderRadius: '50%', display: 'inline-flex' }}><Avatar nombre={(jugadores[id] || {}).nombre} foto={(jugadores[id] || {}).foto} /></span>)}
          {grupo.miembros.length > 6 ? <span style={{ marginLeft: 10, fontSize: 13, color: '#c9f0dc' }}>+{grupo.miembros.length - 6}</span> : null}
        </div>
      </section>
      {error ? <div className="error" role="alert">{error}</div> : null}

      <CardB style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="cap">Código de invitación</div>
        <div className="code" aria-label={`Código ${grupo.codigo}`}>{grupo.codigo}</div>
        <div className="row"><Btn onClick={copiar}><Icono n="copy" />Copiar</Btn><Btn v="pri" onClick={() => window.open(`https://wa.me/?text=${texto}`, '_blank', 'noopener')}><Icono n="share" />Compartir</Btn></div>
        {esAdmin ? <button className="link" onClick={() => ejecutar(async () => { await llamar('nuevoCodigo', { gid }); }, 'Código nuevo creado')}>Generar un código nuevo</button> : null}
      </CardB>

      {esAdmin ? (
        <>
          <button className="choice" onClick={() => ir('avisosAdmin')}><span className="ti"><Icono n="bell" /></span><div className="grow"><b>Avisos del grupo</b><span>Qué se avisa, cuándo y a quién.</span></div><Icono n="chev" /></button>
          <Card>
            {editando ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="field"><label htmlFor="g-nombre">Nombre del grupo</label><input id="g-nombre" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={60} /></div>
                <div className="field"><label htmlFor="g-precio">Precio por persona ($)</label><input id="g-precio" type="number" inputMode="numeric" min="0" value={precio} onChange={e => setPrecio(e.target.value)} /></div>
                <div className="field"><label htmlFor="g-pozo">Pozo acumulado ($)</label><input id="g-pozo" type="number" inputMode="numeric" min="0" value={pozo} onChange={e => setPozo(e.target.value)} /></div>
                <div className="row"><Btn onClick={() => setEditando(false)}>Cancelar</Btn>
                  <Btn v="pri" onClick={() => ejecutar(async () => { await actualizarGrupo(gid, { nombre: nombre.trim(), precioCancha: Number(precio) || 0, pozo: Number(pozo) || 0 }); setEditando(false); }, 'Cambios guardados')}>Guardar</Btn></div>
              </div>
            ) : <Fila icono="edit" titulo="Nombre, precio y pozo" sub={`${grupo.nombre}${grupo.precioCancha ? ` · $${grupo.precioCancha} por persona` : ''}${grupo.pozo ? ` · pozo $${grupo.pozo}` : ''}`} onClick={() => setEditando(true)} derecha={<Icono n="chev" />} />}
          </Card>
        </>
      ) : null}

      <div><h3 className="t" style={{ marginBottom: 8 }}>Jugadores</h3>
        <Card>
          {grupo.miembros.map(id => {
            const j = jugadores[id] || {};
            const pendiente = id.startsWith('l_');
            const soyYo = id === uid;
            const esAdm = grupo.admins.includes(id);
            return (
              <div key={id}>
                <div className="todo-r" style={{ minHeight: 56 }}>
                  <Avatar nombre={j.nombre} foto={j.foto} yo={soyYo} />
                  <div className="grow"><b>{j.nombre || 'Jugador'}{j.apodo ? <span style={{ color: 'var(--primary)', fontWeight: 500 }}> “{j.apodo}”</span> : null}</b>
                    {pendiente ? <small>Todavía no entró con su email</small> : null}</div>
                  {id === grupo.creadorUid ? <Pill t="tint">Creador</Pill> : esAdm ? <Pill t="tint">Admin</Pill> : null}
                  {esAdmin && !soyYo ? <button className="iconbtn" style={{ width: 36, height: 36 }} aria-label={`Opciones de ${j.nombre}`} onClick={() => { setAbierto(abierto === id ? null : id); setPanel(''); }}><Icono n="chev" style={{ transform: abierto === id ? 'rotate(90deg)' : 'none' }} /></button> : null}
                  {esAdmin && soyYo ? <button className="chip sm" onClick={() => { setAbierto(abierto === id ? null : id); setPanel('niveles'); }}>Mi nivel</button> : null}
                </div>
                {abierto === id && esAdmin ? (
                  panel === 'niveles' ? <EditorNiveles gid={gid} id={id} nombre={j.nombre} onCerrar={() => { setAbierto(null); setPanel(''); }} /> : panel === 'nombre' ? <EditorNombre gid={gid} id={id} j={j} onCerrar={() => { setAbierto(null); setPanel(''); }} /> : panel === 'expulsar' ? (
                    <div className="confirm" style={{ margin: '0 16px 14px' }}><b>¿Sacar a {j.nombre} del grupo?</b><span className="muted">Conserva su historial pero deja de ver el grupo.</span>
                      <div className="row"><Btn onClick={() => setPanel('')}>No</Btn><Btn v="pri" onClick={() => ejecutar(async () => { await quitarMiembro(gid, grupo, id); setAbierto(null); }, 'Jugador sacado')}>Sí, sacar</Btn></div></div>
                  ) : (
                    <div className="chips" style={{ padding: '0 16px 14px' }}>
                      <button className="chip" onClick={() => setPanel('nombre')}>Editar nombre y foto</button>
                      <button className="chip" onClick={() => setPanel('niveles')}>Cambiar nivel</button>
                      {!pendiente ? <button className="chip" onClick={() => ejecutar(() => (esAdm ? sacarAdmin(gid, id) : ponerAdmin(gid, id)), esAdm ? 'Ya no es admin' : 'Ahora es admin')}>{esAdm ? 'Quitar admin' : 'Hacer admin'}</button> : null}
                      {id !== grupo.creadorUid ? <button className="chip" onClick={() => setPanel('expulsar')}>Sacar del grupo</button> : null}
                    </div>
                  )
                ) : null}
              </div>
            );
          })}
        </Card>
      </div>

      {esAdmin && guardados.length ? (
        <div><h3 className="t" style={{ marginBottom: 8 }}>Invitados guardados</h3>
          <Card>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="muted">{invitadosUtiles.length} {invitadosUtiles.length === 1 ? 'invitado' : 'invitados'} para elegir cuando alguien trae a un amigo.</span>
              {invitadosSobrantes.length ? (
                <>
                  <Hint>Hay {invitadosSobrantes.length} repetidos o que ya juegan en el grupo. Limpiar no cambia ningún partido anterior.</Hint>
                  <Btn disabled={limpiando} onClick={() => ejecutar(async () => { setLimpiando(true); try { await borrarInvitados(gid, invitadosSobrantes.map(x => x.id)); } finally { setLimpiando(false); } }, 'Lista limpia')}>Limpiar repetidos ({invitadosSobrantes.length})</Btn>
                </>
              ) : null}
              <div className="chips">{invitadosUtiles.map(x => <span key={x.id} className="chip">{x.nombre}<button type="button" aria-label={`Borrar a ${x.nombre} de la lista`} style={{ border: 0, background: 'none', marginLeft: 6, cursor: 'pointer', color: 'var(--text-3)', font: 'inherit' }} onClick={() => ejecutar(() => borrarInvitados(gid, [x.id]), 'Invitado borrado')}>×</button></span>)}</div>
            </div>
          </Card>
        </div>
      ) : null}

      <div><h3 className="t" style={{ marginBottom: 8 }}>Qué puede hacer cada uno</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roles.map(r => (
            <CardB key={r[0]}><div className="row sp" style={{ marginBottom: 6 }}><b>{r[0]}</b>{r[1] ? <Pill t="tint"><Icono n="shield" />{r[1]}</Pill> : null}</div>
              {r[2].map(x => <div key={x} className="row" style={{ padding: '4px 0', color: 'var(--text-2)', fontSize: 13.5 }}><span style={{ color: 'var(--ok)', display: 'inline-flex' }}><Icono n="check" style={{ width: 16, height: 16 }} /></span>{x}</div>)}</CardB>
          ))}
        </div>
      </div>

      <Card><Fila icono="user" titulo="Mi perfil" sub="Nombre, apodo y cuenta" onClick={() => ir('perfil')} derecha={<Icono n="chev" />} /></Card>
      {esCreador ? (
        borrando ? (
          <div className="confirm"><b>¿Borrar "{grupo.nombre}"?</b><span className="muted">Se borran el grupo, todos sus partidos, estadísticas y jugadores para todos. No se puede deshacer.</span>
            <div className="field"><label htmlFor="bg-conf">Para confirmar, escribí BORRAR</label><input id="bg-conf" value={confBorrar} onChange={e => setConfBorrar(e.target.value)} autoComplete="off" autoCapitalize="characters" /></div>
            <div className="row"><Btn onClick={() => { setBorrando(false); setConfBorrar(''); }}>Cancelar</Btn>
              <Btn v="pri" disabled={confBorrar.trim().toUpperCase() !== 'BORRAR'} onClick={() => ejecutar(async () => { await llamar('borrarGrupo', { gid, confirmar: 'BORRAR' }); toast('Grupo borrado'); ir('inicio'); })}>Borrar el grupo</Btn></div></div>
        ) : <Btn v="ghost" onClick={() => setBorrando(true)}><Icono n="trash" />Borrar el grupo</Btn>
      ) : null}
      {!esCreador ? (
        confirmaSalir ? (
          <div className="confirm"><b>¿Salir de {grupo.nombre}?</b><span className="muted">Para volver vas a necesitar el código.</span>
            <div className="row"><Btn onClick={() => setConfirmaSalir(false)}>Quedarme</Btn><Btn v="pri" onClick={() => ejecutar(async () => { await quitarMiembro(gid, grupo, uid); })}>Salir</Btn></div></div>
        ) : <Btn v="ghost" onClick={() => setConfirmaSalir(true)}>Salir del grupo</Btn>
      ) : null}
    </div>
  );
}
