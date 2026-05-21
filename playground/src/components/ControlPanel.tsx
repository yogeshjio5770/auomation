import React, { useState, useEffect } from 'react';
import { Settings, Key, Mail, ShieldAlert, Sparkles, Cpu, Github, Webhook, Globe } from 'lucide-react';

interface ControlPanelProps {
  onConfigChange: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onConfigChange }) => {
  const [isOpen, setIsOpen]                   = useState(false);
  const [activeTab, setActiveTab]             = useState<'ai' | 'git' | 'email'>('ai');
  const [modelProvider, setModelProvider]     = useState('groq');
  const [geminiKey, setGeminiKey]             = useState('');
  const [groqKey, setGroqKey]                 = useState('');
  const [web3FormsKey, setWeb3FormsKey]       = useState('');
  const [devEmail, setDevEmail]               = useState('');
  const [n8nWebhook, setN8nWebhook]           = useState('');
  const [vercelDeployHook, setVercelDeployHook] = useState('');
  const [githubRepo, setGithubRepo]           = useState('');
  const [githubToken, setGithubToken]         = useState('');
  const [githubBranch, setGithubBranch]       = useState('main');
  const [backendUrl, setBackendUrl]           = useState('http://localhost:3001');
  const [isSaved, setIsSaved]                 = useState(false);

  useEffect(() => {
    setModelProvider(localStorage.getItem('ah_model_provider') || 'groq');
    setGeminiKey(localStorage.getItem('ah_gemini_key') || '');
    setGroqKey(localStorage.getItem('ah_groq_key') || '');
    setWeb3FormsKey(localStorage.getItem('ah_web3forms_key') || '');
    setDevEmail(localStorage.getItem('ah_dev_email') || '');
    setN8nWebhook(localStorage.getItem('ah_n8n_webhook') || '');
    setVercelDeployHook(localStorage.getItem('ah_vercel_hook') || '');
    setGithubRepo(localStorage.getItem('ah_github_repo') || '');
    setGithubToken(localStorage.getItem('ah_github_token') || '');
    setGithubBranch(localStorage.getItem('ah_github_branch') || 'main');

    const backend = localStorage.getItem('ah_backend_url') || 'http://localhost:3001';
    setBackendUrl(backend);

    // Also sync from server DB
    fetch(`${backend}/api/settings`, {
      headers: { 'x-site-id': window.location.host },
    })
      .then(r => r.json())
      .then(({ settings }) => {
        if (!settings) return;
        if (settings.n8nWebhook)       setN8nWebhook(settings.n8nWebhook);
        if (settings.vercelDeployHook) setVercelDeployHook(settings.vercelDeployHook);
        if (settings.githubRepo)       setGithubRepo(settings.githubRepo);
        if (settings.githubToken)      setGithubToken(settings.githubToken);
        if (settings.githubBranch)     setGithubBranch(settings.githubBranch);
        if (settings.groqKey)          setGroqKey(settings.groqKey);
        if (settings.geminiKey)        setGeminiKey(settings.geminiKey);
        if (settings.modelProvider)    setModelProvider(settings.modelProvider);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Save to localStorage
    localStorage.setItem('ah_model_provider', modelProvider);
    localStorage.setItem('ah_gemini_key',     geminiKey.trim());
    localStorage.setItem('ah_groq_key',        groqKey.trim());
    localStorage.setItem('ah_web3forms_key',   web3FormsKey.trim());
    localStorage.setItem('ah_dev_email',       devEmail.trim());
    localStorage.setItem('ah_n8n_webhook',     n8nWebhook.trim());
    localStorage.setItem('ah_vercel_hook',     vercelDeployHook.trim());
    localStorage.setItem('ah_github_repo',     githubRepo.trim());
    localStorage.setItem('ah_github_token',    githubToken.trim());
    localStorage.setItem('ah_github_branch',   githubBranch.trim() || 'main');
    localStorage.setItem('ah_backend_url',     backendUrl.trim());

    // Persist to server DB
    try {
      await fetch(`${backendUrl.trim()}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-site-id': window.location.host,
        },
        body: JSON.stringify({
          settings: {
            modelProvider,
            geminiKey:        geminiKey.trim(),
            groqKey:          groqKey.trim(),
            n8nWebhook:       n8nWebhook.trim(),
            vercelDeployHook: vercelDeployHook.trim(),
            githubRepo:       githubRepo.trim(),
            githubToken:      githubToken.trim(),
            githubBranch:     githubBranch.trim() || 'main',
          },
        }),
      });
    } catch (_) {}

    setIsSaved(true);
    onConfigChange();
    setTimeout(() => { setIsSaved(false); setIsOpen(false); }, 1500);
  };

  const n8nConnected = !!n8nWebhook;
  const gitConnected = !!(githubRepo && githubToken);

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="control-settings-btn" title="System Settings">
        <Settings size={16} className="spin-hover" />
        <span>System Settings</span>
        {(n8nConnected || gitConnected) && (
          <span className="settings-connected-badge">
            {[n8nConnected && 'N8N', gitConnected && 'Git'].filter(Boolean).join(' · ')}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="settings-modal-overlay" onClick={e => e.target === e.currentTarget && setIsOpen(false)}>
          <div className="settings-modal-content">
            {/* Header */}
            <div className="settings-modal-header">
              <div className="settings-modal-title">
                <ShieldAlert size={18} className="neon-cyan" />
                <span>AUTOHEAL SYSTEM SETTINGS</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="settings-modal-close">✕</button>
            </div>

            {/* Tabs */}
            <div className="settings-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`settings-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              >
                <Sparkles size={13} /> AI Engine
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('git')}
                className={`settings-tab-btn ${activeTab === 'git' ? 'active' : ''}`}
              >
                <Github size={13} /> Git + N8N
                {(n8nConnected || gitConnected) && <span className="tab-dot" />}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`settings-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
              >
                <Mail size={13} /> Email Alerts
              </button>
            </div>

            <form onSubmit={handleSave} className="settings-modal-body">

              {/* ── AI ENGINE TAB ─────────────────────────────────────────── */}
              {activeTab === 'ai' && (
                <>
                  <div className="form-section">
                    <div className="form-section-title">
                      <Sparkles size={14} className="neon-purple" />
                      <span>AI Provider</span>
                    </div>
                    <p className="form-section-desc">
                      Choose your AI engine for auto-healing errors and evolving the UI.
                    </p>
                    <div className="engine-select-container">
                      <button
                        type="button"
                        onClick={() => setModelProvider('gemini')}
                        className={`module-switch-card ${modelProvider === 'gemini' ? 'active' : ''}`}
                      >
                        <Sparkles size={13} className="neon-purple" />
                        <span>Google Gemini</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelProvider('groq')}
                        className={`module-switch-card ${modelProvider === 'groq' ? 'active' : ''}`}
                      >
                        <Cpu size={13} className="neon-cyan" />
                        <span>Groq (Llama 3)</span>
                      </button>
                    </div>
                  </div>

                  {modelProvider === 'gemini' ? (
                    <div className="form-section">
                      <div className="input-group">
                        <div className="input-icon"><Key size={14} /></div>
                        <input
                          type="password"
                          placeholder="Gemini API Key..."
                          value={geminiKey}
                          onChange={e => setGeminiKey(e.target.value)}
                          className="settings-input"
                        />
                      </div>
                      <div className="key-guide">
                        💡 <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="hyperlink">
                          Get a free Gemini API Key
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="form-section">
                      <div className="input-group">
                        <div className="input-icon"><Key size={14} /></div>
                        <input
                          type="password"
                          placeholder="Groq API Key..."
                          value={groqKey}
                          onChange={e => setGroqKey(e.target.value)}
                          className="settings-input"
                        />
                      </div>
                      <div className="key-guide">
                        💡 <a href="https://console.groq.com/" target="_blank" rel="noreferrer" className="hyperlink">
                          Get a free Groq API Key
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="form-section" style={{ marginTop: '16px' }}>
                    <div className="form-section-title">
                      <Globe size={14} className="neon-cyan" />
                      <span>AutoHeal Server Endpoint</span>
                    </div>
                    <p className="form-section-desc">
                      The URL of your hosted Express file patcher server. Set to your hosted Cloud backend (e.g. Render).
                    </p>
                    <div className="input-group">
                      <div className="input-icon"><Globe size={14} /></div>
                      <input
                        type="url"
                        placeholder="http://localhost:3001"
                        value={backendUrl}
                        onChange={e => setBackendUrl(e.target.value)}
                        className="settings-input"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── GIT + N8N TAB ─────────────────────────────────────────── */}
              {activeTab === 'git' && (
                <>
                  <div className="git-connection-status">
                    <div className={`git-status-item ${n8nConnected ? 'connected' : ''}`}>
                      <Webhook size={13} />
                      <span>N8N: {n8nConnected ? 'Connected ✓' : 'Not configured'}</span>
                    </div>
                    <div className={`git-status-item ${gitConnected ? 'connected' : ''}`}>
                      <Github size={13} />
                      <span>GitHub: {gitConnected ? 'Connected ✓' : 'Not configured'}</span>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-title">
                      <Webhook size={14} className="neon-purple" />
                      <span>N8N Webhook URL</span>
                    </div>
                    <p className="form-section-desc">
                      Paste your N8N production webhook URL. Every AutoHeal fix will POST here automatically.
                    </p>
                    <div className="input-group">
                      <div className="input-icon"><Webhook size={14} /></div>
                      <input
                        type="url"
                        placeholder="https://your-n8n.onrender.com/webhook/autoheal..."
                        value={n8nWebhook}
                        onChange={e => setN8nWebhook(e.target.value)}
                        className="settings-input"
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-title">
                      <Github size={14} className="neon-cyan" />
                      <span>GitHub Repository</span>
                    </div>
                    <div className="input-row">
                      <div className="input-group">
                        <div className="input-icon"><Github size={14} /></div>
                        <input
                          type="text"
                          placeholder="owner/repo-name"
                          value={githubRepo}
                          onChange={e => setGithubRepo(e.target.value)}
                          className="settings-input"
                        />
                      </div>
                      <div className="input-group">
                        <div className="input-icon"><Key size={14} /></div>
                        <input
                          type="text"
                          placeholder="Branch (default: main)"
                          value={githubBranch}
                          onChange={e => setGithubBranch(e.target.value)}
                          className="settings-input"
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <div className="input-icon"><Key size={14} /></div>
                      <input
                        type="password"
                        placeholder="GitHub Personal Access Token (ghp_...)"
                        value={githubToken}
                        onChange={e => setGithubToken(e.target.value)}
                        className="settings-input"
                      />
                    </div>
                    <div className="key-guide">
                      💡 <a href="https://github.com/settings/tokens/new?scopes=repo" target="_blank" rel="noreferrer" className="hyperlink">
                        Generate GitHub PAT (needs repo scope)
                      </a>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-section-title">
                      <Globe size={14} className="neon-emerald" />
                      <span>Deploy Hook (Optional)</span>
                    </div>
                    <div className="input-group">
                      <div className="input-icon"><Globe size={14} /></div>
                      <input
                        type="url"
                        placeholder="Vercel / Render Deploy Hook URL..."
                        value={vercelDeployHook}
                        onChange={e => setVercelDeployHook(e.target.value)}
                        className="settings-input"
                      />
                    </div>
                    <p className="form-section-desc">
                      After each GitHub commit, AutoHeal will trigger a Vercel/Render rebuild automatically.
                    </p>
                  </div>
                </>
              )}

              {/* ── EMAIL ALERTS TAB ──────────────────────────────────────── */}
              {activeTab === 'email' && (
                <div className="form-section">
                  <div className="form-section-title">
                    <Mail size={14} className="neon-emerald" />
                    <span>Email Alert Config</span>
                  </div>
                  <p className="form-section-desc">
                    Receive real stack-trace reports in your inbox when an error is detected.
                  </p>
                  <div className="input-row">
                    <div className="input-group">
                      <div className="input-icon"><Mail size={14} /></div>
                      <input
                        type="email"
                        placeholder="developer@yourdomain.com"
                        value={devEmail}
                        onChange={e => setDevEmail(e.target.value)}
                        className="settings-input"
                      />
                    </div>
                    <div className="input-group">
                      <div className="input-icon"><Key size={14} /></div>
                      <input
                        type="password"
                        placeholder="Web3Forms Access Key..."
                        value={web3FormsKey}
                        onChange={e => setWeb3FormsKey(e.target.value)}
                        className="settings-input"
                      />
                    </div>
                  </div>
                  <div className="key-guide">
                    💡 <a href="https://web3forms.com/" target="_blank" rel="noreferrer" className="hyperlink">
                      Get a free Web3Forms key (10 seconds)
                    </a>
                  </div>
                </div>
              )}

              <div className="settings-modal-footer">
                <div className="settings-status-note">
                  🔒 Saved to local storage + server DB per site
                </div>
                <div className="settings-actions">
                  <button type="button" onClick={() => setIsOpen(false)} className="btn-settings secondary">
                    Cancel
                  </button>
                  <button type="submit" className={`btn-settings primary ${isSaved ? 'success' : ''}`}>
                    {isSaved ? '✓ Saved!' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
