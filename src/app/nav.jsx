import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Navegación mínima por hash (#/partido/equipos) para que el botón Atrás del celular funcione.
const Ctx = createContext(null);
export const useNav = () => useContext(Ctx);

const leer = () => {
  const [ruta = 'inicio', ...resto] = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/');
  return { ruta, param: resto.join('/') };
};

export function NavProvider({ children }) {
  const [estado, setEstado] = useState(leer);
  useEffect(() => {
    const f = () => { setEstado(leer()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const ir = useCallback((ruta, param = '') => { location.hash = `#/${ruta}${param ? '/' + param : ''}`; }, []);
  const atras = useCallback(() => history.back(), []);
  return <Ctx.Provider value={{ ...estado, ir, atras }}>{children}</Ctx.Provider>;
}
