export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
  const ONESIGNAL_APP_ID = "3fb550f4-3eb2-4006-bd3d-77f2951d94fe";

  if (!ONESIGNAL_API_KEY) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), { status: 500 });
  }

  try {
    const body = await req.json();
    const { playerIds, title, message, data } = body;

    if (!playerIds || playerIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No player IDs' }), { status: 400 });
    }

    const resp = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_subscription_ids: playerIds,
        headings: { en: title, es: title },
        contents: { en: message, es: message },
        data: data || {},
        url: 'https://futbol-app-puce.vercel.app',
      })
    });

    const result = await resp.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
