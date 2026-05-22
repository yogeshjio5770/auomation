const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  try {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const firstEq = trimmed.indexOf('=');
        if (firstEq > 0) {
          const key = trimmed.substring(0, firstEq).trim();
          const val = trimmed.substring(firstEq + 1).trim().replace(/^['"]|['"]$/g, '');
          process.env[key] = val;
        }
      }
    });
    console.log('⚡ [AutoHeal Server] Successfully loaded environment variables from .env.local');
  } catch (err) {
    console.error('⚠️ [AutoHeal Server] Failed to parse .env.local:', err.message);
  }
}

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
  const groqKey = site.settings?.groqKey;
  const geminiKey = site.settings?.geminiKey;

  const isPlaceholder = (key) => !key || key.trim() === '' || key.trim().toUpperCase() === 'YOUR_GROQ_API_KEY' || key.trim().toUpperCase() === 'YOUR_GEMINI_API_KEY' || key.trim().toUpperCase() === 'PLACEHOLDER';

  if (provider === 'groq' && isPlaceholder(groqKey)) {
    return res.status(400).json({
      success: false,
      explanation: 'Groq API Key is not configured for this site. Please click the Settings gear icon in the AutoHeal Evolution Dashboard to configure your API key.'
    });
  }
  if (provider === 'gemini' && isPlaceholder(geminiKey)) {
    return res.status(400).json({
      success: false,
      explanation: 'Gemini API Key is not configured for this site. Please click the Settings gear icon in the AutoHeal Evolution Dashboard to configure your API key.'
    });
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

CRITICAL INSTRUCTIONS:
1. WRITE COMPLETE, PRODUCTION-READY CODE. Do not write simple placeholders or basic HTML.
2. USE PREMIUM MODERN DESIGN. If building UI components (like a Login page), use beautiful, modern aesthetics (glassmorphism, soft shadows, vibrant gradients, dark mode, smooth micro-animations). 
3. DO NOT IMPORT NON-EXISTENT FILES. If asked to build a multi-page app, build all the components (Home, Login, Signup) directly inside this file and use state to toggle between them. Do not assume 'Login.jsx' exists.
4. MAKE IT WOW THE USER. Go above and beyond to make the code fully functional and visually stunning!`;
    } else {
      return res.status(400).json({ success: false, explanation: 'Provide either an error or a prompt.' });
    }

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
  "diffCode": "A unified Git-style code diff (or a general summary of changes).",
  "files": [
    {
      "path": "src/App.jsx",
      "content": "The COMPLETE updated file content for this specific file."
    }
  ]
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
      files: json.files || []
    });
  } catch (e) {
    console.error('[AutoHeal Server] AI Generation Error:', e);
    return res.status(500).json({ success: false, explanation: `AI Generation Error: ${e.message}` });
  }
});

// POST /api/apply-patch
app.post('/api/apply-patch', async (req, res) => {
  const { file, content, targetText, replacementText, commitMessage: clientCommitMsg, files } = req.body;
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
  if (!files && site.settings && site.settings.n8nWebhook && site.settings.githubRepo && site.settings.githubToken) {
    try {
      const patchContent = content || '';

      // Sync patch to physical local codespace/workspace file
      const localPath = FILE_MAP[file] || (file ? path.resolve(__dirname, file) : null);
      if (localPath && localPath.startsWith(__dirname)) {
        try {
          const parentDir = path.dirname(localPath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          fs.writeFileSync(localPath, patchContent, 'utf-8');
          console.log(`[AutoHeal Server] Synchronously saved patch locally to codespace: ${localPath}`);
        } catch (localWriteErr) {
          console.warn(`[AutoHeal Server] Local codespace save skipped (possibly production read-only filesystem): ${localWriteErr.message}`);
        }
      }
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

      const filesToProcess = files ? files : [{ path: repoRelativePath, content: content }];

      // Sync patch to physical local codespace/workspace files
      for (const f of filesToProcess) {
        const localPath = FILE_MAP[f.path] || (f.path ? path.resolve(__dirname, f.path) : null);
        if (localPath && localPath.startsWith(__dirname)) {
          try {
            const parentDir = path.dirname(localPath);
            if (!fs.existsSync(parentDir)) {
              fs.mkdirSync(parentDir, { recursive: true });
            }
            fs.writeFileSync(localPath, f.content, 'utf-8');
            console.log(`[AutoHeal Server] Synchronously saved patch locally to codespace: ${localPath}`);
          } catch (localWriteErr) {
            console.warn(`[AutoHeal Server] Local codespace save skipped (possibly production read-only filesystem): ${localWriteErr.message}`);
          }
        }
      }

      let lastSha = null;

      for (const f of filesToProcess) {
        const p = relativeFileMap[f.path] || f.path;
        const apiPath = `/repos/${repo}/contents/${p}`;

        // 1. Fetch file content to get the SHA
        const getRes = await githubApiCall(token, `${apiPath}?ref=${branch}`, 'GET');
        let currentSha = null;
        if (getRes.status === 200 && getRes.body) currentSha = getRes.body.sha;

        // 2. Commit file to GitHub
        console.log(`[AutoHeal Server] Committing file patch directly to GitHub: ${repo}/${p}`);
        const commitMessage = clientCommitMsg || `🤖 AutoHeal: auto-patch file ${p}`;
        const putBody = {
          message: commitMessage,
          content: Buffer.from(f.content).toString('base64'),
          branch: branch
        };
        if (currentSha) putBody.sha = currentSha;

        const putRes = await githubApiCall(token, apiPath, 'PUT', putBody);
        if (putRes.status !== 200 && putRes.status !== 201) {
          throw new Error(`GitHub commit failed for ${p}: ${JSON.stringify(putRes.body)}`);
        }
        lastSha = putRes.body?.content?.sha;
      }

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
        message: `Successfully committed ${filesToProcess.length} file(s) directly to GitHub repo: ${repo}`,
        sha: lastSha
      });
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
// ROBUST MULTI-TENANT DATABASE LAYER (SUPABASE + LOCAL FILE FALLBACK)
// ==========================================
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || process.env.AUTOHEAL_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.AUTOHEAL_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseKey || 'dummy_key');

const DB_PATH = path.join(__dirname, 'db.json');

function loadLocalDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('[AutoHeal DB] Error reading local db.json:', err.message);
  }
  return { sites: {} };
}

function saveLocalDb(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('[AutoHeal DB] Error writing to local db.json:', err.message);
  }
}

async function resolveAndSyncCredentials(siteId, site) {
  const normalizedSiteId = siteId || 'localhost:5173';
  if (!site || !site.settings) return;

  const isPlaceholder = (val) => {
    if (!val) return true;
    const s = val.trim().toUpperCase();
    return s === '' || s === 'YOUR_GROQ_API_KEY' || s === 'YOUR_GEMINI_API_KEY' || s === 'PLACEHOLDER';
  };

  const keysToSync = [
    { settingKey: 'groqKey', dbKey: 'groqKey', supabaseCol: 'groq_key', envFallbacks: ['GROQ_API_KEY', 'AUTOHEAL_GROQ_KEY'] },
    { settingKey: 'geminiKey', dbKey: 'geminiKey', supabaseCol: 'gemini_key', envFallbacks: ['GEMINI_API_KEY', 'AUTOHEAL_GEMINI_KEY'] },
    { settingKey: 'githubToken', dbKey: 'githubToken', supabaseCol: 'github_token', envFallbacks: ['GITHUB_TOKEN', 'AUTOHEAL_GITHUB_TOKEN'] },
    { settingKey: 'githubRepo', dbKey: 'githubRepo', supabaseCol: 'github_repo', envFallbacks: ['GITHUB_REPO', 'AUTOHEAL_GITHUB_REPO'] },
    { settingKey: 'vercelDeployHook', dbKey: 'vercelDeployHook', supabaseCol: 'vercel_deploy_hook', envFallbacks: ['VERCEL_DEPLOY_HOOK', 'AUTOHEAL_VERCEL_DEPLOY_HOOK'] },
    { settingKey: 'n8nWebhook', dbKey: 'n8nWebhook', supabaseCol: 'n8n_webhook', envFallbacks: ['N8N_WEBHOOK', 'AUTOHEAL_N8N_WEBHOOK'] }
  ];

  let supabaseKeys = null;
  if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://example.supabase.co') {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('id', normalizedSiteId)
        .single();
      if (!error && data) {
        supabaseKeys = data;
      }
    } catch (err) {
      console.warn('[AutoHeal DB] Supabase user_api_keys fetch failed:', err.message);
    }
  }

  const db = loadLocalDb();
  const localKeys = (db.user_api_keys && db.user_api_keys[normalizedSiteId]) || {};

  let hasChanges = false;
  for (const item of keysToSync) {
    let currentVal = site.settings[item.settingKey];

    if (isPlaceholder(currentVal)) {
      let resolvedVal = '';
      if (supabaseKeys && supabaseKeys[item.supabaseCol]) {
        resolvedVal = supabaseKeys[item.supabaseCol];
      }
      if (isPlaceholder(resolvedVal) && localKeys[item.dbKey]) {
        resolvedVal = localKeys[item.dbKey];
      }
      if (isPlaceholder(resolvedVal)) {
        for (const envVar of item.envFallbacks) {
          if (process.env[envVar]) {
            resolvedVal = process.env[envVar];
            break;
          }
        }
      }

      if (!isPlaceholder(resolvedVal)) {
        site.settings[item.settingKey] = resolvedVal;
        hasChanges = true;
      } else {
        if (currentVal !== '') {
          site.settings[item.settingKey] = '';
          hasChanges = true;
        }
      }
    }
  }

  if (hasChanges) {
    console.log(`[AutoHeal DB] Resolved and updated credentials for: ${normalizedSiteId}`);
    if (!db.sites) db.sites = {};
    db.sites[normalizedSiteId] = site;
    if (!db.user_api_keys) db.user_api_keys = {};
    db.user_api_keys[normalizedSiteId] = {
      siteId: normalizedSiteId,
      groqKey: site.settings.groqKey || '',
      geminiKey: site.settings.geminiKey || '',
      githubToken: site.settings.githubToken || '',
      githubRepo: site.settings.githubRepo || '',
      vercelDeployHook: site.settings.vercelDeployHook || '',
      n8nWebhook: site.settings.n8nWebhook || '',
      updatedAt: new Date().toISOString()
    };
    saveLocalDb(db);

    if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://example.supabase.co') {
      supabase.from('sites').upsert({ id: normalizedSiteId, data: site }, { onConflict: 'id' }).catch(err => {
        console.error('[AutoHeal DB] Async Supabase sync error:', err.message);
      });
      supabase.from('user_api_keys').upsert({
        id: normalizedSiteId,
        groq_key: site.settings.groqKey || '',
        gemini_key: site.settings.geminiKey || '',
        github_token: site.settings.githubToken || '',
        github_repo: site.settings.githubRepo || '',
        vercel_deploy_hook: site.settings.vercelDeployHook || '',
        n8n_webhook: site.settings.n8nWebhook || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).catch(err => {
        console.error('[AutoHeal DB] Async Supabase user_api_keys sync error:', err.message);
      });
    }
  }
}

async function getSiteData(siteId) {
  const normalizedSiteId = siteId || 'localhost:5173';
  let site = null;

  // 1. Try Supabase if configured
  if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://example.supabase.co') {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('data')
        .eq('id', normalizedSiteId)
        .single();
      
      if (!error && data?.data) {
        site = data.data;
      }
    } catch (err) {
      console.warn('[AutoHeal DB] Supabase fetch failed, trying local fallback:', err.message);
    }
  }

  // 2. Try local db.json fallback
  if (!site) {
    const db = loadLocalDb();
    if (db.sites && db.sites[normalizedSiteId]) {
      site = db.sites[normalizedSiteId];
      console.log(`[AutoHeal DB] Loaded site data from local db.json for: ${normalizedSiteId}`);
    }
  }

  // 3. Fallback to default blueprint if not found anywhere
  if (!site) {
    // Only pre-populate developer credentials for localhost or for their own configured primary domain
    const isLocal = normalizedSiteId.includes('localhost') || normalizedSiteId.includes('127.0.0.1');
    const isPrimaryOwner = isLocal || (process.env.AUTOHEAL_GITHUB_REPO && normalizedSiteId.includes(process.env.AUTOHEAL_GITHUB_REPO.split('/')[0]));

    site = {
      errors: [],
      customDb: {},
      settings: {
        n8nWebhook: isPrimaryOwner ? (process.env.N8N_WEBHOOK || process.env.AUTOHEAL_N8N_WEBHOOK || '') : '',
        vercelDeployHook: isPrimaryOwner ? (process.env.VERCEL_DEPLOY_HOOK || process.env.AUTOHEAL_VERCEL_DEPLOY_HOOK || '') : '',
        gitBranch: 'main',
        githubRepo: isPrimaryOwner ? (process.env.GITHUB_REPO || process.env.AUTOHEAL_GITHUB_REPO || '') : '',
        githubToken: isPrimaryOwner ? (process.env.GITHUB_TOKEN || process.env.AUTOHEAL_GITHUB_TOKEN || '') : '',
        modelProvider: process.env.MODEL_PROVIDER || 'groq',
        geminiKey: process.env.GEMINI_API_KEY || process.env.AUTOHEAL_GEMINI_KEY || '',
        groqKey: process.env.GROQ_API_KEY || process.env.AUTOHEAL_GROQ_KEY || ''
      },
      scores: { polish: 52, spacing: 60, mobile: 45, conversion: 55 }
    };
    await saveSiteData(normalizedSiteId, site);
  }

  await resolveAndSyncCredentials(normalizedSiteId, site);
  return site;
}

async function saveSiteData(siteId, siteData) {
  const normalizedSiteId = siteId || 'localhost:5173';

  // 1. Always save locally to db.json
  const db = loadLocalDb();
  if (!db.sites) db.sites = {};
  db.sites[normalizedSiteId] = siteData;

  // Sync to user_api_keys table/root locally
  if (!db.user_api_keys) db.user_api_keys = {};
  if (siteData.settings) {
    db.user_api_keys[normalizedSiteId] = {
      siteId: normalizedSiteId,
      groqKey: siteData.settings.groqKey || '',
      geminiKey: siteData.settings.geminiKey || '',
      githubToken: siteData.settings.githubToken || '',
      githubRepo: siteData.settings.githubRepo || '',
      vercelDeployHook: siteData.settings.vercelDeployHook || '',
      n8nWebhook: siteData.settings.n8nWebhook || '',
      updatedAt: new Date().toISOString()
    };
  }
  saveLocalDb(db);

  // 2. Save to Supabase if configured
  if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://example.supabase.co') {
    try {
      const { error } = await supabase
        .from('sites')
        .upsert({ id: normalizedSiteId, data: siteData }, { onConflict: 'id' });
      if (error) {
        console.error('[AutoHeal DB] Supabase upsert error:', error);
      }

      // Sync credentials to Supabase user_api_keys table
      if (siteData.settings) {
        const { error: keyError } = await supabase
          .from('user_api_keys')
          .upsert({
            id: normalizedSiteId,
            groq_key: siteData.settings.groqKey || '',
            gemini_key: siteData.settings.geminiKey || '',
            github_token: siteData.settings.githubToken || '',
            github_repo: siteData.settings.githubRepo || '',
            vercel_deploy_hook: siteData.settings.vercelDeployHook || '',
            n8n_webhook: siteData.settings.n8nWebhook || '',
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        if (keyError) {
          console.warn('[AutoHeal DB] Supabase optional user_api_keys table sync skipped/failed:', keyError.message);
        }
      }
    } catch (err) {
      console.error('[AutoHeal DB] Supabase save failed:', err.message);
    }
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
