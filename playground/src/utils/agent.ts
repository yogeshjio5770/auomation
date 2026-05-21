import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ErrorData } from '../../../packages/autoheal-sdk/src/interceptor.ts';
import { gitBridge } from './gitBridge.ts';

const getBackendUrl = () => {
  return localStorage.getItem('ah_backend_url') || 'http://localhost:3001';
};

const DATABASE_CAPABILITY_INSTRUCTION = `
DATABASE CAPABILITY:
This project has a built-in multi-tenant Cloud JSON Database. The database is partitioned per website domain and supports simple HTTP/fetch calls relative to the same host:
1. READ: GET '/api/db' -> returns JSON { success: true, data: { ... } }
2. WRITE/UPDATE: POST '/api/db' with JSON body { data: { key: value } } -> merges data and returns { success: true, data }
3. APPEND (for lists of users, logs, messages): POST '/api/db/append' with JSON body { key: string, value: any } -> appends value to data[key] and returns { success: true, data }
4. CLEAR: POST '/api/db/clear' with JSON body { key: string } -> clears a key, or clears the entire database if no key is provided.

If the user asks to add features requiring storage (e.g., login views, signing up users, contact forms, feedback counters, message logs), you MUST write the React TSX component to fetch/post to these endpoints using standard browser fetch().
`;


export interface HealingResult {
  success: boolean;
  diffCode: string;
  patchCode: string;
  targetPath?: string;
  explanation: string;
}

export interface StylingResult {
  success: boolean;
  cssCode: string;
  diffCode: string;
  explanation: string;
}

/**
 * Predefined offline styling modules for instant out-of-the-box physical upgrades
 */
