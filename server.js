const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Resolve target file paths in the workspace
const FILE_MAP = {
  sandbox: path.resolve(__dirname, 'playground/src/components/SandboxView.tsx'),
  css: path.resolve(__dirname, 'playground/src/index.css'),
  sdk: path.resolve(__dirname, 'packages/autoheal-sdk/src/widget.ts'),
};

const https = require('https');

// Helper to make GitHub API calls using built-in https
function githubApiCall(token, urlPath, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: urlPath,
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'autoheal-backend',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// GET /api/file-context
app.get('/api/file-context', async (req, res) => {
  const { file } = req.query;
  const siteId = req.headers['x-site-id'] || req.query.siteId || 'localhost:5173';
  const db = loadDb();
  const site = getSiteData(db, siteId);

  // Map local keys to repo relative paths
  const relativeFileMap = {
    sandbox: 'playground/src/components/SandboxView.tsx',
    css: 'playground/src/index.css',
    sdk: 'packages/autoheal-sdk/src/widget.ts',
  };
  const repoRelativePath = relativeFileMap[file] || file;

  // If settings have GitHub integration configured, read from GitHub API instead of local disk
  if (site.settings && site.settings.githubRepo && site.settings.githubToken) {
    try {
      const repo = site.settings.githubRepo;
      const token = site.settings.githubToken;
      const branch = site.settings.githubBranch || 'main';
      const apiPath = `/repos/${repo}/contents/${repoRelativePath}?ref=${branch}`;

      console.log(`[AutoHeal Server] Fetching file from GitHub Repo: ${repo}/${repoRelativePath}`);
      const apiRes = await githubApiCall(token, apiPath, 'GET');
      
      if (apiRes.status === 200 && apiRes.body && apiRes.body.content) {
        const decodedContent = Buffer.from(apiRes.body.content, 'base64').toString('utf-8');
        return res.json({
          success: true,
          mode: 'github',
          filePath: `github://${repo}/${repoRelativePath}`,
          relativePath: repoRelativePath,
          content: decodedContent,
          sha: apiRes.body.sha
        });
      } else {
        console.warn(`[AutoHeal Server] GitHub fetch failed (Status ${apiRes.status}). Falling back to local filesystem.`);
      }
    } catch (err) {
      console.error('[AutoHeal Server] GitHub API fetch error:', err.message);
    }
  }

  // Fallback to Local Filesystem
  const targetPath = FILE_MAP[file] || (file ? path.resolve(__dirname, file) : null);
  if (!targetPath) {
    return res.status(400).json({ error: 'Please provide a valid file query parameter (e.g. sandbox, css).' });
  }
  if (!targetPath.startsWith(__dirname)) {
    return res.status(403).json({ error: 'Access denied: File is outside workspace directory.' });
  }

  try {
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: `File not found: ${file}` });
    }
    const content = fs.readFileSync(targetPath, 'utf-8');
    return res.json({
      success: true,
      mode: 'local',
      filePath: targetPath,
      relativePath: path.relative(__dirname, targetPath),
      content,
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to read file: ${err.message}` });
  }
});

// POST /api/apply-patch
app.post('/api/apply-patch', async (req, res) => {
  const { file, content, targetText, replacementText, commitMessage: clientCommitMsg } = req.body;
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const db = loadDb();
  const site = getSiteData(db, siteId);

  const relativeFileMap = {
    sandbox: 'playground/src/components/SandboxView.tsx',
    css: 'playground/src/index.css',
    sdk: 'packages/autoheal-sdk/src/widget.ts',
  };
  const repoRelativePath = relativeFileMap[file] || file;

  // ──────────────────────────────────────────────────────────────────────────
  // MODE 1: N8N CLOUD BRIDGE — forward to N8N webhook (creativekulhad.onrender.com)
  // The server injects the user's credentials server-side so the browser never sees them.
  // ──────────────────────────────────────────────────────────────────────────
  if (site.settings && site.settings.n8nWebhook && site.settings.githubRepo && site.settings.githubToken) {
    try {
      const patchContent = content || '';
      const webhookPayload = {
        file: repoRelativePath,
        content: patchContent,
        commitMessage: clientCommitMsg || `🤖 AutoHeal: auto-patch ${repoRelativePath}`,
        branch: site.settings.githubBranch || 'main',
        githubRepo: site.settings.githubRepo,
        githubToken: site.settings.githubToken,
        vercelDeployHook: site.settings.vercelDeployHook || '',
        siteId: siteId,
        timestamp: new Date().toISOString(),
        source: 'autoheal-server-proxy',
      };

      console.log(`[AutoHeal Server] Forwarding patch to N8N Cloud Bridge: ${site.settings.n8nWebhook}`);

      const n8nUrl = new URL(site.settings.n8nWebhook);
      const n8nBody = JSON.stringify(webhookPayload);
      const n8nOpts = {
        hostname: n8nUrl.hostname,
        port: n8nUrl.port || (n8nUrl.protocol === 'https:' ? 443 : 80),
        path: n8nUrl.pathname + n8nUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(n8nBody),
        },
      };

      const n8nLib = n8nUrl.protocol === 'https:' ? https : require('http');
      const n8nResult = await new Promise((resolve, reject) => {
        const n8nReq = n8nLib.request(n8nOpts, (n8nRes) => {
          let data = '';
          n8nRes.on('data', chunk => data += chunk);
          n8nRes.on('end', () => {
            try { resolve({ status: n8nRes.statusCode, body: JSON.parse(data) }); }
            catch { resolve({ status: n8nRes.statusCode, body: data }); }
          });
        });
        n8nReq.on('error', reject);
        n8nReq.write(n8nBody);
        n8nReq.end();
      });

      if (n8nResult.status >= 200 && n8nResult.status < 400) {
        console.log('[AutoHeal Server] N8N Cloud Bridge responded successfully.');
        return res.json({
          success: true,
          mode: 'n8n-cloud',
          message: `Patch forwarded to N8N Cloud Bridge → GitHub (${site.settings.githubRepo})`,
          n8nResponse: n8nResult.body,
        });
      } else {
        console.warn(`[AutoHeal Server] N8N returned status ${n8nResult.status}, falling back to direct GitHub.`);
        // Fall through to direct GitHub mode below
      }
    } catch (err) {
      console.error('[AutoHeal Server] N8N forwarding failed:', err.message, '— falling back to direct GitHub.');
      // Fall through to direct GitHub mode below
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MODE 2: DIRECT GITHUB API — commit directly from Express server
  // ──────────────────────────────────────────────────────────────────────────
  if (site.settings && site.settings.githubRepo && site.settings.githubToken) {
    try {
      const repo = site.settings.githubRepo;
      const token = site.settings.githubToken;
      const branch = site.settings.githubBranch || 'main';
      const apiPath = `/repos/${repo}/contents/${repoRelativePath}`;

      // 1. Fetch file content to get the SHA
      const getRes = await githubApiCall(token, `${apiPath}?ref=${branch}`, 'GET');
      let currentSha = null;
      let originalContent = '';

      if (getRes.status === 200 && getRes.body) {
        currentSha = getRes.body.sha;
        originalContent = Buffer.from(getRes.body.content, 'base64').toString('utf-8');
      }

      // 2. Resolve content
      let updatedContent = '';
      if (content) {
        updatedContent = content;
      } else if (targetText && replacementText) {
        if (!originalContent.includes(targetText)) {
          return res.status(400).json({ error: 'Target text not found in GitHub source file for patching.' });
        }
        updatedContent = originalContent.replace(targetText, replacementText);
      } else {
        return res.status(400).json({ error: 'Please supply either full new "content" or surgical "targetText"/"replacementText" parameters.' });
      }

      // 3. Commit file to GitHub
      console.log(`[AutoHeal Server] Committing file patch directly to GitHub: ${repo}/${repoRelativePath}`);
      const commitMessage = clientCommitMsg || `🤖 AutoHeal: auto-patch file ${repoRelativePath}`;
      const putBody = {
        message: commitMessage,
        content: Buffer.from(updatedContent).toString('base64'),
        branch: branch
      };
      if (currentSha) putBody.sha = currentSha;

      const putRes = await githubApiCall(token, apiPath, 'PUT', putBody);

      if (putRes.status === 200 || putRes.status === 201) {
        // Trigger Vercel Deploy Hook if configured
        if (site.settings.vercelDeployHook) {
          try {
            const hookUrl = new URL(site.settings.vercelDeployHook);
            const hookOpts = {
              hostname: hookUrl.hostname,
              path: hookUrl.pathname + hookUrl.search,
              method: 'POST',
            };
            const hookReq = https.request(hookOpts, () => {});
            hookReq.on('error', () => {});
            hookReq.end();
            console.log('[AutoHeal Server] Vercel Deploy Hook triggered successfully.');
          } catch (deployErr) {
            console.error('[AutoHeal Server] Vercel deploy hook error:', deployErr.message);
          }
        }

        return res.json({
          success: true,
          mode: 'github',
          message: `Patch successfully committed directly to GitHub repo: ${repo}/${repoRelativePath}`,
          sha: putRes.body?.content?.sha
        });
      } else {
        return res.status(putRes.status).json({ error: 'GitHub commit failed', details: putRes.body });
      }
    } catch (err) {
      return res.status(500).json({ error: `GitHub API write failed: ${err.message}` });
    }
  }

  // Fallback to Local Filesystem
  const targetPath = FILE_MAP[file] || (file ? path.resolve(__dirname, file) : null);
  if (!targetPath) {
    return res.status(400).json({ error: 'Please provide a valid file identifier.' });
  }
  if (!targetPath.startsWith(__dirname)) {
    return res.status(403).json({ error: 'Access denied: File is outside workspace directory.' });
  }

  try {
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: `File not found: ${targetPath}` });
    }

    let updatedContent = '';
    if (content) {
      updatedContent = content;
    } else if (targetText && replacementText) {
      const original = fs.readFileSync(targetPath, 'utf-8');
      if (!original.includes(targetText)) {
        return res.status(400).json({ error: 'Target text not found in source file for surgical patching.' });
      }
      updatedContent = original.replace(targetText, replacementText);
    } else {
      return res.status(400).json({ error: 'Please supply either full new "content" or surgical "targetText"/"replacementText" parameters.' });
    }

    fs.writeFileSync(targetPath, updatedContent, 'utf-8');
    console.log(`[AutoHeal Server] Applied patch to ${path.relative(__dirname, targetPath)} successfully.`);
    return res.json({
      success: true,
      mode: 'local',
      message: `Patch successfully written to physical file: ${path.relative(__dirname, targetPath)}`,
      filePath: targetPath,
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to write file: ${err.message}` });
  }
});


