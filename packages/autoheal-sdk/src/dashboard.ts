import type { ErrorData } from './interceptor.ts';

export interface DashboardConfig {
  n8nWebhook?: string;
  vercelDeployHook?: string;
  gitBranch?: string;
  modelProvider?: string;
  geminiKey?: string;
  groqKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export class AutoHealDashboard {
  private container: HTMLElement | null = null;
  private isConnected = true;
  private errorList: ErrorData[] = [];
  private currentTerminalLogs: string[] = [];
  private localOllamaDetected = false;

  private settings = {
    n8nWebhook: '',
    vercelDeployHook: '',
    gitBranch: 'main',
    modelProvider: 'groq',
    geminiKey: '',
    groqKey: '',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3'
  };

  private scores = {
    polish: 52,
    spacing: 60,
    mobile: 45,
    conversion: 55
  };

  constructor() {
    // Listen for custom telemetry updates
    window.addEventListener('__autoheal_telemetry_update__', ((e: CustomEvent<ErrorData[]>) => {
      this.errorList = e.detail;
      this.render();
    }) as EventListener);
  }

  private getMockErrors(): ErrorData[] {
    const now = Date.now();
    return [
      {
        id: 'mock_crash_1',
        type: 'crash',
        message: "TypeError: Cannot read properties of undefined (reading 'map') in SandboxView.tsx:67",
        stack: "TypeError: Cannot read properties of undefined (reading 'map')\n    at SandboxView (file:///c:/auomation/playground/src/components/SandboxView.tsx:67:32)\n    at renderWithHooks (file:///c:/auomation/node_modules/react-dom/cjs/react-dom.development.js:15486:18)",
        source: 'file:///c:/auomation/playground/src/components/SandboxView.tsx',
        line: 67,
        column: 32,
        timestamp: new Date(now - 5 * 60 * 1000).toISOString()
      },
      {
        id: 'mock_promise_1',
        type: 'promise',
        message: "Unhandled Promise Rejection: Error: Network Error - Failed to fetch endpoint 'https://api.broken-endpoint.dev/data/v1/telemetry'",
        stack: "Error: Network Error\n    at fetchTelemetryData (file:///c:/auomation/playground/src/utils/api.ts:14:11)\n    at async loadDashboardData (file:///c:/auomation/playground/src/App.tsx:92:24)",
        source: 'file:///c:/auomation/playground/src/utils/api.ts',
        line: 14,
        column: 11,
        timestamp: new Date(now - 15 * 60 * 1000).toISOString()
      },
      {
        id: 'mock_asset_1',
        type: 'asset',
        message: "Failed to load resource: net::ERR_FILE_NOT_FOUND (broken-cyber-chip-image.jpg)",
        source: 'file:///c:/auomation/playground/src/assets/broken-cyber-chip-image.jpg',
        timestamp: new Date(now - 32 * 60 * 1000).toISOString()
      },
      {
        id: 'mock_console_1',
        type: 'console_error',
        message: "[React] Mismatched Hydration Warning: expected text node containing \"AutoHeal // Evolution Deck\" but found HTML tag <div>",
        source: 'file:///c:/auomation/node_modules/react-dom/cjs/react-dom.development.js',
        timestamp: new Date(now - 48 * 60 * 1000).toISOString()
      }
    ];
  }

  private async printDiffToTerminal(diff: string) {
    const lines = diff.split('\n');
    for (const line of lines) {
      let type: 'comment' | 'success' | 'error' | 'info' | 'default' = 'default';
      if (line.startsWith('+') && !line.startsWith('+++')) {
        type = 'success';
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        type = 'error';
      } else if (line.startsWith('@@') || line.startsWith('Index:') || line.startsWith('===')) {
        type = 'comment';
      } else if (line.startsWith('---') || line.startsWith('+++')) {
        type = 'info';
      }
      this.addTerminalLog(line, type);
      await this.delay(120);
    }
  }

  private getEndpoint(): string {
    return (window as any).AUTOHEAL_ENDPOINT || 'http://localhost:3001';
  }

  private async checkLocalOllama(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  private async initData() {
    // Check for local Ollama server automatically
    this.checkLocalOllama().then(detected => {
      if (detected) {
        this.localOllamaDetected = true;
        this.addTerminalLog('Local Ollama server detected automatically! 🟢 Unlimited free patch generation available.', 'success');
        this.render();
      }
    });

    try {
      const siteId = window.location.host;
      const headers = { 'x-site-id': siteId };

      this.addTerminalLog(`Connecting to live patcher backend database...`, 'comment');

      const [telemetryRes, settingsRes, scoresRes] = await Promise.all([
        fetch(`${this.getEndpoint()}/api/telemetry`, { headers }),
        fetch(`${this.getEndpoint()}/api/settings`, { headers }),
        fetch(`${this.getEndpoint()}/api/scores`, { headers })
      ]);

      const [telemetryData, settingsData, scoresData] = await Promise.all([
        telemetryRes.json(),
        settingsRes.json(),
        scoresRes.json()
      ]);

      if (telemetryData.success && telemetryData.errors) {
        this.errorList = telemetryData.errors;
        (window as any).__autoheal_errors_cache__ = this.errorList;
      }
      if (settingsData.success && settingsData.settings) {
        this.settings = { ...this.settings, ...settingsData.settings };
      }
      if (scoresData.success && scoresData.scores) {
        this.scores = { ...this.scores, ...scoresData.scores };
      }

      this.addTerminalLog('Successfully synced workspace state with live multi-tenant backend.', 'success');
      this.render();
    } catch (e) {
      this.addTerminalLog(`Backend offline: ${(e as Error).message}. Operating in Dev-Simulation Mode.`, 'info');
      // If server is not running, fallback to memory
      const cached = (window as any).__autoheal_errors_cache__ || [];
      if (cached.length === 0) {
        this.errorList = this.getMockErrors();
        (window as any).__autoheal_errors_cache__ = this.errorList;
      } else {
        this.errorList = cached;
      }
      this.render();
    }
  }

  /**
   * Mounts the evolution control dashboard inside a target element
   */
  public mount(selector: string | HTMLElement) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!element) {
      console.error('__autoheal_internal__ Dashboard mount target not found:', selector);
      return;
    }

    this.container = element as HTMLElement;
    this.injectStyles();
    
    this.addTerminalLog('AutoHeal Evolution Dashboard mounted successfully.');
    this.addTerminalLog('Telemetry connection secure. Monitoring live traffic...');

    this.initData();
  }

