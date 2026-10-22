import { useEffect, useState } from 'react';
import { llamar } from './firebase.js';

// ¿Sigue abierto el ingreso con DNI (transición desde la versión anterior)? El dueño lo cierra desde Plataforma.
let guardado = null;
export function useDniAbierto() {
  const [abierto, setAbierto] = useState(guardado === null ? true : guardado);
  useEffect(() => {
    let vivo = true;
    llamar('estadoIngreso').then(r => { guardado = !!r.dni; if (vivo) setAbierto(guardado); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  return abierto;
}
export const olvidarEstadoIngreso = () => { guardado = null; };
