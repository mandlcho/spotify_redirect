# Spotify Redirect Receiver

Static page you can register as a Spotify redirect URI for both Authorization Code and Implicit Grant flows. It reads the incoming OAuth response, shows you the payload, lets you copy it, and can post it back to the window that opened the auth flow.

## Usage

1. Host this page (or open it locally) and add its URL to your Spotify app's **Redirect URIs**.
2. Start your Spotify OAuth flow pointing the redirect to this page.
3. After redirect:
   - Authorization Code flow: the `code` and `state` query params are displayed.
   - Implicit Grant flow: the token in the hash fragment is parsed and immediately removable via the "Clean token fragment" button (auto-removal also runs after parsing).
4. Copy the parsed JSON or click **Send payload to opener** to push it to the window that initiated the flow via `window.postMessage({ source: 'spotify-redirect', payload })`.

## Running locally

No build step is required. You can double-click `index.html` or serve it from any static server, e.g.:

```bash
npx serve .
# or
python -m http.server 8080
```

Then set your redirect URI to `http://localhost:3000` (or the port you used) and complete the OAuth flow.

## Security notes

- The page never transmits tokens except when you explicitly click **Send payload to opener**, which uses `postMessage`.
- The hash fragment is cleared from the address bar shortly after parsing to reduce accidental leakage.
- Scopes, state, and raw parameters are preserved in the rendered payload to help with debugging.

## Spotify → Lark custom status sync

A minimal Node 18+ script (`status-sync.js`) pulls your Spotify "currently playing" track and updates your Lark/Feishu custom status.

### Prereqs
- Spotify app with scopes: `user-read-currently-playing user-read-playback-state`.
- Lark/Feishu internal app with permission to write custom status (e.g., `contact:employee_custom_status:write`).
- Lark user identifier (`user_id` or `open_id`).

### One-time setup
1. Use `index.html` as your redirect URI and complete the Spotify auth to get a refresh token:
   ```bash
   curl -u "$SPOTIFY_CLIENT_ID:$SPOTIFY_CLIENT_SECRET" \
     -d "grant_type=authorization_code&code=YOUR_CODE&redirect_uri=YOUR_REDIRECT_URI" \
     https://accounts.spotify.com/api/token
   ```
   Save the `refresh_token`.
2. From Lark/Feishu app settings, note `app_id` and `app_secret`. Confirm your base API URL (`https://open.feishu.cn` or `https://open.larksuite.com`).
3. Get your `user_id` (or `open_id`) from the admin console or `/open-apis/contact/v3/users/me`.

### Run the sync
```bash
export SPOTIFY_CLIENT_ID=...
export SPOTIFY_CLIENT_SECRET=...
export SPOTIFY_REFRESH_TOKEN=...
export LARK_APP_ID=...
export LARK_APP_SECRET=...
export LARK_USER_ID=...
# optional overrides
export LARK_USER_ID_TYPE=user_id   # or open_id
export LARK_BASE=https://open.feishu.cn
export POLL_SECONDS=45
export STATUS_DURATION_SECONDS=3600

node status-sync.js
```

Behavior:
- Polls Spotify every `POLL_SECONDS` for the current track.
- Sets Lark custom status to `🎧 Track — Artist` when playing.
- Clears the status when nothing is playing.

### Lark API used
- Tenant access token: `POST /open-apis/auth/v3/tenant_access_token/internal/`
- Set status: `POST /open-apis/contact/v3/users/{user_id}/custom_status?user_id_type=user_id`

If your region uses `open.larksuite.com`, set `LARK_BASE` accordingly.

## GitHub Pages now-playing view

Static viewer that shows your current Spotify playback via PKCE (no server secrets) is available at `now-playing.html`.

1. Publish the repo with GitHub Pages (Settings → Pages → Deploy from branch → `main` → `/ (root)`). The live URL will be `https://<your-username>.github.io/spotify_redirect/`.
2. Open `https://<your-username>.github.io/spotify_redirect/now-playing.html`.
3. Enter your Spotify `client_id` (from your Spotify app) and click **Save Client ID**.
4. Click **Connect to Spotify**. This runs the Authorization Code with PKCE flow against the same page as redirect.
5. After authorization, the page shows your current track (polls every 10s). Tokens live only in your browser storage; **Clear tokens** removes them.

Notes:
- Scopes requested: `user-read-currently-playing user-read-playback-state`.
- PKCE is used, so no client secret is stored. Refresh tokens are kept in `localStorage` for convenience.
- You must add the exact Redirect URI shown on the page (e.g., `https://mandlcho.github.io/spotify_redirect/now-playing.html`) to your Spotify app’s Redirect URIs list or you’ll get `INVALID_CLIENT: Invalid redirect URI`.
