import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { useState } from 'react';
import { db } from '../lib/firebase.js';
import { useColl } from '../data/hooks.js';
import { anotarse, bajarse } from '../data/acciones.js';
import { aFecha, faltan, titulo as tituloFecha, diaCorto } from '../lib/fechas.js';
import { Btn, Card, CardB, Fila, Icono, Meter, Pill, Vacio } from '../components/ui.jsx';
import { useSesion, nombreDe } from '../app/sesion.jsx';
import { useNav } from '../app/nav.jsx';
import { BarraSuperior } from '../app/Shell.jsx';
import { mensajeError } from '../lib/firebase.js';

const iniciales = n => (n || '').split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();

export default function Inicio() {
  const { uid, perfil, grupo, grupos, gid, elegirGrupo, partido, jugadores, esAdmin } = useSesion();
  const { ir } = useNav();
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const ultimo = useColl(query(collection(db, `grupos/${gid}/partidos`), where('estado', '==', 'cerrado'), orderBy('fechaHora', 'desc'), limit(1)), gid);
  const yo = jugadores[uid];

  const d = partido ? aFecha(partido.fechaHora) : null;
  const n = partido ? (partido.inscriptos || []).length : 0;
  const cupo = partido ? partido.cupo : 0;
  const anotado = partido && (partido.inscriptos || []).includes(uid);
  const enEspera = partido && (partido.listaEspera || []).indexOf(uid);
  const lleno = partido && n >= cupo;
  const votando = partido && partido.estado === 'votando';

  async function accion(fn) {
    setError(''); setCargando(true);
    try { await fn(); } catch (e) { setError(mensajeError(e)); }
    setCargando(false);
  }

  const u = ultimo && ultimo[0];
  const r = u && u.resultado;

  return (
    <div className="scr">
      <BarraSuperior />
      <div className="grp-h">
        <span className="gav">{iniciales(grupo.nombre)}</span>
        <div className="grow"><b>{grupo.nombre}</b><div className="small">{grupo.miembros.length} {grupo.miembros.length === 1 ? 'jugador' : 'jugadores'}</div></div>
        {grupos.length > 1 ? (
          <select className="select" style={{ width: 'auto', minHeight: 36, fontSize: 14 }} value={gid} onChange={e => elegirGrupo(e.target.value)} aria-label="Cambiar de grupo">
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        ) : null}
      </div>
      <div>
        <h2 className="t">Hola, {(perfil.apodo || perfil.nombre).split(' ')[0]}</h2>
        <p className="lead" style={{ marginTop: 2 }}>{partido && d ? faltan(d) + ' para el partido.' : 'Todavía no hay partido armado.'}</p>
      </div>

      {partido ? (
        <section className="kpi pitch" aria-label="Próximo partido">
          <div className="lb">{votando ? 'Votación abierta' : 'Próximo partido'}</div>
          <div className="v">{d ? tituloFecha(d) : ''}</div>
          <div className="s"><span><Icono n="pin" style={{ width: 15, height: 15 }} />{partido.lugar}</span><span>{partido.formato}</span></div>
          {votando ? (
            <Btn v="white" style={{ marginTop: 16 }} onClick={() => ir('partido', 'votar')}>Ir a votar</Btn>
          ) : (
            <>
              <div className="row sp" style={{ margin: '16px 0 8px' }}><b className="num" style={{ fontSize: 15 }}>{n} de {cupo} anotados</b><span style={{ fontSize: 13, color: '#c9f0dc' }}>{lleno ? 'Completo' : `Quedan ${cupo - n}`}</span></div>
              <Meter pct={cupo ? (n / cupo) * 100 : 0} />
              {anotado
                ? <Btn v="glass" style={{ marginTop: 14 }} disabled={cargando} onClick={() => accion(() => bajarse(gid, partido, uid))}><Icono n="check" />Estás anotado · Salir</Btn>
                : enEspera >= 0
                  ? <Btn v="glass" style={{ marginTop: 14 }} disabled={cargando} onClick={() => accion(() => bajarse(gid, partido, uid))}>En lista de espera (puesto {enEspera + 1}) · Salir</Btn>
                  : <Btn v="white" style={{ marginTop: 14 }} disabled={cargando} onClick={() => accion(() => anotarse(gid, partido, uid))}>{lleno ? 'Sumarme a la lista de espera' : 'Anotarme'}</Btn>}
            </>
          )}
        </section>
      ) : esAdmin ? (
        <section className="kpi pitch">
          <div className="lb">Sin partido</div>
          <div className="v">Armá el próximo</div>
          <div className="s" style={{ display: 'block' }}>Elegí día, hora y cancha. Avisamos a todo el grupo.</div>
          <Btn v="white" style={{ marginTop: 16 }} onClick={() => ir('partido')}>Crear partido</Btn>
        </section>
      ) : (
        <Vacio titulo="El admin todavía no creó el partido" texto="Cuando lo cree te avisamos." />
      )}
      {error ? <div className="error" role="alert">{error}</div> : null}

      {partido ? (
        <Card>
          <div className="card-h"><h3 className="t">Qué sigue</h3></div>
          <div style={{ paddingTop: 6 }}>
            <Fila icono={anotado ? 'check' : 'cal'} hecho={anotado} titulo="Anotarte al partido" sub={anotado ? 'Listo, ya estás en la lista' : lleno ? 'El cupo está completo' : `Quedan ${cupo - n} lugares`} />
            <Fila icono="users" titulo="Ver los equipos" sub={partido.equipos && partido.equipos.publicado ? 'Ya están publicados' : 'Se publican antes del partido'} onClick={() => ir('partido', 'equipos')} derecha={<span className="go">Ver</span>} />
            <Fila icono="vote" titulo="Votar a tus compañeros" sub={votando ? 'Está abierta' : 'Se abre cuando termina el partido'} onClick={() => ir('partido', 'votar')} derecha={votando ? <Pill t="warn">Abierta</Pill> : null} />
          </div>
        </Card>
      ) : null}

      {r ? (
        <Card>
          <div className="card-h"><h3 className="t">El último partido</h3><span className="small">{diaCorto(aFecha(u.fechaHora))}</span></div>
          <CardB style={{ paddingTop: 12, border: 0, boxShadow: 'none' }}>
            <div className="row sp"><span className="pill eq-o">Oscuro</span><b className="num" style={{ fontSize: 28, letterSpacing: '-.035em' }}>{r.golesO} – {r.golesB}</b><span className="pill eq-b">Blanco</span></div>
            {u.mvps && u.mvps.length ? <div className="row" style={{ marginTop: 12, justifyContent: 'center', gap: 8 }}><span className="pill warn"><Icono n="star" />MVP</span><span style={{ fontWeight: 550 }}>{u.mvps.map(id => nombreDe(id, jugadores, u)).join(' y ')}</span></div> : null}
          </CardB>
        </Card>
      ) : null}

      <div className="grid2">
        <Card className="kp"><div className="lb">Puntos</div><div className="v num">{yo && yo.stats ? yo.stats.puntos : 0}</div></Card>
        <Card className="kp"><div className="lb">Racha</div>
          <div className="racha" style={{ marginTop: 12 }}>{yo && yo.racha ? yo.racha.split('').slice(-5).map((c, i) => <b key={i} className={c}>{c}</b>) : <span className="small">Sin partidos todavía</span>}</div>
        </Card>
      </div>
    </div>
  );
}
