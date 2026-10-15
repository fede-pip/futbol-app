import { defineConfig } from 'vitest/config';

// `npm test` corre solo las pruebas unitarias. Las de integración usan el proyecto de
// pruebas de Firebase (red + usuarios reales de prueba): `npm run test:integracion`.
export default defineConfig({
  test: {
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
    exclude: ['tests/integracion/**', 'node_modules/**', 'functions/node_modules/**']
  }
});
