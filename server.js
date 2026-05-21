const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve the pre-built AutoHeal SDK bundle so sites can load it via <script> tag
// e.g. <script src="https://autoheal-4p4q.onrender.com/sdk/autoheal.js"></script>
app.use('/sdk', express.static(path.join(__dirname, 'public'), {
  setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60');
  }
}));

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
  const site = await getSiteData(siteId);

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

// POST /api/generate-patch (Secure AI Generation on Backend)
app.post('/api/generate-patch', async (req, res) => {
  const { file, error, prompt: userPrompt, fileContent } = req.body;
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const site = await getSiteData(siteId);

  const provider = site.settings?.modelProvider || 'groq';
  const groqKey = site.settings?.groqKey || process.env.GROQ_API_KEY;
  const geminiKey = site.settings?.geminiKey || process.env.GEMINI_API_KEY;

  if (provider === 'groq' && !groqKey) {
    return res.status(400).json({ success: false, explanation: 'Groq API Key is not configured for this site.' });
  }
  if (provider === 'gemini' && !geminiKey) {
    return res.status(400).json({ success: false, explanation: 'Gemini API Key is not configured for this site.' });
  }

  try {
    let aiInstruction = '';
    if (error) {
      aiInstruction = `
Analyze the following error captured by our diagnostic monitor and write a self-healing patch:
ERROR METRICS:
- Type: ${error.type}
- Message: ${error.message}
- Source Location: ${error.source || 'N/A'} (Line ${error.line}:${error.column})
- Stack Trace: ${error.stack || 'N/A'}
- DOM Snippet: ${error.domContext || 'N/A'}
Your goal is to repair the file permanently to prevent this error.`;
    } else if (userPrompt) {
      aiInstruction = `
The user has manually requested a new feature or change. 
USER REQUEST: "${userPrompt}"
Your goal is to implement this feature perfectly in the file.`;
    } else {
      return res.status(400).json({ success: false, explanation: 'Provide either an error or a prompt.' });
    }

    // Fetch File Content if not provided
    let actualFileContent = fileContent;
    if (!actualFileContent) {
      const relativeFileMap = {
        sandbox: 'playground/src/components/SandboxView.tsx',
        css: 'playground/src/index.css',
        sdk: 'packages/autoheal-sdk/src/widget.ts',
      };
      const repoRelativePath = relativeFileMap[file] || file;
      
      if (site.settings?.githubRepo && site.settings?.githubToken) {
        const repo = site.settings.githubRepo;
        const token = site.settings.githubToken;
        const branch = site.settings.githubBranch || 'main';
        const apiRes = await githubApiCall(token, `/repos/${repo}/contents/${repoRelativePath}?ref=${branch}`, 'GET');
        if (apiRes.status === 200 && apiRes.body?.content) {
          actualFileContent = Buffer.from(apiRes.body.content, 'base64').toString('utf-8');
        }
      }
      
      if (!actualFileContent) {
        const targetPath = FILE_MAP[file] || path.resolve(__dirname, file || '');
        if (fs.existsSync(targetPath)) {
          if (fs.lstatSync(targetPath).isFile()) {
            actualFileContent = fs.readFileSync(targetPath, 'utf-8');
          } else {
            console.warn(`[AutoHeal Server] Target path is a directory, cannot read as file: ${targetPath}`);
          }
        }
      }
    }

    const fullPrompt = `
You are an expert JavaScript, React, and web engineering agent.
${aiInstruction}

CURRENT WORKSPACE FILE CONTENT:
\`\`\`tsx
${actualFileContent || '/* File content not provided */'}
\`\`\`

Your response must be a valid JSON object only, with no markdown styling blocks (no \`\`\`json wrappers), satisfying the following structure:
{
  "success": true,
  "explanation": "Detailed explanation of what changed.",
  "targetPath": "${file || 'unknown'}",
  "diffCode": "A unified Git-style code diff showing the before (minus lines) and after (plus lines) code fixes.",
  "healedFileContent": "The COMPLETE updated file content with the bug physically resolved or feature added."
}
Ensure your output is strictly valid JSON. Double-check that all strings are escaped correctly.
`.trim();

    let text = '';
    
    if (provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are an autonomous debugging agent. Output strictly valid JSON conforming exactly to the user schema.' },
            { role: 'user', content: fullPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Groq Error:', errText);
        throw new Error(`Groq API returned ${response.status}: ${errText}`);
      }
      const resData = await response.json();
      text = resData.choices[0].message.content.trim();
    } else {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const response = await model.generateContent(fullPrompt);
      text = response.response.text().trim();
    }
    
    const cleaned = text
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/, '')
      .trim();

    const json = JSON.parse(cleaned);
    return res.json({
      success: json.success ?? true,
      explanation: json.explanation || 'Self-healed via AI.',
      diffCode: json.diffCode || '',
      patchCode: json.patchCode || '',
      healedFileContent: json.healedFileContent || ''
    });
  } catch (e) {
    console.error('[AutoHeal Server] AI Generation Error:', e);
    return res.status(500).json({ success: false, explanation: `AI Generation Error: ${e.message}` });
  }
});

