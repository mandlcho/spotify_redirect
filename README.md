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
