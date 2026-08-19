export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
  const ONESIGNAL_APP_ID = "3fb550f4-3eb2-4006-bd3d-77f2951d94fe";

  if (!ONESIGNAL_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing ONESIGNAL_API_KEY env var' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { playerIds, title, message, data } = body;

    // Limpiar: sin vacíos y sin duplicados
    const ids = [...new Set((playerIds || []).filter(Boolean))];

    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: 'No player IDs', recipients: 0 }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        // FIX: include_player_ids es el campo correcto del endpoint v1.
        // Acepta los Subscription ID que devuelve la SDK v16.
        include_player_ids: ids,
        target_channel: 'push',
        headings: { en: title, es: title },
        contents: { en: message, es: message },
        data: data || {},
        url: 'https://futbol-app-puce.vercel.app',
      })
    });

    const result = await resp.json();

    // Devolvemos también cuántos IDs mandamos, para poder diagnosticar
    return new Response(JSON.stringify({ ...result, _sent_to: ids.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
