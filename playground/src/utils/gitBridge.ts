/**
 * GitBridge — dispatches every AutoHeal patch to N8N → GitHub → Vercel
 */

export interface GitDispatchPayload {
  file: string;
  content: string;
  diffCode: string;
  commitMessage: string;
}

export interface GitDispatchResult {
  success: boolean;
  mode: 'live' | 'simulation' | 'disabled';
  message: string;
  commitUrl?: string;
}

class GitBridge {
  private async getSettings(): Promise<{
    n8nWebhook: string;
    vercelDeployHook: string;
    githubRepo: string;
    githubToken: string;
    githubBranch: string;
  }> {
    try {
      const siteId = window.location.host;
      const backendUrl = localStorage.getItem('ah_backend_url') || 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/settings`, {
        headers: { 'x-site-id': siteId },
      });
      if (res.ok) {
        const data = await res.json();
        return data.settings || {};
      }
    } catch (_) {}
    return {
      n8nWebhook: localStorage.getItem('ah_n8n_webhook') || '',
      vercelDeployHook: localStorage.getItem('ah_vercel_hook') || '',
      githubRepo: localStorage.getItem('ah_github_repo') || '',
      githubToken: localStorage.getItem('ah_github_token') || '',
      githubBranch: localStorage.getItem('ah_github_branch') || 'main',
    };
  }

  /**
   * Dispatch a patch through the Express server → N8N → GitHub → Vercel
   * The Express server securely injects credentials server-side.
   * Falls back to simulation if no backend is configured.
   */
  public async dispatch(payload: GitDispatchPayload): Promise<GitDispatchResult> {
    const settings = await this.getSettings();
    const backendUrl = localStorage.getItem('ah_backend_url') || 'http://localhost:3001';
    const siteId = window.location.host;

    // ── Check if cloud mode is active (n8nWebhook or githubRepo configured) ──
    const hasCloudConfig = !!(settings.n8nWebhook || (settings.githubRepo && settings.githubToken));

    if (!hasCloudConfig) {
      // ── Simulation mode (nothing configured) ──────────────────────────
      await this.simulateDispatch(payload);
      return {
        success: true,
        mode: 'simulation',
        message: '[SIMULATION] Git commit dispatched to mock N8N bridge',
      };
    }

    // ── Live mode — route through Express server ─────────────────────────
    // The server looks up credentials from db.json and either:
    //   1. Forwards to N8N Cloud Bridge (creativekulhad.onrender.com)
    //   2. Commits directly to GitHub API
    try {
      const res = await fetch(`${backendUrl}/api/apply-patch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-site-id': siteId,
        },
        body: JSON.stringify({
          file: payload.file,
          content: payload.content,
          commitMessage: payload.commitMessage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      console.log('[AutoHeal GitBridge] Patch dispatched via server:', data);

      return {
        success: true,
        mode: 'live',
        message: data.message || `✓ Patch committed via ${data.mode}`,
        commitUrl: data.n8nResponse?.commitUrl || data.commitUrl,
      };
    } catch (e: any) {
      console.error('[AutoHeal GitBridge] Dispatch failed:', e.message);
      return {
        success: false,
        mode: 'live',
        message: `✗ Git push failed: ${e.message}`,
      };
    }
  }

  /**
   * Simulate a git commit with realistic terminal output delays
   */
  private async simulateDispatch(payload: GitDispatchPayload): Promise<void> {
    const steps = [
      `[SIMULATION] Connecting to N8N bridge at selfheal-patch-handler...`,
      `[SIMULATION] Staging file: ${payload.file}`,
      `[SIMULATION] Committing: "${payload.commitMessage}"`,
      `[SIMULATION] Pushing to origin/main...`,
      `[SIMULATION] Webhook payload delivered. Vercel rebuild triggered.`,
    ];
    for (const step of steps) {
      console.log('[AutoHeal GitBridge]', step);
      await new Promise(r => setTimeout(r, 350));
    }
  }
}

export const gitBridge = new GitBridge();
