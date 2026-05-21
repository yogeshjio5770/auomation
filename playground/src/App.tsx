import React, { useEffect, useState } from 'react';
import { Cpu, Shield } from 'lucide-react';
import { ControlPanel } from './components/ControlPanel';
import { MainDashboard } from './components/MainDashboard';
import { healerAgent } from './utils/agent.ts';

// AutoHeal SDK is injected via <script src=".../sdk/autoheal.js"> in index.html
// Access it through the global window.AutoHeal object
declare const window: Window & { AutoHeal?: any };

export const App: React.FC = () => {
  const [configVersion, setConfigVersion] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('ah_groq_key')) {
      localStorage.setItem('ah_groq_key', 'YOUR_GROQ_API_KEY');
    }
    if (!localStorage.getItem('ah_model_provider')) {
      localStorage.setItem('ah_model_provider', 'groq');
    }
  }, []);

  useEffect(() => {
    const web3FormsKey = localStorage.getItem('ah_web3forms_key') || '';
    const devEmail = localStorage.getItem('ah_dev_email') || '';

    window.AutoHeal?.init({
      email: {
        accessKey: web3FormsKey || undefined,
        devEmail: devEmail || undefined,
        enabled: !!(web3FormsKey && devEmail),
      },
      autoHealEnabled: true,
      onHealRequest: async (error: any) => {
        const currentGeminiKey = localStorage.getItem('ah_gemini_key') || undefined;
        const result = await healerAgent.healError(error, currentGeminiKey);
        if (result.success && result.patchCode) {
          try {
            const script = document.createElement('script');
            script.textContent = `try { ${result.patchCode} } catch(e) { console.error("Patch failed:", e); }`;
            document.body.appendChild(script);
            script.remove();
          } catch (e) {
            console.error('Patch injection failed:', e);
          }
        }
        return { success: result.success, diffCode: result.diffCode };
      }
    });

    return () => { window.AutoHeal?.shutdown(); };
  }, [configVersion]);

  const handleConfigChange = () => {
    window.AutoHeal?.shutdown();
    setConfigVersion(prev => prev + 1);
  };

  return (
    <div className="autoheal-app">
      <header className="app-header glass-panel">
        <div className="header-logo">
          <div className="logo-neon-box">
            <Cpu size={20} className="neon-cyan" />
          </div>
          <div className="logo-brand">
            <span className="brand-main">AUTOHEAL</span>
            <span className="brand-sub">AUTONOMOUS WEBSITE EVOLUTION AI</span>
          </div>
        </div>

        <div className="header-center">
          <div className="sdk-status-pill">
            <Shield size={13} className="neon-emerald" />
            <span>SDK ACTIVE — AUTO MONITORING</span>
            <span className="pulse-dot" />
          </div>
        </div>

        <div className="header-actions">
          <ControlPanel onConfigChange={handleConfigChange} />
        </div>
      </header>

      <main className="app-main">
        <MainDashboard />
      </main>
    </div>
  );
};

export default App;
