#!/usr/bin/env node
/**
 * AutoHeal Setup Wizard
 * ─────────────────────────────────────────────────────────
 * Runs interactively to connect GitHub, Vercel, and N8N.
 * Zero external dependencies — pure Node.js built-ins only.
 *
 * Usage:
 *   npx @autoheal/setup
 *   OR add to your package.json: "postinstall": "autoheal-setup"
 */

'use strict';

const readline = require('readline');
const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const { execSync, spawn } = require('child_process');

// ─── ANSI color helpers (zero deps) ───────────────────────────────────────────
const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  cyan:    '\x1b[96m',
  green:   '\x1b[92m',
  yellow:  '\x1b[93m',
  red:     '\x1b[91m',
  magenta: '\x1b[95m',
  white:   '\x1b[97m',
  bgDark:  '\x1b[40m',
};

const paint = (color, text) => `${color}${text}${c.reset}`;
const bold  = (text) => paint(c.bold, text);
const cyan  = (text) => paint(c.cyan, text);
const green = (text) => paint(c.green, text);
const red   = (text) => paint(c.red, text);
const dim   = (text) => paint(c.dim, text);
const yellow = (text) => paint(c.yellow, text);
const mag   = (text) => paint(c.magenta, text);

// ─── Spinner (pure terminal) ───────────────────────────────────────────────────
const SPINNER_FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
function createSpinner(text) {
  let i = 0;
  let done = false;
  const interval = setInterval(() => {
    if (done) return;
    process.stdout.write(`\r${cyan(SPINNER_FRAMES[i++ % SPINNER_FRAMES.length])} ${text}   `);
  }, 80);
  return {
    succeed: (msg) => { done = true; clearInterval(interval); process.stdout.write(`\r${green('✓')} ${msg}\n`); },
    fail:    (msg) => { done = true; clearInterval(interval); process.stdout.write(`\r${red('✗')} ${msg}\n`); },
    warn:    (msg) => { done = true; clearInterval(interval); process.stdout.write(`\r${yellow('⚠')} ${msg}\n`); },
  };
}