// ==========================================
// MULTI-TENANT FILESYSTEM DATABASE (db.json)
// ==========================================
const DB_FILE = path.resolve(__dirname, 'db.json');

function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb = { sites: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content || '{"sites":{}}');
  } catch (err) {
    console.error('[AutoHeal DB] Error reading db.json, returning empty structure:', err);
    return { sites: {} };
  }
}

function saveDb(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AutoHeal DB] Error writing db.json:', err);
  }
}

function getSiteData(db, siteId) {
  const normalizedSiteId = siteId || 'localhost:5173';
  if (!db.sites) {
    db.sites = {};
  }
  if (!db.sites[normalizedSiteId]) {
    db.sites[normalizedSiteId] = {
      errors: [],
      customDb: {},
      settings: {
        n8nWebhook: '',
        vercelDeployHook: '',
        gitBranch: 'main',
        githubRepo: '',
        githubToken: '',
        githubBranch: 'main',
        modelProvider: 'groq',
        geminiKey: '',
        groqKey: 'YOUR_GROQ_API_KEY'
      },
      scores: {
        polish: 52,
        spacing: 60,
        mobile: 45,
        conversion: 55
      }
    };
  }
  return db.sites[normalizedSiteId];
}

function getSiteMockErrors(siteId) {
  const now = Date.now();
  const hostName = siteId || 'localhost:5173';
  return [
    {
      id: 'mock_crash_1',
      type: 'crash',
      message: `TypeError: Cannot read properties of undefined (reading 'map') in SandboxView.tsx:67 on ${hostName}`,
      stack: `TypeError: Cannot read properties of undefined (reading 'map')\n    at SandboxView (file:///c:/auomation/playground/src/components/SandboxView.tsx:67:32)\n    at renderWithHooks (file:///c:/auomation/node_modules/react-dom/cjs/react-dom.development.js:15486:18)`,
      source: 'file:///c:/auomation/playground/src/components/SandboxView.tsx',
      line: 67,
      column: 32,
      timestamp: new Date(now - 5 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_promise_1',
      type: 'promise',
      message: `Unhandled Promise Rejection: Error: Network Error - Failed to fetch endpoint 'https://api.broken-endpoint.dev/data/v1/telemetry' on ${hostName}`,
      stack: `Error: Network Error\n    at fetchTelemetryData (file:///c:/auomation/playground/src/utils/api.ts:14:11)\n    at async loadDashboardData (file:///c:/auomation/playground/src/App.tsx:92:24)`,
      source: 'file:///c:/auomation/playground/src/utils/api.ts',
      line: 14,
      column: 11,
      timestamp: new Date(now - 15 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_asset_1',
      type: 'asset',
      message: `Failed to load resource: net::ERR_FILE_NOT_FOUND (broken-cyber-chip-image.jpg) on ${hostName}`,
      source: `file:///c:/auomation/playground/src/assets/broken-cyber-chip-image.jpg`,
      timestamp: new Date(now - 32 * 60 * 1000).toISOString()
    },
    {
      id: 'mock_console_1',
      type: 'console_error',
      message: `[React] Mismatched Hydration Warning on ${hostName}: expected text node containing "AutoHeal // Evolution Deck" but found HTML tag <div>`,
      source: `file:///c:/auomation/node_modules/react-dom/cjs/react-dom.development.js`,
      timestamp: new Date(now - 48 * 60 * 1000).toISOString()
    }
  ];
}

// REST Endpoints: Telemetry Exception Logs
app.get('/api/telemetry', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.query.siteId || 'localhost:5173';
  const db = loadDb();
  const site = getSiteData(db, siteId);
  
  if (site.errors.length === 0) {
    site.errors = getSiteMockErrors(siteId);
    saveDb(db);
  }
  return res.json({ success: true, errors: site.errors });
});

app.post('/api/telemetry', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const errorData = req.body.error;
  if (!errorData) {
    return res.status(400).json({ error: 'Error data payload is required.' });
  }

  const db = loadDb();
  const site = getSiteData(db, siteId);
  
  const exists = site.errors.some(e => e.message === errorData.message && e.type === errorData.type);
  if (!exists) {
    site.errors.push(errorData);
    saveDb(db);
  }
  return res.json({ success: true, errors: site.errors });
});

