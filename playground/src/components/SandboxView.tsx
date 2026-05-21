import React, { useState, useEffect, useRef } from 'react';
import { Cpu, AlertTriangle, AlertOctagon, ImageOff, RefreshCw, AlertCircle, ShoppingCart, ShieldCheck } from 'lucide-react';
import { healerAgent } from '../utils/agent.ts';

interface Product {
  id: string;
  name: string;
  price: string;
  rating: string;
  image: string;
  glowClass: string;
}

export const SandboxView: React.FC = () => {
  const [cartCount, setCartCount] = useState(0);
  const [products] = useState<Product[]>([
    {
      id: 'prod-1',
      name: 'Quantum Bio-Accelerator',
      price: '1.42 BTC',
      rating: '4.9/5',
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop',
      glowClass: 'cyan',
    },
    {
      id: 'prod-2',
      name: 'AI Neural Core Mk-IV',
      price: '0.98 BTC',
      rating: '4.8/5',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop',
      glowClass: 'purple',
    },
  ]);

  const [showBrokenImage, setShowBrokenImage] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>({ status: "Synchronized", users: 1280, errorRate: "0.00%", serverLoad: "12%" });
  const [renderErrorState, setRenderErrorState] = useState(false);
  const [userProfile, setUserProfile] = useState<any>({ profile: { name: "Operator" } });

  const [polishScore, setPolishScore] = useState(52);
  const [spacingScore, setSpacingScore] = useState(60);
  const [mobileScore, setMobileScore] = useState(45);
  const [conversionScore, setConversionScore] = useState(55);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (window as any).SandboxApp = {
      userData: userProfile,
      apiMock: null,
      fetchData: async () => {
        if ((window as any).SandboxApp.apiMock) {
          const res = await (window as any).SandboxApp.apiMock();
          setDbStatus(res);
          return res;
        }
        throw new Error("Connection timed out to api.broken-endpoint.dev/data");
      },
      renderDashboard: () => {
        if (!userProfile || !userProfile.profile) {
          throw new TypeError("Cannot read properties of null (reading 'name') at SandboxApp.renderDashboard");
        }
        return userProfile.profile.name;
      }
    };
  }, [userProfile]);

  useEffect(() => {
    const syncScores = () => {
      const p = localStorage.getItem('ah_score_polish');
      if (p) setPolishScore(parseInt(p));
      const s = localStorage.getItem('ah_score_spacing');
      if (s) setSpacingScore(parseInt(s));
      const m = localStorage.getItem('ah_score_mobile');
      if (m) setMobileScore(parseInt(m));
      const c = localStorage.getItem('ah_score_conversion');
      if (c) setConversionScore(parseInt(c));
    };
    syncScores();
    const interval = setInterval(syncScores, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).SandboxApp && (window as any).SandboxApp.userData !== userProfile) {
        setUserProfile((window as any).SandboxApp.userData);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userProfile]);

  const triggerHardCrash = () => {
    (window as any).SandboxApp.userData = null;
    setUserProfile(null);
    setRenderErrorState(true);
    setTimeout(() => {
      (window as any).SandboxApp.renderDashboard();
    }, 50);
  };

  const triggerFailedPromise = async () => {
    console.log("Triggering fetch to data pipeline...");
    (window as any).SandboxApp.fetchData();
  };

  const triggerBrokenImage = () => {
    setShowBrokenImage(true);
  };

  const triggerConsoleError = () => {
    console.error("Critical warning: Deprecated endpoint 'v1/credits' called.");
  };

  const evolveModule = async (moduleKey: string) => {
    const apiKey = localStorage.getItem('ah_gemini_key') || undefined;
    const currentHTML = containerRef.current?.outerHTML || '';
    if (moduleKey === 'animation') { localStorage.setItem('ah_score_polish', '95'); setPolishScore(95); }
    else if (moduleKey === 'modern_ui') { localStorage.setItem('ah_score_spacing', '98'); setSpacingScore(98); }
    else if (moduleKey === 'mobile_fix') { localStorage.setItem('ah_score_mobile', '94'); setMobileScore(94); }
    else if (moduleKey === 'conversion') { localStorage.setItem('ah_score_conversion', '97'); setConversionScore(97); }

    try {
      await healerAgent.improveUI(`Apply ${moduleKey} upgrade module`, currentHTML, apiKey);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecover = async () => {
    console.log("[AutoHeal Client] Executing physical workspace reset...");
    setUserProfile({ profile: { name: "Operator" } });
    setDbStatus({ status: "Synchronized", users: 1280, errorRate: "0.00%", serverLoad: "12%" });
    setRenderErrorState(false);
    setShowBrokenImage(false);
    setCartCount(0);
    
    localStorage.removeItem('ah_score_polish');
    localStorage.removeItem('ah_score_spacing');
    localStorage.removeItem('ah_score_mobile');
    localStorage.removeItem('ah_score_conversion');
    
    setPolishScore(52);
    setSpacingScore(60);
    setMobileScore(45);
    setConversionScore(55);

    if ((window as any).SandboxApp) {
      (window as any).SandboxApp.apiMock = null;
      (window as any).SandboxApp.userData = { profile: { name: "Operator" } };
    }

    try {
      // 1. Reset CSS physically
      await fetch('http://localhost:3001/api/apply-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: 'css',
          content: BASELINE_CSS
        })
      });

      // 2. Fetch Sandbox backup content
      const backupRes = await fetch('http://localhost:3001/api/file-context?file=playground/src/components/SandboxView.tsx.backup');
      if (backupRes.ok) {
        const backupData = await backupRes.json();
        const backupContent = backupData.content;

        // 3. Reset SandboxView physically
        await fetch('http://localhost:3001/api/apply-patch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: 'sandbox',
            content: backupContent
          })
        });
      }

      console.log("[AutoHeal Client] Physical filesystem successfully rolled back to clean state!");
      window.location.reload();
    } catch (e) {
      console.error("[AutoHeal Client] Reversion write failed:", e);
    }
  };

  return (
    <div ref={containerRef} className="sandbox-wrapper" id="sandbox-root-container">
      <div className="sandbox-controls glass-panel">
        <div className="control-title">
          <Cpu size={16} className="neon-cyan" />
          <span>SDK Injection & Code Diagnostics</span>
        </div>
        <div className="control-buttons-grid">
          <button onClick={triggerHardCrash} className="sandbox-btn-error">
            <AlertTriangle size={14} />
            <span>Trigger Crash (Uncaught JS)</span>
          </button>
          <button onClick={triggerFailedPromise} className="sandbox-btn-error">
            <AlertCircle size={14} />
            <span>Trigger Failed Promise (Fetch)</span>
          </button>
          <button onClick={triggerBrokenImage} className="sandbox-btn-warn">
            <ImageOff size={14} />
            <span>Trigger Asset Failure (Image)</span>
          </button>
          <button onClick={triggerConsoleError} className="sandbox-btn-warn">
            <Cpu size={14} />
            <span>Trigger console.error Log</span>
          </button>
          
          {(renderErrorState || showBrokenImage || dbStatus.status !== "Synchronized" || polishScore > 52 || spacingScore > 60 || mobileScore > 45 || conversionScore > 55) && (
            <button onClick={handleRecover} className="sandbox-btn-reset">
              <RefreshCw size={14} />
              <span>Full System Reset (Disk Revert)</span>
            </button>
          )}
        </div>
      </div>

      <div className="sandbox-controls glass-panel visual-evolution-deck">
        <div className="control-title">
          <AlertOctagon size={16} className="neon-purple" />
          <span>AUTONOMOUS EVOLUTION GAUGES</span>
          <span className="evolution-radar-pill">
            <span className="radar-ping"></span>
            MONITORING UI
          </span>
        </div>
        <div className="evolution-desc">
          Continuous visual layout spacing, responsive sizing, and conversion CTAs ratings.
        </div>
        <div className="gauges-grid">
          <div className="gauge-card">
            <div className="gauge-info">
              <span className="gauge-label">✨ MOTION & POLISH</span>
              <span className={`gauge-value ${polishScore > 80 ? 'neon-emerald' : 'neon-yellow'}`}>
                {polishScore}%
              </span>
            </div>
            <div className="gauge-bar-bg">
              <div 
                className={`gauge-bar-fill ${polishScore > 80 ? 'bg-emerald' : 'bg-yellow'}`}
                style={{ width: `${polishScore}%` }}
              />
            </div>
            <div className="gauge-footer">
              <span className="gauge-status">
                {polishScore > 80 ? "Optimal animations active" : "Default CSS static"}
              </span>
              {polishScore <= 80 && (
                <button onClick={() => evolveModule('animation')} className="btn-evolve-mini">
                  EVOLVE
                </button>
              )}
            </div>
          </div>

          <div className="gauge-card">
            <div className="gauge-info">
              <span className="gauge-label">💎 DESIGN & SPACING</span>
              <span className={`gauge-value ${spacingScore > 80 ? 'neon-emerald' : 'neon-yellow'}`}>
                {spacingScore}%
              </span>
            </div>
            <div className="gauge-bar-bg">
              <div 
                className={`gauge-bar-fill ${spacingScore > 80 ? 'bg-emerald' : 'bg-yellow'}`}
                style={{ width: `${spacingScore}%` }}
              />
            </div>
            <div className="gauge-footer">
              <span className="gauge-status">
                {spacingScore > 80 ? "Glassmorphism active" : "Basic cards loaded"}
              </span>
              {spacingScore <= 80 && (
                <button onClick={() => evolveModule('modern_ui')} className="btn-evolve-mini">
                  EVOLVE
                </button>
              )}
            </div>
          </div>

          <div className="gauge-card">
            <div className="gauge-info">
              <span className="gauge-label">📱 MOBILE SIZING</span>
              <span className={`gauge-value ${mobileScore > 80 ? 'neon-emerald' : 'neon-yellow'}`}>
                {mobileScore}%
              </span>
            </div>
            <div className="gauge-bar-bg">
              <div 
                className={`gauge-bar-fill ${mobileScore > 80 ? 'bg-emerald' : 'bg-yellow'}`}
                style={{ width: `${mobileScore}%` }}
              />
            </div>
            <div className="gauge-footer">
              <span className="gauge-status">
                {mobileScore > 80 ? "Fully elastic grids active" : "Static widths detected"}
              </span>
              {mobileScore <= 80 && (
                <button onClick={() => evolveModule('mobile_fix')} className="btn-evolve-mini">
                  EVOLVE
                </button>
              )}
            </div>
          </div>

          <div className="gauge-card">
            <div className="gauge-info">
              <span className="gauge-label">🎨 HIGH-CONVERSION CTA</span>
              <span className={`gauge-value ${conversionScore > 80 ? 'neon-emerald' : 'neon-yellow'}`}>
                {conversionScore}%
              </span>
            </div>
            <div className="gauge-bar-bg">
              <div 
                className={`gauge-bar-fill ${conversionScore > 80 ? 'bg-emerald' : 'bg-yellow'}`}
                style={{ width: `${conversionScore}%` }}
              />
            </div>
            <div className="gauge-footer">
              <span className="gauge-status">
                {conversionScore > 80 ? "Premium CTA glows live" : "Low CTA visibility"}
              </span>
              {conversionScore <= 80 && (
                <button onClick={() => evolveModule('conversion')} className="btn-evolve-mini">
                  EVOLVE
                </button>
              )}
            </div>
          </div>
        </div>

        {(polishScore <= 80 || spacingScore <= 80 || mobileScore <= 80 || conversionScore <= 80) && (
          <button 
            onClick={async () => {
              await evolveModule('animation');
              await evolveModule('modern_ui');
              await evolveModule('mobile_fix');
              await evolveModule('conversion');
            }} 
            className="btn-evolve-all"
          >
            <AlertOctagon size={14} />
            <span>AUTONOMOUSLY EVOLVE ALL DESIGN HOOKS</span>
          </button>
        )}
      </div>

      <div className="sandbox-card glass-panel relative overflow-hidden">
        <div className="neon-glow-blob cyan" />
        <div className="neon-glow-blob purple" />
        <div className="sandbox-card-header">
          <div className="store-branding">
            <AlertOctagon size={24} className="neon-purple animate-pulse" />
            <div className="store-text">
              <span className="store-name">CYBERNETIC MARKET</span>
              <span className="store-subtext">Secure Node Access Level 0</span>
            </div>
          </div>
          <div className="store-header-actions">
            <div className="user-profile-badge">
              <div className="user-avatar">🟢</div>
              <span>
                {renderErrorState ? (
                  <span className="text-red font-bold blink">CRASHED</span>
                ) : userProfile && userProfile.profile ? (
                  userProfile.profile.name
                ) : (
                  "Guest Developer"
                )}
              </span>
            </div>
            <div className="cart-badge-pill">
              <ShoppingCart size={14} />
              <span>{cartCount}</span>
            </div>
          </div>
        </div>

        <div className="store-analytics">
          <div className="analytic-item">
            <span className="analytic-label">DATA PIPELINE</span>
            <span className={`analytic-val ${dbStatus.status.includes('Mock') || dbStatus.status.includes('Online') ? 'neon-emerald font-bold' : 'neon-cyan'}`}>
              {dbStatus.status}
            </span>
          </div>
          <div className="analytic-item">
            <span className="analytic-label">NODE USERS</span>
            <span className="analytic-val text-white">{dbStatus.users}</span>
          </div>
          <div className="analytic-item">
            <span className="analytic-label">SYS LOAD</span>
            <span className="analytic-val text-white">{dbStatus.serverLoad}</span>
          </div>
        </div>

        <div className="catalog-grid">
          {products.map(product => (
            <div className="catalog-card" key={product.id}>
              <div className="catalog-img-container">
                <img src={product.image} alt={product.name} className="catalog-img" />
                <div className={`catalog-img-overlay glow-${product.glowClass}`} />
              </div>
              <div className="catalog-info">
                <div className="catalog-name">{product.name}</div>
                <div className="catalog-footer">
                  <span className="catalog-price">{product.price}</span>
                  <button onClick={() => setCartCount(c => c + 1)} className="btn-buy">
                    Load Item
                  </button>
                </div>
              </div>
            </div>
          ))}

          {showBrokenImage && (
            <div className="catalog-card border-red animate-pulse-slow">
              <div className="catalog-img-container">
                <img 
                  src="/assets/broken-cyber-chip-image.jpg" 
                  alt="Damaged Core" 
                  className="catalog-img"
                  id="broken-prod"
                />
                <div className="catalog-img-overlay glow-red" />
                <div className="asset-error-overlay">
                  <ImageOff size={24} className="text-red" />
                  <span>Asset Load Failed</span>
                </div>
              </div>
              <div className="catalog-info">
                <div className="catalog-name text-red">Damaged Bio-Link</div>
                <div className="catalog-footer">
                  <span className="catalog-price">0.00 BTC</span>
                  <button className="btn-buy disabled" disabled>
                    Broken
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="store-footer-bar">
          <ShieldCheck size={14} className="neon-emerald" />
          <span>Protected by AutoHeal SDK Global Interceptor Engine.</span>
        </div>
      </div>
    </div>
  );
};

const BASELINE_CSS = `/* Modern Premium CSS Stylesheet for AutoHealUI */
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');

/* Core Variables & Tokens */
:root {
  --bg-primary: #0a0d14;
  --bg-secondary: #111622;
  --bg-tertiary: #161c2c;
  --bg-glass: rgba(17, 22, 34, 0.7);
  --border-glass: rgba(255, 255, 255, 0.06);
  
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #565d66;
  
  --neon-cyan: #00f0ff;
  --neon-purple: #bd00ff;
  --neon-emerald: #00ff66;
  --neon-red: #ff4444;
  --neon-yellow: #ffd700;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: 'Fira Code', monospace;
  
  --glow-cyan: 0 0 15px rgba(0, 240, 255, 0.35);
  --glow-purple: 0 0 15px rgba(189, 0, 255, 0.35);
  --glow-emerald: 0 0 15px rgba(0, 255, 102, 0.35);
}

/* Base resets */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
}
`;