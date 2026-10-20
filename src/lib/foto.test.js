import { describe, it, expect } from 'vitest';
import { urlFoto } from './foto.js';

describe('urlFoto', () => {
  it('convierte los enlaces de Google Drive de la versión anterior', () => {
    expect(urlFoto('https://drive.google.com/file/d/ABC123/view?usp=sharing')).toBe('https://drive.google.com/thumbnail?id=ABC123&sz=w400');
    expect(urlFoto('https://drive.google.com/open?id=XYZ789')).toBe('https://drive.google.com/thumbnail?id=XYZ789&sz=w400');
  });
  it('deja pasar otros enlaces y las fotos guardadas como imagen; vacío si no hay', () => {
    expect(urlFoto('https://i.imgur.com/a.jpg')).toBe('https://i.imgur.com/a.jpg');
    expect(urlFoto('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
    expect(urlFoto('')).toBe(''); expect(urlFoto(undefined)).toBe('');
  });
});
