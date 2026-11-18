import { useEffect, useState } from 'react';
import { SesionProvider, useSesion } from './sesion.jsx';
import { NavProvider, useNav } from './nav.jsx';
import { BarraInferior } from './Shell.jsx';
import { Splash, ToastProvider } from '../components/ui.jsx';
import { crearPerfil, marcarOnboarding } from '../data/acciones.js';
import { registrarSiHayPermiso } from '../lib/push.js';
import Bienvenida from '../screens/Bienvenida.jsx';
import Cuenta from '../screens/Cuenta.jsx';
import { AgregarEmail, CompletarPerfil, GrupoElegir, MigrarDni, PermisoAvisos, PreguntaAnterior } from '../screens/Inicio1.jsx';
import Inicio from '../screens/Inicio.jsx';
import Partido from '../screens/Partido.jsx';
import Stats from '../screens/Stats.jsx';
import Grupo from '../screens/Grupo.jsx';
import Perfil from '../screens/Perfil.jsx';
import { CentroAvisos, MisAvisos } from '../screens/Avisos.jsx';
import { AvisoEdit, AvisosAdmin } from '../screens/AvisosAdmin.jsx';
import Plataforma, { esSuper } from '../screens/Plataforma.jsx';

const leer = k => { try { return sessionStorage.getItem(k) || localStorage.getItem(k); } catch (e) { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };

function Rutas() {
  const { ruta, ir } = useNav();
  const { esAdmin } = useSesion();
  const pantallas = {
    inicio: <Inicio />, partido: <Partido />, stats: <Stats />, grupo: <Grupo />, perfil: <Perfil />,
    avisos: <CentroAvisos />, misAvisos: <MisAvisos />,
    avisosAdmin: esAdmin ? <AvisosAdmin /> : <Inicio />, avisoEdit: esAdmin ? <AvisoEdit /> : <Inicio />,
    plataforma: <Plataforma />,
    migrar: <MigrarDni onListo={() => ir('inicio')} onOmitir={() => ir('perfil')} />
  };
  return <>{pantallas[ruta] || <Inicio />}<BarraInferior /></>;
}

function Contenido() {
  const s = useSesion();
  const nav = useNav();
  const [bienvenidaVista, setBienvenidaVista] = useState(() => !!leer('app8_bienvenida'));
  const [viendoDni, setViendoDni] = useState(false);
  const [paso, setPaso] = useState(0); // fuerza re-render tras cambios locales

  // Quien entra con Google ya trae nombre: su perfil se crea solo.
  useEffect(() => {
    if (s.user && s.perfil === null && s.user.displayName) crearPerfil(s.uid, { nombre: s.user.displayName, foto: '' }).catch(() => {});
  }, [s.user, s.perfil]);
  // Si ya dio permiso de avisos en este dispositivo, lo registramos en silencio.
  useEffect(() => { if (s.uid && s.perfil) registrarSiHayPermiso(s.uid); }, [s.uid, !!s.perfil]);

  if (s.cargando) return <Splash />;
  if (!s.user) {
    if (!bienvenidaVista) return <Bienvenida onTerminar={() => { guardar('app8_bienvenida', '1'); setBienvenidaVista(true); }} />;
    return <Cuenta onAtras={() => { try { localStorage.removeItem('app8_bienvenida'); } catch (e) { /* nada */ } setBienvenidaVista(false); }} />;
  }
  if (!s.perfil) return s.user.displayName ? <Splash /> : <CompletarPerfil uid={s.uid} />;
  // Quien entró con DNI todavía no tiene email: es obligatorio, es su forma de entrar y de recuperar la contraseña.
  if (!s.user.email) return <AgregarEmail nombre={s.perfil.nombre} onListo={s.refrescar} />;
  // El dueño de la plataforma llega a sus herramientas aunque todavía no tenga grupo.
  if (esSuper(s.user) && nav.ruta === 'plataforma') return <Plataforma />;
  // Primera vez: ¿ya jugaba en la versión anterior? (se pregunta una sola vez)
  const yaPregunto = !!(s.priv && (s.priv.legacyDni || (s.priv.onboarding && s.priv.onboarding.anterior)));
  if (!yaPregunto || viendoDni) {
    const seguir = () => { setViendoDni(false); marcarOnboarding(s.uid, 'anterior'); };
    return viendoDni ? <MigrarDni onListo={seguir} onOmitir={() => setViendoDni(false)} /> : <PreguntaAnterior onListo={seguir} onDni={() => setViendoDni(true)} />;
  }
  if (!s.grupos.length) return <GrupoElegir uid={s.uid} superAdmin={esSuper(s.user)} onAnterior={() => setViendoDni(true)} onListo={gid => { s.elegirGrupo(gid); setPaso(paso + 1); }} />;
  if (!(s.priv && s.priv.onboarding && s.priv.onboarding.avisos)) return <PermisoAvisos uid={s.uid} onListo={() => marcarOnboarding(s.uid, 'avisos')} />;
  return <Rutas />;
}

export default function App() {
  return (
    <SesionProvider><NavProvider><ToastProvider><div className="app"><Contenido /></div></ToastProvider></NavProvider></SesionProvider>
  );
}