export const OFFLINE_STYLE_MODULES: Record<string, { cssCode: string; diffCode: string; explanation: string }> = {
  animation: {
    cssCode: `
/* ✨ Animation Upgrade Module Appended */
@keyframes neon-glow-pulse-anim {
  0% { box-shadow: 0 0 10px rgba(0, 240, 255, 0.25), inset 0 0 5px rgba(0, 240, 255, 0.1); }
  50% { box-shadow: 0 0 25px rgba(189, 0, 255, 0.45), inset 0 0 15px rgba(189, 0, 255, 0.25); }
  100% { box-shadow: 0 0 10px rgba(0, 240, 255, 0.25), inset 0 0 5px rgba(0, 240, 255, 0.1); }
}
.sandbox-card {
  animation: neon-glow-pulse-anim 5s infinite alternate !important;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.catalog-card {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
}
.catalog-card:hover {
  transform: translateY(-8px) scale(1.03) !important;
  box-shadow: 0 12px 30px rgba(0, 240, 255, 0.3) !important;
  border-color: rgba(0, 240, 255, 0.5) !important;
}
.btn-buy {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
}
.btn-buy:hover {
  transform: scale(1.05) !important;
  box-shadow: var(--glow-emerald) !important;
}
`.trim(),
    diffCode: `
+ /* ✨ Animation Upgrade Module Appended */
+ @keyframes neon-glow-pulse-anim { ... }
+ .sandbox-card { animation: neon-glow-pulse-anim 5s infinite alternate; }
+ .catalog-card:hover { transform: translateY(-8px) scale(1.03); }
`.trim(),
    explanation: "Successfully injected premium responsive micro-animations! Upgraded card layout with hovering translates, pulsing ambient glow borders, and micro-interactive transformations.",
  },
  
  modern_ui: {
    cssCode: `
/* 💎 Modern UI Upgrade Module Appended */
.sandbox-card {
  background: rgba(10, 15, 26, 0.6) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(0, 240, 255, 0.03) !important;
}
.catalog-card {
  background: rgba(255, 255, 255, 0.02) !important;
  border: 1px solid rgba(255, 255, 255, 0.04) !important;
  backdrop-filter: blur(12px) !important;
  border-radius: 12px !important;
  padding: 16px !important;
}
.store-name {
  font-family: var(--font-mono) !important;
  letter-spacing: 0.1em !important;
  background: linear-gradient(90deg, #fff, var(--neon-cyan), var(--neon-purple)) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}
.store-analytics {
  background: rgba(0, 0, 0, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.04) !important;
  border-radius: 10px !important;
}
`.trim(),
    diffCode: `
+ /* 💎 Modern UI Upgrade Module Appended */
+ .sandbox-card { backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
+ .catalog-card { backdrop-filter: blur(12px); border-radius: 12px; }
+ .store-name { background: linear-gradient(90deg, #fff, var(--neon-cyan), var(--neon-purple)); }
`.trim(),
    explanation: "Converted standard dashboard to high-fidelity Glassmorphic cards. Standardized panel borders, neon text gradients, and micro-frosted catalog layout details.",
  },

  mobile_fix: {
    cssCode: `
/* 📱 Mobile Responsiveness Module Appended */
@media (max-width: 768px) {
  .catalog-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }
  .store-analytics {
    grid-template-columns: 1fr !important;
    gap: 10px !important;
    padding: 12px !important;
  }
  .sandbox-card-header {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 16px !important;
  }
  .store-header-actions {
    justify-content: space-between !important;
  }
}
`.trim(),
    diffCode: `
+ /* 📱 Mobile Responsiveness Module Appended */
+ @media (max-width: 768px) {
+   .catalog-grid { grid-template-columns: 1fr; }
+   .store-analytics { grid-template-columns: 1fr; }
+   .sandbox-card-header { flex-direction: column; }
+ }
`.trim(),
    explanation: "Injected mobile responsive viewport grid parameters! Fixed content overflow squishing, converted analytical dashboard boxes to column flow, and adapted title actions on mobile screens.",
  },

  conversion: {
    cssCode: `
/* 🎨 Conversion CTA Upgrade Module Appended */
.btn-buy {
  background: linear-gradient(135deg, var(--neon-emerald) 0%, #059669 100%) !important;
  color: #000 !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  border: none !important;
  box-shadow: 0 0 15px rgba(0, 255, 102, 0.4) !important;
  padding: 8px 16px !important;
}
.btn-buy:hover {
  background: linear-gradient(135deg, #00ff77 0%, #00c752 100%) !important;
  box-shadow: 0 0 25px rgba(0, 255, 102, 0.7) !important;
}
.store-footer-bar {
  background: rgba(0, 255, 102, 0.05) !important;
  border-top: 1px dashed rgba(0, 255, 102, 0.2) !important;
  padding: 10px 16px !important;
}
`.trim(),
    diffCode: `
+ /* 🎨 Conversion CTA Upgrade Module Appended */
+ .btn-buy { background: linear-gradient(135deg, var(--neon-emerald) 0%, #059669 100%); }
+ .btn-buy:hover { box-shadow: 0 0 25px rgba(0, 255, 102, 0.7); }
+ .store-footer-bar { background: rgba(0, 255, 102, 0.05); }
`.trim(),
    explanation: "Enhanced Call-to-Action design hierarchy! Redesigned purchase CTA buttons using high-contrast emerald glow gradients, and added secure visual proof banners below products.",
  }
};

/**
 * Offline simulation dictionary for instant out-of-the-box demonstration
 */
