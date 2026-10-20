// Las fotos de la versión anterior eran enlaces; los de Google Drive hay que pasarlos a una dirección de imagen directa.
export function urlFoto(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) return url;
  const m = url.match(/\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w400`;
  const m2 = url.match(/drive\.google\.com\/.*[?&]id=([^&]+)/);
  if (m2) return `https://drive.google.com/thumbnail?id=${m2[1]}&sz=w400`;
  return url;
}

// Foto de perfil: se achica en el celular a un cuadrado de 128 px (unos 6 KB) y se guarda en el perfil.
// Así no hace falta un servicio de archivos aparte, y no sube costos.
export function fotoDesdeArchivo(archivo, lado = 128) {
  return new Promise((ok, mal) => {
    if (!archivo || !/^image\//.test(archivo.type || '')) return mal(new Error('Elegí una imagen.'));
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = lado;
        const x = c.getContext('2d');
        const m = Math.min(img.naturalWidth, img.naturalHeight);
        x.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, lado, lado);
        ok(c.toDataURL('image/jpeg', 0.75));
      } catch (e) { mal(new Error('No pudimos procesar esa imagen. Probá con otra.')); }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No pudimos leer esa imagen. Probá con otra.')); };
    img.src = url;
  });
}