app.post('/api/telemetry/clear', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Error ID is required for clearing.' });
  }

  const db = loadDb();
  const site = getSiteData(db, siteId);
  site.errors = site.errors.filter(e => e.id !== id);
  saveDb(db);
  return res.json({ success: true, errors: site.errors });
});

app.post('/api/telemetry/reseed', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const db = loadDb();
  const site = getSiteData(db, siteId);
  site.errors = getSiteMockErrors(siteId);
  saveDb(db);
  return res.json({ success: true, errors: site.errors });
});

// REST Endpoints: Settings parameters
app.get('/api/settings', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.query.siteId || 'localhost:5173';
  const db = loadDb();
  const site = getSiteData(db, siteId);
  return res.json({ success: true, settings: site.settings });
});

app.post('/api/settings', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const newSettings = req.body.settings;
  if (!newSettings) {
    return res.status(400).json({ error: 'Settings payload is required.' });
  }

  const db = loadDb();
  const site = getSiteData(db, siteId);
  site.settings = { ...site.settings, ...newSettings };
  saveDb(db);
  return res.json({ success: true, settings: site.settings });
});

// REST Endpoints: Visual Scoring parameters
app.get('/api/scores', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.query.siteId || 'localhost:5173';
  const db = loadDb();
  const site = getSiteData(db, siteId);
  return res.json({ success: true, scores: site.scores });
});

