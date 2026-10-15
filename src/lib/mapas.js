// Google Maps (Places) para elegir la cancha. Sin clave (VITE_GOOGLE_MAPS_KEY) el campo funciona como texto libre.
const CLAVE = import.meta.env.VITE_GOOGLE_MAPS_KEY;
export const hayMapas = Boolean(CLAVE);

let cargando = null;
function cargarPlaces() {
  if (!CLAVE) return Promise.reject(new Error('sin-clave'));
  if (!cargando) {
    cargando = new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(CLAVE)}&loading=async&language=es&region=AR`;
      s.async = true;
      s.onload = () => window.google.maps.importLibrary('places').then(ok, mal);
      s.onerror = () => { cargando = null; mal(new Error('no-carga')); };
      document.head.appendChild(s);
    });
  }
  return cargando;
}

export const nuevaSesion = async () => { const { AutocompleteSessionToken } = await cargarPlaces(); return new AutocompleteSessionToken(); };

// Sugerencias para lo que va escribiendo (solo Argentina).
export async function sugerir(texto, sesion) {
  const { AutocompleteSuggestion } = await cargarPlaces();
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: texto, sessionToken: sesion, includedRegionCodes: ['ar'], language: 'es' });
  return suggestions.filter(s => s.placePrediction).slice(0, 5).map(s => ({
    prediccion: s.placePrediction,
    principal: s.placePrediction.mainText?.text || s.placePrediction.text.text,
    secundario: s.placePrediction.secondaryText?.text || ''
  }));
}

// Datos del lugar elegido: texto para mostrar, id y coordenadas.
export async function elegir(prediccion) {
  const lugar = prediccion.toPlace();
  await lugar.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
  const direccion = (lugar.formattedAddress || '').replace(/, Argentina$/, '');
  const nombre = lugar.displayName || '';
  return {
    texto: nombre && direccion && !direccion.startsWith(nombre) ? `${nombre}, ${direccion}` : (direccion || nombre),
    lugarId: lugar.id, lat: lugar.location?.lat(), lng: lugar.location?.lng()
  };
}

// Enlace para abrir el lugar en Google Maps (funciona sin clave, con texto o con el lugar elegido).
export function urlMapa({ lugar, lugarId, lat, lng }) {
  const q = typeof lat === 'number' && typeof lng === 'number' ? `${lat},${lng}` : encodeURIComponent(lugar || '');
  return `https://www.google.com/maps/search/?api=1&query=${q}${lugarId ? `&query_place_id=${encodeURIComponent(lugarId)}` : ''}`;
}
