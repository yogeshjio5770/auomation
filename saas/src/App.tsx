import React, { useState } from 'react';

function App() {
  const [siteId, setSiteId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-site-id': siteId,
        },
        body: JSON.stringify({
          settings: {},
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        throw new Error('Server returned an error');
      }
    } catch (error) {
      console.error('Failed to submit configuration:', error);
      alert('Failed to connect to Master Server. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-glow"></div>
      
      <div className="app-container">
        <h1>Welcome to <span className="gradient-text">AutoHeal</span></h1>
        <p className="subtitle">
          The world's first AI-powered self-healing infrastructure. 
          Generate your custom integration snippet below.
        </p>

        <div className="glass-card">
          {!isSuccess ? (
            <>
              <h2 className="card-title">Configure Integration</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Project Name (Site ID)</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. my-awesome-startup"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? 'Connecting to Master Server...' : 'Generate Snippet'}
                </button>
              </form>
            </>
          ) : (
            <div className="success-message">
              <div className="icon-check">✓</div>
              <h2 className="card-title">You're All Set!</h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Copy the snippet below and paste it into the <code>&lt;head&gt;</code> of your website.
              </p>
              
              <div className="code-block">
                <code>
                  &lt;script&gt;<br/>
                  &nbsp;&nbsp;window.AUTOHEAL_SITE_ID = "{siteId}";<br/>
                  &nbsp;&nbsp;window.AUTOHEAL_ENDPOINT = "{import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}";<br/>
                  &lt;/script&gt;<br/>
                  &lt;script src="https://unpkg.com/@autoheal/core"&gt;&lt;/script&gt;
                </code>
              </div>

              <button className="btn-secondary" style={{ marginTop: '20px' }} onClick={() => setIsSuccess(false)}>
                Configure Another Project
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
