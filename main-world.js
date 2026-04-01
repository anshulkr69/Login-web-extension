// main-world.js — Runs in the MAIN world (same as the page's own scripts)
// This CAN access page-defined functions like submitRequest()
// but CANNOT access chrome.runtime APIs.

(function () {
  'use strict';

  console.log('[AutoLogin:MAIN] Main-world script loaded');

  // ── Block popups from the portal ──────────────────────
  window.open = function () {
    console.log('[AutoLogin:MAIN] Blocked window.open:', arguments[0]);
    return null;
  };
  window.alert = function (msg) {
    console.log('[AutoLogin:MAIN] Suppressed alert:', msg);
  };
  window.confirm = function (msg) {
    console.log('[AutoLogin:MAIN] Suppressed confirm:', msg);
    return true;
  };

  // ── Listen for the submit event from content.js (ISOLATED world) ──
  // content.js dispatches "autologin-submit" when credentials are filled.
  window.addEventListener('autologin-submit', function () {
    console.log('[AutoLogin:MAIN] Received autologin-submit event');
    doSubmit();
  });

  function doSubmit() {
    // Method 1: Call submitRequest() directly (available on Sophos portal)
    if (typeof submitRequest === 'function') {
      console.log('[AutoLogin:MAIN] Calling submitRequest() directly');
      submitRequest();
      return;
    }

    // Method 2: Click the sign-in anchor (has href="javascript:submitRequest()")
    const anchors = document.querySelectorAll('a[href*="submitRequest"]');
    for (const a of anchors) {
      const txt = (a.textContent || '').toLowerCase().trim();
      if (txt.includes('sign out') || txt.includes('logout')) continue;
      console.log('[AutoLogin:MAIN] Clicking anchor:', a.outerHTML.substring(0, 100));
      a.click();
      return;
    }

    // Method 3: Click any element that says "Sign in"
    const all = document.querySelectorAll('a, button, input[type="submit"], div');
    for (const el of all) {
      const txt = (el.textContent || el.value || '').toLowerCase().trim();
      if (txt === 'sign in' || txt === 'signin' || txt === 'login' || txt === 'log in') {
        console.log('[AutoLogin:MAIN] Clicking by text:', el.tagName);
        el.click();
        return;
      }
    }

    console.warn('[AutoLogin:MAIN] Could not find any submit mechanism!');
  }

  console.log('[AutoLogin:MAIN] Ready, listening for autologin-submit event');
})();