app.post('/api/scores', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const newScores = req.body.scores;
  if (!newScores) {
    return res.status(400).json({ error: 'Scores payload is required.' });
  }

  const db = loadDb();
  const site = getSiteData(db, siteId);
  site.scores = { ...site.scores, ...newScores };
  saveDb(db);
  return res.json({ success: true, scores: site.scores });
});

// ──────────────────────────────────────────────────────────────────────────
// MULTI-TENANT CUSTOM DATABASE ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────
app.get('/api/db', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.query.siteId || 'localhost:5173';
  const db = loadDb();
  const site = getSiteData(db, siteId);
  if (!site.customDb) {
    site.customDb = {};
    saveDb(db);
  }
  return res.json({ success: true, data: site.customDb });
});

app.post('/api/db', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const dataPayload = req.body.data;
  if (dataPayload === undefined) {
    return res.status(400).json({ error: 'Data payload is required in body.data' });
  }

  const db = loadDb();
  const site = getSiteData(db, siteId);
  if (!site.customDb) {
    site.customDb = {};
  }
  site.customDb = { ...site.customDb, ...dataPayload };
  saveDb(db);
  return res.json({ success: true, data: site.customDb });
});

app.post('/api/db/append', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and value parameters are required.' });
  }

  const db = loadDb();
  const site = getSiteData(db, siteId);
  if (!site.customDb) {
    site.customDb = {};
  }
  if (!Array.isArray(site.customDb[key])) {
    site.customDb[key] = [];
  }
  site.customDb[key].push(value);
  saveDb(db);
  return res.json({ success: true, data: site.customDb[key] });
});

app.post('/api/db/clear', (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const { key } = req.body;
  
  const db = loadDb();
  const site = getSiteData(db, siteId);
  if (!site.customDb) {
    site.customDb = {};
  }
  if (key) {
    delete site.customDb[key];
  } else {
    site.customDb = {};
  }
  saveDb(db);
  return res.json({ success: true, message: key ? `Key "${key}" cleared` : 'Database cleared', data: site.customDb });
});

app.listen(PORT, () => {
  console.log(`⚡ [AutoHeal Server] Express Physical File Patcher is running on http://localhost:${PORT}`);
});