const SIMULATED_HEAL_SCENARIOS: Record<string, HealingResult> = {
  crash: {
    success: true,
    targetPath: 'playground/src/components/SandboxView.tsx',
    diffCode: `
-        if (!userProfile || !userProfile.profile) {
-          throw new TypeError("Cannot read properties of null (reading 'name') at SandboxApp.renderDashboard");
-        }
-        return userProfile.profile.name;
+        // Healed: Checked if profile is loaded before accessing name
+        if (!userProfile || !userProfile.profile) {
+          return "Guest Developer (Recovered)";
+        }
+        return userProfile.profile.name;
    `.trim(),
    patchCode: `
(function() {
  if (window.SandboxApp) {
    window.SandboxApp.userData = { profile: { name: "Guest Developer (Recovered)" } };
    console.log("__autoheal_internal__ Applied runtime patch: repaired userData store.");
  }
})()
    `.trim(),
    explanation: "Detected attempts to access a nested property 'name' of 'profile' when 'profile' was null/undefined. The patch physically writes a defensive check into SandboxView.tsx and recovers user state.",
  },
  
  promise: {
    success: true,
    targetPath: 'playground/src/components/SandboxView.tsx',
    diffCode: `
-      fetchData: async () => {
-        // Failing mock endpoint
-        if ((window as any).SandboxApp.apiMock) { ... }
-        throw new Error("Connection timed out to api.broken-endpoint.dev/data");
-      },
+      fetchData: async () => {
+        try {
+          if ((window as any).SandboxApp.apiMock) { ... }
+          throw new Error("Connection timed out to api.broken-endpoint.dev/data");
+        } catch (err) {
+          console.warn("Using local cached fallback dataset.");
+          const fallback = { status: "Online (Mocked Healer)", users: 1280, errorRate: "0.00%", serverLoad: "12%" };
+          setDbStatus(fallback);
+          return fallback;
+        }
+      },
    `.trim(),
    patchCode: `
(function() {
  if (window.SandboxApp) {
    window.SandboxApp.apiMock = () => {
      return Promise.resolve({
        status: "Online (Mocked Healer)",
        users: 1280,
        errorRate: "0.00%",
        serverLoad: "12%"
      });
    };
    console.log("__autoheal_internal__ Repaired API mocks to resolve unhandled promise rejection.");
  }
})()
    `.trim(),
    explanation: "Caught a rejected Promise from a failing REST API endpoint. Physically patched the fetchData method in SandboxView.tsx with an elegant try-catch block that falls back to a cached dataset.",
  },

  asset: {
    success: true,
    targetPath: 'playground/src/components/SandboxView.tsx',
    diffCode: `
-                <img 
-                  src="/assets/broken-cyber-chip-image.jpg" 
-                  alt="Damaged Core" 
-                  className="catalog-img"
-                  id="broken-prod"
-                />
+                <img 
+                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop" 
+                  alt="Damaged Core (Healed)" 
+                  className="catalog-img"
+                  id="broken-prod"
+                  onError={(e) => {
+                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop";
+                  }}
+                />
    `.trim(),
    patchCode: `
(function() {
  const img = document.getElementById('broken-prod');
  if (img) {
    img.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop';
    console.log("__autoheal_internal__ Substituted broken asset with high-fidelity placeholder abstract asset.");
  }
})()
    `.trim(),
    explanation: "Captured a failure to load an image resource. Automatically replaced the missing asset source attribute in SandboxView.tsx with a gorgeous abstract stock image fallback.",
  },
};

export class HealerAgent {
  constructor() {}

