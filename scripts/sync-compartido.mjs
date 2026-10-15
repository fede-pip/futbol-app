// Copia los módulos compartidos (catálogo de avisos y lógica) a las Cloud Functions,
// que se despliegan por separado y no pueden importar desde ../src.
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('functions/src/compartido', { recursive: true });
for (const f of ['catalogo.js', 'logica.js']) copyFileSync(`src/lib/${f}`, `functions/src/compartido/${f}`);
console.log('Módulos compartidos sincronizados');
