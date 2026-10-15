import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { LOGO } from '../assets/logo.js';

const IC = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.5.2 4 1.8 4.5 4.5"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  chev: '<path d="M9 5l7 7-7 7"/>', back: '<path d="M15 5l-7 7 7 7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  share: '<path d="M12 16V4M7 9l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  food: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  vote: '<path d="M5 13l4 4L19 7"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  send: '<path d="M21 3L3 10l7 3 3 7z"/><path d="M10 13l11-10"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18h2"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 21h8M10 17h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>'
};

export const Icono = ({ n, ...p }) => <svg className="i" viewBox="0 0 24 24" aria-hidden="true" {...p} dangerouslySetInnerHTML={{ __html: IC[n] || '' }} />;

export const IconoGoogle = () => (
  <svg className="i" viewBox="0 0 48 48" aria-hidden="true" style={{ stroke: 'none' }}>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M47 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.9c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 7.2-10.4 7.2-17.6z" />
    <path fill="#FBBC05" d="M10.5 28.6a14.5 14.5 0 0 1 0-9.2l-8-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

export const Marca = ({ px = 30 }) => <span className="mark" style={{ width: px, height: px }}><img src={LOGO} alt="Me Anoto" /></span>;

export function Btn({ v, sm, children, className = '', ...p }) {
  return <button type="button" className={`btn ${v || ''} ${sm ? 'sm' : ''} ${className}`} {...p}>{children}</button>;
}
export const Card = ({ children, className = '', ...p }) => <div className={`card ${className}`} {...p}>{children}</div>;
export const CardB = ({ children, className = '', ...p }) => <div className={`card card-b ${className}`} {...p}>{children}</div>;
export const Pill = ({ t = '', children, ...p }) => <span className={`pill ${t}`} {...p}>{children}</span>;

const variante = n => (n === 'yo' ? 'me' : 'v' + (((n || 'x').charCodeAt(0) + (n || 'x').length) % 4));
export function Avatar({ nombre = '', foto, yo, lg }) {
  const ini = nombre.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';
  if (foto) return <span className={`av ${lg ? 'lg' : ''}`} style={{ overflow: 'hidden' }}><img src={foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>;
  return <span className={`av ${yo ? 'me' : variante(nombre)} ${lg ? 'lg' : ''}`} aria-hidden="true">{ini}</span>;
}

export const Meter = ({ pct = 0, claro, color }) => (
  <div className={`meter ${claro ? 'l' : ''}`}><i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, ...(color ? { background: color } : {}) }} /></div>
);

export const Switch = ({ on, onChange, label }) => (
  <button type="button" className="sw" role="switch" aria-checked={!!on} aria-label={label} onClick={() => onChange && onChange(!on)} />
);

export function HbTabs({ items, cur, onSel }) {
  return (
    <div className="hb" role="tablist">
      {items.map(t => (
        <button key={t.id} role="tab" className={t.id === cur ? 'on' : ''} aria-selected={t.id === cur} onClick={() => onSel(t.id)}>
          {t.label}{t.badge ? <em>{t.badge}</em> : null}
        </button>
      ))}
    </div>
  );
}

export const Hint = ({ icono = 'info', children, accion }) => (
  <div className="hint"><span className="hi"><Icono n={icono} /></span><div className="grow">{children}</div>{accion}</div>
);

export function Fila({ icono, titulo, sub, derecha, onClick, hecho, children, estilo }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`todo-r ${hecho ? 'done' : ''}`} onClick={onClick} style={estilo} {...(onClick ? { type: 'button' } : {})}>
      {icono ? <span className="ti"><Icono n={icono} /></span> : null}
      {children}
      <div className="grow"><b>{titulo}</b>{sub ? <small>{sub}</small> : null}</div>
      {derecha}
    </Tag>
  );
}

export function Campo({ label, id, className = '', ...p }) {
  return <div className="field"><label htmlFor={id}>{label}</label><input id={id} className={className} {...p} /></div>;
}

export const Vacio = ({ titulo, texto, children }) => (
  <Card className="lista-vacia"><b>{titulo}</b>{texto}{children ? <div style={{ marginTop: 12 }}>{children}</div> : null}</Card>
);

export const Splash = () => <div className="splash"><Marca px={64} /></div>;

export function CabeceraPantalla({ titulo, sub }) {
  return <div><h2 className="t">{titulo}</h2>{sub ? <p className="lead" style={{ marginTop: 2 }}>{sub}</p> : null}</div>;
}

// ---- Avisos breves ----
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('');
  const t = useRef(null);
  const mostrar = useCallback(m => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(''), 2600); }, []);
  return <ToastCtx.Provider value={mostrar}>{children}{msg ? <div className="toast" role="status">{msg}</div> : null}</ToastCtx.Provider>;
}
