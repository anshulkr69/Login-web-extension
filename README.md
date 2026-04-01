# Auto Login Extension v2.0

Chrome extension that automatically logs into the **Sophos captive portal** at  
`http://192.168.0.2:8090/httpclient.html`

## How it works

1. When the page loads, the extension fills in the **primary credentials** and clicks **Sign In**.
2. If the login fails (error message appears in `#statusmessage`), the extension automatically tries the **next fallback** credentials.
3. It cycles through all 4 credential sets before restarting.


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
