import { useEffect, useState } from 'react';
import { llamar, mensajeError } from '../lib/firebase.js';
import { Btn, CardB, Pill, useToast } from './ui.jsx';

// Pedidos de quienes jugaban en la versión anterior y piden que los unan a su historial.
// Un admin del grupo (o el dueño de la plataforma) confirma que es la persona.
export default function PedidosVinculo({ gid, todos = false }) {
  const toast = useToast();
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState('');

  async function cargar() {
    try { const r = await llamar('listarSolicitudes', todos ? { todos: true } : { gid }); setPedidos(r.pedidos); setError(''); }
    catch (e) { setError(mensajeError(e)); setPedidos([]); }
  }
  useEffect(() => { cargar(); }, [gid, todos]);

  async function resolver(p, aprobar) {
    setOcupado(p.uid); setError('');
    try {
      await llamar('resolverSolicitud', { uid: p.uid, aprobar });
      toast(aprobar ? `${p.nombreAnterior} quedó unido a su cuenta` : 'Pedido rechazado');
      await cargar();
    } catch (e) { setError(mensajeError(e)); }
    setOcupado('');
  }

  if (pedidos === null || (pedidos.length === 0 && !error)) return null;
  return (
    <div>
      <div className="row sp" style={{ marginBottom: 8 }}><h3 className="t">Pedidos para unir cuentas</h3><Pill t="warn">{pedidos.length}</Pill></div>
      <p className="muted" style={{ marginBottom: 10 }}>Estas personas jugaban en la versión anterior y piden que las unan a su historial. Aprobá solo si sabés que son ellas.</p>
      {error ? <div className="error" role="alert" style={{ marginBottom: 8 }}>{error}</div> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pedidos.map(p => (
          <CardB key={p.uid} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><b>{p.solicitante || 'Alguien'}</b> dice ser <b>{p.nombreAnterior}</b></div>
            <div className="small">{p.email ? `Cuenta: ${p.email}` : 'Sin email'} · DNI terminado en {p.dniFin}</div>
            <div className="row" style={{ gap: 8 }}>
              <Btn disabled={ocupado === p.uid} onClick={() => resolver(p, false)}>Rechazar</Btn>
              <Btn v="pri" disabled={ocupado === p.uid} onClick={() => resolver(p, true)}>{ocupado === p.uid ? 'Un momento…' : 'Es esa persona'}</Btn>
            </div>
          </CardB>
        ))}
      </div>
    </div>
  );
}
