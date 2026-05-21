import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://autoheal-4p4q.onrender.com';

// ─── HOW IT WORKS STEPS ─────────────────────────────────────────────────────
const STEPS = [
  {
    icon: '📋',
    num: '01',
    title: 'Register Your Site',
    desc: 'Enter your project name below. We instantly register your site on the AutoHeal Master Server and generate a unique Site ID for you.',
    color: '#6366f1',
  },
  {
    icon: '🔧',
    num: '02',
    title: 'Run the CLI Setup',
    desc: 'Run one command in your project terminal. The wizard connects your GitHub repo, Vercel deploy hook, and N8N automation in under 2 minutes.',
    color: '#a855f7',
    code: 'npx @autoheal/setup',
  },
  {
    icon: '📌',
    num: '03',
    title: 'Paste the Snippet',
    desc: 'Copy the two-line script snippet and paste it into the <head> of your website. No build tools, no npm install required.',
    color: '#06b6d4',
  },
  {
    icon: '🤖',
    num: '04',
    title: 'AI Auto-Heals Your Site',
    desc: 'AutoHeal monitors your site 24/7. When an error is detected, the AI writes a fix, commits it to GitHub, and Vercel auto-deploys it — all automatically.',
    color: '#22c55e',
  },
];

// ─── FEATURE CARDS ───────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '⚡', title: 'Zero-Config Widget', desc: 'Two script tags. That\'s it. Works on any HTML site, React, Vue, Angular — no bundler needed.' },
  { icon: '🧠', title: 'Gemini AI Engine', desc: 'Google Gemini reads your error stack trace and writes a surgical code patch in seconds.' },
  { icon: '🔁', title: 'Auto Git + Deploy', desc: 'Every fix is committed to your GitHub repo and Vercel auto-deploys it. Your site heals itself live.' },
  { icon: '🛡️', title: 'Crash Protection', desc: 'Runtime crashes, console errors, failed assets, broken promises — all intercepted and healed.' },
  { icon: '📊', title: 'Error Dashboard', desc: 'Real-time telemetry of all captured errors with timestamps, stack traces, and healing status.' },
  { icon: '🔒', title: 'Credentials Stay Private', desc: 'Your GitHub token never touches the browser. Stored securely on your private Master Server only.' },
];

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [siteId, setSiteId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const fixes   = useCounter(12847);
  const uptime  = useCounter(99);
  const sites   = useCounter(340);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % STEPS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const snippet = `<script>
  window.AUTOHEAL_SITE_ID = "${siteId || 'your-project-name'}";
  window.AUTOHEAL_ENDPOINT = "${BACKEND_URL}";
</script>
<script src="${BACKEND_URL}/sdk/autoheal.js"></script>`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-site-id': siteId },
        body: JSON.stringify({ settings: {} }),
      });
      setIsSuccess(true);
    } catch {
      alert('Failed to connect to Master Server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page">
      {/* ── BACKGROUND ── */}
      <div className="bg-orb orb1" />
      <div className="bg-orb orb2" />
      <div className="bg-orb orb3" />

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo">
            <span className="logo-icon">🩺</span>
            <span className="logo-text">AutoHeal</span>
            <span className="logo-badge">AI</span>
          </div>
          <div className="nav-links">
            <a href="#how-it-works">How it Works</a>
            <a href="#features">Features</a>
            <a href="#get-started" className="nav-cta">Get Started →</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="eyebrow-dot" />
          Powered by Google Gemini AI
        </div>
        <h1 className="hero-title">
          Your Website<br />
          <span className="grad">Heals Itself.</span>
        </h1>
        <p className="hero-sub">
          AutoHeal detects runtime crashes, console errors, and broken assets on your live website — 
          then uses AI to write the fix, push it to GitHub, and auto-deploy via Vercel. 
          <strong> Fully automated. Zero downtime.</strong>
        </p>
        <div className="hero-actions">
          <a href="#get-started" className="btn-hero-primary">Get Started Free →</a>
          <a href="#how-it-works" className="btn-hero-ghost">See How It Works</a>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-num">{fixes.toLocaleString()}+</div>
            <div className="stat-label">Bugs Auto-Fixed</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-num">{uptime}%</div>
            <div className="stat-label">Uptime Guaranteed</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-num">{sites}+</div>
            <div className="stat-label">Sites Protected</div>
          </div>
        </div>

        {/* Widget preview mockup */}
        <div className="widget-mockup">
          <div className="mockup-browser">
            <div className="browser-bar">
              <div className="browser-dots">
                <span /><span /><span />
              </div>
              <div className="browser-url">https://your-website.vercel.app</div>
            </div>
            <div className="browser-body">
              <div className="site-preview">
                <div className="site-skeleton sk1" />
                <div className="site-skeleton sk2" />
                <div className="site-skeleton sk3" />
              </div>
              <div className="ah-badge-demo">
                <span>🩺</span>
                <div>
                  <div className="badge-demo-title">Error Caught &amp; Healed</div>
                  <div className="badge-demo-sub">AI patch deployed ✓</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" id="how-it-works">
        <div className="section-inner">
          <div className="section-eyebrow">Simple Setup</div>
          <h2 className="section-title">How AutoHeal Works</h2>
          <p className="section-sub">From zero to self-healing website in under 5 minutes.</p>

          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`step-card ${activeStep === i ? 'step-active' : ''}`}
                onClick={() => setActiveStep(i)}
                style={{ '--step-color': step.color } as React.CSSProperties}
              >
                <div className="step-num" style={{ color: step.color }}>{step.num}</div>
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                {step.code && (
                  <div className="step-code">
                    <code>{step.code}</code>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Flow arrows on desktop */}
          <div className="flow-line">
            <div className="flow-progress" style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section section-dark" id="features">
        <div className="section-inner">
          <div className="section-eyebrow">Everything Included</div>
          <h2 className="section-title">Built for Real Production Sites</h2>
          <p className="section-sub">Not just a logger. AutoHeal is a full AI repair pipeline.</p>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GET STARTED ── */}
      <section className="section" id="get-started">
        <div className="section-inner">
          <div className="section-eyebrow">Step 1 of 4</div>
          <h2 className="section-title">Register Your Site</h2>
          <p className="section-sub">Enter a unique name for your project. This becomes your Site ID.</p>

          <div className="onboard-layout">
            {/* Left: Form */}
            <div className="glass-card onboard-card">
              {!isSuccess ? (
                <>
                  <div className="card-header">
                    <div className="card-header-icon">🚀</div>
                    <div>
                      <h3 className="card-title">Create Your Project</h3>
                      <p className="card-subtitle">Free forever. No credit card required.</p>
                    </div>
                  </div>
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label htmlFor="site-id-input">Project Name (Site ID)</label>
                      <input
                        id="site-id-input"
                        type="text"
                        className="glass-input"
                        placeholder="e.g. my-awesome-startup"
                        value={siteId}
                        onChange={e => setSiteId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        required
                        pattern="[a-z0-9\-]+"
                        title="Lowercase letters, numbers, and hyphens only"
                      />
                      <span className="input-hint">Lowercase letters, numbers, hyphens only</span>
                    </div>
                    <button type="submit" className="btn-primary" id="register-btn" disabled={isLoading}>
                      {isLoading ? (
                        <><span className="btn-spinner" /> Registering on Master Server...</>
                      ) : (
                        <>Register Project &amp; Get Snippet →</>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="success-panel">
                  <div className="success-check">✓</div>
                  <h3 className="card-title">"{siteId}" is Registered!</h3>
                  <p className="success-sub">Copy this snippet and paste it into the <code>&lt;head&gt;</code> of your website:</p>

                  <div className="code-block">
                    <div className="code-header">
                      <span className="code-lang">HTML</span>
                      <button className="copy-btn" id="copy-snippet-btn" onClick={handleCopy}>
                        {copied ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    <pre className="code-pre"><code>{snippet}</code></pre>
                  </div>

                  <div className="next-steps">
                    <h4>Next Steps:</h4>
                    <div className="next-step-item">
                      <span className="ns-num">2</span>
                      <div>
                        <strong>Run the CLI</strong>
                        <p>In your project folder, run: <code className="inline-code">npx @autoheal/setup</code></p>
                      </div>
                    </div>
                    <div className="next-step-item">
                      <span className="ns-num">3</span>
                      <div>
                        <strong>Paste &amp; Deploy</strong>
                        <p>Paste the snippet above into your HTML <code className="inline-code">&lt;head&gt;</code>, push &amp; deploy.</p>
                      </div>
                    </div>
                    <div className="next-step-item">
                      <span className="ns-num">4</span>
                      <div>
                        <strong>Watch It Self-Heal</strong>
                        <p>Break something intentionally. Watch AutoHeal fix and redeploy it automatically! 🤖</p>
                      </div>
                    </div>
                  </div>

                  <button className="btn-secondary" id="register-another-btn" onClick={() => { setIsSuccess(false); setSiteId(''); }}>
                    ← Register Another Project
                  </button>
                </div>
              )}
            </div>

            {/* Right: Mini how-to panel */}
            <div className="onboard-info">
              <div className="info-card">
                <div className="info-icon">🖥️</div>
                <h4>What happens when you register?</h4>
                <ul className="info-list">
                  <li>✓ Your Site ID is created on the AutoHeal Master Server</li>
                  <li>✓ A unique config slot is reserved for your credentials</li>
                  <li>✓ You get a ready-to-paste script snippet</li>
                  <li>✓ The AI healing engine is activated for your site</li>
                </ul>
              </div>
              <div className="info-card">
                <div className="info-icon">🔐</div>
                <h4>Privacy &amp; Security</h4>
                <ul className="info-list">
                  <li>✓ Your GitHub token is never stored in the browser</li>
                  <li>✓ Credentials synced via encrypted CLI, not the web</li>
                  <li>✓ Each site is completely isolated in its own namespace</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <span>🩺</span> AutoHeal
          </div>
          <p className="footer-sub">The world's first AI-powered self-healing website platform.</p>
          <p className="footer-copy">Built with ❤️ using Gemini AI, GitHub, N8N &amp; Vercel</p>
        </div>
      </footer>
    </div>
  );
}
