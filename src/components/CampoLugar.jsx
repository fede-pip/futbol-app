import { useEffect, useRef, useState } from 'react';
import { hayMapas, nuevaSesion, sugerir, elegir } from '../lib/mapas.js';

// Campo "Lugar" con sugerencias de Google Maps. onCambio(texto, extra): extra trae lugarId/lat/lng si eligió una sugerencia.
export default function CampoLugar({ id, value, onCambio, placeholder }) {
  const [lista, setLista] = useState([]);
  const [activo, setActivo] = useState(-1);
  const [abierto, setAbierto] = useState(false);
  const sesion = useRef(null);
  const espera = useRef(null);
  const ultimo = useRef(0);

  useEffect(() => () => clearTimeout(espera.current), []);

  function escribir(texto) {
    onCambio(texto, null);
    if (!hayMapas) return;
    clearTimeout(espera.current);
    if (texto.trim().length < 3) { setLista([]); setAbierto(false); return; }
    const n = ++ultimo.current;
    espera.current = setTimeout(async () => {
      try {
        if (!sesion.current) sesion.current = await nuevaSesion();
        const r = await sugerir(texto, sesion.current);
        if (n === ultimo.current) { setLista(r); setActivo(-1); setAbierto(r.length > 0); }
      } catch { setLista([]); setAbierto(false); } // sin conexión o sin clave: queda el texto libre
    }, 250);
  }

  async function tomar(s) {
    setAbierto(false); setLista([]);
    try { const e = await elegir(s.prediccion); sesion.current = null; onCambio(e.texto, { lugarId: e.lugarId, lat: e.lat, lng: e.lng }); }
    catch { onCambio(`${s.principal}${s.secundario ? ', ' + s.secundario : ''}`, null); }
  }

  function teclas(e) {
    if (!abierto) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(a => Math.min(a + 1, lista.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && activo >= 0) { e.preventDefault(); tomar(lista[activo]); }
    else if (e.key === 'Escape') setAbierto(false);
  }

  return (
    <div className="field lugar-campo">
      <label htmlFor={id}>Lugar</label>
      <input id={id} value={value} onChange={e => escribir(e.target.value)} onKeyDown={teclas} onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder={placeholder} maxLength={120} autoComplete="off"
        role={hayMapas ? 'combobox' : undefined} aria-expanded={hayMapas ? abierto : undefined} aria-controls={`${id}-lista`} aria-autocomplete={hayMapas ? 'list' : undefined} />
      {abierto ? (
        <ul id={`${id}-lista`} className="lugar-lista" role="listbox">
          {lista.map((s, i) => (
            <li key={i} role="option" aria-selected={i === activo} className={i === activo ? 'on' : ''} onMouseDown={e => { e.preventDefault(); tomar(s); }}>
              <b>{s.principal}</b><span>{s.secundario}</span>
            </li>
          ))}
          <li className="lugar-google" aria-hidden="true">Google Maps</li>
        </ul>
      ) : null}
    </div>
  );
}
