import crypto from 'crypto';

function sha256(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, fbp, fbc, event_source_url } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const PIXEL_ID = (process.env.META_PIXEL_ID || '').trim();
  const CAPI_TOKEN = (process.env.META_CAPI_TOKEN || '').trim();
  const TG_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const TG_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();

  const results = { capi: null, telegram: null };

  // 1. Send Lead event to Meta Conversions API
  if (PIXEL_ID && CAPI_TOKEN) {
    try {
      const userData = {
        em: [sha256(email)],
      };
      if (fbp) userData.fbp = fbp;
      if (fbc) userData.fbc = fbc;

      const capiBody = {
        data: [
          {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: event_source_url || '',
            user_data: userData,
          },
        ],
      };

      const capiRes = await fetch(
        `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(capiBody),
        }
      );
      results.capi = await capiRes.json();
      console.log('[lead] capi result:', JSON.stringify(results.capi));
    } catch (err) {
      results.capi = { error: err.message };
      console.log('[lead] capi error:', err.message);
    }
  }

  // 2. Send Telegram alert
  if (TG_TOKEN && TG_CHAT_ID) {
    try {
      const text = `🎉 הרשמה חדשה ל-PromptHub!\n📧 ${email}\n🕐 ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`;
      const tgRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT_ID, text }),
      });
      results.telegram = await tgRes.json();
      console.log('[lead] telegram result:', JSON.stringify(results.telegram));
    } catch (err) {
      results.telegram = { error: err.message };
      console.log('[lead] telegram error:', err.message);
    }
  }

  // 3. Log this lead event to Supabase for the dashboard
  try {
    const SUPA_URL = 'https://qfjngabqhxbpnvfssijq.supabase.co';
    const SUPA_KEY = 'sb_publishable__VyQ0LyxUDbLQosfGAEudg_r-AKm8cq';
    await fetch(`${SUPA_URL}/rest/v1/lead_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
      },
      body: JSON.stringify({
        email,
        source_url: event_source_url || '',
        capi_success: !!(results.capi && results.capi.events_received),
        capi_message: JSON.stringify(results.capi),
        telegram_success: !!(results.telegram && results.telegram.ok),
        telegram_message: JSON.stringify(results.telegram),
      }),
    });
  } catch (err) {
    console.log('[lead] supabase log error:', err.message);
  }

  return res.status(200).json({ ok: true, results });
}
