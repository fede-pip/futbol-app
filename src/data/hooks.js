import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

// Suscripción a un documento. `ref` debe ser estable o `null` si todavía no corresponde leer.
// Devuelve undefined mientras carga, null si no existe.
export function useDoc(ref, clave) {
  const [v, setV] = useState(undefined);
  useEffect(() => {
    if (!ref) { setV(undefined); return; }
    return onSnapshot(ref, s => setV(s.exists() ? { id: s.id, ...s.data() } : null), () => setV(null));
  }, [clave]);
  return v;
}

// Suscripción a una colección o consulta. Devuelve undefined mientras carga.
export function useColl(consulta, clave) {
  const [v, setV] = useState(undefined);
  useEffect(() => {
    if (!consulta) { setV(undefined); return; }
    return onSnapshot(consulta, s => setV(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setV([]));
  }, [clave]);
  return v;
}

export const aMapa = lista => Object.fromEntries((lista || []).map(x => [x.id, x]));
