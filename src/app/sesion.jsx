import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, limit, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';
import { aMapa, useColl, useDoc } from '../data/hooks.js';

const Ctx = createContext(null);
export const useSesion = () => useContext(Ctx);

const GID_KEY = 'app8_grupo';
const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };

export function SesionProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined: todavía resolviendo la sesión
  const [rev, setRev] = useState(0);
  const refrescar = useCallback(async () => { if (auth.currentUser) { await auth.currentUser.reload(); setRev(r => r + 1); } }, []);
  useEffect(() => onAuthStateChanged(auth, u => setUser(u || null)), []);
  const uid = user ? user.uid : null;

  const perfil = useDoc(uid ? doc(db, 'usuarios', uid) : null, uid);
  const priv = useDoc(uid ? doc(db, 'privado', uid) : null, uid);
  const grupos = useColl(uid ? query(collection(db, 'grupos'), where('miembros', 'array-contains', uid)) : null, uid);
  const avisos = useColl(uid ? query(collection(db, `privado/${uid}/avisos`), orderBy('creadoEn', 'desc'), limit(50)) : null, uid);

  const [gidSel, setGidSel] = useState(() => leer(GID_KEY));
  const grupo = (grupos && (grupos.find(g => g.id === gidSel) || grupos[0])) || null;
  const gid = grupo ? grupo.id : null;
  const elegirGrupo = useCallback(id => { setGidSel(id); try { localStorage.setItem(GID_KEY, id); } catch (e) { /* sin almacenamiento */ } }, []);

  const jugadoresL = useColl(gid ? collection(db, `grupos/${gid}/jugadores`) : null, gid);
  const jugadores = useMemo(() => aMapa(jugadoresL), [jugadoresL]);
  // Puede haber hasta 2 partidos a la vez (por ejemplo, uno pendiente de votación y otro próximo).
  // `activos` es la lista; `partidoActivo` es el campo de antes (un solo partido).
  const idsActivos = useMemo(() => (grupo ? (grupo.activos || (grupo.partidoActivo ? [grupo.partidoActivo] : [])) : []), [grupo]);
  const [pidSel, setPidSel] = useState(null);
  const pidActivo = idsActivos.includes(pidSel) ? pidSel : idsActivos[0] || null;
  const p0 = useDoc(gid && idsActivos[0] ? doc(db, `grupos/${gid}/partidos/${idsActivos[0]}`) : null, `${gid}/${idsActivos[0]}`);
  const p1 = useDoc(gid && idsActivos[1] ? doc(db, `grupos/${gid}/partidos/${idsActivos[1]}`) : null, `${gid}/${idsActivos[1]}`);
  const partidos = [p0, p1].filter((x, i) => x && idsActivos[i]);
  const partido = partidos.find(x => x.id === pidActivo) || null;
  const elegirPartido = useCallback(id => setPidSel(id), []);

  const esAdmin = !!(grupo && uid && grupo.admins.includes(uid));
  const esCreador = !!(grupo && uid && grupo.creadorUid === uid);
  const sinLeer = (avisos || []).filter(a => !a.leido).length;
  const cargando = user === undefined || (user && (perfil === undefined || priv === undefined || grupos === undefined));

  const valor = { rev, refrescar, user, uid, perfil, priv, grupos, grupo, gid, elegirGrupo, jugadores, partido, partidos, idsActivos, elegirPartido, esAdmin, esCreador, avisos: avisos || [], sinLeer, cargando };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

// Nombre para mostrar de una persona o invitado dentro del grupo.
export function nombreDe(id, jugadores, partido) {
  if (!id) return '';
  if (String(id).startsWith('inv_')) return (partido && partido.invitados && partido.invitados[id] && partido.invitados[id].nombre) || 'Invitado';
  const j = jugadores && jugadores[id];
  return (j && (j.nombre || '')) || 'Jugador';
}
