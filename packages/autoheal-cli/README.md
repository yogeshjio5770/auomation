# @autoheal/setup

> Interactive CLI wizard that connects AutoHeal to GitHub, Vercel, and N8N in under 60 seconds.

## What it does

When you run this wizard it will:

1. **GitHub** — Login via browser OAuth (or paste a PAT). Optionally create a new repo for your project.
2. **Vercel** — Login via `vercel` CLI or paste an API token. Creates a project linked to your GitHub repo and generates a deploy hook.
3. **N8N** — Guide you to deploy N8N on Render (free) and configure the AutoHeal Git Bridge webhook.
4. **Config** — Writes `.autoheal.json` (non-secret) and `.env.local` (secrets). Updates `.gitignore`. Syncs settings to your AutoHeal dev server automatically.

## Usage

### Option A — Run once manually
```bash
npx @autoheal/setup
```

### Option B — Auto-run on `npm install`
Add to your `package.json`:
```json
{
  "scripts": {
    "postinstall": "autoheal-setup"
  }
}
```

### Option C — As part of your dev setup
```bash
npm run setup
```
Add to your `package.json`:
```json
{
  "scripts": {
    "setup": "autoheal-setup"
  }
}
```

## Requirements

- Node.js ≥ 18
- Zero external dependencies (uses only built-in Node.js modules)

## The Full Auto-Heal Flow After Setup

```
Error detected on your website
    ↓
AutoHeal AI generates a fix
    ↓
Fix written to disk locally
    ↓
gitBridge.dispatch() called automatically
    ↓
POST → N8N Webhook (your Render instance)
    ↓
N8N commits fix to GitHub
    ↓
GitHub triggers Vercel/Render rebuild
    ↓
Live website heals itself ✓
```

## Files Created

| File | Contents |
|---|---|
| `.autoheal.json` | Non-secret config (repo name, N8N URL, Vercel project URL) |
| `.env.local` | Secret tokens (GitHub PAT, Vercel token, deploy hook) |

> ⚠️ **Never commit `.env.local`** — it contains your secret tokens. The wizard adds it to `.gitignore` automatically.

## N8N Workflow

After running this wizard, import the `n8n_git_bridge_workflow.json` file into your N8N instance:

1. Open your N8N dashboard (e.g. `https://my-n8n.onrender.com`)
2. Go to **Workflows → Import from File**
3. Select `n8n_git_bridge_workflow.json`
4. Add your GitHub credentials in the GitHub node
5. **Activate** the workflow

## Re-running the Wizard

You can safely re-run the wizard at any time to update credentials:

```bash
npx @autoheal/setup
```

Existing values are pre-filled so you only need to update what changed.
