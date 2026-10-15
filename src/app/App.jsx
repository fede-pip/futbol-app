import { useEffect, useState } from 'react';
import { SesionProvider, useSesion } from './sesion.jsx';
import { NavProvider, useNav } from './nav.jsx';
import { BarraInferior } from './Shell.jsx';
import { Splash, ToastProvider } from '../components/ui.jsx';
import { crearPerfil, marcarOnboarding } from '../data/acciones.js';
import { registrarSiHayPermiso } from '../lib/push.js';
import Bienvenida from '../screens/Bienvenida.jsx';
import Cuenta from '../screens/Cuenta.jsx';
import { CompletarPerfil, GrupoElegir, MigrarDni, PermisoAvisos } from '../screens/Inicio1.jsx';
import Inicio from '../screens/Inicio.jsx';
import Partido from '../screens/Partido.jsx';
import Stats from '../screens/Stats.jsx';
import Grupo from '../screens/Grupo.jsx';
import Perfil from '../screens/Perfil.jsx';
import { CentroAvisos, MisAvisos } from '../screens/Avisos.jsx';
import { AvisoEdit, AvisosAdmin } from '../screens/AvisosAdmin.jsx';

const leer = k => { try { return sessionStorage.getItem(k) || localStorage.getItem(k); } catch (e) { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };

function Rutas() {
  const { ruta, ir } = useNav();
  const { esAdmin } = useSesion();
  const pantallas = {
    inicio: <Inicio />, partido: <Partido />, stats: <Stats />, grupo: <Grupo />, perfil: <Perfil />,
    avisos: <CentroAvisos />, misAvisos: <MisAvisos />,
    avisosAdmin: esAdmin ? <AvisosAdmin /> : <Inicio />, avisoEdit: esAdmin ? <AvisoEdit /> : <Inicio />,
    migrar: <MigrarDni onListo={() => ir('inicio')} onOmitir={() => ir('perfil')} />
  };
  return <>{pantallas[ruta] || <Inicio />}<BarraInferior /></>;
}

function Contenido() {
  const s = useSesion();
  const [bienvenidaVista, setBienvenidaVista] = useState(() => !!leer('app8_bienvenida'));
  const [migrando, setMigrando] = useState(() => !!leer('app8_migrar'));
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
    return <Cuenta migrando={migrando} onAtras={() => { try { localStorage.removeItem('app8_bienvenida'); } catch (e) { /* nada */ } setBienvenidaVista(false); }}
      onMigrar={() => { try { sessionStorage.setItem('app8_migrar', '1'); } catch (e) { /* nada */ } setMigrando(true); }} />;
  }
  if (!s.perfil) return s.user.displayName ? <Splash /> : <CompletarPerfil uid={s.uid} />;
  if (migrando) {
    const fin = () => { try { sessionStorage.removeItem('app8_migrar'); } catch (e) { /* nada */ } setMigrando(false); };
    return <MigrarDni onListo={fin} onOmitir={fin} />;
  }
  if (!s.grupos.length) return <GrupoElegir uid={s.uid} onListo={gid => { s.elegirGrupo(gid); setPaso(paso + 1); }} />;
  if (!(s.priv && s.priv.onboarding && s.priv.onboarding.avisos)) return <PermisoAvisos uid={s.uid} onListo={() => marcarOnboarding(s.uid, 'avisos')} />;
  return <Rutas />;
}

export default function App() {
  return (
    <SesionProvider><NavProvider><ToastProvider><div className="app"><Contenido /></div></ToastProvider></NavProvider></SesionProvider>
  );
}