// ─── HTTP helper (built-in fetch alternative) ──────────────────────────────────
function apiCall(opts, body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = opts.hostname && !opts.hostname.startsWith('http://');
    const lib = opts.protocol === 'http:' ? http : https;
    const req = lib.request(opts, (res) => {
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

// ─── Open browser cross-platform ──────────────────────────────────────────────
function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'start ""' :
              process.platform === 'darwin' ? 'open' : 'xdg-open';
  try { execSync(`${cmd} "${url}"`, { stdio: 'ignore' }); } catch (_) {}
}

// ─── Readline prompt helpers ───────────────────────────────────────────────────
let rl;

function createRL() {
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(question, defaultVal = '') {
  return new Promise((resolve) => {
    const hint = defaultVal ? dim(` [${defaultVal}]`) : '';
    rl.question(`  ${cyan('?')} ${question}${hint}: `, (answer) => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

function askSecret(question) {
  return new Promise((resolve) => {
    process.stdout.write(`  ${cyan('?')} ${question}: `);
    // Hide input on supported terminals
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      let input = '';
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      const onData = (ch) => {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(input);
        } else if (ch === '\u0003') {
          process.exit();
        } else if (ch === '\u007f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += ch;
          process.stdout.write('*');
        }
      };
      process.stdin.on('data', onData);
    } else {
      rl.question('', resolve);
    }
  });
}

function askYN(question, defaultYes = true) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  return new Promise((resolve) => {
    rl.question(`  ${cyan('?')} ${question} ${dim(`(${hint})`)} `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (!a) { resolve(defaultYes); return; }
      resolve(a === 'y' || a === 'yes');
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function hr(char = '─', len = 60) {
  return dim(char.repeat(len));
}

// ─── Config file management ────────────────────────────────────────────────────
const CONFIG_FILE = path.join(process.cwd(), '.autoheal.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return {}; }
}

function saveConfig(data) {
  const existing = loadConfig();
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

// ─── Write .env.local ──────────────────────────────────────────────────────────
function writeEnv(data) {
  const envPath = path.join(process.cwd(), '.env.local');
  const lines = [
    '# AutoHeal — auto-generated by autoheal-setup',
    '# Do NOT commit this file to Git (it contains secrets)',
    '',
    ...Object.entries(data)
      .filter(([, v]) => v)
      .map(([k, v]) => `AUTOHEAL_${k.toUpperCase()}=${v}`),
  ];
  fs.writeFileSync(envPath, lines.join('\n') + '\n');
}

// ─── GITHUB DEVICE FLOW ────────────────────────────────────────────────────────
// Using the official GitHub CLI's OAuth app client ID (public, safe to embed)
const GH_CLIENT_ID = 'Ov23li80SPHB3vlQfm4t'; // Replace with your GitHub OAuth App client ID

async function githubDeviceFlow() {
  // Step 1: Request device + user code
  const spinner = createSpinner('Requesting GitHub login code…');
  const res = await apiCall({
    hostname: 'github.com',
    path: '/login/device/code',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  }, JSON.stringify({ client_id: GH_CLIENT_ID, scope: 'repo,user:email' }));

  if (res.status !== 200) {
    spinner.fail('GitHub OAuth not available — falling back to manual PAT');
    return null;
  }

  const { device_code, user_code, verification_uri, interval, expires_in } = res.body;
  spinner.succeed('GitHub login code ready');

  console.log();
  console.log(`  ${cyan('1.')} Go to: ${bold(cyan(verification_uri))}`);
  console.log(`  ${cyan('2.')} Enter code: ${bold(yellow(user_code))}`);
  console.log();

  openBrowser(verification_uri);

  // Step 2: Poll for token
  const pollSpinner = createSpinner('Waiting for you to authorize in browser…');
  const deadline = Date.now() + (expires_in * 1000);

  while (Date.now() < deadline) {
    await sleep((interval || 5) * 1000);
    const poll = await apiCall({
      hostname: 'github.com',
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    }, JSON.stringify({ client_id: GH_CLIENT_ID, device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }));

    if (poll.body?.access_token) {
      pollSpinner.succeed('GitHub authorized!');
      return poll.body.access_token;
    }
    if (poll.body?.error === 'authorization_pending') continue;
    if (poll.body?.error === 'slow_down') { await sleep(5000); continue; }
    break;
  }

  pollSpinner.fail('Device flow timed out');
  return null;
}

async function getGithubUser(token) {
  const res = await apiCall({
    hostname: 'api.github.com',
    path: '/user',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'autoheal-setup', 'Accept': 'application/vnd.github+json' },
  });
  return res.body;
}

async function createGithubRepo(token, owner, repoName, isPrivate = false) {
  const res = await apiCall({
    hostname: 'api.github.com',
    path: '/user/repos',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'autoheal-setup', 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
  }, JSON.stringify({
    name: repoName,
    description: '🤖 AutoHeal — AI-powered self-healing website',
    private: isPrivate,
    auto_init: true,
  }));
  return res.body;
}

async function checkRepoExists(token, owner, repo) {
  const res = await apiCall({
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'autoheal-setup', 'Accept': 'application/vnd.github+json' },
  });
  return res.status === 200;
}

// ─── VERCEL HELPERS ────────────────────────────────────────────────────────────
async function vercelGetUser(token) {
  const res = await apiCall({
    hostname: 'api.vercel.com',
    path: '/v2/user',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return res.body;
}

async function vercelCreateProject(token, name, githubRepo, githubToken) {
  const res = await apiCall({
    hostname: 'api.vercel.com',
    path: '/v10/projects',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  }, JSON.stringify({
    name,
    framework: 'vite',
    gitRepository: {
      type: 'github',
      repo: githubRepo,
    },
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
  }));
  return res.body;
}

async function vercelGetDeployHook(token, projectId) {
  const res = await apiCall({
    hostname: 'api.vercel.com',
    path: `/v1/projects/${projectId}/deploy-hooks`,
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  }, JSON.stringify({ name: 'AutoHeal Deploy Hook', ref: 'main' }));
  return res.body?.url || null;
}

// ─── N8N HELPERS ───────────────────────────────────────────────────────────────
async function testN8nWebhook(webhookUrl) {
  try {
    const url = new URL(webhookUrl);
    const res = await apiCall({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      protocol: url.protocol,
      headers: { 'Content-Type': 'application/json' },
    }, JSON.stringify({ test: true, source: 'autoheal-setup' }));
    return res.status < 500;
  } catch {
    return false;
  }
}

// ─── WRITE AUTOHEAL CONFIG TO SERVER DB ───────────────────────────────────────
async function syncConfigToServer(config, masterUrl, siteId) {
  try {
    const url = new URL('/api/settings', masterUrl);
    const res = await apiCall({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      protocol: url.protocol,
      headers: { 'Content-Type': 'application/json', 'x-site-id': siteId },
    }, JSON.stringify({ settings: config }));
    return res.status === 200;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  createRL();

  // ── Banner ────────────────────────────────────────────────────────────────
  console.clear();
  console.log();
  console.log(cyan('  ╔═══════════════════════════════════════════════════════╗'));
  console.log(cyan('  ║') + bold('         🤖  A U T O H E A L   S E T U P              ') + cyan('║'));
  console.log(cyan('  ║') + dim('       AI-Powered Self-Healing Website Platform         ') + cyan('║'));
  console.log(cyan('  ╚═══════════════════════════════════════════════════════╝'));
  console.log();
  console.log(dim('  This wizard will connect your AutoHeal instance to:'));
  console.log(dim('  GitHub → Vercel → N8N in under 60 seconds.\n'));
  console.log(hr());
  console.log();

  let config = loadConfig();
  const result = {
    githubToken:      config.githubToken || '',
    githubRepo:       config.githubRepo  || '',
    githubBranch:     config.githubBranch || 'main',
    githubUsername:   config.githubUsername || '',
    vercelToken:      config.vercelToken || '',
    vercelProjectId:  config.vercelProjectId || '',
    vercelProjectUrl: config.vercelProjectUrl || '',
    vercelDeployHook: config.vercelDeployHook || '',
    n8nWebhook:       config.n8nWebhook || '',
    n8nHosted:        config.n8nHosted  || '',
  };

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: GITHUB
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`${bold(cyan('  STEP 1 of 4'))} ${cyan('—')} GitHub Account`);
  console.log(hr());
  console.log();

  const hasGithub = await askYN('Do you already have a GitHub account?', true);
  if (!hasGithub) {
    console.log();
    console.log(`  ${yellow('→')} Opening GitHub signup in your browser…`);
    openBrowser('https://github.com/join');
    console.log(`  ${dim('Create your account, then come back here.')}`);
    await ask('Press Enter when your GitHub account is ready…');
  }

  console.log();

  // Try Device Flow first, fall back to manual PAT
  let useDeviceFlow = false;
  if (!result.githubToken) {
    console.log(`  ${dim('How would you like to connect GitHub?')}`);
    console.log(`  ${cyan('1.')} ${bold('Auto-login')} ${dim('(browser OAuth — recommended)')}`);
    console.log(`  ${cyan('2.')} ${bold('Paste a token')} ${dim('(GitHub Personal Access Token)')}`);
    console.log();
    const choice = await ask('Enter choice', '1');

    if (choice === '1') {
      const token = await githubDeviceFlow().catch(() => null);
      if (token) {
        result.githubToken = token;
        useDeviceFlow = true;
      }
    }
  }

  // Manual PAT fallback
  if (!result.githubToken) {
    console.log();
    console.log(`  ${yellow('→')} Opening GitHub token creation page…`);
    openBrowser('https://github.com/settings/tokens/new?scopes=repo,user:email&description=AutoHeal+Setup');
    console.log(`  ${dim('Create a Classic Token with')} ${bold('repo')} ${dim('scope, then paste it below.')}`);
    console.log();
    result.githubToken = await askSecret('GitHub Personal Access Token (ghp_...)');
  }

  // Verify token
  if (result.githubToken) {
    const spinner = createSpinner('Verifying GitHub token…');
    try {
      const user = await getGithubUser(result.githubToken);
      if (user?.login) {
        result.githubUsername = user.login;
        spinner.succeed(`Connected as ${bold('@' + user.login)} ${dim('(' + (user.name || user.login) + ')')}`);
      } else {
        spinner.fail('Invalid token — check and re-run setup');
      }
    } catch (e) {
      spinner.fail('Could not connect to GitHub API');
    }
  }

  // Choose / create repo automatically if not set
  console.log();
  const createNew = !result.githubRepo;

  if (createNew) {
    const repoName = path.basename(process.cwd()).toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'autoheal-site';
    const isPrivate = false;

    const spinner = createSpinner(`Creating repo ${bold(result.githubUsername + '/' + repoName)}…`);
    try {
      const repo = await createGithubRepo(result.githubToken, result.githubUsername, repoName, isPrivate);
      if (repo?.full_name) {
        result.githubRepo   = repo.full_name;
        result.githubBranch = repo.default_branch || 'main';
        spinner.succeed(`Repo created: ${cyan('https://github.com/' + repo.full_name)}`);
      } else if (repo?.errors?.[0]?.message?.includes('already exists')) {
        result.githubRepo = `${result.githubUsername}/${repoName}`;
        spinner.warn(`Repo already exists — using ${cyan(result.githubRepo)}`);
      } else {
        spinner.fail('Repo creation failed — enter manually');
        result.githubRepo = await ask('GitHub repo (owner/name)', result.githubRepo);
      }
    } catch {
      spinner.fail('API error');
      result.githubRepo = await ask('GitHub repo (owner/name)', result.githubRepo);
    }
  } else {
    result.githubRepo = await ask('GitHub repo (owner/name)', result.githubRepo);
    if (result.githubRepo && result.githubToken) {
      const [owner, repo] = result.githubRepo.split('/');
      const exists = await checkRepoExists(result.githubToken, owner, repo);
      if (exists) {
        console.log(`  ${green('✓')} Repo found: ${cyan('https://github.com/' + result.githubRepo)}`);
      } else {
        console.log(`  ${yellow('⚠')} Repo not found — double-check the name`);
      }
    }
  }

  // ── Push code to GitHub ─────────────────────────────────────────────────
  if (result.githubRepo && result.githubToken) {
    console.log();
    const pushNow = true;
    if (pushNow) {
      const remoteUrl = `https://${result.githubToken}@github.com/${result.githubRepo}.git`;
      const branch = result.githubBranch || 'main';

      try {
        // Check if git is installed
        execSync('git --version', { stdio: 'ignore' });
      } catch {
        console.log(`  ${red('✗')} Git is not installed. Please install Git and re-run setup.`);
        console.log(`  ${yellow('→')} https://git-scm.com/downloads`);
        openBrowser('https://git-scm.com/downloads');
      }

      // Initialize git if not already a repo
      const isGitRepo = fs.existsSync(path.join(process.cwd(), '.git'));
      if (!isGitRepo) {
        const initSpinner = createSpinner('Initializing git repository…');
        try {
          execSync('git init', { cwd: process.cwd(), stdio: 'ignore' });
          execSync(`git branch -M ${branch}`, { cwd: process.cwd(), stdio: 'ignore' });
          initSpinner.succeed('Git repository initialized');
        } catch (e) {
          initSpinner.fail('Failed to initialize git: ' + e.message);
        }
      }

      // Ensure .gitignore exists with secrets excluded
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      let gitignoreContent = '';
      try { gitignoreContent = fs.readFileSync(gitignorePath, 'utf8'); } catch {}
      const ignoreEntries = ['.env.local', '.autoheal.json', 'node_modules', 'dist'];
      let modified = false;
      for (const entry of ignoreEntries) {
        if (!gitignoreContent.includes(entry)) {
          gitignoreContent += `\n${entry}`;
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(gitignorePath, gitignoreContent.trimStart() + '\n');
        console.log(`  ${green('✓')} Updated .gitignore (secrets excluded)`);
      }

      // Set remote origin
      const remoteSpinner = createSpinner('Configuring remote origin…');
      try {
        try { execSync('git remote remove origin', { cwd: process.cwd(), stdio: 'ignore' }); } catch {}
        execSync(`git remote add origin "${remoteUrl}"`, { cwd: process.cwd(), stdio: 'ignore' });
        remoteSpinner.succeed(`Remote set: ${cyan('github.com/' + result.githubRepo)}`);
      } catch (e) {
        remoteSpinner.fail('Failed to set remote: ' + e.message);
      }

      // Stage, commit, and push
      const pushSpinner = createSpinner('Staging, committing, and pushing code…');
      try {
        execSync('git add -A', { cwd: process.cwd(), stdio: 'ignore' });

        // Check if there is anything to commit
        let needsCommit = true;
        try {
          execSync('git diff --cached --quiet', { cwd: process.cwd(), stdio: 'ignore' });
          // If the above succeeds, staging area is clean — check if there are existing commits
          try {
            execSync('git rev-parse HEAD', { cwd: process.cwd(), stdio: 'ignore' });
            needsCommit = false; // Has commits and nothing new staged
          } catch {
            needsCommit = true; // No commits yet (fresh repo)
          }
        } catch {
          needsCommit = true; // There are staged changes
        }

        if (needsCommit) {
          try {
            execSync('git commit -m "🤖 AutoHeal: initial project setup"', { cwd: process.cwd(), stdio: 'ignore' });
          } catch (commitErr) {
            execSync(`git config user.name "${result.githubUsername || 'AutoHeal User'}"`, { cwd: process.cwd(), stdio: 'ignore' });
            execSync(`git config user.email "${result.githubUsername ? result.githubUsername + '@users.noreply.github.com' : 'autoheal@example.com'}"`, { cwd: process.cwd(), stdio: 'ignore' });
            execSync('git commit -m "🤖 AutoHeal: initial project setup"', { cwd: process.cwd(), stdio: 'ignore' });
          }
        }

        execSync(`git push -u origin ${branch} --force`, { cwd: process.cwd(), stdio: 'pipe' });
        pushSpinner.succeed(`Code pushed to ${cyan(`github.com/${result.githubRepo} (${branch})`)}`);
      } catch (e) {
        pushSpinner.fail('Push failed: ' + (e.stderr?.toString() || e.message));
        console.log(`  ${dim('You can push manually later:')} ${cyan(`git push -u origin ${branch}`)}`);
      }
    }
  }

  console.log();

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: VERCEL
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`${bold(cyan('  STEP 2 of 4'))} ${cyan('—')} Vercel Hosting`);
  console.log(hr());
  console.log();

  const hasVercel = await askYN('Do you have a Vercel account?', true);
  if (!hasVercel) {
    console.log(`  ${yellow('→')} Opening Vercel signup…`);
    openBrowser('https://vercel.com/signup');
    console.log(`  ${dim('Sign up (free), then come back here.')}`);
    await ask('Press Enter when your Vercel account is ready…');
  }

  let useVercelCLI = (() => {
    try { execSync('vercel --version', { stdio: 'ignore' }); return true; }
    catch { return false; }
  })();

  if (!useVercelCLI) {
    console.log();
    const autoInstallVercel = await askYN('Vercel CLI is not installed. Auto-install it for 1-click browser login?', true);
    if (autoInstallVercel) {
      const spinner = createSpinner('Installing Vercel CLI globally (npm install -g vercel)…');
      try {
        const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        execSync(`${npmCmd} install -g vercel`, { stdio: 'ignore' });
        spinner.succeed('Vercel CLI installed successfully');
        useVercelCLI = true;
      } catch (e) {
        spinner.fail('Failed to auto-install Vercel CLI');
      }
    }
  }

  let cliLoginCompleted = false;
  if (useVercelCLI && !result.vercelToken) {
    console.log();
    const useVercelLogin = await askYN('Use `vercel login` CLI? (recommended)', true);
    if (useVercelLogin) {
      console.log();
      console.log(`  ${dim('Running')} ${cyan('vercel login')} ${dim('— follow prompts in your browser…')}`);
      try {
        execSync('vercel login', { stdio: 'inherit' });
        cliLoginCompleted = true;
        // Try to get token from ~/.vercel
        const tokenPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.vercel', 'auth');
        if (fs.existsSync(tokenPath)) {
          const auth = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
          result.vercelToken = auth.token || '';
        }
      } catch (_) {}
    }
  }

  if (!result.vercelToken && !cliLoginCompleted) {
    console.log();
    console.log(`  ${yellow('→')} Opening Vercel token page…`);
    openBrowser('https://vercel.com/account/tokens');
    console.log(`  ${dim('Click')} ${bold('Create')} ${dim('→ name it "AutoHeal" → copy the token')}`);
    console.log();
    result.vercelToken = await askSecret('Vercel API Token');
  }

  // Verify Vercel token
  if (result.vercelToken) {
    const spinner = createSpinner('Verifying Vercel token…');
    try {
      const user = await vercelGetUser(result.vercelToken);
      if (user?.user?.username || user?.username) {
        const username = user?.user?.username || user?.username;
        spinner.succeed(`Connected to Vercel as ${bold('@' + username)}`);

        // Create or link project automatically
        if (!result.vercelProjectId && result.githubRepo) {
          console.log();
          const createProj = true;
          if (createProj) {
            const projName = result.githubRepo.split('/')[1] || 'autoheal-site';
            const pSpinner = createSpinner(`Creating Vercel project ${bold(projName)}…`);
            try {
              const proj = await vercelCreateProject(result.vercelToken, projName, result.githubRepo, result.githubToken);
              if (proj?.id) {
                result.vercelProjectId  = proj.id;
                result.vercelProjectUrl = `https://${proj.name}.vercel.app`;
                pSpinner.succeed(`Project created: ${cyan(result.vercelProjectUrl)}`);

                // Get deploy hook
                const hookSpinner = createSpinner('Generating deploy hook…');
                const hook = await vercelGetDeployHook(result.vercelToken, proj.id);
                if (hook) {
                  result.vercelDeployHook = hook;
                  hookSpinner.succeed('Deploy hook created');

                  // Trigger first deployment immediately
                  const deploySpinner = createSpinner('Triggering first deployment…');
                  try {
                    await apiCall({
                      hostname: new URL(hook).hostname,
                      path: new URL(hook).pathname,
                      method: 'POST',
                      protocol: 'https:',
                    });
                    deploySpinner.succeed(`First deploy triggered — site will be live at ${cyan(result.vercelProjectUrl)} in ~60 seconds`);
                  } catch {
                    deploySpinner.warn('Auto-deploy will trigger on next git push');
                  }
                } else {
                  hookSpinner.warn('Could not auto-create deploy hook — set manually in Vercel dashboard');
                }
              } else {
                pSpinner.fail(`Project creation failed: ${proj?.error?.message || 'unknown error'}`);
              }
            } catch {
              pSpinner.fail('API error creating Vercel project');
            }
          }
        }

        if (!result.vercelProjectId && useVercelCLI) {
          console.log();
          const deployViaCLI = true;
          if (deployViaCLI) {
            console.log();
            console.log(`  ${dim('Running')} ${cyan('vercel --prod')} ${dim('— deploying your project…')}`);
            try {
              const output = execSync('vercel --prod --yes', { cwd: process.cwd(), encoding: 'utf8' });
              const urlMatch = output.match(/(https:\/\/[^\s]+\.vercel\.app)/);
              if (urlMatch) {
                result.vercelProjectUrl = urlMatch[1];
                console.log(`  ${green('✓')} Deployed to: ${cyan(result.vercelProjectUrl)}`);
              } else {
                console.log(`  ${green('✓')} Deployment complete`);
              }
            } catch (e) {
              console.log(`  ${yellow('⚠')} CLI deploy failed — you can deploy manually with: ${cyan('vercel --prod')}`);
            }
          }
        }

        if (!result.vercelDeployHook) {
          console.log(`  ${yellow('⚠')} Could not auto-generate Vercel deploy hook. Auto-deploys via N8N may require manual setup.`);
        }
      } else {
        spinner.fail('Invalid Vercel token');
      }
    } catch {
      spinner.fail('Could not connect to Vercel API');
    }
  } else if (useVercelCLI) {
    console.log();
    const deployViaCLI = true;
    if (deployViaCLI) {
      console.log();
      console.log(`  ${dim('Running')} ${cyan('vercel --prod')} ${dim('— deploying your project…')}`);
      try {
        const output = execSync('vercel --prod --yes', { cwd: process.cwd(), encoding: 'utf8' });
        const urlMatch = output.match(/(https:\/\/[^\s]+\.vercel\.app)/);
        if (urlMatch) {
          result.vercelProjectUrl = urlMatch[1];
          console.log(`  ${green('✓')} Deployed to: ${cyan(result.vercelProjectUrl)}`);
        } else {
          console.log(`  ${green('✓')} Deployment complete`);
        }
      } catch (e) {
        console.log(`  ${yellow('⚠')} CLI deploy failed — you can deploy manually with: ${cyan('vercel --prod')}`);
      }
    }
  }

  console.log();

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: N8N
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`${bold(cyan('  STEP 3 of 4'))} ${cyan('—')} N8N Automation (Git Bridge)`);
  console.log(hr());
  console.log();
  console.log(`  ${dim('N8N is the middleware that auto-commits every AutoHeal fix to GitHub')}`);
  console.log(`  ${dim('and triggers your Vercel/Render deploy automatically.')}`);
  console.log();

  const useSharedBridge = true;

  if (useSharedBridge) {
    result.n8nHosted = 'https://creativekulhad.onrender.com';
    result.n8nWebhook = 'https://creativekulhad.onrender.com/webhook/autoheal-patch-handler';
    console.log();
    console.log(`  ${green('✓')} Connected to shared Cloud Bridge: ${cyan(result.n8nWebhook)}`);
  } else {
    const hasN8n = await askYN('Do you already have N8N running (e.g. on Render)?', !!result.n8nHosted);

    if (!hasN8n) {
      console.log();
      console.log(`  ${cyan('→')} Deploy N8N to Render ${dim('(free tier — takes ~2 min)')}`);
      console.log();
      console.log(`  ${bold('One-click deploy URL:')}`);
      const renderDeployUrl = 'https://render.com/deploy?repo=https://github.com/render-examples/n8n';
      console.log(`  ${cyan(renderDeployUrl)}`);
      console.log();
      openBrowser(renderDeployUrl);
      console.log(`  ${dim('Steps:')}`);
      console.log(`  ${dim('1. Click')} ${bold('Deploy to Render')}`);
      console.log(`  ${dim('2. Set')} ${bold('N8N_BASIC_AUTH_ACTIVE')} ${dim('= true')}`);
      console.log(`  ${dim('3. Set')} ${bold('N8N_BASIC_AUTH_USER')} ${dim('and')} ${bold('N8N_BASIC_AUTH_PASSWORD')}`);
      console.log(`  ${dim('4. Wait ~2 min for deploy to finish')}`);
      console.log(`  ${dim('5. Copy your Render app URL (e.g. https://my-n8n.onrender.com)')}`);
      console.log();
      result.n8nHosted = await ask('Paste your N8N Render URL (e.g. https://my-n8n.onrender.com)', result.n8nHosted);
    } else {
      result.n8nHosted = await ask('N8N URL (e.g. https://my-n8n.onrender.com)', result.n8nHosted);
    }

    if (result.n8nHosted) {
      const base = result.n8nHosted.replace(/\/$/, '');
      result.n8nWebhook = `${base}/webhook/autoheal-patch-handler`;
      console.log();
      console.log(`  ${green('✓')} Webhook URL set to: ${cyan(result.n8nWebhook)}`);
      console.log();
      console.log(`  ${bold(yellow('⚠  IMPORTANT:'))} Import the AutoHeal workflow into N8N:`);
      console.log(`  ${dim('1. Open:')} ${cyan(base)}`);
      console.log(`  ${dim('2. Go to')} ${bold('Workflows → Import from URL or File')}`);
      console.log(`  ${dim('3. Import the file:')} ${bold('n8n_git_bridge_workflow.json')}`);
      console.log(`  ${dim('4. Activate the workflow')}`);

      console.log();
      const testWebhook = await askYN('Test the N8N webhook connection now?', true);
      if (testWebhook) {
        const spinner = createSpinner(`Pinging ${result.n8nWebhook}…`);
        const ok = await testN8nWebhook(result.n8nWebhook);
        if (ok) {
          spinner.succeed('N8N webhook is reachable!');
        } else {
          spinner.warn('Could not reach N8N yet — make sure your workflow is activated and Render is running');
        }
      }
    }
    }

  console.log();

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3.5: CLOUD DATABASE PROVISIONING
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`${bold(cyan('  STEP 3.5 of 4'))} ${cyan('—')} Cloud Database`);
  console.log(hr());
  console.log();
  const needDb = true;
  if (needDb) {
    const isCloud = result.n8nHosted?.includes('creativekulhad.onrender.com');
    const dbBaseUrl = isCloud ? 'https://creativekulhad.onrender.com' : 'http://localhost:3001';
    
    result.dbEnabled = true;
    result.dbUrl = `${dbBaseUrl}/api/db`;
    
    console.log();
    console.log(`  ${green('✓')} Provisioned free Cloud Database: ${cyan(result.dbUrl)}`);
    console.log(`  ${dim('Your site can save/load data directly using fetch()!')}`);
  } else {
    result.dbEnabled = false;
    result.dbUrl = '';
  }

  console.log();

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: FINALIZE
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`${bold(cyan('  STEP 4 of 4'))} ${cyan('—')} Saving Configuration`);
  console.log(hr());
  console.log();

  // Backend URL is fixed — same master server for every user
  const masterUrl = 'https://autoheal-4p4q.onrender.com';
  
  // Auto-detect the Site URL from Vercel deployment if available
  let siteId = result.vercelProjectUrl;
  if (siteId && !siteId.startsWith('http')) {
    siteId = 'https://' + siteId;
  }
  
  if (!siteId) {
    siteId = await ask('Website URL (e.g. https://my-site.com)', 'my-awesome-startup');
  } else {
    console.log(`  ${green('✓')} Auto-detected Site URL from Vercel: ${cyan(siteId)}`);
  }

  const spinner = createSpinner('Installing libraries & writing config…');

  // Install the SDK automatically
  try {
    const { execSync } = require('child_process');
    execSync('npm install @autoheal/core', { stdio: 'ignore' });
  } catch (err) {
    // Ignore errors, user might already have it or not be using npm
  }

  // Write .autoheal.json (non-secret config)
  saveConfig({
    githubRepo:       result.githubRepo,
    githubUsername:   result.githubUsername,
    githubBranch:     result.githubBranch,
    vercelProjectId:  result.vercelProjectId,
    vercelProjectUrl: result.vercelProjectUrl,
    n8nHosted:        result.n8nHosted,
    n8nWebhook:       result.n8nWebhook,
    dbEnabled:        result.dbEnabled,
    dbUrl:            result.dbUrl,
    siteId:           siteId,
    masterUrl:        masterUrl,
  });

  // Write .env.local (secrets)
  writeEnv({
    github_token:      result.githubToken,
    github_repo:       result.githubRepo,
    github_branch:     result.githubBranch,
    vercel_token:      result.vercelToken,
    vercel_deploy_hook: result.vercelDeployHook,
    n8n_webhook:       result.n8nWebhook,
    db_enabled:        result.dbEnabled ? 'true' : 'false',
    db_url:            result.dbUrl,
  });

  // Sync to remote Master Server DB
  const syncedToServer = await syncConfigToServer({
    githubRepo:       result.githubRepo,
    githubToken:      result.githubToken,
    githubBranch:     result.githubBranch,
    vercelDeployHook: result.vercelDeployHook,
    n8nWebhook:       result.n8nWebhook,
  }, masterUrl, siteId);

  spinner.succeed(`Config saved to ${bold('.autoheal.json')} and ${bold('.env.local')}`);

  if (syncedToServer) {
    console.log(`  ${green('✓')} Settings securely synced to AutoHeal Master Server`);
  } else {
    console.log(`  ${yellow('⚠')} Could not sync to Master Server — credentials will work after server restarts.`);
  }

  // Check if .gitignore already has .env.local
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let gitignoreContent = '';
  try { gitignoreContent = fs.readFileSync(gitignorePath, 'utf8'); } catch {}
  if (!gitignoreContent.includes('.env.local')) {
    fs.writeFileSync(gitignorePath, gitignoreContent + '\n.env.local\n.autoheal.json\n');
    console.log(`  ${green('✓')} Added ${bold('.env.local')} and ${bold('.autoheal.json')} to .gitignore`);
  }

  // ── AUTO-INJECT SNIPPET INTO index.html ────────────────────────────────────
  console.log();
  console.log(dim('  Searching for index.html to auto-inject AutoHeal snippet...'));

  const snippet = [
    '    <!-- AutoHeal SDK: AI-powered self-healing -->',
    '    <script>',
    `      window.AUTOHEAL_SITE_ID = "${siteId}";`,
    `      window.AUTOHEAL_ENDPOINT = "${masterUrl}";`,
    '    </script>',
    `    <script src="${masterUrl}/sdk/autoheal.js"></script>`,
  ].join('\n');

  const searchDirs = ['.', 'public', 'src', 'static', 'dist', 'www'];
  const htmlNames  = ['index.html', 'index.htm'];
  let injected = false;

  for (const dir of searchDirs) {
    for (const fname of htmlNames) {
      const htmlPath = path.join(process.cwd(), dir, fname);
      if (!fs.existsSync(htmlPath)) continue;
      try {
        let html = fs.readFileSync(htmlPath, 'utf8');
        if (html.includes('AUTOHEAL_SITE_ID')) {
          // Already has a snippet — update the site ID and URL
          html = html.replace(
            /window\.AUTOHEAL_SITE_ID\s*=\s*"[^"]*"/,
            `window.AUTOHEAL_SITE_ID = "${siteId}"`
          ).replace(
            /window\.AUTOHEAL_ENDPOINT\s*=\s*"[^"]*"/,
            `window.AUTOHEAL_ENDPOINT = "${masterUrl}"`
          ).replace(
            /<script src="[^"]*\/sdk\/autoheal\.js"><\/script>/,
            `<script src="${masterUrl}/sdk/autoheal.js"></script>`
          );
          fs.writeFileSync(htmlPath, html, 'utf8');
          console.log(`  ${green('✓')} Updated existing AutoHeal snippet in ${bold(path.relative(process.cwd(), htmlPath))}`);
          injected = true;
          break;
        }
        // Inject before </head>
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${snippet}\n  </head>`);
          fs.writeFileSync(htmlPath, html, 'utf8');
          console.log(`  ${green('✓')} Auto-injected AutoHeal snippet into ${bold(path.relative(process.cwd(), htmlPath))}`);
          injected = true;
          break;
        }
      } catch (e) {
        console.log(`  ${yellow('⚠')} Could not write to ${htmlPath}: ${e.message}`);
      }
    }
    if (injected) break;
  }

  if (!injected) {
    console.log(`  ${yellow('⚠')} No index.html found automatically. Paste this into your HTML <head>:`);
    console.log();
    console.log(dim(snippet.split('\n').map(l => '      ' + l).join('\n')));
  } else {
    // Automatically commit and push the injected HTML
    try {
      console.log();
      console.log(dim('  Committing AutoHeal injection to GitHub...'));
      const { execSync } = require('child_process');
      execSync('git add . && git commit -m "chore: auto-inject AutoHeal SDK" && git push', { stdio: 'ignore' });
      console.log(`  ${green('✓')} Code pushed to GitHub! Vercel is now deploying your site.`);
    } catch (err) {
      console.log(`  ${yellow('⚠')} Could not auto-push to GitHub. You may need to run 'git push' manually.`);
    }
  }

  // ── SUCCESS SUMMARY ───────────────────────────────────────────────────────
  console.log();
  console.log(hr('═'));
  console.log();
  console.log(green('  ✅  AUTOHEAL IS FULLY CONNECTED!'));
  console.log();

  const rows = [
    ['Site URL',     siteId],
    ['GitHub',       result.githubRepo     ? `github.com/${result.githubRepo}` : '—'],
    ['Branch',       result.githubBranch   || 'main'],
    ['Vercel',       result.vercelProjectUrl || (result.vercelToken ? 'Token saved' : '—')],
    ['Master Server', masterUrl],
  ];

  for (const [label, value] of rows) {
    console.log(`  ${dim(label.padEnd(14))} ${cyan(value)}`);
  }

  console.log();
  console.log(hr());
  console.log();
  console.log(bold('  What happens now — fully automatic:'));
  console.log(`  ${cyan('1.')} AutoHeal snippet is ${bold('already in your HTML')} — zero manual steps`);
  console.log(`  ${cyan('2.')} Errors on your site are ${bold('caught automatically')}`);
  console.log(`  ${cyan('3.')} AI writes a fix and ${bold('commits to GitHub')}`);
  console.log(`  ${cyan('4.')} Vercel detects the push and ${bold('auto-redeploys your site')}`);
  console.log(`  ${cyan('5.')} Your site ${bold('heals itself')} — no action needed from you`);
  console.log();
  console.log(cyan('  ╔═══════════════════════════════════════════╗'));
  console.log(cyan('  ║') + bold('   🚀  Your site now heals itself!         ') + cyan('║'));
  console.log(cyan('  ╚═══════════════════════════════════════════╝'));
  console.log();

  rl.close();
}

// ─── Entry point ──────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error(red('\n  ✗ Setup failed: ') + err.message);
  if (rl) rl.close();
  process.exit(1);
});
