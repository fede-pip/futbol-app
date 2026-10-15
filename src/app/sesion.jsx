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
  const pidActivo = grupo ? grupo.partidoActivo : null;
  const partido = useDoc(gid && pidActivo ? doc(db, `grupos/${gid}/partidos/${pidActivo}`) : null, `${gid}/${pidActivo}`);

  const esAdmin = !!(grupo && uid && grupo.admins.includes(uid));
  const esCreador = !!(grupo && uid && grupo.creadorUid === uid);
  const sinLeer = (avisos || []).filter(a => !a.leido).length;
  const cargando = user === undefined || (user && (perfil === undefined || priv === undefined || grupos === undefined));

  const valor = { user, uid, perfil, priv, grupos, grupo, gid, elegirGrupo, jugadores, partido, esAdmin, esCreador, avisos: avisos || [], sinLeer, cargando };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

// Nombre para mostrar de una persona o invitado dentro del grupo.
export function nombreDe(id, jugadores, partido) {
  if (!id) return '';
  if (String(id).startsWith('inv_')) return (partido && partido.invitados && partido.invitados[id] && partido.invitados[id].nombre) || 'Invitado';
  const j = jugadores && jugadores[id];
  return (j && (j.nombre || '')) || 'Jugador';
}
