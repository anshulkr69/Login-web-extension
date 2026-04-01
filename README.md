# Auto Login Extension v2.0

Chrome extension that automatically logs into the **Sophos captive portal** at  
`http://192.168.0.2:8090/httpclient.html`

## How it works

1. When the page loads, the extension fills in the **primary credentials** and clicks **Sign In**.
2. If the login fails (error message appears in `#statusmessage`), the extension automatically tries the **next fallback** credentials.
3. It cycles through all 4 credential sets before restarting.

### Credentials (in order)

| # | Username       | Password     |
|---|---------------|-------------|
| 1 | BTECH1019525  | 8603804591  |
| 2 | BTECH1020025  | 9304675074  |
| 3 | BTECH1022225  | 9097308713  |
| 4 | BTECH1022525  | 6204065128  |

## Key fixes in v2.0

- **Sign-in button click** — Injects a `<script>` into the page context to call `submitRequest()` (content scripts run in an isolated world and can't access page-defined functions directly).
- **Correct primary password** — Fixed to `8603804591`.
- **Error detection** — Specifically watches `#statusmessage` (Sophos portal's error container) via MutationObserver + polling fallback.
- **Fallback rotation** — On error → clears fields → fills next credential set → clicks Sign In again.

## Installation

1. Open **Chrome** → navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select this folder (`auto-login-extension`)
4. Navigate to `http://192.168.0.2:8090/httpclient.html` — it will auto-login!

## Files

| File            | Purpose                                            |
|-----------------|-----------------------------------------------------|
| `manifest.json` | Extension config (Manifest V3, content script setup) |
| `content.js`    | Auto-login logic with fallback credential rotation   |
