// Auto Login Extension - Content Script (ISOLATED world)
// Reads credentials from chrome.storage, fills form, dispatches submit, detects result, closes tab

(function () {
  'use strict';

  const STORAGE_KEY = 'autoLoginCredentials';
  const INDEX_KEY = 'autoLogin_credIndex';
  const ATTEMPT_KEY = 'autoLogin_attemptTS';

  // ── Helpers ──────────────────────────────────────────────

  function getCredIndex() {
    const v = localStorage.getItem(INDEX_KEY);
    return v !== null ? parseInt(v, 10) : 0;
  }

  function setCredIndex(i) {
    localStorage.setItem(INDEX_KEY, String(i));
  }

  function markAttempt() {
    localStorage.setItem(ATTEMPT_KEY, String(Date.now()));
  }

  function clearAttempt() {
    localStorage.removeItem(ATTEMPT_KEY);
  }

  function recentAttempt() {
    const ts = localStorage.getItem(ATTEMPT_KEY);
    return ts && Date.now() - parseInt(ts, 10) < 30000;
  }

  // ── DOM accessors ──────────────────────────────────────

  function getUsername() {
    return document.querySelector('input#username') ||
           document.querySelector('input[name="username"]') ||
           document.querySelector('input[type="text"]');
  }

  function getPassword() {
    return document.querySelector('input#password') ||
           document.querySelector('input[name="password"]') ||
           document.querySelector('input[type="password"]');
  }

  function getStatusMessage() {
    return document.querySelector('#statusmessage');
  }

  function getLoggedInMessage() {
    return document.querySelector('#loggedin-message') ||
           document.querySelector('.loggedin');
  }

  // ── Error detection ───────────────────────────────────

  function isErrorVisible() {
    const el = getStatusMessage();
    if (!el) return false;

    const isShown = el.classList.contains('shown') || el.offsetHeight > 0;
    if (!isShown) return false;

    const txt = el.textContent.toLowerCase();
    return txt.includes('invalid') ||
           txt.includes('fail') ||
           txt.includes('maximum') ||
           txt.includes('limit') ||
           txt.includes('exceeded') ||
           txt.includes('locked') ||
           txt.includes('already logged') ||
           txt.length > 0;
  }

  // ── Success detection ─────────────────────────────────

  function isLoginSuccessful() {
    const loggedIn = getLoggedInMessage();
    if (loggedIn) {
      const txt = loggedIn.textContent.toLowerCase();
      if (txt.includes('signed in') || txt.includes('logged in')) return true;
    }

    const el = getStatusMessage();
    if (el) {
      const txt = el.textContent.toLowerCase();
      if (txt.includes('signed in') || txt.includes('logged in') ||
          txt.includes('success') || txt.includes('welcome')) return true;
    }

    const title = document.title.toLowerCase();
    if (title.includes('signed in') || title.includes('logged in')) return true;

    const body = document.body.textContent.toLowerCase();
    if (body.includes('you are signed in') || body.includes('you are logged in')) return true;

    return false;
  }

  // ── Auto-close tab ────────────────────────────────────

  function closeTab() {
    console.log('[AutoLogin] ✓ Login successful! Closing tab in 1.5s…');
    clearAttempt();
    localStorage.removeItem(INDEX_KEY);

    setTimeout(() => {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'closeTab' }, () => {
          if (chrome.runtime.lastError) {
            window.close();
          }
        });
      } else {
        window.close();
      }
    }, 1500);
  }

  // ── Fill fields ───────────────────────────────────────

  function setNativeValue(el, value) {
    const nativeSet = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeSet.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillAndSubmit(credentials, index) {
    if (index >= credentials.length) {
      console.log('[AutoLogin] All credentials exhausted, restarting from 0');
      index = 0;
    }

    const cred = credentials[index];
    const uEl = getUsername();
    const pEl = getPassword();

    if (!uEl || !pEl) {
      console.warn('[AutoLogin] Input fields not found, retrying in 1s…');
      setTimeout(() => fillAndSubmit(credentials, index), 1000);
      return;
    }

    console.log(`[AutoLogin] Trying credential #${index + 1}: ${cred.user}`);

    setNativeValue(uEl, cred.user);
    setNativeValue(pEl, cred.password);

    setCredIndex(index);
    markAttempt();

    // Dispatch custom event to main-world.js which calls submitRequest()
    setTimeout(() => {
      console.log('[AutoLogin] Dispatching autologin-submit event to MAIN world');
      window.dispatchEvent(new CustomEvent('autologin-submit'));
    }, 400);
  }

  // ── Fallback: move to next credential ─────────────────

  function tryNext(credentials) {
    const cur = getCredIndex();
    const next = (cur + 1) % credentials.length;
    console.log(`[AutoLogin] Credential #${cur + 1} failed → trying #${next + 1}`);
    clearAttempt();
    setTimeout(() => fillAndSubmit(credentials, next), 800);
  }

  // ── Observe for error/success ─────────────────────────

  let observerActive = false;

  function watchForResult(credentials) {
    if (observerActive) return;
    observerActive = true;

    const target = document.body;

    const mo = new MutationObserver(() => {
      if (!recentAttempt()) return;

      if (isLoginSuccessful()) {
        console.log('[AutoLogin] ✓ Success detected!');
        mo.disconnect();
        observerActive = false;
        closeTab();
        return;
      }

      if (isErrorVisible()) {
        console.log('[AutoLogin] ✗ Error detected');
        mo.disconnect();
        observerActive = false;
        tryNext(credentials);
      }
    });

    mo.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    let polls = 0;
    const pollId = setInterval(() => {
      polls++;
      if (isLoginSuccessful()) {
        clearInterval(pollId); mo.disconnect(); observerActive = false;
        closeTab(); return;
      }
      if (isErrorVisible()) {
        clearInterval(pollId); mo.disconnect(); observerActive = false;
        tryNext(credentials); return;
      }
      if (polls >= 10) clearInterval(pollId);
    }, 2000);
  }

  // ── Load credentials from storage and start ───────────

  function loadCredentialsAndStart() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const data = result[STORAGE_KEY];

      if (!data || !data.primaryUser || !data.primaryPassword) {
        console.log('[AutoLogin] No credentials saved. Open the extension popup to configure.');
        return;
      }

      // Build credentials array: primary + fallbacks
      const credentials = [
        { user: data.primaryUser, password: data.primaryPassword }
      ];

      if (data.fallbacks && data.fallbacks.length > 0) {
        for (const fb of data.fallbacks) {
          if (fb.user && fb.password) {
            credentials.push({ user: fb.user, password: fb.password });
          }
        }
      }

      console.log(`[AutoLogin] Loaded ${credentials.length} credential(s) from storage`);
      main(credentials);
    });
  }

  // ── Entry point ───────────────────────────────────────

  function main(credentials) {
    console.log('[AutoLogin] Content script loaded on', location.href);

    // If already signed in, close the tab immediately
    if (isLoginSuccessful()) {
      console.log('[AutoLogin] Already signed in, closing tab…');
      closeTab();
      return;
    }

    const uEl = getUsername();
    const pEl = getPassword();

    if (!uEl || !pEl) {
      const bodyText = document.body.textContent.toLowerCase();
      if (bodyText.includes('signed in') || bodyText.includes('logged in')) {
        closeTab();
      } else {
        console.log('[AutoLogin] No login form detected');
        localStorage.removeItem(INDEX_KEY);
        clearAttempt();
      }
      return;
    }

    if (recentAttempt() && isErrorVisible()) {
      console.log('[AutoLogin] Stale error present from last attempt');
      tryNext(credentials);
      return;
    }

    watchForResult(credentials);

    const idx = recentAttempt() ? getCredIndex() : 0;
    if (!recentAttempt()) setCredIndex(0);

    setTimeout(() => fillAndSubmit(credentials, idx), 600);
  }

  // ── Bootstrap ─────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(loadCredentialsAndStart, 500));
  } else {
    setTimeout(loadCredentialsAndStart, 500);
  }
})();
