// Sync Spotify "currently playing" to Lark custom status.
// Requirements: Node 18+, env vars set (see README).
const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
  LARK_APP_ID,
  LARK_APP_SECRET,
  LARK_USER_ID,
  LARK_USER_ID_TYPE = 'user_id',
  LARK_BASE = 'https://open.feishu.cn',
  POLL_SECONDS = 45,
  STATUS_DURATION_SECONDS = 3600
} = process.env;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
  console.error('Missing Spotify env vars.');
  process.exit(1);
}
if (!LARK_APP_ID || !LARK_APP_SECRET || !LARK_USER_ID) {
  console.error('Missing Lark env vars.');
  process.exit(1);
}

async function getSpotifyAccessToken() {
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: SPOTIFY_REFRESH_TOKEN
    })
  });
  if (!resp.ok) throw new Error(`spotify token ${resp.status}`);
  const json = await resp.json();
  return json.access_token;
}

async function getCurrentTrack(accessToken) {
  const resp = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (resp.status === 204) return null;
  if (!resp.ok) throw new Error(`spotify now playing ${resp.status}`);
  const json = await resp.json();
  if (!json.is_playing) return null;
  const track = json.item;
  const artists = track?.artists?.map((a) => a.name).join(', ');
  return track ? `${track.name} — ${artists}` : null;
}

async function getTenantAccessToken() {
  const resp = await fetch(`${LARK_BASE}/open-apis/auth/v3/tenant_access_token/internal/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET })
  });
  const data = await resp.json();
  if (data.code !== 0) throw new Error(`lark tenant token ${JSON.stringify(data)}`);
  return data.tenant_access_token;
}

async function setLarkStatus(tat, text) {
  const url = `${LARK_BASE}/open-apis/contact/v3/users/${LARK_USER_ID}/custom_status?user_id_type=${LARK_USER_ID_TYPE}`;
  const body = {
    custom_status: {
      text: text?.slice(0, 80) || '',
      emoji: '1f3b5', // 🎵
      duration: Number(STATUS_DURATION_SECONDS) || 0
    }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (data.code !== 0) throw new Error(`lark set status ${JSON.stringify(data)}`);
}

async function main() {
  const tat = await getTenantAccessToken();
  let lastText = null;
  const intervalMs = Number(POLL_SECONDS) * 1000;
  console.log(`Starting sync. Poll every ${POLL_SECONDS}s.`);
  setInterval(async () => {
    try {
      const access = await getSpotifyAccessToken();
      const text = await getCurrentTrack(access);
      if (text && text !== lastText) {
        await setLarkStatus(tat, `🎧 ${text}`);
        lastText = text;
        console.log('Updated status:', text);
      } else if (!text && lastText !== null) {
        await setLarkStatus(tat, '');
        lastText = null;
        console.log('Cleared status (nothing playing)');
      }
    } catch (err) {
      console.error('sync error', err.message || err);
    }
  }, intervalMs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
