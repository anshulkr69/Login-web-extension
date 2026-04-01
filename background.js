// Background Service Worker – handles tab closing & popup blocking

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'closeTab' && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
    sendResponse({ ok: true });
  }
});

// Block pop-ups / new windows opened by the captive portal after sign-in
// This intercepts any new tab/window the portal tries to open
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  // If the source is the captive portal, close the newly opened tab
  if (details.sourceTabId) {
    chrome.tabs.get(details.sourceTabId, (srcTab) => {
      if (srcTab && srcTab.url && srcTab.url.includes('192.168.0.2:8090')) {
        console.log('[AutoLogin BG] Blocking popup from captive portal:', details.url);
        chrome.tabs.remove(details.tabId);
      }
    });
  }
});
