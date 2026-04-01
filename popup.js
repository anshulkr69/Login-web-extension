// popup.js – Manages credentials UI for the Auto Login extension

(function () {
  'use strict';

  const MAX_FALLBACKS = 5;
  const STORAGE_KEY = 'autoLoginCredentials';

  // ── DOM refs ──────────────────────────────────────────

  const primaryUser = document.getElementById('primary-user');
  const primaryPass = document.getElementById('primary-pass');
  const primaryStatus = document.getElementById('primary-status');
  const fallbackList = document.getElementById('fallback-list');
  const addFallbackBtn = document.getElementById('add-fallback-btn');
  const saveBtn = document.getElementById('save-btn');
  const clearBtn = document.getElementById('clear-btn');
  const toast = document.getElementById('toast');

  let fallbackCount = 0;

  // ── Toast helper ──────────────────────────────────────

  function showToast(msg, type = 'success') {
    toast.textContent = msg;
    toast.className = 'toast ' + type;
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ── Toggle password visibility ────────────────────────

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-vis');
    if (!btn) return;
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = `
        <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>`;
    } else {
      input.type = 'password';
      btn.innerHTML = `
        <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>`;
    }
  });

  // ── Fallback credential UI ────────────────────────────

  function createFallbackItem(index, user = '', hasSavedPass = false) {
    fallbackCount++;
    updateAddBtn();

    const id = `fb-${Date.now()}-${index}`;
    const div = document.createElement('div');
    div.className = 'fallback-item';
    div.dataset.id = id;

    div.innerHTML = `
      <div class="fallback-item-header">
        <span class="fallback-number">Fallback #${index}</span>
        <button class="remove-btn" data-id="${id}" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Remove
        </button>
      </div>
      <div class="form-group">
        <label for="${id}-user">Username</label>
        <div class="input-wrapper">
          <input type="text" id="${id}-user" placeholder="Username" autocomplete="off" spellcheck="false" value="${escapeHtml(user)}">
        </div>
      </div>
      <div class="form-group">
        <label for="${id}-pass">Password</label>
        <div class="input-wrapper">
          <input type="password" id="${id}-pass" placeholder="${hasSavedPass ? '••••••  (saved)' : 'Password'}" autocomplete="off" class="${hasSavedPass ? 'saved-password' : ''}">
          <button class="toggle-vis" data-target="${id}-pass" title="Toggle visibility">
            <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    fallbackList.appendChild(div);

    // Remove handler
    div.querySelector('.remove-btn').addEventListener('click', () => {
      div.style.opacity = '0';
      div.style.transform = 'translateY(-8px)';
      div.style.transition = 'all 200ms ease';
      setTimeout(() => {
        div.remove();
        fallbackCount--;
        renumberFallbacks();
        updateAddBtn();
      }, 200);
    });

    return id;
  }

  function renumberFallbacks() {
    const items = fallbackList.querySelectorAll('.fallback-item');
    items.forEach((item, i) => {
      item.querySelector('.fallback-number').textContent = `Fallback #${i + 1}`;
    });
  }

  function updateAddBtn() {
    const count = fallbackList.querySelectorAll('.fallback-item').length;
    addFallbackBtn.disabled = count >= MAX_FALLBACKS;
    if (count >= MAX_FALLBACKS) {
      addFallbackBtn.textContent = `Maximum ${MAX_FALLBACKS} fallbacks reached`;
    } else {
      addFallbackBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Fallback (${count}/${MAX_FALLBACKS})`;
    }
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Add fallback button ───────────────────────────────

  addFallbackBtn.addEventListener('click', () => {
    const currentCount = fallbackList.querySelectorAll('.fallback-item').length;
    if (currentCount >= MAX_FALLBACKS) return;
    createFallbackItem(currentCount + 1);
  });

  // ── Save credentials ─────────────────────────────────

  saveBtn.addEventListener('click', () => {
    const user = primaryUser.value.trim();
    const pass = primaryPass.value.trim();

    if (!user) {
      showToast('⚠️ Primary username is required', 'error');
      primaryUser.focus();
      return;
    }

    // Load existing saved data to preserve passwords that weren't re-entered
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const old = result[STORAGE_KEY] || {};
      const oldFallbacks = old.fallbacks || [];

      // Build primary
      const primary = {
        user: user,
        // If password field is empty but was previously saved, keep old one
        password: pass || old.primaryPassword || '',
      };

      if (!primary.password) {
        showToast('⚠️ Primary password is required', 'error');
        primaryPass.focus();
        return;
      }

      // Build fallbacks
      const fallbacks = [];
      const items = fallbackList.querySelectorAll('.fallback-item');
      for (const item of items) {
        const id = item.dataset.id;
        const fUser = item.querySelector(`#${id}-user`).value.trim();
        const fPassInput = item.querySelector(`#${id}-pass`);
        const fPass = fPassInput.value.trim();
        const itemIndex = fallbacks.length;

        if (!fUser) continue; // skip empty fallbacks

        // If password wasn't re-entered, try to reuse old one for same username
        let finalPass = fPass;
        if (!finalPass) {
          const oldMatch = oldFallbacks.find(f => f.user === fUser);
          if (oldMatch) finalPass = oldMatch.password;
        }

        if (!finalPass) {
          showToast(`⚠️ Password required for ${fUser}`, 'error');
          fPassInput.focus();
          return;
        }

        fallbacks.push({ user: fUser, password: finalPass });
      }

      // Save
      const data = {
        primaryUser: primary.user,
        primaryPassword: primary.password,
        fallbacks: fallbacks,
        savedAt: new Date().toISOString(),
      };

      chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
        showToast('✓ Credentials saved securely', 'success');
        loadSavedState();
      });
    });
  });

  // ── Clear all ─────────────────────────────────────────

  clearBtn.addEventListener('click', () => {
    if (!confirm('Remove all saved credentials?')) return;

    chrome.storage.local.remove([STORAGE_KEY], () => {
      primaryUser.value = '';
      primaryPass.value = '';
      primaryPass.placeholder = 'Enter password';
      primaryPass.classList.remove('saved-password');
      primaryStatus.className = 'cred-status';
      fallbackList.innerHTML = '';
      fallbackCount = 0;
      updateAddBtn();
      showToast('Credentials cleared', 'success');
    });
  });

  // ── Load saved state on open ──────────────────────────

  function loadSavedState() {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const data = result[STORAGE_KEY];

      if (!data) {
        primaryStatus.className = 'cred-status empty';
        primaryStatus.textContent = 'No credentials saved. Enter your login details above.';
        updateAddBtn();
        return;
      }

      // Primary
      primaryUser.value = data.primaryUser || '';
      primaryPass.value = ''; // Never show the password
      primaryPass.placeholder = '••••••  (saved)';
      primaryPass.classList.add('saved-password');

      primaryStatus.className = 'cred-status saved';
      primaryStatus.textContent = `✓ Saved · Last updated ${formatDate(data.savedAt)}`;

      // Fallbacks
      fallbackList.innerHTML = '';
      fallbackCount = 0;

      if (data.fallbacks && data.fallbacks.length > 0) {
        data.fallbacks.forEach((fb, i) => {
          createFallbackItem(i + 1, fb.user, true);
        });
      }

      updateAddBtn();
    });
  }

  function formatDate(iso) {
    if (!iso) return 'unknown';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  // ── Init ──────────────────────────────────────────────

  loadSavedState();
})();
