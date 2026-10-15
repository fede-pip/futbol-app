import { Icono, Marca } from '../components/ui.jsx';
import { useSesion } from './sesion.jsx';
import { useNav } from './nav.jsx';

const TABS = [['inicio', 'Inicio', 'home'], ['partido', 'Partido', 'cal'], ['stats', 'Stats', 'chart'], ['grupo', 'Grupo', 'users']];
const TAB_DE = { inicio: 'inicio', avisos: 'inicio', misAvisos: 'inicio', perfil: 'grupo', partido: 'partido', stats: 'stats', grupo: 'grupo', avisosAdmin: 'grupo', avisoEdit: 'grupo' };

export function BarraSuperior({ titulo, atras, onAtras }) {
  const { sinLeer } = useSesion();
  const { ir } = useNav();
  return (
    <div className="bar-top">
      {atras
        ? <button className="back" onClick={onAtras}><Icono n="back" />{atras === true ? 'Volver' : atras}</button>
        : <div className="brand"><Marca />{titulo || 'Me Anoto'}</div>}
      <div className="row" style={{ gap: 8 }}>
        <button className="iconbtn" onClick={() => ir('avisos')} aria-label={sinLeer ? `Avisos, ${sinLeer} sin leer` : 'Avisos'}>
          <Icono n="bell" />{sinLeer ? <span className="dot" /> : null}
        </button>
      </div>
    </div>
  );
}

export function BarraInferior() {
  const { ruta, ir } = useNav();
  const actual = TAB_DE[ruta] || 'inicio';
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map(t => (
        <button key={t[0]} className="tab" aria-current={actual === t[0]} onClick={() => ir(t[0])}><Icono n={t[2]} />{t[1]}</button>
      ))}
    </nav>
  );
}
