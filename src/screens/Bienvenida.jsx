import { useState } from 'react';
import { Btn, Lockup, Marca, Meter } from '../components/ui.jsx';

const DIAPOS = [
  { t: 'Anotate en un toque', p: 'Ves quién juega, cuántos lugares quedan y si te quedás a comer.' },
  { t: 'Equipos parejos, sin discutir', p: 'La app los arma según el nivel de cada uno. Nadie ve los puntajes de los demás.' },
  { t: 'Votá y mirá cómo mejorás', p: 'Después del partido tus compañeros votan cómo jugaste. Tu nivel se ajusta solo.' }
];

function Arte({ i }) {
  if (i === 0) return (
    <div className="art">
      <div className="mini"><div className="grow"><div className="cap">Lunes 19 · 21:30</div><b style={{ fontSize: 15 }}>Cancha Palermo</b></div><span className="pill ok">2 lugares</span></div>
      <Meter pct={83} claro />
      <span className="cap">10 de 12 anotados</span>
    </div>
  );
  if (i === 1) return (
    <div className="art"><div className="teams">
      <div className="team o"><h4>Oscuro<span>6</span></h4><ul><li>F. Pipkin</li><li>N. Ferrari</li><li>A. Dal Maso</li></ul></div>
      <div className="team b"><h4>Blanco<span>6</span></h4><ul><li>J. Roca</li><li>T. Vega</li><li>L. Ibarra</li></ul></div>
    </div></div>
  );
  return (
    <div className="art">
      <div className="mini"><b className="grow">Definición</b></div>
      <div className="opts"><div className="opt m" aria-pressed="true">Mejor</div><div className="opt i">Igual</div><div className="opt p">Peor</div></div>
      <span className="small">Es anónimo y lleva menos de un minuto.</span>
    </div>
  );
}

function Portada({ onEmpezar, onSaltar }) {
  return (
    <div className="portada">
      <div className="portada-centro">
        <Marca px={112} />
        <h1 className="portada-nombre">me anoto</h1>
        <p className="portada-lema">El partido de todas las semanas, sin vueltas.</p>
      </div>
      <div className="portada-botones">
        <Btn v="white" onClick={onEmpezar}>Empezar</Btn>
        <Btn v="glass" onClick={onSaltar}>Ya tengo cuenta</Btn>
      </div>
    </div>
  );
}

export default function Bienvenida({ onTerminar }) {
  const [i, setI] = useState(-1); // -1: portada
  if (i === -1) return <Portada onEmpezar={() => setI(0)} onSaltar={onTerminar} />;
  const d = DIAPOS[i];
  const ultima = i === DIAPOS.length - 1;
  return (
    <div className="scr" style={{ flex: 1 }}>
      <div className="bar-top"><Lockup /><button className="back" onClick={onTerminar}>Saltar</button></div>
      <div className="prog" aria-label={`Paso ${i + 1} de 3`}>{DIAPOS.map((_, k) => <i key={k} className={k <= i ? 'on' : ''} />)}</div>
      <Arte i={i} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><h2 className="t">{d.t}</h2><p className="lead">{d.p}</p></div>
      <Btn v="pri" style={{ marginTop: 'auto' }} onClick={() => (ultima ? onTerminar() : setI(i + 1))}>{ultima ? 'Empezar' : 'Siguiente'}</Btn>
    </div>
  );
}