// POST /api/apply-patch
app.post('/api/apply-patch', async (req, res) => {
  const { file, content, targetText, replacementText, commitMessage: clientCommitMsg } = req.body;
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const site = await getSiteData(siteId);

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
// MULTI-TENANT SUPABASE CLOUD DATABASE
// ==========================================
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseKey || 'dummy_key');

async function getSiteData(siteId) {
  const normalizedSiteId = siteId || 'localhost:5173';
  
  const { data, error } = await supabase
    .from('sites')
    .select('data')
    .eq('id', normalizedSiteId)
    .single();

  let site = data?.data;

  if (!site) {
    site = {
      errors: [],
      customDb: {},
      settings: {
        n8nWebhook: process.env.N8N_WEBHOOK || '',
        vercelDeployHook: process.env.VERCEL_DEPLOY_HOOK || '',
        gitBranch: process.env.GITHUB_BRANCH || 'main',
        githubRepo: process.env.GITHUB_REPO || '',
        githubToken: process.env.GITHUB_TOKEN || '',
        modelProvider: process.env.MODEL_PROVIDER || 'groq',
        geminiKey: process.env.GEMINI_API_KEY || '',
        groqKey: process.env.GROQ_API_KEY || ''
      },
      scores: { polish: 52, spacing: 60, mobile: 45, conversion: 55 }
    };
    await saveSiteData(normalizedSiteId, site);
  }
  return site;
}

async function saveSiteData(siteId, siteData) {
  const normalizedSiteId = siteId || 'localhost:5173';
  const { error } = await supabase
    .from('sites')
    .upsert({ id: normalizedSiteId, data: siteData }, { onConflict: 'id' });
    
  if (error) {
    console.error('[AutoHeal DB] Error saving to Supabase:', error);
  }
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
app.get('/api/telemetry', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.query.siteId || 'localhost:5173';
  const site = await getSiteData(siteId);
  
  if (site.errors.length === 0) {
    site.errors = getSiteMockErrors(siteId);
    await saveSiteData(siteId, site);
  }
  return res.json({ success: true, errors: site.errors });
});

app.post('/api/telemetry', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const errorData = req.body.error;
  if (!errorData) {
    return res.status(400).json({ error: 'Error data payload is required.' });
  }

  const site = await getSiteData(siteId);
  
  const exists = site.errors.some(e => e.message === errorData.message && e.type === errorData.type);
  if (!exists) {
    site.errors.push(errorData);
    await saveSiteData(siteId, site);
  }
  return res.json({ success: true, errors: site.errors });
});

app.post('/api/telemetry/clear', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Error ID is required for clearing.' });
  }

  const site = await getSiteData(siteId);
  site.errors = site.errors.filter(e => e.id !== id);
  await saveSiteData(siteId, site);
  return res.json({ success: true, errors: site.errors });
});

app.post('/api/telemetry/reseed', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const site = await getSiteData(siteId);
  site.errors = getSiteMockErrors(siteId);
  await saveSiteData(siteId, site);
  return res.json({ success: true, errors: site.errors });
});

// REST Endpoints: Settings parameters
app.get('/api/settings', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.query.siteId || 'localhost:5173';
  const site = await getSiteData(siteId);
  return res.json({ success: true, settings: site.settings });
});

app.post('/api/settings', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const newSettings = req.body.settings;
  if (!newSettings) {
    return res.status(400).json({ error: 'Settings payload is required.' });
  }

  const site = await getSiteData(siteId);
  site.settings = { ...site.settings, ...newSettings };
  await saveSiteData(siteId, site);
  return res.json({ success: true, settings: site.settings });
});

// REST Endpoints: Visual Scoring parameters
app.get('/api/scores', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.query.siteId || 'localhost:5173';
  const site = await getSiteData(siteId);
  return res.json({ success: true, scores: site.scores });
});

app.post('/api/scores', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const newScores = req.body.scores;
  if (!newScores) {
    return res.status(400).json({ error: 'Scores payload is required.' });
  }

  const site = await getSiteData(siteId);
  site.scores = { ...site.scores, ...newScores };
  await saveSiteData(siteId, site);
  return res.json({ success: true, scores: site.scores });
});

// ──────────────────────────────────────────────────────────────────────────
// MULTI-TENANT CUSTOM DATABASE ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────
app.get('/api/db', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.query.siteId || 'localhost:5173';
  const site = await getSiteData(siteId);
  if (!site.customDb) {
    site.customDb = {};
    await saveSiteData(siteId, site);
  }
  return res.json({ success: true, data: site.customDb });
});

app.post('/api/db', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const dataPayload = req.body.data;
  if (dataPayload === undefined) {
    return res.status(400).json({ error: 'Data payload is required in body.data' });
  }

  const site = await getSiteData(siteId);
  if (!site.customDb) {
    site.customDb = {};
  }
  site.customDb = { ...site.customDb, ...dataPayload };
  await saveSiteData(siteId, site);
  return res.json({ success: true, data: site.customDb });
});

app.post('/api/db/append', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Key and value parameters are required.' });
  }

  const site = await getSiteData(siteId);
  if (!site.customDb) {
    site.customDb = {};
  }
  if (!Array.isArray(site.customDb[key])) {
    site.customDb[key] = [];
  }
  site.customDb[key].push(value);
  await saveSiteData(siteId, site);
  return res.json({ success: true, data: site.customDb[key] });
});

app.post('/api/db/clear', async (req, res) => {
  const siteId = req.headers['x-site-id'] || req.body.siteId || 'localhost:5173';
  const { key } = req.body;
  
  const site = await getSiteData(siteId);
  if (!site.customDb) {
    site.customDb = {};
  }
  if (key) {
    delete site.customDb[key];
  } else {
    site.customDb = {};
  }
  await saveSiteData(siteId, site);
  return res.json({ success: true, message: key ? `Key "${key}" cleared` : 'Database cleared', data: site.customDb });
});

app.listen(PORT, () => {
  console.log(`⚡ [AutoHeal Server] Express Physical File Patcher is running on http://localhost:${PORT}`);
});