  /**
   * Generates a surgical healing patch using Gemini API, or falls back to simulation mode
   */
  public async healError(error: ErrorData, apiKey?: string): Promise<HealingResult> {
    // 1. Try to read SandboxView.tsx from the Express dev server
    let physicalCode = '';
    let serverAvailable = false;
    try {
      const res = await fetch(`${getBackendUrl()}/api/file-context?file=sandbox`, {
        headers: { 'x-site-id': window.location.host }
      });
      if (res.ok) {
        const data = await res.json();
        physicalCode = data.content;
        serverAvailable = true;
      }
    } catch (e) {
      console.warn('[AutoHeal Client] Express dev server not detected. Operating in runtime-only mode.');
    }

    const activeProvider = localStorage.getItem('ah_model_provider') || 'gemini';
    const groqKey = localStorage.getItem('ah_groq_key') || undefined;

    // Check if we should fall back to simulation mode (neither key is configured)
    const hasKey = activeProvider === 'gemini' ? !!apiKey : !!groqKey;

    if (!hasKey) {
      // Offline/simulation route
      let type: string = error.type;
      if (type === 'console_error' || type === 'console_warn') {
        type = 'promise';
      }
      
      const scenario = SIMULATED_HEAL_SCENARIOS[type];
      if (!scenario) {
        return {
          success: false,
          diffCode: '',
          patchCode: '',
          explanation: 'No simulated solution found for this type of error.',
        };
      }

      // Perform actual physical file-healing search & replace over Dev Server
      if (serverAvailable && physicalCode) {
        let patchedContent = physicalCode;
        if (type === 'crash') {
          patchedContent = physicalCode.replace(
            `        if (!userProfile || !userProfile.profile) {
          throw new TypeError("Cannot read properties of null (reading 'name') at SandboxApp.renderDashboard");
        }
        return userProfile.profile.name;`,
            `        // Healed: Checked if profile is loaded before accessing name
        if (!userProfile || !userProfile.profile) {
          return "Guest Developer (Recovered)";
        }
        return userProfile.profile.name;`
          );
        } else if (type === 'promise') {
          patchedContent = physicalCode.replace(
            `      fetchData: async () => {
        // Failing mock endpoint
        if ((window as any).SandboxApp.apiMock) {
          const res = await (window as any).SandboxApp.apiMock();
          setDbStatus(res);
          return res;
        }
        throw new Error("Connection timed out to api.broken-endpoint.dev/data");
      },`,
            `      fetchData: async () => {
        // Healed: Catch connection errors and gracefully fallback to mock synchronized status
        try {
          if ((window as any).SandboxApp.apiMock) {
            const res = await (window as any).SandboxApp.apiMock();
            setDbStatus(res);
            return res;
          }
          throw new Error("Connection timed out to api.broken-endpoint.dev/data");
        } catch (err) {
          console.warn("Using local cached fallback dataset.");
          const fallback = { status: "Online (Mocked Healer)", users: 1280, errorRate: "0.00%", serverLoad: "12%" };
          setDbStatus(fallback);
          return fallback;
        }
      },`
          );
        } else if (type === 'asset') {
          patchedContent = physicalCode.replace(
            `                {/* Intentional broken image source */}
                <img 
                  src="/assets/broken-cyber-chip-image.jpg" 
                  alt="Damaged Core" 
                  className="catalog-img"
                  id="broken-prod"
                />`,
            `                {/* Healed: Dynamic fallback placeholder injected on asset error event */}
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop" 
                  alt="Damaged Core (Healed)" 
                  className="catalog-img"
                  id="broken-prod"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop";
                  }}
                />`
          );
        }

        try {
          await fetch(`${getBackendUrl()}/api/apply-patch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-site-id': window.location.host
            },
            body: JSON.stringify({ file: 'sandbox', content: patchedContent }),
          });
          console.log('[AutoHeal Client] Physically wrote healed JS component to disk via Express server.');
          // Dispatch to N8N → GitHub → Vercel
          gitBridge.dispatch({
            file: 'playground/src/components/SandboxView.tsx',
            content: patchedContent,
            diffCode: scenario.diffCode || '',
            commitMessage: `🤖 AutoHeal: fix ${type} error — ${error.message.slice(0, 60)}`,
          }).then(r => console.log('[AutoHeal GitBridge]', r.message));
        } catch (err) {
          console.error('[AutoHeal Client] Physical file-writing failed:', err);
        }
      }

      return scenario;
    }

    // 2. Route AI request to active provider
    if (activeProvider === 'groq') {
      try {
        console.log('[AutoHeal Agent] Calling Groq Cloud API for sub-second Llama-3 self-healing...');
        const prompt = `
You are an expert self-healing JavaScript, React, and web engineering agent.
Analyze the following error captured by our diagnostic monitor and write a self-healing patch:

ERROR METRICS:
- Type: ${error.type}
- Message: ${error.message}
- Source Location: ${error.source || 'N/A'} (Line ${error.line}:${error.column})
- Stack Trace: ${error.stack || 'N/A'}
- DOM Snippet: ${error.domContext || 'N/A'}

CURRENT WORKSPACE FILE CONTENT (SandboxView.tsx):
\`\`\`tsx
${physicalCode || '/* SandboxView.tsx not loaded */'}
\`\`\`

${DATABASE_CAPABILITY_INSTRUCTION}

Your goal is to repair SandboxView.tsx permanently to prevent this error.
Your response must be a valid JSON object only, with no markdown styling blocks (no \`\`\`json wrappers), satisfying the following structure:
{
  "success": true,
  "explanation": "Detailed explanation of what failed and why this patch resolves the root cause.",
  "targetPath": "playground/src/components/SandboxView.tsx",
  "diffCode": "A unified Git-style code diff showing the before (minus lines) and after (plus lines) code fixes.",
  "patchCode": "A self-executing JavaScript anonymous function (IIFE) as a string. This is a backup for runtime-only healing.",
  "healedFileContent": "The COMPLETE updated file content for SandboxView.tsx with the bug physically resolved."
}

Ensure your output is strictly valid JSON. Double-check that all strings are escaped correctly. Output ONLY the JSON block. Do not add any prefix or suffix.
        `.trim();

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [
              { role: 'system', content: 'You are an autonomous debugging agent. Output strictly valid JSON conforming exactly to the user schema.' },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          })
        });

        if (!response.ok) {
          throw new Error(`Groq API responded with code: ${response.status}`);
        }

        const resData = await response.json();
        const text = resData.choices[0].message.content.trim();
        const json = JSON.parse(text);

        if (serverAvailable && json.healedFileContent) {
          await fetch(`${getBackendUrl()}/api/apply-patch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-site-id': window.location.host
            },
            body: JSON.stringify({ file: 'sandbox', content: json.healedFileContent }),
          });
          console.log('[AutoHeal Client] Physical source healed using Groq Llama-3 on-disk patching!');
          // Dispatch to N8N → GitHub → Vercel
          gitBridge.dispatch({
            file: 'playground/src/components/SandboxView.tsx',
            content: json.healedFileContent,
            diffCode: json.diffCode || '',
            commitMessage: `🤖 AutoHeal (Groq): fix ${error.type} — ${error.message.slice(0, 60)}`,
          }).then(r => console.log('[AutoHeal GitBridge]', r.message));
        }

        return {
          success: json.success ?? true,
          explanation: json.explanation || 'Self-healed physically via Groq Llama-3 AI.',
          diffCode: json.diffCode || '',
          patchCode: json.patchCode || '',
          targetPath: json.targetPath || 'playground/src/components/SandboxView.tsx',
        };
      } catch (e) {
        console.error('__autoheal_internal__ Groq AI generation error:', e);
        return {
          success: false,
          diffCode: '',
          patchCode: '',
          explanation: `Groq Llama-3 API Error: ${(e as Error).message}. Check your API Key.`,
        };
      }
    } else {
      // Gemini Route
      try {
        // Connect to Google AI SDK client-side
        const genAI = new GoogleGenerativeAI(apiKey!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
You are an expert self-healing JavaScript, React, and web engineering agent.
Analyze the following error captured by our diagnostic monitor and write a self-healing patch:

ERROR METRICS:
- Type: ${error.type}
- Message: ${error.message}
- Source Location: ${error.source || 'N/A'} (Line ${error.line}:${error.column})
- Stack Trace: ${error.stack || 'N/A'}
- DOM Snippet: ${error.domContext || 'N/A'}

CURRENT WORKSPACE FILE CONTENT (SandboxView.tsx):
\`\`\`tsx
${physicalCode || '/* SandboxView.tsx not loaded */'}
\`\`\`

${DATABASE_CAPABILITY_INSTRUCTION}

Your goal is to repair SandboxView.tsx permanently to prevent this error.
Your response must be a valid JSON object only, with no markdown styling blocks (no \`\`\`json wrappers), satisfying the following structure:
{
  "success": true,
  "explanation": "Detailed explanation of what failed and why this patch resolves the root cause.",
  "targetPath": "playground/src/components/SandboxView.tsx",
  "diffCode": "A unified Git-style code diff showing the before (minus lines) and after (plus lines) code fixes.",
  "patchCode": "A self-executing JavaScript anonymous function (IIFE) as a string. This is a backup for runtime-only healing.",
  "healedFileContent": "The COMPLETE updated file content for SandboxView.tsx with the bug physically resolved."
}

Ensure your output is strictly valid JSON. Double-check that all strings are escaped correctly.
        `.trim();

        const response = await model.generateContent(prompt);
        const text = response.response.text().trim();
        
        const cleaned = text
          .replace(/^```json/i, '')
          .replace(/^```/i, '')
          .replace(/```$/, '')
          .trim();

        const json = JSON.parse(cleaned);

        if (serverAvailable && json.healedFileContent) {
          await fetch(`${getBackendUrl()}/api/apply-patch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-site-id': window.location.host
            },
            body: JSON.stringify({ file: 'sandbox', content: json.healedFileContent }),
          });
          console.log('[AutoHeal Client] Physical source healed using Gemini on-disk patching!');
          // Dispatch to N8N → GitHub → Vercel
          gitBridge.dispatch({
            file: 'playground/src/components/SandboxView.tsx',
            content: json.healedFileContent,
            diffCode: json.diffCode || '',
            commitMessage: `🤖 AutoHeal (Gemini): fix ${error.type} — ${error.message.slice(0, 60)}`,
          }).then(r => console.log('[AutoHeal GitBridge]', r.message));
        }

        return {
          success: json.success ?? true,
          explanation: json.explanation || 'Self-healed physically via Gemini AI.',
          diffCode: json.diffCode || '',
          patchCode: json.patchCode || '',
          targetPath: json.targetPath || 'playground/src/components/SandboxView.tsx',
        };
      } catch (e) {
        console.error('__autoheal_internal__ Gemini AI generation error:', e);
        return {
          success: false,
          diffCode: '',
          patchCode: '',
          explanation: `Gemini API Error: ${(e as Error).message}. Check your API Key.`,
        };
      }
    }
  }

  /**
   * Generates a new CSS layout style block using Gemini API, or falls back to simulation mode
   */
  public async improveUI(userPrompt: string, currentHTML: string, apiKey?: string): Promise<StylingResult> {
    // 1. Try to read current index.css from local Express server
    let cssCodeBase = '';
    let serverAvailable = false;
    try {
      const res = await fetch(`${getBackendUrl()}/api/file-context?file=css`, {
        headers: { 'x-site-id': window.location.host }
      });
      if (res.ok) {
        const data = await res.json();
        cssCodeBase = data.content;
        serverAvailable = true;
      }
    } catch (e) {
      console.warn('[AutoHeal Client] Express dev server not detected. Styling applied in-memory only.');
    }

    const activeProvider = localStorage.getItem('ah_model_provider') || 'gemini';
    const groqKey = localStorage.getItem('ah_groq_key') || undefined;

    // Check if we should fall back to simulation mode (neither key is configured)
    const hasKey = activeProvider === 'gemini' ? !!apiKey : !!groqKey;

    if (!hasKey) {
      // Offline/simulation route
      let matchKey = 'glassmorphism';
      const lower = userPrompt.toLowerCase();
      if (lower.includes('animation') || lower.includes('sparkle') || lower.includes('evolve_animation') || lower.includes('✨')) {
        matchKey = 'animation';
      } else if (lower.includes('modern_ui') || lower.includes('glass') || lower.includes('💎')) {
        matchKey = 'modern_ui';
      } else if (lower.includes('mobile') || lower.includes('responsiveness') || lower.includes('📱')) {
        matchKey = 'mobile_fix';
      } else if (lower.includes('conversion') || lower.includes('cta') || lower.includes('🎨')) {
        matchKey = 'conversion';
      }

      const scenario = OFFLINE_STYLE_MODULES[matchKey] || OFFLINE_STYLE_MODULES.modern_ui;

      // Write physical file to index.css if Express server is running
      if (serverAvailable && cssCodeBase) {
        // Avoid duplicate appends of the same module by searching for the header comment
        const headerComment = `/* ${matchKey.toUpperCase()} Upgrade Module Appended */`;
        let updatedCSS = cssCodeBase;
        if (!cssCodeBase.includes(headerComment)) {
          updatedCSS = `${cssCodeBase}\n\n${scenario.cssCode}`;
          
          try {
            await fetch(`${getBackendUrl()}/api/apply-patch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-site-id': window.location.host
              },
              body: JSON.stringify({ file: 'css', content: updatedCSS }),
            });
            console.log(`[AutoHeal Client] Appended ${matchKey} styles physically to index.css on disk.`);
            // Dispatch to N8N → GitHub → Vercel
            gitBridge.dispatch({
              file: 'playground/src/index.css',
              content: updatedCSS,
              diffCode: scenario.diffCode || '',
              commitMessage: `🤖 AutoHeal: apply ${matchKey} UI evolution module`,
            }).then(r => console.log('[AutoHeal GitBridge]', r.message));
          } catch (err) {
            console.error('[AutoHeal Client] Physical CSS write failed:', err);
          }
        }
      }

      return {
        success: true,
        cssCode: scenario.cssCode,
        diffCode: scenario.diffCode,
        explanation: scenario.explanation,
      };
    }

    if (activeProvider === 'groq') {
      try {
        console.log('[AutoHeal Agent] Calling Groq Cloud API for sub-second Llama-3 visual design evolution...');
        const promptMsg = `
You are a premium UI/UX Design Engineer and CSS Architect.
The user wants to customize their website's appearance or add interactive functionality.

USER REQUEST: "${userPrompt}"

CURRENT HTML CONTEXT:
\`\`\`html
${currentHTML}
\`\`\`

CURRENT CSS FILE ON DISK (index.css):
\`\`\`css
${cssCodeBase || '/* css not loaded */'}
\`\`\`

${DATABASE_CAPABILITY_INSTRUCTION}

Generate a clean CSS stylesheet containing the styling rules to fulfill their request. Ensure all rules have '!important' to override standard styling cleanly, and add premium styling tokens: glassmorphism, glowing hover states, and smooth transition animations!
Your response must be a valid JSON object only, with no markdown styling blocks (no \`\`\`json wrappers), satisfying the following structure:
{
  "success": true,
  "explanation": "Brief description of the design tokens applied.",
  "cssCode": "The COMPLETE updated index.css stylesheet string containing all original styles PLUS your new improvements merged elegantly.",
  "diffCode": "A short Git-style code diff showing what class styling changed in index.css."
}

Ensure your output is strictly valid JSON. Escape all newlines in the string attributes. Output ONLY the JSON block. Do not add any prefix or suffix.
        `.trim();

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [
              { role: 'system', content: 'You are a CSS styling architect. Output strictly valid JSON conforming exactly to the user schema.' },
              { role: 'user', content: promptMsg }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2
          })
        });

        if (!response.ok) {
          throw new Error(`Groq API responded with code: ${response.status}`);
        }

        const resData = await response.json();
        const text = resData.choices[0].message.content.trim();
        const json = JSON.parse(text);

        if (serverAvailable && json.cssCode) {
          // Physically update index.css on disk!
          await fetch(`${getBackendUrl()}/api/apply-patch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-site-id': window.location.host
            },
            body: JSON.stringify({ file: 'css', content: json.cssCode }),
          });
          console.log('[AutoHeal Client] Physical index.css updated via Groq Llama-3 design re-architecture.');
        }

        return {
          success: json.success ?? true,
          explanation: json.explanation || 'UI improved via Groq Llama-3 UI architect.',
          cssCode: json.cssCode || '',
          diffCode: json.diffCode || '',
        };
      } catch (e) {
        console.error('__autoheal_internal__ Groq AI UI improvement error:', e);
        return {
          success: false,
          cssCode: '',
          diffCode: '',
          explanation: `Groq Llama-3 API Error: ${(e as Error).message}. Check your API Key.`,
        };
      }
    } else {
      // Gemini Route
      try {
        const genAI = new GoogleGenerativeAI(apiKey!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const promptMsg = `
You are a premium UI/UX Design Engineer and CSS Architect.
The user wants to customize their website's appearance or add interactive functionality.

USER REQUEST: "${userPrompt}"

CURRENT HTML CONTEXT:
\`\`\`html
${currentHTML}
\`\`\`

CURRENT CSS FILE ON DISK (index.css):
\`\`\`css
${cssCodeBase || '/* css not loaded */'}
\`\`\`

${DATABASE_CAPABILITY_INSTRUCTION}

Generate a clean CSS stylesheet containing the styling rules to fulfill their request. Ensure all rules have '!important' to override standard styling cleanly, and add premium styling tokens: glassmorphism, glowing hover states, and smooth transition animations!
Your response must be a valid JSON object only, with no markdown styling blocks (no \`\`\`json wrappers), satisfying the following structure:
{
  "success": true,
  "explanation": "Brief description of the design tokens applied.",
  "cssCode": "The COMPLETE updated index.css stylesheet string containing all original styles PLUS your new improvements merged elegantly.",
  "diffCode": "A short Git-style code diff showing what class styling changed in index.css."
}

Ensure your output is strictly valid JSON. Escape all newlines in the string attributes.
        `.trim();

        const response = await model.generateContent(promptMsg);
        const text = response.response.text().trim();

        const cleaned = text
          .replace(/^```json/i, '')
          .replace(/^```/i, '')
          .replace(/```$/, '')
          .trim();

        const json = JSON.parse(cleaned);

        if (serverAvailable && json.cssCode) {
          // Physically update index.css on disk!
          await fetch(`${getBackendUrl()}/api/apply-patch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-site-id': window.location.host
            },
            body: JSON.stringify({ file: 'css', content: json.cssCode }),
          });
          console.log('[AutoHeal Client] Physical index.css updated via Gemini AI design re-architecture.');
        }

        return {
          success: json.success ?? true,
          explanation: json.explanation || 'UI improved via Gemini UI architect.',
          cssCode: json.cssCode || '',
          diffCode: json.diffCode || '',
        };
      } catch (e) {
        console.error('__autoheal_internal__ Gemini AI UI improvement error:', e);
        return {
          success: false,
          cssCode: '',
          diffCode: '',
          explanation: `Gemini API Error: ${(e as Error).message}. Check your API Key.`,
        };
      }
    }
  }


}
export const healerAgent = new HealerAgent();