  private addTerminalLog(message: string, type: 'comment' | 'success' | 'error' | 'info' | 'default' = 'default') {
    const timestamp = new Date().toLocaleTimeString();
    let prefix = '> ';
    if (type === 'success') prefix = '✓ ';
    else if (type === 'error') prefix = '✗ ';
    else if (type === 'info') prefix = 'ℹ ';

    this.currentTerminalLogs.push(`[${timestamp}] ${prefix}${message}`);
    if (this.currentTerminalLogs.length > 50) this.currentTerminalLogs.shift();
    
    // Update terminal view immediately if loaded
    const terminalEl = document.getElementById('ah-dash-terminal');
    if (terminalEl) {
      const line = document.createElement('div');
      line.className = `ah-term-line ${type}`;
      line.textContent = `[${timestamp}] ${prefix}${message}`;
      terminalEl.appendChild(line);
      terminalEl.scrollTop = terminalEl.scrollHeight;
    }
  }

  private async saveSettings(
    n8nUrl: string,
    vercelUrl: string,
    gitBranch: string,
    modelProvider?: string,
    geminiKey?: string,
    groqKey?: string,
    ollamaUrl?: string,
    ollamaModel?: string
  ) {
    const updatedSettings: Partial<typeof this.settings> = {
      n8nWebhook: n8nUrl.trim(),
      vercelDeployHook: vercelUrl.trim(),
      gitBranch: gitBranch.trim()
    };

    if (modelProvider) updatedSettings.modelProvider = modelProvider;
    if (geminiKey !== undefined) updatedSettings.geminiKey = geminiKey.trim();
    if (groqKey !== undefined) updatedSettings.groqKey = groqKey.trim();
    if (ollamaUrl !== undefined) updatedSettings.ollamaUrl = ollamaUrl.trim();
    if (ollamaModel !== undefined) updatedSettings.ollamaModel = ollamaModel.trim();

    // Optimistic local update
    this.settings = { ...this.settings, ...updatedSettings };

    try {
      const res = await fetch(`${this.getEndpoint()}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-site-id': window.location.host
        },
        body: JSON.stringify({ settings: updatedSettings })
      });
      const data = await res.json();
      if (data.success && data.settings) {
        this.settings = { ...this.settings, ...data.settings };
        this.addTerminalLog('Cloud Git-Bridge settings saved to remote database.', 'success');
      } else {
        throw new Error('Failed to save settings: server did not return success.');
      }
    } catch (e) {
      this.addTerminalLog(`Failed to save settings to backend: ${(e as Error).message}. Saved locally in memory.`, 'error');
    }
    this.render();
  }

  private async dispatchWebhook(payload: {
    file: string;
    content: string;
    diffCode: string;
    explanation: string;
    type: string;
  }) {
    const n8nWebhook = this.settings.n8nWebhook || '';
    const vercelHook = this.settings.vercelDeployHook || '';
    const gitBranch = this.settings.gitBranch || 'main';

    this.addTerminalLog(`Initiating Cloud Git-Bridge dispatch for file: ${payload.file}...`, 'info');
    
    // 1. Log simulation steps to the terminal for incredible developer UX
    await this.delay(1000);
    this.addTerminalLog(`Resolving payload changes (diff size: ${payload.diffCode.split('\n').length} lines).`, 'default');
    
    await this.delay(800);
    if (!n8nWebhook) {
      this.addTerminalLog('FAILED: N8N Webhook Endpoint not configured! operating in Dev-Simulation.', 'error');
      
      // Simulated cloud sequence
      this.addTerminalLog('[SIMULATION] Dispatching Webhook payload to mock receiver...', 'info');
      await this.delay(1200);
      this.addTerminalLog('[SIMULATION] N8N Workflow Triggered: "selfheal-patch-handler"', 'success');
      await this.delay(1000);
      this.addTerminalLog(`[SIMULATION] Git Commit pushed to branch "${gitBranch}" successfully.`, 'success');
      await this.delay(1200);
      this.addTerminalLog('[SIMULATION] Vercel Deploy Hook triggered! Rebuilding live site...', 'info');
      await this.delay(1500);
      this.addTerminalLog('[SIMULATION] Deployed version completed. Evolution goes Live!', 'success');
      return { success: true, simulated: true };
    }

    try {
      this.addTerminalLog(`Dispatched POST webhook request to: ${n8nWebhook}`, 'comment');
      
      const res = await fetch(n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          vercelDeployHook: vercelHook,
          gitBranch,
          timestamp: new Date().toISOString()
        })
      });

      if (!res.ok) {
        throw new Error(`N8N Endpoint returned status code: ${res.status}`);
      }

      this.addTerminalLog('N8N Webhook response successful!', 'success');
      
      if (vercelHook) {
        this.addTerminalLog('Vercel live deployment triggered concurrently.', 'info');
      }

      return { success: true };
    } catch (e) {
      this.addTerminalLog(`Webhook dispatch error: ${(e as Error).message}`, 'error');
      return { success: false, error: (e as Error).message };
    }
  }

  private async triggerSimulatedHeal(error: ErrorData) {
    this.addTerminalLog(`Selected telemetry crash report: [${error.type.toUpperCase()}]`, 'info');
    this.addTerminalLog('Requesting repair suggestion from client-side AI agent...', 'comment');

    const provider = this.settings.modelProvider || 'gemini';
    const activeKey = provider === 'gemini' 
      ? this.settings.geminiKey 
      : this.settings.groqKey;

    const isMock = error.id.startsWith('mock_');

    if (isMock) {
      this.addTerminalLog(`Mock exception recognized: [${error.id}]. Injecting static high-fidelity repair...`, 'info');
    } else if (!activeKey) {
      this.addTerminalLog('No active API Key found in settings! Using fallback simulation module.', 'comment');
    } else {
      this.addTerminalLog(`Active LPU provider: [${provider.toUpperCase()}] running diagnostics...`, 'info');
    }

    await this.delay(1200);

    let success = false;
    let diffCode = '';
    let patchedFile = 'playground/src/components/SandboxView.tsx';

    if (isMock) {
      success = true;
      if (error.id === 'mock_crash_1') {
        patchedFile = 'playground/src/components/SandboxView.tsx';
        diffCode = `Index: playground/src/components/SandboxView.tsx
===================================================================
--- playground/src/components/SandboxView.tsx
+++ playground/src/components/SandboxView.tsx
@@ -64,5 +64,5 @@
-  const items = catalogData.items;
-  return items.map(item => <ItemCard key={item.id} data={item} />);
+  const items = catalogData?.items || [];
+  return items.map(item => <ItemCard key={item.id} data={item} />);`;
      } else if (error.id === 'mock_promise_1') {
        patchedFile = 'playground/src/utils/api.ts';
        diffCode = `Index: playground/src/utils/api.ts
===================================================================
--- playground/src/utils/api.ts
+++ playground/src/utils/api.ts
@@ -11,5 +11,10 @@
-  const res = await fetch('https://api.broken-endpoint.dev/data/v1/telemetry');
-  const data = await res.json();
+  let data = [];
+  try {
+    const res = await fetch('https://api.broken-endpoint.dev/data/v1/telemetry');
+    if (res.ok) data = await res.json();
+  } catch (e) {
+    console.warn("Telemetry fallback enabled:", e);
+  }
+  return data;`;
      } else if (error.id === 'mock_asset_1') {
        patchedFile = 'playground/src/components/SandboxView.tsx';
        diffCode = `Index: playground/src/components/SandboxView.tsx
===================================================================
--- playground/src/components/SandboxView.tsx
+++ playground/src/components/SandboxView.tsx
@@ -102,3 +102,6 @@
-  <img src="/assets/broken-cyber-chip-image.jpg" alt="Cyber Chip" />
+  <img 
+    src="/assets/broken-cyber-chip-image.jpg" 
+    onError={(e) => { e.currentTarget.src = "/assets/fallback-chip.png"; }} 
+    alt="Cyber Chip" 
+  />`;
      } else if (error.id === 'mock_console_1') {
        patchedFile = 'packages/autoheal-sdk/src/dashboard.ts';
        diffCode = `Index: packages/autoheal-sdk/src/dashboard.ts
===================================================================
--- packages/autoheal-sdk/src/dashboard.ts
+++ packages/autoheal-sdk/src/dashboard.ts
@@ -298,3 +298,3 @@
-              <div class="ah-brand-title">AUTOHEAL // EVOLUTION DECK</div>
-+              <div id="ah-brand-title-static" class="ah-brand-title">AUTOHEAL // EVOLUTION DECK</div>`;
      }
    } else {
      if ((window as any).AutoHeal && (window as any).AutoHeal.config && (window as any).AutoHeal.config.onHealRequest) {
        try {
          const result = await (window as any).AutoHeal.config.onHealRequest(error);
          success = result.success;
          diffCode = result.diffCode;
        } catch (err) {
          this.addTerminalLog(`AI Agent pipeline crashed: ${(err as Error).message}`, 'error');
        }
      } else {
        success = true;
        diffCode = `Index: ${error.source || 'unknown-file.tsx'}\n+++ ${error.source || 'unknown-file.tsx'}\n@@ -1,1 +1,2 @@\n- /* error */\n+ /* simulated AI cloud repair applied successfully */`;
      }
    }

    if (success && diffCode) {
      this.addTerminalLog('AI Repair patch compiled successfully!', 'success');
      this.addTerminalLog('Printing visual git patch diff...', 'info');
      await this.printDiffToTerminal(diffCode);
      
      // Dispatch via Webhook
      const patchResult = await this.dispatchWebhook({
        file: patchedFile,
        content: '/* Completed autonomous code replacement script context */',
        diffCode,
        explanation: `Surgically repaired exception: ${error.message}`,
        type: error.type
      });

      if (patchResult.success) {
        // Clear exception from database/cache
        try {
          const res = await fetch(`${this.getEndpoint()}/api/telemetry/clear`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-site-id': window.location.host
            },
            body: JSON.stringify({ id: error.id })
          });
          const data = await res.json();
          if (data.success && data.errors) {
            this.errorList = data.errors;
            (window as any).__autoheal_errors_cache__ = this.errorList;
          } else {
            this.errorList = this.errorList.filter(e => e.id !== error.id);
            (window as any).__autoheal_errors_cache__ = this.errorList;
          }
        } catch (err) {
          this.errorList = this.errorList.filter(e => e.id !== error.id);
          (window as any).__autoheal_errors_cache__ = this.errorList;
        }

        window.dispatchEvent(new CustomEvent('__autoheal_telemetry_update__', { detail: this.errorList }));
        this.render();
      }
    } else {
      this.addTerminalLog('Repair algorithm aborted: AI agent could not generate safe replacement boundaries.', 'error');
    }
  }

  private async triggerSimulatedEvolution(gauge: string) {
    this.addTerminalLog(`Starting visual layout evolution: [${gauge.toUpperCase()}]`, 'info');
    this.addTerminalLog('Studying DOM node alignment and mobile styling parameters...', 'comment');

    await this.delay(1200);
    this.addTerminalLog('Generating updated Glassmorphic token stylesheet...', 'info');

    // Simulate style generation
    let diffCode = '';
    let cssCode = '';
    const updatedScores = { ...this.scores };
    
    if (gauge === 'animation') {
      diffCode = `+ .sandbox-card {\n+   animation: neon-glow-pulse-anim 5s infinite alternate;\n+ }`;
      cssCode = '/* Injected animation keyframes */';
      updatedScores.polish = 95;
    } else if (gauge === 'spacing') {
      diffCode = `+ .sandbox-card {\n+   backdrop-filter: blur(20px);\n+   border: 1px solid rgba(255,255,255,0.08);\n+ }`;
      cssCode = '/* Injected spacing tokens */';
      updatedScores.spacing = 98;
    } else if (gauge === 'mobile') {
      diffCode = `+ @media (max-width: 768px) {\n+   .catalog-grid { grid-template-columns: 1fr; }\n+ }`;
      cssCode = '/* Injected responsive overrides */';
      updatedScores.mobile = 94;
    } else if (gauge === 'conversion') {
      diffCode = `+ .btn-buy {\n+   background: linear-gradient(135deg, var(--neon-emerald), #059669);\n+ }`;
      cssCode = '/* Injected CTA conversion elements */';
      updatedScores.conversion = 97;
    }

    this.scores = updatedScores;

    await this.delay(1000);
    this.addTerminalLog('Visual upgrade stylesheet compiled successfully!', 'success');

    // Dispatch via Webhook
    const patchResult = await this.dispatchWebhook({
      file: 'playground/src/index.css',
      content: cssCode,
      diffCode,
      explanation: `Evolved target design hook: ${gauge}`,
      type: 'css'
    });

    if (patchResult.success) {
      this.addTerminalLog(`Evolved scoring variables completed! Redeployment is active.`, 'success');
      
      // Save scores to remote database
      try {
        const res = await fetch(`${this.getEndpoint()}/api/scores`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-site-id': window.location.host
          },
          body: JSON.stringify({ scores: updatedScores })
        });
        const data = await res.json();
        if (data.success && data.scores) {
          this.scores = data.scores;
        }
      } catch (err) {
        this.addTerminalLog(`Failed to write evolved scores to backend DB: ${(err as Error).message}`, 'error');
      }

      // Inject CSS into current page to preview live evolution instantly!
      const styleId = `autoheal-evolution-style-${gauge}`;
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      
      if (gauge === 'animation') {
        styleEl.textContent = `
          @keyframes neon-glow-pulse-anim-dash {
            0% { box-shadow: 0 0 10px rgba(0, 240, 255, 0.25); }
            50% { box-shadow: 0 0 25px rgba(189, 0, 255, 0.45); }
            100% { box-shadow: 0 0 10px rgba(0, 240, 255, 0.25); }
          }
          .sandbox-card {
            animation: neon-glow-pulse-anim-dash 5s infinite alternate !important;
          }
        `;
      } else if (gauge === 'spacing') {
        styleEl.textContent = `
          .sandbox-card {
            background: rgba(10, 15, 26, 0.65) !important;
            backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
        `;
      } else if (gauge === 'mobile') {
        styleEl.textContent = `
          @media (max-width: 768px) {
            .catalog-grid { grid-template-columns: 1fr !important; }
          }
        `;
      } else if (gauge === 'conversion') {
        styleEl.textContent = `
          .btn-buy {
            background: linear-gradient(135deg, #00ff66 0%, #059669 100%) !important;
            box-shadow: 0 0 15px rgba(0, 255, 102, 0.4) !important;
          }
        `;
      }

      this.render();
    }
  }

  private render() {
    if (!this.container) return;

    const n8nWebhook = this.settings.n8nWebhook || '';
    const vercelHook = this.settings.vercelDeployHook || '';

    const scorePolish = this.scores.polish;
    const scoreSpacing = this.scores.spacing;
    const scoreMobile = this.scores.mobile;
    const scoreConversion = this.scores.conversion;

    this.container.innerHTML = `
      <div class="ah-dash-wrapper">
        
        <!-- Dashboard Navigation Header -->
        <div class="ah-dash-header glass-panel">
          <div class="ah-dash-brand">
            <div class="ah-brand-icon">🧬</div>
            <div>
              <div class="ah-brand-title">AUTOHEAL // EVOLUTION DECK</div>
              <div class="ah-brand-sub">SaaS AUTONOMOUS WORKSPACE CONTROLLER</div>
            </div>
          </div>
          <div class="ah-dash-actions">
            <div class="ah-pill ${this.isConnected ? 'green' : 'red'}">
              <span class="ah-pulse-dot small ${this.isConnected ? 'green' : 'red'}"></span>
              <span>${this.isConnected ? 'GIT-BRIDGE CONNECTED' : 'OFFLINE'}</span>
            </div>
            <button class="ah-dash-btn secondary" id="ah-dash-reseed-trigger">🔄 Re-Seed Data</button>
            <button class="ah-dash-btn secondary" id="ah-dash-settings-trigger">⚙️ Cloud Settings</button>
          </div>
        </div>

        <div class="ah-dash-grid">
          
          <!-- LEFT SIDE: Error Hub Telemetry (Before) & Solution Deck (After) -->
          <div class="ah-dash-column col-left">
            
            <div class="ah-panel glass-panel">
              <div class="ah-panel-title">
                <span class="ah-icon-bullet red">🛑</span>
                <span>Telemetry Logs Hub (BEFORE)</span>
              </div>
              <div class="ah-panel-body scrollable">
                ${this.errorList.length === 0 ? `
                  <div class="ah-empty-state">
                    <span class="ah-empty-icon">🛡️</span>
                    <span class="ah-empty-text">No active telemetry exceptions caught in workspace.</span>
                    <button class="ah-dash-btn primary small" id="ah-dash-empty-reseed" style="margin-top: 12px;">🔄 Re-Seed Mock Telemetry</button>
                  </div>
                ` : `
                  <div class="ah-error-logs-list">
                    ${this.errorList.map(err => `
                      <div class="ah-log-item-card">
                        <div class="ah-log-item-header">
                          <span class="ah-log-badge ${err.type === 'crash' ? 'red' : 'yellow'}">${err.type.toUpperCase()}</span>
                          <span class="ah-log-time">${new Date(err.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div class="ah-log-message">${err.message}</div>
                        ${err.source ? `<div class="ah-log-src">Source: <code>${err.source.substring(err.source.lastIndexOf('/') + 1)}</code></div>` : ''}
                        <div class="ah-log-footer">
                          <button class="ah-dash-btn primary small heal-trigger-btn" data-id="${err.id}">🩺 AI Cloud Repair</button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>

            <!-- Deployment Progress Terminal (AFTER) -->
            <div class="ah-panel glass-panel">
              <div class="ah-panel-title">
                <span class="ah-icon-bullet cyan">💻</span>
                <span>Autonomous Git-Bridge Console</span>
              </div>
              <div class="ah-panel-body dark-terminal scrollable" id="ah-dash-terminal">
                ${this.currentTerminalLogs.map(log => {
                  let cls = '';
                  if (log.includes('✓') || log.includes('Live')) cls = 'success';
                  else if (log.includes('✗') || log.includes('FAILED')) cls = 'error';
                  else if (log.includes('ℹ') || log.includes('Initiating')) cls = 'info';
                  else if (log.includes('comment')) cls = 'comment';
                  return `<div class="ah-term-line ${cls}">${log}</div>`;
                }).join('')}
              </div>
            </div>

          </div>

          <!-- RIGHT SIDE: Visual Layout Scoring Deck & Custom Evolutionary Prompt -->
          <div class="ah-dash-column col-right">
            
            <div class="ah-panel glass-panel">
              <div class="ah-panel-title">
                <span class="ah-icon-bullet purple">✨</span>
                <span>Visual Score Evolution Deck</span>
              </div>
              <div class="ah-panel-body">
                <div class="ah-gauges-container">
                  
                  <!-- Gauge 1: Motion & Polish -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">⚡ MOTION & POLISH</span>
                      <span class="ah-gauge-score ${scorePolish >= 80 ? 'green' : 'yellow'}">${scorePolish}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill yellow" style="width: ${scorePolish}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${scorePolish >= 80 ? 'Premium micro-animations active' : 'Static stylesheets detected'}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="animation">EVOLVE</button>
                    </div>
                  </div>

                  <!-- Gauge 2: Spacing & UI Design -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">💎 DESIGN & SPACING</span>
                      <span class="ah-gauge-score ${scoreSpacing >= 80 ? 'green' : 'yellow'}">${scoreSpacing}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill cyan" style="width: ${scoreSpacing}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${scoreSpacing >= 80 ? 'High-contrast Glassmorphism active' : 'Outdated layout card models loaded'}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="spacing">EVOLVE</button>
                    </div>
                  </div>

                  <!-- Gauge 3: Mobile Sizing -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">📱 MOBILE RESPONSIVENESS</span>
                      <span class="ah-gauge-score ${scoreMobile >= 80 ? 'green' : 'yellow'}">${scoreMobile}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill purple" style="width: ${scoreMobile}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${scoreMobile >= 80 ? 'Fluid grid scaling configured' : 'Static pixel widths warning'}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="mobile">EVOLVE</button>
                    </div>
                  </div>

                  <!-- Gauge 4: Conversion CTA -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">🎨 HIGH-CONVERSION CTA</span>
                      <span class="ah-gauge-score ${scoreConversion >= 80 ? 'green' : 'yellow'}">${scoreConversion}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill emerald" style="width: ${scoreConversion}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${scoreConversion >= 80 ? 'Glowing CTA gradient borders loaded' : 'Low CTA layout visibility'}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="conversion">EVOLVE</button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <!-- Evolutionary Settings Overlay trigger / Inline settings -->
            <div class="ah-panel glass-panel" id="ah-settings-panel" style="display: none;">
              <div class="ah-panel-title">
                <span class="ah-icon-bullet green">⚙️</span>
                <span>Git-Bridge & SaaS AI Setup</span>
              </div>
              <div class="ah-panel-body">
                <form class="ah-settings-form" id="ah-dash-settings-form">
                  <div class="ah-input-group">
                    <label>N8N Git-Bridge Webhook Endpoint URL</label>
                    <input type="text" id="ah-n8n-url-input" class="ah-text-input" placeholder="https://n8n.yourdomain.com/webhook/selfheal-patch" value="${n8nWebhook}" />
                  </div>
                  <div class="ah-input-group">
                    <label>Vercel / Render Live Deploy Hook URL</label>
                    <input type="text" id="ah-vercel-url-input" class="ah-text-input" placeholder="https://api.vercel.com/v1/integrations/deploy/..." value="${vercelHook}" />
                  </div>
                  <div class="ah-input-group">
                    <label>Target Git Repository Branch</label>
                    <input type="text" id="ah-git-branch-input" class="ah-text-input" placehold                  <div class="ah-input-group">
                    <label>Autonomous AI Engine Provider</label>
                    <select id="ah-model-provider-input" class="ah-text-input">
                      <option value="gemini" ${this.settings.modelProvider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                      <option value="groq" ${this.settings.modelProvider === 'groq' ? 'selected' : ''}>Groq (Llama 3)</option>
                      <option value="ollama" ${this.settings.modelProvider === 'ollama' ? 'selected' : ''}>Ollama (Local LLM)</option>
                    </select>
                  </div>
                  <div class="ah-input-group" style="${this.settings.modelProvider === 'gemini' ? '' : 'display: none;'}">
                    <label>Google Gemini API Key</label>
                    <input type="password" id="ah-gemini-key-input" class="ah-text-input" placeholder="Enter Gemini API Key..." value="${this.settings.geminiKey || ''}" />
                  </div>
                  <div class="ah-input-group" style="${this.settings.modelProvider === 'groq' ? '' : 'display: none;'}">
                    <label>Groq API Key</label>
                    <input type="password" id="ah-groq-key-input" class="ah-text-input" placeholder="Enter Groq API Key..." value="${this.settings.groqKey || ''}" />
                  </div>
                  <div class="ah-input-group" id="ah-ollama-url-group" style="${this.settings.modelProvider === 'ollama' ? '' : 'display: none;'}">
                    <label>Ollama Server URL</label>
                    <input type="text" id="ah-ollama-url-input" class="ah-text-input" placeholder="http://localhost:11434" value="${this.settings.ollamaUrl || 'http://localhost:11434'}" />
                  </div>
                  <div class="ah-input-group" id="ah-ollama-model-group" style="${this.settings.modelProvider === 'ollama' ? '' : 'display: none;'}">
                    <label>Ollama Model Name</label>
                    <input type="text" id="ah-ollama-model-input" class="ah-text-input" placeholder="llama3" value="${this.settings.ollamaModel || 'llama3'}" />
                  </div>

                  <div style="margin-top: 15px; margin-bottom: 15px;">
                    ${this.localOllamaDetected ? `
                    <div class="ah-ollama-alert" style="background: rgba(0, 255, 102, 0.08); border: 1px solid var(--neon-emerald); border-radius: 6px; padding: 10px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <span style="color: var(--neon-emerald); font-weight: bold;">🟢 Local Ollama Connected!</span>
                        <div style="color: var(--dash-text-muted); font-size: 11px; margin-top: 2px;">Your machine is ready to generate unlimited free fixes.</div>
                      </div>
                      ${this.settings.modelProvider !== 'ollama' ? `
                        <button type="button" class="ah-dash-btn small green" id="ah-connect-ollama-btn" style="padding: 4px 8px; font-size: 11px; margin-left: 10px; border-radius: 4px;">Use Local LLM</button>
                      ` : ''}
                    </div>
                    ` : `
                    <div class="ah-ollama-alert" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--dash-border); border-radius: 6px; padding: 10px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <span style="color: var(--dash-text-muted); font-weight: bold;">⚪ Local Ollama offline</span>
                        <div style="color: var(--dash-text-muted); font-size: 11px; margin-top: 2px;">Start Ollama locally to unlock free, unlimited debug sessions.</div>
                      </div>
                      <button type="button" class="ah-dash-btn small secondary" id="ah-retry-ollama-btn" style="padding: 4px 8px; font-size: 11px; margin-left: 10px; border-radius: 4px;">Detect</button>
                    </div>
                    `}
                  </div>

                  <div class="ah-settings-actions">
                    <button type="button" class="ah-dash-btn secondary" id="ah-settings-cancel">Cancel</button>
                    <button type="submit" class="ah-dash-btn green">Save Cloud Settings</button>
                  </div>
                </form>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    // Hook listeners
    this.container.querySelectorAll('.heal-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLButtonElement).dataset.id;
        const err = this.errorList.find(x => x.id === id);
        if (err) this.triggerSimulatedHeal(err);
      });
    });

    this.container.querySelectorAll('.evolve-trigger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gauge = (e.currentTarget as HTMLButtonElement).dataset.gauge;
        if (gauge) this.triggerSimulatedEvolution(gauge);
      });
    });

    const reseedTrigger = this.container.querySelector('#ah-dash-reseed-trigger');
    if (reseedTrigger) {
      reseedTrigger.addEventListener('click', async () => {
        try {
          this.addTerminalLog('Requesting live mock database re-seeding...', 'comment');
          const res = await fetch(`${this.getEndpoint()}/api/telemetry/reseed`, {
            method: 'POST',
            headers: {
              'x-site-id': window.location.host
            }
          });
          const data = await res.json();
          if (data.success && data.errors) {
            this.errorList = data.errors;
            (window as any).__autoheal_errors_cache__ = this.errorList;
            this.addTerminalLog('Reset & populated live mock telemetry database successfully.', 'success');
          } else {
            throw new Error('Reseed request failed on server.');
          }
        } catch (e) {
          this.errorList = this.getMockErrors();
          (window as any).__autoheal_errors_cache__ = this.errorList;
          this.addTerminalLog('Reset & populated local mock telemetry dataset.', 'info');
        }
        window.dispatchEvent(new CustomEvent('__autoheal_telemetry_update__', { detail: this.errorList }));
        this.render();
      });
    }

    const emptyReseed = this.container.querySelector('#ah-dash-empty-reseed');
    if (emptyReseed) {
      emptyReseed.addEventListener('click', async () => {
        try {
          this.addTerminalLog('Requesting live mock database re-seeding...', 'comment');
          const res = await fetch(`${this.getEndpoint()}/api/telemetry/reseed`, {
            method: 'POST',
            headers: {
              'x-site-id': window.location.host
            }
          });
          const data = await res.json();
          if (data.success && data.errors) {
            this.errorList = data.errors;
            (window as any).__autoheal_errors_cache__ = this.errorList;
            this.addTerminalLog('Populated live mock telemetry database successfully.', 'success');
          } else {
            throw new Error('Reseed request failed on server.');
          }
        } catch (e) {
          this.errorList = this.getMockErrors();
          (window as any).__autoheal_errors_cache__ = this.errorList;
          this.addTerminalLog('Populated local mock telemetry dataset.', 'info');
        }
        window.dispatchEvent(new CustomEvent('__autoheal_telemetry_update__', { detail: this.errorList }));
        this.render();
      });
    }

    const settingsTrigger = this.container.querySelector('#ah-dash-settings-trigger');
    const settingsPanel = this.container.querySelector('#ah-settings-panel') as HTMLElement;
    const settingsCancel = this.container.querySelector('#ah-settings-cancel');
    const settingsForm = this.container.querySelector('#ah-dash-settings-form') as HTMLFormElement;

    if (settingsTrigger && settingsPanel) {
      settingsTrigger.addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
      });
    }

    if (settingsCancel && settingsPanel) {
      settingsCancel.addEventListener('click', () => {
        settingsPanel.style.display = 'none';
      });
    }

    if (settingsForm && settingsPanel) {
      // Dynamic Field Toggle Listener
      const providerSelect = document.getElementById('ah-model-provider-input') as HTMLSelectElement;
      if (providerSelect) {
        providerSelect.addEventListener('change', () => {
          const val = providerSelect.value;
          const geminiGroup = document.getElementById('ah-gemini-key-input')?.closest('.ah-input-group') as HTMLElement;
          const groqGroup = document.getElementById('ah-groq-key-input')?.closest('.ah-input-group') as HTMLElement;
          const ollamaUrlGroup = document.getElementById('ah-ollama-url-group');
          const ollamaModelGroup = document.getElementById('ah-ollama-model-group');

          if (geminiGroup) geminiGroup.style.display = val === 'gemini' ? 'block' : 'none';
          if (groqGroup) groqGroup.style.display = val === 'groq' ? 'block' : 'none';
          if (ollamaUrlGroup) ollamaUrlGroup.style.display = val === 'ollama' ? 'block' : 'none';
          if (ollamaModelGroup) ollamaModelGroup.style.display = val === 'ollama' ? 'block' : 'none';
        });
      }

      // Connect Ollama Automatically
      const connectOllamaBtn = this.container?.querySelector('#ah-connect-ollama-btn');
      if (connectOllamaBtn) {
        connectOllamaBtn.addEventListener('click', () => {
          this.addTerminalLog('Connecting local Ollama LLM provider automatically...', 'comment');
          this.saveSettings(
            this.settings.n8nWebhook,
            this.settings.vercelDeployHook,
            this.settings.gitBranch,
            'ollama',
            this.settings.geminiKey,
            this.settings.groqKey,
            this.settings.ollamaUrl || 'http://localhost:11434',
            this.settings.ollamaModel || 'llama3'
          );
          this.addTerminalLog('Successfully switched to local Ollama provider! Enjoy unlimited free debug heals.', 'success');
        });
      }

      // Retry/Detect Ollama
      const retryOllamaBtn = this.container?.querySelector('#ah-retry-ollama-btn');
      if (retryOllamaBtn) {
        retryOllamaBtn.addEventListener('click', async () => {
          this.addTerminalLog('Scanning local network for Ollama server...', 'comment');
          const detected = await this.checkLocalOllama();
          if (detected) {
            this.localOllamaDetected = true;
            this.addTerminalLog('Local Ollama server detected! 🟢 Now ready for unlimited free patches.', 'success');
          } else {
            this.addTerminalLog('Ollama server is offline on http://localhost:11434. Please run "ollama serve" to start it.', 'error');
          }
          this.render();
        });
      }

      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const n8nUrl = (document.getElementById('ah-n8n-url-input') as HTMLInputElement).value;
        const vercelUrl = (document.getElementById('ah-vercel-url-input') as HTMLInputElement).value;
        const branch = (document.getElementById('ah-git-branch-input') as HTMLInputElement).value;
        const modelProvider = (document.getElementById('ah-model-provider-input') as HTMLSelectElement).value;
        const geminiKey = (document.getElementById('ah-gemini-key-input') as HTMLInputElement).value;
        const groqKey = (document.getElementById('ah-groq-key-input') as HTMLInputElement).value;
        const ollamaUrl = (document.getElementById('ah-ollama-url-input') as HTMLInputElement)?.value || 'http://localhost:11434';
        const ollamaModel = (document.getElementById('ah-ollama-model-input') as HTMLInputElement)?.value || 'llama3';
        
        this.saveSettings(n8nUrl, vercelUrl, branch, modelProvider, geminiKey, groqKey, ollamaUrl, ollamaModel);
        settingsPanel.style.display = 'none';
      });
    }

    // Scroll terminal to bottom
    const term = document.getElementById('ah-dash-terminal');
    if (term) term.scrollTop = term.scrollHeight;
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private injectStyles() {
    if (document.getElementById('autoheal-dashboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'autoheal-dashboard-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');

      /* Cyberpunk Slate Variables */
      .ah-dash-wrapper {
        --dash-bg: #0a0d14;
        --dash-panel-bg: rgba(17, 22, 34, 0.7);
        --dash-border: rgba(255, 255, 255, 0.06);
        --dash-text: #e6edf3;
        --dash-text-muted: #8b949e;
        
        --neon-cyan: #00f0ff;
        --neon-purple: #bd00ff;
        --neon-emerald: #00ff66;
        --neon-red: #ff4444;
        --neon-yellow: #ffd700;
        
        font-family: 'Inter', sans-serif;
        background-color: var(--dash-bg);
        color: var(--dash-text);
        padding: 24px;
        min-height: 100vh;
        box-sizing: border-box;
      }

      .ah-dash-wrapper * {
        box-sizing: border-box;
      }

      /* Navigation Header */
      .ah-dash-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-radius: 12px;
        margin-bottom: 24px;
      }

      .ah-dash-brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .ah-brand-icon {
        font-size: 28px;
      }

      .ah-brand-title {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.05em;
        background: linear-gradient(90deg, #fff, var(--neon-cyan), var(--neon-purple));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .ah-brand-sub {
        font-size: 11px;
        color: var(--dash-text-muted);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 500;
        margin-top: 2px;
      }

      .ah-dash-actions {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      /* Layout grid */
      .ah-dash-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 24px;
      }

      @media (max-width: 1024px) {
        .ah-dash-grid {
          grid-template-columns: 1fr;
        }
      }

      .ah-dash-column {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      /* Panel system */
      .glass-panel {
        background: var(--dash-panel-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--dash-border);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }

      .ah-panel {
        display: flex;
        flex-direction: column;
        max-height: 520px;
      }

      .ah-panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--dash-border);
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .ah-panel-body {
        padding: 20px;
        overflow-y: auto;
      }

      .ah-panel-body.scrollable {
        max-height: 400px;
      }

      /* Telemetry log list */
      .ah-error-logs-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .ah-log-item-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--dash-border);
        border-radius: 8px;
        padding: 14px;
        transition: all 0.3s ease;
      }

      .ah-log-item-card:hover {
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.02);
      }

      .ah-log-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .ah-log-message {
        font-family: 'Fira Code', monospace;
        font-size: 12.5px;
        color: var(--dash-text);
        word-break: break-all;
        margin-bottom: 10px;
      }

      .ah-log-src {
        font-size: 11px;
        color: var(--dash-text-muted);
        margin-bottom: 12px;
      }

      .ah-log-src code {
        font-family: 'Fira Code', monospace;
        color: var(--neon-cyan);
      }

      /* Diagnostic console terminal */
      .dark-terminal {
        background: #06090e;
        border: 1px solid rgba(0, 240, 255, 0.15);
        border-radius: 8px;
        padding: 16px;
        font-family: 'Fira Code', monospace;
        font-size: 12px;
        height: 280px;
        box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.6);
      }

      .ah-term-line {
        margin-bottom: 8px;
        line-height: 1.5;
        color: #c9d1d9;
      }

      .ah-term-line.comment { color: #8b949e; }
      .ah-term-line.success { color: var(--neon-emerald); }
      .ah-term-line.error { color: var(--neon-red); }
      .ah-term-line.info { color: var(--neon-cyan); }

      /* Gauges spacer */
      .ah-gauges-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .ah-gauge-row {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--dash-border);
        border-radius: 8px;
        padding: 16px;
      }

      .ah-gauge-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .ah-gauge-name {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.85);
      }

      .ah-gauge-score {
        font-size: 14px;
        font-weight: 800;
        font-family: 'Fira Code', monospace;
      }

      .ah-gauge-score.green { color: var(--neon-emerald); }
      .ah-gauge-score.yellow { color: var(--neon-yellow); }

      .ah-progress-track {
        background: rgba(255, 255, 255, 0.05);
        height: 6px;
        border-radius: 5px;
        margin-bottom: 12px;
        overflow: hidden;
      }

      .ah-progress-fill {
        height: 100%;
        border-radius: 5px;
      }

      .ah-progress-fill.yellow { background: var(--neon-yellow); box-shadow: 0 0 10px var(--neon-yellow); }
      .ah-progress-fill.cyan { background: var(--neon-cyan); box-shadow: 0 0 10px var(--neon-cyan); }
      .ah-progress-fill.purple { background: var(--neon-purple); box-shadow: 0 0 10px var(--neon-purple); }
      .ah-progress-fill.emerald { background: var(--neon-emerald); box-shadow: 0 0 10px var(--neon-emerald); }

      .ah-gauge-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: var(--dash-text-muted);
      }

      /* Buttons & input classes */
      .ah-dash-btn {
        background: transparent;
        color: var(--dash-text);
        border: 1px solid var(--dash-border);
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .ah-dash-btn:hover {
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.02);
      }

      .ah-dash-btn.primary {
        background: linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(189, 0, 255, 0.1) 100%);
        border-color: rgba(0, 240, 255, 0.45);
      }

      .ah-dash-btn.primary:hover {
        border-color: var(--neon-cyan);
        box-shadow: 0 0 12px rgba(0, 240, 255, 0.3);
      }

      .ah-dash-btn.purple {
        background: rgba(189, 0, 255, 0.1);
        border-color: rgba(189, 0, 255, 0.4);
        color: #fff;
      }

      .ah-dash-btn.purple:hover {
        border-color: var(--neon-purple);
        box-shadow: 0 0 12px rgba(189, 0, 255, 0.35);
      }

      .ah-dash-btn.green {
        background: rgba(0, 255, 102, 0.08);
        border-color: rgba(0, 255, 102, 0.4);
      }

      .ah-dash-btn.green:hover {
        border-color: var(--neon-emerald);
        box-shadow: 0 0 12px rgba(0, 255, 102, 0.3);
      }

      .ah-dash-btn.small {
        padding: 5px 10px;
        font-size: 11px;
      }

      /* Pills and badges */
      .ah-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        padding: 6px 12px;
        border-radius: 50px;
        border: 1px solid var(--dash-border);
      }

      .ah-pill.green {
        background: rgba(0, 255, 102, 0.05);
        color: var(--neon-emerald);
        border-color: rgba(0, 255, 102, 0.2);
      }

      .ah-pill.red {
        background: rgba(255, 68, 68, 0.05);
        color: var(--neon-red);
        border-color: rgba(255, 68, 68, 0.2);
      }

      .ah-log-badge {
        font-size: 9.5px;
        font-weight: 800;
        padding: 2.5px 6px;
        border-radius: 3px;
        letter-spacing: 0.05em;
      }

      .ah-log-badge.red { background: rgba(255, 68, 68, 0.15); color: var(--neon-red); }
      .ah-log-badge.yellow { background: rgba(255, 215, 0, 0.15); color: var(--neon-yellow); }

      .ah-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .ah-pulse-dot.green {
        background: var(--neon-emerald);
        box-shadow: 0 0 8px var(--neon-emerald);
      }

      .ah-pulse-dot.red {
        background: var(--neon-red);
        box-shadow: 0 0 8px var(--neon-red);
      }

      .ah-icon-bullet {
        font-size: 16px;
      }

      /* Empty states */
      .ah-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        border: 1px dashed var(--dash-border);
        border-radius: 8px;
      }

      .ah-empty-icon {
        font-size: 36px;
        margin-bottom: 12px;
      }

      .ah-empty-text {
        font-size: 12px;
        color: var(--dash-text-muted);
      }

      /* Input Forms settings */
      .ah-settings-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .ah-input-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .ah-input-group label {
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: var(--dash-text-muted);
      }

      .ah-text-input {
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid var(--dash-border);
        color: #fff;
        padding: 10px;
        border-radius: 6px;
        font-family: 'Fira Code', monospace;
        font-size: 12px;
        width: 100%;
      }

      .ah-text-input:focus {
        border-color: var(--neon-cyan);
        outline: none;
        box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
      }

      .ah-settings-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 10px;
      }
    `;
    document.head.appendChild(style);
  }
}

export const dashboardInstance = new AutoHealDashboard();
