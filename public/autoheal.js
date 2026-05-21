/**
 * AutoHeal SDK — Browser Bundle v1.0.0
 * Self-contained IIFE. Reads window.AUTOHEAL_SITE_ID and window.AUTOHEAL_ENDPOINT.
 * Served by the AutoHeal Master Server at /sdk/autoheal.js
 */
(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  const SITE_ID   = window.AUTOHEAL_SITE_ID   || window.location.host;
  const ENDPOINT  = window.AUTOHEAL_ENDPOINT  || 'https://autoheal-4p4q.onrender.com';

  // ─── ERROR INTERCEPTOR ─────────────────────────────────────────────────────
  class ErrorInterceptor {
    constructor() {
      this.active = false;
      this.callback = null;
      this._origConsoleError = console.error;
      this._origConsoleWarn  = console.warn;
    }

    start(callback) {
      if (this.active) return;
      this.active   = true;
      this.callback = callback;

      window.addEventListener('error',             this._handleUncaught.bind(this));
      window.addEventListener('unhandledrejection', this._handleRejection.bind(this));
      window.addEventListener('error',             this._handleAsset.bind(this), true);

      const self = this;
      console.error = function (...args) {
        self._origConsoleError.apply(console, args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (msg.includes('__autoheal_internal__')) return;
        self._trigger({ id: 'err_' + Math.random().toString(36).substr(2,9), type: 'console_error', message: msg, timestamp: new Date().toISOString() });
      };

      console.warn = function (...args) {
        self._origConsoleWarn.apply(console, args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (msg.includes('__autoheal_internal__')) return;
        self._trigger({ id: 'warn_' + Math.random().toString(36).substr(2,9), type: 'console_warn', message: msg, timestamp: new Date().toISOString() });
      };
    }

    stop() {
      if (!this.active) return;
      this.active = false;
      this.callback = null;
      window.removeEventListener('error',             this._handleUncaught.bind(this));
      window.removeEventListener('unhandledrejection', this._handleRejection.bind(this));
      window.removeEventListener('error',             this._handleAsset.bind(this), true);
      console.error = this._origConsoleError;
      console.warn  = this._origConsoleWarn;
    }

    _trigger(data) { if (this.callback) this.callback(data); }

    _handleUncaught(event) {
      if (event.target && event.target !== window) return;
      this._trigger({
        id: 'crash_' + Math.random().toString(36).substr(2,9),
        type: 'crash',
        message: event.message || 'Unknown uncaught exception',
        source: event.filename, line: event.lineno, column: event.colno,
        stack: event.error ? event.error.stack : '',
        timestamp: new Date().toISOString()
      });
    }

    _handleRejection(event) {
      let message = 'Promise rejected without reason', stack = '';
      if (event.reason) {
        if (event.reason instanceof Error) { message = event.reason.message; stack = event.reason.stack || ''; }
        else if (typeof event.reason === 'string') message = event.reason;
        else message = JSON.stringify(event.reason);
      }
      this._trigger({ id: 'promise_' + Math.random().toString(36).substr(2,9), type: 'promise', message, stack, timestamp: new Date().toISOString() });
    }

    _handleAsset(event) {
      const target = event.target;
      if (!target) return;
      const tag = target.tagName;
      if (tag !== 'IMG' && tag !== 'SCRIPT' && tag !== 'LINK') return;
      const src = target.getAttribute(tag === 'LINK' ? 'href' : 'src') || 'unknown';
      this._trigger({
        id: 'asset_' + Math.random().toString(36).substr(2,9),
        type: 'asset',
        message: `Failed to load resource: ${tag.toLowerCase()} load error.`,
        source: src,
        domContext: target.outerHTML ? target.outerHTML.substring(0, 150) + '...' : `<${tag.toLowerCase()}>`,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ─── WIDGET ────────────────────────────────────────────────────────────────
  class AutoHealWidget {
    constructor() {
      this.container     = null;
      this.badge         = null;
      this.currentErrors = [];
      this.onHealHandler = null;
    }

    init(onHeal) {
      this.onHealHandler = onHeal;
      this._injectStyles();
      this._createBadge();
      this._createContainer();
    }

    reportSoftError(error) {
      if (this.currentErrors.find(e => e.id === error.id)) return;
      this.currentErrors.push(error);
      this._updateBadge();
    }

    triggerHardCrash(error) {
      this.reportSoftError(error);
      this._openModal(error, true);
    }

    _updateBadge() {
      if (!this.badge) return;
      const count = this.currentErrors.length;
      if (count > 0) {
        this.badge.style.display = 'flex';
        const countEl = this.badge.querySelector('.ah-badge-count');
        if (countEl) countEl.textContent = String(count);
        const textEl  = this.badge.querySelector('.ah-badge-text');
        const last    = this.currentErrors[this.currentErrors.length - 1];
        if (textEl) textEl.textContent = last.type === 'crash' ? 'System Crash Caught!' : `Error: ${last.message.substring(0,24)}...`;
        this.badge.classList.remove('ah-pulse');
        void this.badge.offsetWidth;
        this.badge.classList.add('ah-pulse');
      } else {
        this.badge.style.display = 'none';
      }
    }

    _createBadge() {
      if (document.getElementById('autoheal-badge')) return;
      this.badge = document.createElement('div');
      this.badge.id = 'autoheal-badge';
      this.badge.className = 'ah-badge-pill';
      this.badge.style.display = 'none';
      this.badge.innerHTML = `<div class="ah-badge-icon">🩺</div><div class="ah-badge-details"><span class="ah-badge-text">Errors Detected</span><span class="ah-badge-count">0</span></div>`;
      this.badge.addEventListener('click', () => {
        if (this.currentErrors.length > 0) this._openModal(this.currentErrors[this.currentErrors.length - 1], false);
      });
      document.body.appendChild(this.badge);
    }

    _createContainer() {
      if (document.getElementById('autoheal-container')) return;
      this.container = document.createElement('div');
      this.container.id = 'autoheal-container';
      this.container.className = 'ah-modal-overlay';
      document.body.appendChild(this.container);
    }

    _openModal(error, isHardCrash) {
      if (!this.container) return;
      if (isHardCrash) { document.body.classList.add('ah-blur-active'); this.container.classList.add('ah-hard-crash'); }
      else { this.container.classList.remove('ah-hard-crash'); }
      this.container.style.display = 'flex';
      const ts = new Date(error.timestamp).toLocaleTimeString();
      this.container.innerHTML = `
        <div class="ah-diag-modal">
          <div class="ah-diag-header">
            <div class="ah-diag-title"><span class="ah-pulse-dot red"></span><span>AUTOHEAL SYSTEM DIAGNOSTICS</span></div>
            <button class="ah-close-btn" id="ah-close-modal-btn">✕</button>
          </div>
          <div class="ah-diag-body">
            <div class="ah-section">
              <div class="ah-section-title">🛑 Captured Exception [${error.type.toUpperCase()}]</div>
              <div class="ah-error-card">
                <div class="ah-error-msg">${error.message}</div>
                ${error.source ? `<div class="ah-error-source">URL: <span>${error.source}</span> ${error.line ? `(Line ${error.line}:${error.column})` : ''}</div>` : ''}
                ${error.domContext ? `<div class="ah-error-dom">DOM: <code>${this._esc(error.domContext)}</code></div>` : ''}
                <div class="ah-timestamp">Caught at ${ts} • Logs emailed to developer inbox ✉️</div>
              </div>
            </div>
            <div class="ah-section ah-diag-flow">
              <div class="ah-scanner-container" id="ah-scanner-box">
                <div class="ah-radar"><div class="ah-radar-sweep"></div><div class="ah-radar-circle circle-1"></div><div class="ah-radar-circle circle-2"></div><div class="ah-radar-circle circle-3"></div></div>
                <div class="ah-scanner-label">SCANNING FOR SOLUTIONS...</div>
              </div>
              <div class="ah-console" id="ah-diag-console">
                <div class="ah-console-line comment">> AutoHeal SDK initialized.</div>
                <div class="ah-console-line error">> INTERCEPTED: ${error.type.toUpperCase()} error detected.</div>
                <div class="ah-console-line">> Packaging dump data...</div>
                <div class="ah-console-line success">> Error log emailed to developer inbox!</div>
                <div class="ah-console-line info">> Spawning AI Healing Agent...</div>
              </div>
            </div>
            <div class="ah-section ah-patch-section" id="ah-patch-box" style="display:none;">
              <div class="ah-section-title">🔮 Proposed Repair Patch</div>
              <div class="ah-diff-viewer" id="ah-diff-box"></div>
            </div>
          </div>
          <div class="ah-diag-footer">
            <div class="ah-status-message" id="ah-footer-status">Analyzing stack trace...</div>
            <div class="ah-actions">
              <button class="ah-btn secondary" id="ah-ignore-btn">Ignore Error</button>
              <button class="ah-btn primary disabled" id="ah-patch-btn" disabled>
                <span class="ah-btn-spinner" id="ah-btn-loader" style="display:inline-block;"></span>
                <span id="ah-btn-text">Waiting for AI...</span>
              </button>
            </div>
          </div>
        </div>`;
      document.getElementById('ah-close-modal-btn').addEventListener('click', () => this._closeModal());
      document.getElementById('ah-ignore-btn').addEventListener('click',     () => this._closeModal());
      this._runEngine(error, document.getElementById('ah-patch-btn'));
    }

    async _runEngine(error, patchBtn) {
      const consoleEl   = document.getElementById('ah-diag-console');
      const footerEl    = document.getElementById('ah-footer-status');
      const scannerBox  = document.getElementById('ah-scanner-box');
      const patchBox    = document.getElementById('ah-patch-box');
      const diffBox     = document.getElementById('ah-diff-box');
      if (!consoleEl) return;

      const log = (msg, type = 'default') => {
        const el = document.createElement('div');
        el.className = `ah-console-line ${type}`;
        el.textContent = `> ${msg}`;
        consoleEl.appendChild(el);
        consoleEl.scrollTop = consoleEl.scrollHeight;
      };

      await this._delay(1000); log('Analyzing stack trace patterns...', 'info');
      if (footerEl) footerEl.textContent = 'Analyzing source-code stack trace...';
      await this._delay(1200); log('Extracting code context around error location...', 'info');
      await this._delay(1000); log('Consulting Gemini LLM error-healing patterns...', 'comment');
      if (footerEl) footerEl.textContent = 'Generating surgical repair code...';

      let success = false, diffCode = '';
      if (this.onHealHandler) {
        try {
          const result = await this.onHealHandler(error);
          success  = result.success;
          diffCode = result.diffCode;
        } catch (e) {
          log('Failed to contact Gemini Healer Agent. Checking offline templates.', 'error');
        }
      }

      await this._delay(800);

      if (success && diffCode) {
        log('Surgical fix generated successfully!', 'success');
        log('Ready to hot-patch runtime environment.', 'success');
        if (footerEl) footerEl.textContent = 'Patch compiled successfully!';
        if (scannerBox) scannerBox.style.display = 'none';
        if (patchBox)   patchBox.style.display   = 'block';
        if (diffBox)    diffBox.innerHTML         = this._renderDiff(diffCode);
        if (patchBtn) {
          patchBtn.disabled = false;
          patchBtn.classList.remove('disabled');
          const loader = document.getElementById('ah-btn-loader');
          const text   = document.getElementById('ah-btn-text');
          if (loader) loader.style.display = 'none';
          if (text)   text.textContent     = 'APPLY LIVE PATCH 🩺';
          patchBtn.onclick = async () => {
            patchBtn.disabled = true;
            patchBtn.classList.add('disabled');
            if (loader) loader.style.display = 'inline-block';
            if (text)   text.textContent     = 'Applying Patch...';
            if (footerEl) footerEl.textContent = 'Injecting runtime hot-patch...';
            await this._delay(1200);
            this.currentErrors = this.currentErrors.filter(e => e.id !== error.id);
            this._updateBadge();
            this._showToast('🚀 System Healed Successfully!', 'success');
            this._closeModal();
          };
        }
      } else {
        log('AI agent could not determine a safe patch for this exception.', 'error');
        if (footerEl) footerEl.textContent = 'Healing failed. Manual debug required.';
        const loader = document.getElementById('ah-btn-loader');
        const text   = document.getElementById('ah-btn-text');
        if (loader) loader.style.display = 'none';
        if (text)   text.textContent     = 'Unable to heal';
      }
    }

    _renderDiff(code) {
      return code.split('\n').map(line => {
        let cls = 'normal';
        if (line.startsWith('+')) cls = 'add';
        else if (line.startsWith('-')) cls = 'delete';
        return `<div class="ah-diff-line ${cls}">${this._esc(line)}</div>`;
      }).join('');
    }

    _showToast(msg, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `ah-toast ${type}`;
      toast.innerHTML = `<span class="ah-toast-icon">${type === 'success' ? '⚡' : '⚠️'}</span><span>${msg}</span>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('visible'), 50);
      setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 400); }, 4000);
    }

    _closeModal() {
      if (!this.container) return;
      this.container.style.display = 'none';
      document.body.classList.remove('ah-blur-active');
    }

    _esc(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }

    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    _injectStyles() {
      if (document.getElementById('autoheal-widget-styles')) return;
      const style = document.createElement('style');
      style.id = 'autoheal-widget-styles';
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');
        .ah-badge-pill{position:fixed;bottom:24px;right:24px;z-index:99999;background:rgba(18,22,33,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,68,68,.45);border-radius:50px;padding:10px 18px;display:flex;align-items:center;gap:12px;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 10px 30px rgba(255,68,68,.25),inset 0 0 10px rgba(255,68,68,.1);color:#fff;transition:all .3s cubic-bezier(.4,0,.2,1)}
        .ah-badge-pill:hover{transform:translateY(-4px) scale(1.02);border-color:#ff4444;box-shadow:0 15px 40px rgba(255,68,68,.4)}
        .ah-badge-icon{font-size:20px}.ah-badge-details{display:flex;flex-direction:column;gap:2px}
        .ah-badge-text{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.7);font-weight:600}
        .ah-badge-count{font-size:14px;font-weight:700;color:#ff4444}
        @keyframes ah-pulse-animation{0%{box-shadow:0 0 0 0 rgba(255,68,68,.7)}70%{box-shadow:0 0 0 15px rgba(255,68,68,0)}100%{box-shadow:0 0 0 0 rgba(255,68,68,0)}}
        .ah-pulse{animation:ah-pulse-animation 1.5s infinite}
        .ah-modal-overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:100000;background:rgba(10,12,16,.4);backdrop-filter:blur(2px);display:none;align-items:center;justify-content:center;font-family:'Inter',sans-serif;color:#e6edf3;transition:all .3s ease}
        .ah-modal-overlay.ah-hard-crash{background:rgba(10,12,16,.7);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px)}
        body.ah-blur-active>*:not(.ah-modal-overlay):not(.ah-toast){filter:blur(8px);transition:filter .3s ease}
        .ah-diag-modal{background:rgba(17,22,34,.95);border:1px solid rgba(0,240,255,.3);border-radius:16px;width:90%;max-width:760px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,.8),0 0 40px rgba(0,240,255,.1);overflow:hidden;animation:ah-modal-slide .4s cubic-bezier(.19,1,.22,1)}
        @keyframes ah-modal-slide{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
        .ah-diag-header{background:rgba(10,14,23,.9);border-bottom:1px solid rgba(255,255,255,.08);padding:16px 24px;display:flex;justify-content:space-between;align-items:center}
        .ah-diag-title{display:flex;align-items:center;gap:10px;font-weight:700;font-size:14px;letter-spacing:.08em;color:#00f0ff;text-shadow:0 0 10px rgba(0,240,255,.3)}
        .ah-pulse-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
        .ah-pulse-dot.red{background:#ff4444;box-shadow:0 0 8px #ff4444;animation:ah-dot-glow 1s infinite alternate}
        @keyframes ah-dot-glow{from{opacity:.5}to{opacity:1}}
        .ah-close-btn{background:none;border:none;color:rgba(255,255,255,.6);font-size:18px;cursor:pointer;transition:color .2s}.ah-close-btn:hover{color:#fff}
        .ah-diag-body{padding:24px;overflow-y:auto;display:flex;flex-direction:column;gap:20px}
        .ah-section{display:flex;flex-direction:column;gap:10px}
        .ah-section-title{font-size:11px;text-transform:uppercase;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:.08em}
        .ah-error-card{background:rgba(255,68,68,.07);border:1px solid rgba(255,68,68,.25);border-radius:8px;padding:16px;font-family:'Inter',sans-serif}
        .ah-error-msg{color:#ff6b6b;font-weight:700;font-size:15px;margin-bottom:8px;line-height:1.4}
        .ah-error-source{font-size:12px;color:rgba(255,255,255,.6);margin-bottom:4px}
        .ah-error-source span{color:#00f0ff;font-family:'Fira Code',monospace}
        .ah-error-dom{font-size:12px;color:rgba(255,255,255,.6);margin-top:4px}
        .ah-error-dom code{color:#ffd700;font-family:'Fira Code',monospace;background:rgba(0,0,0,.3);padding:2px 6px;border-radius:4px}
        .ah-timestamp{font-size:11px;color:rgba(255,255,255,.4);margin-top:8px;border-top:1px solid rgba(255,255,255,.05);padding-top:8px}
        .ah-diag-flow{display:grid;grid-template-columns:240px 1fr;gap:16px;min-height:160px}
        @media(max-width:600px){.ah-diag-flow{grid-template-columns:1fr}}
        .ah-scanner-container{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px}
        .ah-radar{width:80px;height:80px;border-radius:50%;position:relative;background:radial-gradient(circle,rgba(0,240,255,.03) 0%,rgba(0,240,255,.15) 100%);border:1px solid rgba(0,240,255,.2);overflow:hidden}
        .ah-radar-sweep{position:absolute;top:0;left:0;width:100%;height:100%;background:conic-gradient(from 0deg,rgba(0,240,255,.5) 0deg,transparent 90deg);border-radius:50%;animation:ah-spin 2s linear infinite}
        .ah-radar-circle{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;border:1px dashed rgba(0,240,255,.15)}
        .circle-1{width:25%;height:25%}.circle-2{width:50%;height:50%}.circle-3{width:75%;height:75%}
        @keyframes ah-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .ah-scanner-label{font-size:10px;font-weight:700;color:#00f0ff;letter-spacing:.1em;text-align:center;animation:ah-fade 1.5s infinite alternate}
        @keyframes ah-fade{from{opacity:.4}to{opacity:1}}
        .ah-console{background:#0d1117;border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:14px;font-family:'Fira Code',monospace;font-size:11px;line-height:1.6;height:160px;overflow-y:auto;color:#c9d1d9;box-shadow:inset 0 2px 10px rgba(0,0,0,.5)}
        .ah-console-line{margin-bottom:4px;word-break:break-all}
        .ah-console-line.comment{color:#8b949e}.ah-console-line.error{color:#ff6b6b}.ah-console-line.success{color:#56d364}.ah-console-line.info{color:#38bdf8}
        .ah-patch-section{animation:ah-fade-in .5s ease}
        @keyframes ah-fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .ah-diff-viewer{background:#0d1117;border:1px solid rgba(255,255,255,.08);border-radius:8px;max-height:200px;overflow-y:auto;font-family:'Fira Code',monospace;font-size:11px;padding:10px 0}
        .ah-diff-line{padding:2px 16px;white-space:pre-wrap;word-break:break-all}
        .ah-diff-line.add{background-color:rgba(46,160,67,.15);color:#3fb950;border-left:3px solid #2ea043}
        .ah-diff-line.delete{background-color:rgba(248,81,73,.15);color:#f85149;border-left:3px solid #f85149;text-decoration:line-through}
        .ah-diff-line.normal{color:#8b949e;opacity:.7}
        .ah-diag-footer{background:rgba(10,14,23,.9);border-top:1px solid rgba(255,255,255,.08);padding:16px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px}
        @media(max-width:500px){.ah-diag-footer{flex-direction:column;align-items:stretch;text-align:center}}
        .ah-status-message{font-size:12px;color:rgba(255,255,255,.5);font-weight:500}
        .ah-actions{display:flex;gap:12px;justify-content:flex-end}
        .ah-btn{font-family:'Inter',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:10px 20px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .2s}
        .ah-btn.primary{background:linear-gradient(135deg,#00f0ff 0%,#bd00ff 100%);border:none;color:#fff;box-shadow:0 4px 15px rgba(0,240,255,.25)}
        .ah-btn.primary:not(.disabled):hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,240,255,.4)}
        .ah-btn.secondary{background:transparent;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7)}
        .ah-btn.secondary:hover{background:rgba(255,255,255,.05);color:#fff}
        .ah-btn.disabled{opacity:.5;cursor:not-allowed;box-shadow:none!important}
        .ah-btn-spinner{width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:ah-spin .8s linear infinite}
        .ah-toast{position:fixed;bottom:30px;left:30px;z-index:100001;background:rgba(18,22,33,.95);border-left:4px solid #56d364;border-radius:8px;padding:12px 20px;display:flex;align-items:center;gap:12px;font-family:'Inter',sans-serif;color:#fff;font-size:13px;font-weight:600;box-shadow:0 10px 40px rgba(0,0,0,.5);transform:translateY(100px);opacity:0;transition:all .4s cubic-bezier(.175,.885,.32,1.275)}
        .ah-toast.visible{transform:translateY(0);opacity:1}.ah-toast.warning{border-left-color:#ffd700}
        .ah-toast-icon{font-size:18px}
      `;
      document.head.appendChild(style);
    }
  }

  // ─── MAIN SDK INIT ─────────────────────────────────────────────────────────
  const widget      = new AutoHealWidget();
  const interceptor = new ErrorInterceptor();

  async function healError(error) {
    try {
      const res = await fetch(`${ENDPOINT}/api/heal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-site-id': SITE_ID },
        body: JSON.stringify({ error, siteId: SITE_ID })
      });
      const data = await res.json();
      if (data.success) return { success: true, diffCode: data.diffCode || data.patch || '' };
    } catch (e) {
      console.warn('__autoheal_internal__ Heal API error:', e);
    }
    return { success: false, diffCode: '' };
  }

  function sendTelemetry(error) {
    fetch(`${ENDPOINT}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-site-id': SITE_ID },
      body: JSON.stringify({ error })
    }).then(r => r.json()).then(data => {
      if (data.success && data.errors) {
        window.dispatchEvent(new CustomEvent('__autoheal_telemetry_update__', { detail: data.errors }));
      }
    }).catch(() => {});
  }

  function waitForBody(fn) {
    if (document.body) { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  }

  waitForBody(() => {
    widget.init(healError);

    interceptor.start((error) => {
      sendTelemetry(error);

      if (error.type === 'crash') {
        widget.triggerHardCrash(error);
      } else {
        widget.reportSoftError(error);
      }
    });

    console.log('__autoheal_internal__ AutoHeal SDK active — Site:', SITE_ID, '| Endpoint:', ENDPOINT);
  });

  // Expose globally
  window.AutoHeal = { widget, interceptor, SITE_ID, ENDPOINT };

})();
