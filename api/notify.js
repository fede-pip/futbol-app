export const config = { runtime: 'edge' };

// Orígenes autorizados a llamar a este endpoint (sitio de producción y previews propios).
const ORIGENES_OK = [
  'https://futbol-app-puce.vercel.app',
];
const ES_LOCAL = o => /^http:\/\/localhost(:\d+)?$/.test(o);
const ES_PREVIEW = o => /^https:\/\/futbol-app-[a-z0-9-]+\.vercel\.app$/.test(o);

const MAX_IDS = 100;
const MAX_TITULO = 100;
const MAX_MENSAJE = 300;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Solo aceptamos pedidos que vengan de la propia app (no es autenticación
  // fuerte —un script puede falsear el header—, pero corta el abuso casual).
  // La protección real llega con Firebase Auth (ver PLAN.md, Fase 1).
  const origen = req.headers.get('origin') || '';
  if (!(ORIGENES_OK.includes(origen) || ES_PREVIEW(origen) || ES_LOCAL(origen))) {
    return json({ error: 'Origen no autorizado' }, 403);
  }

  const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
  const ONESIGNAL_APP_ID = "3fb550f4-3eb2-4006-bd3d-77f2951d94fe";

  if (!ONESIGNAL_API_KEY) {
    return json({ error: 'Missing ONESIGNAL_API_KEY env var' }, 500);
  }

  try {
    const body = await req.json();
    const { playerIds, data } = body;
    const title = String(body.title || '').slice(0, MAX_TITULO);
    const message = String(body.message || '').slice(0, MAX_MENSAJE);

    if (!title || !message) {
      return json({ error: 'Falta título o mensaje' }, 400);
    }

    // Limpiar: solo strings, sin vacíos, sin duplicados, con tope
    const ids = [...new Set((Array.isArray(playerIds) ? playerIds : []).filter(x => typeof x === 'string' && x))];

    if (ids.length === 0) {
      return json({ error: 'No player IDs', recipients: 0 }, 400);
    }
    if (ids.length > MAX_IDS) {
      return json({ error: `Máximo ${MAX_IDS} destinatarios por envío` }, 400);
    }

    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        // include_player_ids es el campo correcto del endpoint v1.
        // Acepta los Subscription ID que devuelve la SDK v16.
        include_player_ids: ids,
        target_channel: 'push',
        headings: { en: title, es: title },
        contents: { en: message, es: message },
        data: data && typeof data === 'object' ? data : {},
        // URL fija: el cliente no puede redirigir la notificación a otro sitio.
        url: 'https://futbol-app-puce.vercel.app',
      })
    });

    const result = await resp.json();

    return json({ ...result, _sent_to: ids.length }, 200, {
      'Access-Control-Allow-Origin': origen,
      'Vary': 'Origin',
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
