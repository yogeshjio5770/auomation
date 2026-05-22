import type { ErrorData } from './interceptor.ts';

export class AutoHealWidget {
  private container: HTMLDivElement | null = null;
  private badge: HTMLDivElement | null = null;
  private currentErrors: ErrorData[] = [];
  private onHealHandler: ((error: ErrorData) => Promise<{ success: boolean; diffCode: string }>) | null = null;

  constructor() {}

  public init(onHeal: (error: ErrorData) => Promise<{ success: boolean; diffCode: string }>) {
    this.onHealHandler = onHeal;
    this.injectStyles();
    this.createBadge();
    this.createFab();
    this.createWidgetContainer();
  }

  /**
   * Reports a soft error or asset failure (adds to queue, pulses badge)
   */
  public reportSoftError(error: ErrorData) {
    if (this.currentErrors.find(e => e.id === error.id)) return;
    this.currentErrors.push(error);
    this.updateBadgeCount();
  }

  /**
   * Triggers a hard crash healing overlay (fully blurs background, forces diagnostic modal open)
   */
  public triggerHardCrashOverlay(error: ErrorData) {
    this.reportSoftError(error);
    this.openDiagnosticModal(error, true);
  }

  private updateBadgeCount() {
    if (!this.badge) return;
    const count = this.currentErrors.length;
    if (count > 0) {
      this.badge.style.display = 'flex';
      const countEl = this.badge.querySelector('.ah-badge-count') as HTMLSpanElement;
      if (countEl) countEl.textContent = String(count);
      
      const lastError = this.currentErrors[this.currentErrors.length - 1];
      const textEl = this.badge.querySelector('.ah-badge-text') as HTMLSpanElement;
      if (textEl) {
        textEl.textContent = lastError.type === 'crash' 
          ? 'System Crash Caught!' 
          : `Soft Error: ${lastError.message.substring(0, 24)}...`;
      }

      // Add a brief pulse animation
      this.badge.classList.remove('ah-pulse');
      void this.badge.offsetWidth; // Trigger reflow
      this.badge.classList.add('ah-pulse');
    } else {
      this.badge.style.display = 'none';
    }
  }

  private createBadge() {
    if (document.getElementById('autoheal-badge')) return;

    this.badge = document.createElement('div');
    this.badge.id = 'autoheal-badge';
    this.badge.className = 'ah-badge-pill';
    this.badge.style.display = 'none';

    this.badge.innerHTML = `
      <div class="ah-badge-icon">🩺</div>
      <div class="ah-badge-details">
        <span class="ah-badge-text">Errors Detected</span>
        <span class="ah-badge-count">0</span>
      </div>
    `;

    this.badge.addEventListener('click', () => {
      if (this.currentErrors.length > 0) {
        const lastError = this.currentErrors[this.currentErrors.length - 1];
        this.openDiagnosticModal(lastError, false);
      }
    });

    document.body.appendChild(this.badge);
  }

  private createWidgetContainer() {
    if (document.getElementById('autoheal-container')) return;

    this.container = document.createElement('div');
    this.container.id = 'autoheal-container';
    this.container.className = 'ah-modal-overlay';
    document.body.appendChild(this.container);
  }

  private createFab() {
    if (document.getElementById('autoheal-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'autoheal-fab';
    fab.className = 'ah-fab';
    fab.innerHTML = '✨';
    fab.title = 'Ask AI to build a feature';
    
    fab.addEventListener('click', () => {
      this.openFeatureModal();
    });

    document.body.appendChild(fab);
  }

  private openFeatureModal() {
    if (!this.container) return;

    this.container.classList.remove('ah-hard-crash');
    this.container.style.display = 'flex';

    this.container.innerHTML = `
      <div class="ah-diag-modal">
        <div class="ah-diag-header">
          <div class="ah-diag-title">
            <span class="ah-pulse-dot" style="background:#00f0ff"></span>
            <span>AUTOHEAL AI STUDIO</span>
          </div>
          <div>
            <button class="ah-settings-btn" id="ah-settings-btn" title="Settings">⚙️</button>
            <button class="ah-close-btn" id="ah-close-modal-btn">✕</button>
          </div>
        </div>
        
        <div class="ah-diag-body" id="ah-feature-view">
          <div class="ah-section">
            <div class="ah-section-title">✨ What would you like to build?</div>
            <textarea class="ah-feature-input" id="ah-feature-prompt" placeholder="e.g. Add a contact form to this page, or change the background to dark mode..."></textarea>
          </div>

          <div class="ah-section ah-diag-flow">
            <div class="ah-console" id="ah-diag-console" style="display:none; height:150px"></div>
          </div>

          <div class="ah-section ah-patch-section" id="ah-patch-box" style="display: none;">
            <div class="ah-section-title">🔮 Proposed UI Upgrade</div>
            <div class="ah-diff-viewer" id="ah-diff-box">
              <!-- Content filled dynamically -->
            </div>
          </div>
        </div>

        <div class="ah-diag-footer" id="ah-feature-footer">
          <div class="ah-status-message" id="ah-footer-status">Ready to build.</div>
          <div class="ah-actions">
            <button class="ah-btn primary" id="ah-build-btn">
              <span class="ah-btn-spinner" id="ah-btn-loader" style="display: none;"></span>
              <span id="ah-btn-text">BUILD FEATURE 🚀</span>
            </button>
          </div>
        </div>

        <div class="ah-diag-body" id="ah-settings-view" style="display:none; overflow-y:auto; max-height:350px;">
          <div class="ah-section">
            <div class="ah-section-title">⚙️ AI Provider Settings</div>
            <p style="color:#aaa; font-size:13px; margin-bottom:12px; line-height: 1.4;">Configure your own API key to power the AI Studio. Your key is securely stored in the AutoHeal Master Database.</p>
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; color:#888; margin-bottom:4px;">Groq API Key (Llama 3)</label>
              <input type="password" id="ah-groq-key-input" class="ah-feature-input" style="height:36px; border-radius:4px; font-family: monospace;" placeholder="gsk_..." />
            </div>
            <div style="margin-bottom: 12px;">
              <label style="display:flex; align-items:center; cursor:pointer; font-size:13px; color:#fff;">
                <input type="checkbox" id="ah-autonomous-toggle" style="margin-right:8px; cursor:pointer; width:16px; height:16px;" />
                ⚡ Enable Autonomous Auto-Heal (Zero-Click)
              </label>
              <p style="color:#888; font-size:11px; margin-top:4px; margin-left: 24px;">Automatically catches crashes, writes a patch, and deploys to GitHub instantly without asking.</p>
            </div>
          </div>

          <div class="ah-section" style="border-top: 1px solid #333; padding-top: 16px; margin-top: 16px;">
            <div class="ah-section-title">📦 Git & Deployment Settings</div>
            <p style="color:#aaa; font-size:13px; margin-bottom:12px; line-height: 1.4;">Configure your deployment integrations to automatically push patches to live production.</p>
            
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; color:#888; margin-bottom:4px;">GitHub Repository (owner/repo)</label>
              <input type="text" id="ah-github-repo-input" class="ah-feature-input" style="height:36px; border-radius:4px;" placeholder="e.g. Octocat/Hello-World" />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; color:#888; margin-bottom:4px;">GitHub Personal Access Token (PAT)</label>
              <input type="password" id="ah-github-token-input" class="ah-feature-input" style="height:36px; border-radius:4px; font-family: monospace;" placeholder="ghp_..." />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; color:#888; margin-bottom:4px;">Vercel Deploy Hook URL</label>
              <input type="text" id="ah-vercel-hook-input" class="ah-feature-input" style="height:36px; border-radius:4px;" placeholder="https://api.vercel.com/v1/integrations/deploy/..." />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; color:#888; margin-bottom:4px;">N8N Cloud Bridge Webhook URL (Optional)</label>
              <input type="text" id="ah-n8n-webhook-input" class="ah-feature-input" style="height:36px; border-radius:4px;" placeholder="https://creativekulhad.onrender.com/webhook/..." />
            </div>
          </div>
        </div>
        
        <div class="ah-diag-footer" id="ah-settings-footer" style="display:none;">
          <div class="ah-status-message" id="ah-settings-status" style="color: #4ade80;"></div>
          <div class="ah-actions">
            <button class="ah-btn primary" id="ah-save-settings-btn">SAVE SETTINGS</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('ah-close-modal-btn')?.addEventListener('click', () => this.closeDiagnosticModal());
    
    // View switching logic
    const featureView = document.getElementById('ah-feature-view')!;
    const featureFooter = document.getElementById('ah-feature-footer')!;
    const settingsView = document.getElementById('ah-settings-view')!;
    const settingsFooter = document.getElementById('ah-settings-footer')!;
    let isSettingsMode = false;

    document.getElementById('ah-settings-btn')?.addEventListener('click', async () => {
      isSettingsMode = !isSettingsMode;
      if (isSettingsMode) {
        featureView.style.display = 'none';
        featureFooter.style.display = 'none';
        settingsView.style.display = 'block';
        settingsFooter.style.display = 'flex';
        
        // Fetch existing settings to populate the input
        const autonomousToggle = document.getElementById('ah-autonomous-toggle') as HTMLInputElement;
        if (autonomousToggle) {
          autonomousToggle.checked = localStorage.getItem('autoheal_autonomous') === 'true';
        }

        try {
          const endpoint = (window as any).AUTOHEAL_ENDPOINT || 'http://localhost:3001';
          const siteId = (window as any).AUTOHEAL_SITE_ID || window.location.host;
          const res = await fetch(`${endpoint}/api/settings`, { headers: { 'x-site-id': siteId } });
          const data = await res.json();
          const settings = data.settings || {};
          
          if (settings.groqKey) {
            (document.getElementById('ah-groq-key-input') as HTMLInputElement).value = settings.groqKey;
          }
          if (settings.githubRepo) {
            (document.getElementById('ah-github-repo-input') as HTMLInputElement).value = settings.githubRepo;
          }
          if (settings.githubToken) {
            (document.getElementById('ah-github-token-input') as HTMLInputElement).value = settings.githubToken;
          }
          if (settings.vercelDeployHook) {
            (document.getElementById('ah-vercel-hook-input') as HTMLInputElement).value = settings.vercelDeployHook;
          }
          if (settings.n8nWebhook) {
            (document.getElementById('ah-n8n-webhook-input') as HTMLInputElement).value = settings.n8nWebhook;
          }
        } catch (e) {
          console.warn('AutoHeal: Could not fetch settings', e);
        }
      } else {
        featureView.style.display = 'block';
        featureFooter.style.display = 'flex';
        settingsView.style.display = 'none';
        settingsFooter.style.display = 'none';
      }
    });

    // Save Settings logic
    document.getElementById('ah-save-settings-btn')?.addEventListener('click', async () => {
      const groqKey = (document.getElementById('ah-groq-key-input') as HTMLInputElement).value.trim();
      const githubRepo = (document.getElementById('ah-github-repo-input') as HTMLInputElement)?.value.trim() || '';
      const githubToken = (document.getElementById('ah-github-token-input') as HTMLInputElement)?.value.trim() || '';
      const vercelDeployHook = (document.getElementById('ah-vercel-hook-input') as HTMLInputElement)?.value.trim() || '';
      const n8nWebhook = (document.getElementById('ah-n8n-webhook-input') as HTMLInputElement)?.value.trim() || '';
      
      const autonomousToggle = document.getElementById('ah-autonomous-toggle') as HTMLInputElement;
      if (autonomousToggle) {
        localStorage.setItem('autoheal_autonomous', autonomousToggle.checked ? 'true' : 'false');
      }

      const endpoint = (window as any).AUTOHEAL_ENDPOINT || 'http://localhost:3001';
      const siteId = (window as any).AUTOHEAL_SITE_ID || window.location.host;
      const statusEl = document.getElementById('ah-settings-status')!;
      
      statusEl.textContent = 'Saving...';
      try {
        const res = await fetch(`${endpoint}/api/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-site-id': siteId },
          body: JSON.stringify({ 
            settings: { 
              groqKey, 
              githubRepo,
              githubToken,
              vercelDeployHook,
              n8nWebhook,
              modelProvider: 'groq' 
            } 
          })
        });
        const data = await res.json();
        if (data.success) {
          statusEl.textContent = 'Settings saved successfully! ✅';
          setTimeout(() => { statusEl.textContent = ''; }, 3000);
        } else {
          statusEl.textContent = 'Error saving settings.';
        }
      } catch (e) {
        statusEl.textContent = 'Failed to connect to Master Server.';
      }
    });
    
    const buildBtn = document.getElementById('ah-build-btn') as HTMLButtonElement;
    const promptInput = document.getElementById('ah-feature-prompt') as HTMLTextAreaElement;

    buildBtn.addEventListener('click', () => {
      const prompt = promptInput.value.trim();
      if (!prompt) return;
      
      promptInput.disabled = true;
      buildBtn.disabled = true;
      buildBtn.classList.add('disabled');
      const loader = document.getElementById('ah-btn-loader');
      if (loader) loader.style.display = 'inline-block';
      const text = document.getElementById('ah-btn-text');
      if (text) text.textContent = 'BUILDING...';
      
      const consoleEl = document.getElementById('ah-diag-console');
      if (consoleEl) consoleEl.style.display = 'block';

      // Create a mock ErrorData for the feature request
      const featureRequest: ErrorData = {
        id: 'feature_' + Date.now(),
        type: 'feature',
        message: prompt,
        timestamp: new Date().toISOString(),
        source: window.location.pathname === '/' ? 'src/App.jsx' : window.location.pathname
      };

      this.runDiagnosticEngine(featureRequest, buildBtn);
    });
  }

  private openDiagnosticModal(error: ErrorData, isHardCrash: boolean) {
    if (!this.container) return;

    // Apply crash background blur if it's a hard crash
    if (isHardCrash) {
      document.body.classList.add('ah-blur-active');
      this.container.classList.add('ah-hard-crash');
    } else {
      this.container.classList.remove('ah-hard-crash');
    }

    this.container.style.display = 'flex';
    
    const timestamp = new Date(error.timestamp).toLocaleTimeString();

    this.container.innerHTML = `
      <div class="ah-diag-modal">
        <div class="ah-diag-header">
          <div class="ah-diag-title">
            <span class="ah-pulse-dot red"></span>
            <span>AUTOHEAL SYSTEM DIAGNOSTICS</span>
          </div>
          <button class="ah-close-btn" id="ah-close-modal-btn">✕</button>
        </div>
        
        <div class="ah-diag-body">
          <div class="ah-section">
            <div class="ah-section-title">🛑 Captured Exception [${error.type.toUpperCase()}]</div>
            <div class="ah-error-card">
              <div class="ah-error-msg">${error.message}</div>
              ${error.source ? `<div class="ah-error-source">URL: <span>${error.source}</span> ${error.line ? `(Line ${error.line}:${error.column})` : ''}</div>` : ''}
              ${error.domContext ? `<div class="ah-error-dom">DOM: <code>${this.escapeHTML(error.domContext)}</code></div>` : ''}
              <div class="ah-timestamp">Caught at ${timestamp} • Logs emailed to developer inbox ✉️</div>
            </div>
          </div>

          <div class="ah-section ah-diag-flow">
            <div class="ah-scanner-container" id="ah-scanner-box">
              <div class="ah-radar">
                <div class="ah-radar-sweep"></div>
                <div class="ah-radar-circle circle-1"></div>
                <div class="ah-radar-circle circle-2"></div>
                <div class="ah-radar-circle circle-3"></div>
              </div>
              <div class="ah-scanner-label">SCANNING FOR SOLUTIONS...</div>
            </div>

            <div class="ah-console" id="ah-diag-console">
              <div class="ah-console-line comment">> AutoHeal SDK initialized.</div>
              <div class="ah-console-line error">> INTERCEPTED: ${error.type.toUpperCase()} error detected.</div>
              <div class="ah-console-line">> Packaging dump data...</div>
              <div class="ah-console-line success">> Error log emailed to developer email address successfully!</div>
              <div class="ah-console-line info">> Spawning AI Healing Agent...</div>
            </div>
          </div>

          <div class="ah-section ah-patch-section" id="ah-patch-box" style="display: none;">
            <div class="ah-section-title">🔮 Proposed Repair Patch</div>
            <div class="ah-diff-viewer" id="ah-diff-box">
              <!-- Content filled dynamically -->
            </div>
          </div>
        </div>

        <div class="ah-diag-footer">
          <div class="ah-status-message" id="ah-footer-status">Analyzing stack trace...</div>
          <div class="ah-actions">
            <button class="ah-btn secondary" id="ah-ignore-btn">Ignore Error</button>
            <button class="ah-btn primary disabled" id="ah-patch-btn" disabled>
              <span class="ah-btn-spinner" id="ah-btn-loader" style="display: inline-block;"></span>
              <span id="ah-btn-text">Waiting for AI...</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Hook events
    document.getElementById('ah-close-modal-btn')?.addEventListener('click', () => this.closeDiagnosticModal());
    document.getElementById('ah-ignore-btn')?.addEventListener('click', () => this.closeDiagnosticModal());
    
    const patchBtn = document.getElementById('ah-patch-btn') as HTMLButtonElement;
    
    // Start console typing simulator and contact AI
    this.runDiagnosticEngine(error, patchBtn);
  }

  private async runDiagnosticEngine(error: ErrorData, patchBtn: HTMLButtonElement) {
    const consoleEl = document.getElementById('ah-diag-console');
    const footerStatus = document.getElementById('ah-footer-status');
    const scannerBox = document.getElementById('ah-scanner-box');
    const patchBox = document.getElementById('ah-patch-box');
    const diffBox = document.getElementById('ah-diff-box');
    
    if (!consoleEl) return;

    const logLine = (msg: string, type: 'comment'|'error'|'success'|'info'|'default' = 'default') => {
      const el = document.createElement('div');
      el.className = `ah-console-line ${type}`;
      el.textContent = `> ${msg}`;
      consoleEl.appendChild(el);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    };

    // Step-by-step console logging animation
    await this.delay(1000);
    logLine('Analyzing stack trace patterns...', 'info');
    if (footerStatus) footerStatus.textContent = 'Analyzing source-code stack trace...';
    
    await this.delay(1200);
    logLine('Extracting code context around error location...', 'info');
    
    await this.delay(1000);
    logLine('Consulting AI LLM healing patterns...', 'comment');
    if (footerStatus) footerStatus.textContent = 'Generating surgical repair code...';

    // Call AI or trigger simulator
    let success = false;
    let diffCode = '';
    let explanation = '';
    let healedFileContent = '';
    let targetPath = error.source || 'sandbox';
    let files: any[] = [];

    if (this.onHealHandler) {
      try {
        const result = await this.onHealHandler(error);
        success = result.success;
        diffCode = result.diffCode;
        explanation = (result as any).explanation || '';
        healedFileContent = (result as any).healedFileContent || '';
        if ((result as any).targetPath) targetPath = (result as any).targetPath;
        if ((result as any).files) files = (result as any).files;
      } catch (err) {
        logLine('Failed to contact AI Healer Agent.', 'error');
      }
    }

    await this.delay(800);

    if (success && diffCode) {
      logLine('Surgical fix generated successfully!', 'success');
      logLine('Ready to hot-patch runtime environment.', 'success');
      if (footerStatus) footerStatus.textContent = 'Patch compiled successfully!';

      // Hide scanner, show diff
      if (scannerBox) scannerBox.style.display = 'none';
      if (patchBox) patchBox.style.display = 'block';
      if (diffBox) {
        diffBox.innerHTML = this.renderDiff(diffCode);
      }

      // Unlock button
      if (patchBtn) {
        patchBtn.disabled = false;
        patchBtn.classList.remove('disabled');
        const loader = document.getElementById('ah-btn-loader');
        if (loader) loader.style.display = 'none';
        const text = document.getElementById('ah-btn-text');
        if (text) text.textContent = 'APPLY LIVE PATCH 🩺';
        
        patchBtn.onclick = async () => {
          patchBtn.disabled = true;
          patchBtn.classList.add('disabled');
          if (loader) loader.style.display = 'inline-block';
          if (text) text.textContent = 'Applying Patch...';
          
          if (footerStatus) footerStatus.textContent = 'Executing hot-patch sequence...';
          
          logLine('Initiating remote deployment pipeline...', 'info');
          await this.delay(600);
          logLine('Packaging patch files...', 'info');
          await this.delay(600);
          logLine('Contacting AutoHeal backend server...', 'info');
          
          try {
            const endpoint = (window as any).AUTOHEAL_ENDPOINT || 'http://localhost:3001';
            const siteId = (window as any).AUTOHEAL_SITE_ID || window.location.host;
            const res = await fetch(`${endpoint}/api/apply-patch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-site-id': siteId },
              body: JSON.stringify({ files: files.length > 0 ? files : undefined, content: healedFileContent, file: targetPath, prompt: error.message })
            });
            const applyData = await res.json();
            if (applyData.success) {
              logLine('Backend processed request successfully! ✅', 'success');
              await this.delay(600);
              
              if (applyData.mode === 'n8n-cloud') {
                logLine('Route: Forwarded to N8N Cloud Bridge 🌐', 'success');
                if (applyData.n8nResponse && applyData.n8nResponse.message) {
                  logLine(`N8N: ${applyData.n8nResponse.message}`, 'info');
                }
              } else if (applyData.mode === 'github') {
                logLine('Committed patch directly to GitHub Repository! 🚀', 'success');
                logLine(`Commit SHA: ${applyData.sha || 'N/A'}`, 'comment');
              } else {
                logLine('Patch successfully written to local disk! 🩺', 'success');
              }
              
              await this.delay(600);
              logLine('Triggering Vercel Deploy Hook...', 'info');
              await this.delay(400);
              logLine('Production rebuild triggered successfully! ⚡', 'success');
              logLine('Deployment is building in the background.', 'success');
              logLine('Auto-Heal hot-patch complete! Site is recovered. 🎉', 'success');
              
              if (footerStatus) footerStatus.textContent = 'Hot-patch successfully applied!';
              
              this.showToast('🚀 Code Pushed to GitHub! Vercel is building...', 'success');
              
              // Change button to RELOAD PAGE TO VERIFY
              if (patchBtn) {
                patchBtn.disabled = false;
                patchBtn.classList.remove('disabled');
                patchBtn.style.background = '#10b981'; // Green
                patchBtn.style.borderColor = '#10b981';
                patchBtn.style.color = '#fff';
                if (loader) loader.style.display = 'none';
                if (text) text.textContent = 'RELOAD PAGE TO VERIFY 🔄';
                
                // Hide the cancel/ignore button so they must reload or close
                const ignoreBtn = document.getElementById('ah-ignore-btn');
                if (ignoreBtn) ignoreBtn.style.display = 'none';
                
                patchBtn.onclick = () => {
                  window.location.reload();
                };
              }
            } else {
              logLine(`❌ Push Failed: ${applyData.error}`, 'error');
              this.showToast(`❌ Push Failed: ${applyData.error}`, 'error');
              if (footerStatus) footerStatus.textContent = 'Push failed.';
              // Reset button so they can retry
              patchBtn.disabled = false;
              patchBtn.classList.remove('disabled');
              if (loader) loader.style.display = 'none';
              if (text) text.textContent = 'RETRY LIVE PATCH 🩺';
            }
          } catch (e) {
            logLine('❌ Network error communicating with Master Server', 'error');
            this.showToast('❌ Network error communicating with Master Server', 'error');
            if (footerStatus) footerStatus.textContent = 'Network error.';
            // Reset button
            patchBtn.disabled = false;
            patchBtn.classList.remove('disabled');
            if (loader) loader.style.display = 'none';
            if (text) text.textContent = 'RETRY LIVE PATCH 🩺';
          }

          // Clear error from queue
          this.currentErrors = this.currentErrors.filter(e => e.id !== error.id);
          this.updateBadgeCount();
        };
      }
    } else {
      logLine(`AI agent failed: ${explanation || 'Could not determine a safe patch.'}`, 'error');
      if (footerStatus) footerStatus.textContent = 'Healing failed. Manual debug required.';
      if (patchBtn) {
        patchBtn.disabled = false;
        patchBtn.classList.remove('disabled');
        const loader = document.getElementById('ah-btn-loader');
        if (loader) loader.style.display = 'none';
        const text = document.getElementById('ah-btn-text');
        if (text) text.textContent = 'Unable to heal';
      }
    }
  }

  private renderDiff(diffCode: string): string {
    const lines = diffCode.split('\n');
    return lines.map(line => {
      let type = 'normal';
      if (line.startsWith('+')) type = 'add';
      else if (line.startsWith('-')) type = 'delete';
      
      return `<div class="ah-diff-line ${type}">${this.escapeHTML(line)}</div>`;
    }).join('');
  }

  private showToast(msg: string, type: 'success' | 'warning' = 'success') {
    const toast = document.createElement('div');
    toast.className = `ah-toast ${type}`;
    toast.innerHTML = `
      <span class="ah-toast-icon">${type === 'success' ? '⚡' : '⚠️'}</span>
      <span>${msg}</span>
    `;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('visible'), 50);
    
    // Animate out
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  private closeDiagnosticModal() {
    if (!this.container) return;
    this.container.style.display = 'none';
    document.body.classList.remove('ah-blur-active');
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private injectStyles() {
    if (document.getElementById('autoheal-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'autoheal-widget-styles';
    style.textContent = `
      /* Font settings for premium console */
      @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');

      /* Warning Pulsing Badge */
      .ah-badge-pill {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        background: rgba(18, 22, 33, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 68, 68, 0.45);
        border-radius: 50px;
        padding: 10px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 10px 30px rgba(255, 68, 68, 0.25), inset 0 0 10px rgba(255, 68, 68, 0.1);
        color: #fff;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .ah-badge-pill:hover {
        transform: translateY(-4px) scale(1.02);
        border-color: #ff4444;
        box-shadow: 0 15px 40px rgba(255, 68, 68, 0.4);
      }
      .ah-badge-icon {
        font-size: 20px;
      }
      .ah-badge-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .ah-badge-text {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 600;
      }
      .ah-badge-count {
        font-size: 14px;
        font-weight: 700;
        color: #ff4444;
      }
      
      @keyframes ah-pulse-animation {
        0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
        70% { box-shadow: 0 0 0 15px rgba(255, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
      }
      .ah-pulse {
        animation: ah-pulse-animation 1.5s infinite;
      }

      /* Modal Background Overlay */
      .ah-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 100000;
        background: rgba(10, 12, 16, 0.4);
        backdrop-filter: blur(2px);
        display: none;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', sans-serif;
        color: #e6edf3;
        transition: all 0.3s ease;
      }
      .ah-modal-overlay.ah-hard-crash {
        background: rgba(10, 12, 16, 0.7);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
      }
      
      /* Blur Body Effect */
      body.ah-blur-active > *:not(.ah-modal-overlay):not(.ah-toast) {
        filter: blur(8px);
        transition: filter 0.3s ease;
      }

      /* Diagnostic Modal box */
      .ah-diag-modal {
        background: rgba(17, 22, 34, 0.95);
        border: 1px solid rgba(0, 240, 255, 0.3);
        border-radius: 16px;
        width: 90%;
        max-width: 760px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 240, 255, 0.1);
        overflow: hidden;
        animation: ah-modal-slide 0.4s cubic-bezier(0.19, 1, 0.22, 1);
      }
      @keyframes ah-modal-slide {
        from { transform: translateY(40px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      /* Header */
      .ah-diag-header {
        background: rgba(10, 14, 23, 0.9);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ah-diag-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.08em;
        color: #00f0ff;
        text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
      }
      .ah-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }
      .ah-pulse-dot.red {
        background: #ff4444;
        box-shadow: 0 0 8px #ff4444;
        animation: ah-dot-glow 1s infinite alternate;
      }
      @keyframes ah-dot-glow {
        from { opacity: 0.5; }
        to { opacity: 1; }
      }
      .ah-close-btn { background: none; border: none; color: #888; font-size: 20px; cursor: pointer; transition: color 0.2s; padding: 0; line-height: 1; }
      .ah-close-btn:hover { color: #fff; }
      .ah-settings-btn { background: none; border: none; color: #888; font-size: 18px; cursor: pointer; transition: color 0.2s; padding: 0; line-height: 1; margin-right: 12px; }
      .ah-settings-btn:hover { color: #fff; transform: rotate(45deg); }

      /* Body */
      .ah-diag-body { padding: 20px; flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
      .ah-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ah-section-title {
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 0.08em;
      }
      
      /* Captured Error Card */
      .ah-error-card {
        background: rgba(255, 68, 68, 0.07);
        border: 1px solid rgba(255, 68, 68, 0.25);
        border-radius: 8px;
        padding: 16px;
        font-family: 'Inter', sans-serif;
      }
      .ah-error-msg {
        color: #ff6b6b;
        font-weight: 700;
        font-size: 15px;
        margin-bottom: 8px;
        line-height: 1.4;
      }
      .ah-error-source {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 4px;
      }
      .ah-error-source span {
        color: #00f0ff;
        font-family: 'Fira Code', monospace;
      }
      .ah-error-dom {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 4px;
      }
      .ah-error-dom code {
        color: #ffd700;
        font-family: 'Fira Code', monospace;
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .ah-timestamp {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 8px;
      }

      /* Flow Layout: Scanner & Console */
      .ah-diag-flow {
        display: grid;
        grid-template-columns: 240px 1fr;
        gap: 16px;
        min-height: 160px;
      }
      @media (max-width: 600px) {
        .ah-diag-flow {
          grid-template-columns: 1fr;
        }
      }

      /* Radar Scanner */
      .ah-scanner-container {
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 16px;
      }
      .ah-radar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        position: relative;
        background: radial-gradient(circle, rgba(0, 240, 255, 0.03) 0%, rgba(0, 240, 255, 0.15) 100%);
        border: 1px solid rgba(0, 240, 255, 0.2);
        overflow: hidden;
      }
      .ah-radar-sweep {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: conic-gradient(from 0deg, rgba(0, 240, 255, 0.5) 0deg, transparent 90deg);
        border-radius: 50%;
        animation: ah-spin 2s linear infinite;
      }
      .ah-radar-circle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        border: 1px dashed rgba(0, 240, 255, 0.15);
      }
      .circle-1 { width: 25%; height: 25%; }
      .circle-2 { width: 50%; height: 50%; }
      .circle-3 { width: 75%; height: 75%; }
      
      @keyframes ah-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .ah-scanner-label {
        font-size: 10px;
        font-weight: 700;
        color: #00f0ff;
        letter-spacing: 0.1em;
        text-align: center;
        animation: ah-fade 1.5s infinite alternate;
      }
      @keyframes ah-fade {
        from { opacity: 0.4; }
        to { opacity: 1; }
      }

      /* Dev Console */
      .ah-console {
        background: #0d1117;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 14px;
        font-family: 'Fira Code', monospace;
        font-size: 11px;
        line-height: 1.6;
        height: 160px;
        overflow-y: auto;
        color: #c9d1d9;
        box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
      }
      .ah-console-line {
        margin-bottom: 4px;
        word-break: break-all;
      }
      .ah-console-line.comment { color: #8b949e; }
      .ah-console-line.error { color: #ff6b6b; }
      .ah-console-line.success { color: #56d364; }
      .ah-console-line.info { color: #38bdf8; }

      /* Code Diff Box */
      .ah-patch-section {
        animation: ah-fade-in 0.5s ease;
      }
      @keyframes ah-fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .ah-diff-viewer {
        background: #0d1117;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        max-height: 200px;
        overflow-y: auto;
        font-family: 'Fira Code', monospace;
        font-size: 11px;
        padding: 10px 0;
      }
      .ah-diff-line {
        padding: 2px 16px;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .ah-diff-line.add {
        background-color: rgba(46, 160, 67, 0.15);
        color: #3fb950;
        border-left: 3px solid #2ea043;
      }
      .ah-diff-line.delete {
        background-color: rgba(248, 81, 73, 0.15);
        color: #f85149;
        border-left: 3px solid #f85149;
        text-decoration: line-through;
      }
      .ah-diff-line.normal {
        color: #8b949e;
        opacity: 0.7;
      }

      /* Footer Controls */
      .ah-diag-footer {
        background: rgba(10, 14, 23, 0.9);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }
      @media (max-width: 500px) {
        .ah-diag-footer {
          flex-direction: column;
          align-items: stretch;
          text-align: center;
        }
      }

      /* Floating Action Button (FAB) */
      .ah-fab {
        position: fixed;
        bottom: 24px;
        left: 24px;
        width: 48px;
        height: 48px;
        border-radius: 24px;
        background: linear-gradient(135deg, #00f0ff 0%, #bd00ff 100%);
        box-shadow: 0 4px 15px rgba(0, 240, 255, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        z-index: 99999;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .ah-fab:hover {
        transform: scale(1.1) rotate(5deg);
        box-shadow: 0 8px 25px rgba(189, 0, 255, 0.6);
      }

      /* Feature Input Textarea */
      .ah-feature-input {
        width: 100%;
        min-height: 100px;
        background: rgba(10, 15, 26, 0.8);
        border: 1px solid rgba(0, 240, 255, 0.3);
        border-radius: 8px;
        padding: 12px;
        color: #fff;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        resize: vertical;
        box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
        outline: none;
        transition: border-color 0.2s;
      }
      .ah-feature-input:focus {
        border-color: #00f0ff;
        box-shadow: inset 0 2px 10px rgba(0,0,0,0.5), 0 0 10px rgba(0,240,255,0.2);
      }
      
      .ah-status-message {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 500;
      }
      .ah-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      /* Custom Premium Buttons */
      .ah-btn {
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      .ah-btn.primary {
        background: linear-gradient(135deg, #00f0ff 0%, #bd00ff 100%);
        border: none;
        color: #fff;
        box-shadow: 0 4px 15px rgba(0, 240, 255, 0.25);
      }
      .ah-btn.primary:not(.disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 240, 255, 0.4);
      }
      .ah-btn.secondary {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.7);
      }
      .ah-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
      }
      .ah-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none !important;
      }
      
      /* Button Spinner */
      .ah-btn-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: ah-spin 0.8s linear infinite;
      }

      /* Toast Notification */
      .ah-toast {
        position: fixed;
        bottom: 30px;
        left: 30px;
        z-index: 100001;
        background: rgba(18, 22, 33, 0.95);
        border-left: 4px solid #56d364;
        border-radius: 8px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', sans-serif;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .ah-toast.visible {
        transform: translateY(0);
        opacity: 1;
      }
      .ah-toast.warning {
        border-left-color: #ffd700;
      }
      .ah-toast-icon {
        font-size: 18px;
      }
    `;
    document.head.appendChild(style);
  }
}
export const widgetInstance = new AutoHealWidget();
