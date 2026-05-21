var AutoHealSDK=(()=>{var S=Object.defineProperty;var O=Object.getOwnPropertyDescriptor;var M=Object.getOwnPropertyNames;var P=Object.prototype.hasOwnProperty;var B=(u,e)=>{for(var t in e)S(u,t,{get:e[t],enumerable:!0})},N=(u,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of M(e))!P.call(u,a)&&a!==t&&S(u,a,{get:()=>e[a],enumerable:!(s=O(e,a))||s.enumerable});return u};var j=u=>N(S({},"__esModule",{value:!0}),u);var R={};B(R,{AutoHeal:()=>A,AutoHealSDK:()=>L,dashboardInstance:()=>k,emailerInstance:()=>w,patcherInstance:()=>I,widgetInstance:()=>v});var E=class{active=!1;callback=null;originalConsoleError=console.error;originalConsoleWarn=console.warn;constructor(){}start(e){this.active||(this.active=!0,this.callback=e,window.addEventListener("error",this.handleUncaughtError),window.addEventListener("unhandledrejection",this.handleUnhandledRejection),window.addEventListener("error",this.handleAssetError,!0),console.error=(...t)=>{this.originalConsoleError.apply(console,t);let s=t.map(a=>typeof a=="object"?JSON.stringify(a):String(a)).join(" ");s.includes("__autoheal_internal__")||this.triggerCallback({id:"err_"+Math.random().toString(36).substr(2,9),type:"console_error",message:s,timestamp:new Date().toISOString()})},console.warn=(...t)=>{this.originalConsoleWarn.apply(console,t);let s=t.map(a=>typeof a=="object"?JSON.stringify(a):String(a)).join(" ");s.includes("__autoheal_internal__")||this.triggerCallback({id:"warn_"+Math.random().toString(36).substr(2,9),type:"console_warn",message:s,timestamp:new Date().toISOString()})})}stop(){this.active&&(this.active=!1,this.callback=null,window.removeEventListener("error",this.handleUncaughtError),window.removeEventListener("unhandledrejection",this.handleUnhandledRejection),window.removeEventListener("error",this.handleAssetError,!0),console.error=this.originalConsoleError,console.warn=this.originalConsoleWarn)}triggerCallback(e){this.callback&&this.callback(e)}handleUncaughtError=e=>{if(e.target&&e.target!==window)return;let t={id:"crash_"+Math.random().toString(36).substr(2,9),type:"crash",message:e.message||"Unknown uncaught exception",source:e.filename,line:e.lineno,column:e.colno,stack:e.error?e.error.stack:new Error().stack,timestamp:new Date().toISOString()};this.triggerCallback(t)};handleUnhandledRejection=e=>{let t="Promise rejected without reason",s="";e.reason&&(e.reason instanceof Error?(t=e.reason.message,s=e.reason.stack||""):typeof e.reason=="string"?t=e.reason:t=JSON.stringify(e.reason));let a={id:"promise_"+Math.random().toString(36).substr(2,9),type:"promise",message:t,stack:s||new Error().stack,timestamp:new Date().toISOString()};this.triggerCallback(a)};handleAssetError=e=>{let t=e.target;if(!t)return;let s=t.tagName;if(!(s==="IMG"||s==="SCRIPT"||s==="LINK"))return;let i=s==="LINK"?"href":"src",o=t.getAttribute(i)||"unknown source",n=t.outerHTML?t.outerHTML.substring(0,150)+"...":`<${s.toLowerCase()}>`,r={id:"asset_"+Math.random().toString(36).substr(2,9),type:"asset",message:`Failed to load resource: ${s.toLowerCase()} load error.`,source:o,domContext:n,timestamp:new Date().toISOString()};this.triggerCallback(r)}};var T=class{config={enabled:!1};listeners=[];constructor(){}setConfig(e){this.config={...this.config,...e}}subscribe(e){return this.listeners.push(e),()=>{this.listeners=this.listeners.filter(t=>t!==e)}}async sendErrorEmail(e){let t=new Date(e.timestamp).toLocaleString(),s=`\u{1F6A8} AutoHeal Alert [${e.type.toUpperCase()}]: ${e.message.substring(0,50)}`,a=`
===================================================
AUTOHEAL CRITICAL EXCEPTION LOG REPORT
===================================================
Timestamp: ${t}
Error Type: ${e.type.toUpperCase()}
Message: ${e.message}
${e.source?`Source File: ${e.source}`:""}
${e.line?`Line: ${e.line} | Column: ${e.column}`:""}
${e.domContext?`DOM Node Element: ${e.domContext}`:""}

---------------------------------------------------
STACK TRACE:
---------------------------------------------------
${e.stack||"No stack trace captured."}

---------------------------------------------------
BROWSER METRICS:
---------------------------------------------------
User Agent: ${navigator.userAgent}
Language: ${navigator.language}
Screen Resolution: ${window.screen.width}x${window.screen.height}
Viewport Size: ${window.innerWidth}x${window.innerHeight}
URL: ${window.location.href}

===================================================
Self-Healing UI Diagnostic System
===================================================
    `.trim();return this.listeners.forEach(i=>{try{i({subject:s,recipient:this.config.devEmail||"developer@local.dev",body:a,timestamp:new Date().toISOString(),sentReal:this.config.enabled})}catch{}}),!0}},w=new T;var _=class{appliedPatches=[];originalJSBackups=new Map;constructor(){}injectCSS(e,t){try{let s=`autoheal-style-${e}`,a=document.getElementById(s);a||(a=document.createElement("style"),a.id=s,document.head.appendChild(a)),a.textContent=t;let i=this.appliedPatches.find(o=>o.id===e);return i?(i.code=t,i.timestamp=new Date().toISOString()):this.appliedPatches.push({id:e,type:"css",target:"DOM Head Stylesheet",code:t,timestamp:new Date().toISOString()}),!0}catch(s){return console.error("__autoheal_internal__ Error injecting CSS patch:",s),!1}}overrideFunction(e,t,s){try{let a=t.split("."),i=window;for(let r=0;r<a.length-1;r++)i[a[r]]||(i[a[r]]={}),i=i[a[r]];let o=a[a.length-1],n=`backup_${e}_${t}`;return this.originalJSBackups.has(n)||this.originalJSBackups.set(n,i[o]),i[o]=s,this.appliedPatches.push({id:e,type:"js",target:t,code:s.toString(),timestamp:new Date().toISOString()}),!0}catch(a){return console.error("__autoheal_internal__ Error applying JS function override:",a),!1}}removePatch(e){try{let t=this.appliedPatches.findIndex(a=>a.id===e);if(t===-1)return!1;let s=this.appliedPatches[t];if(s.type==="css"){let a=`autoheal-style-${e}`,i=document.getElementById(a);i&&i.remove()}else if(s.type==="js"){let a=s.target.split("."),i=window;for(let r=0;r<a.length-1;r++)i=i[a[r]];let o=a[a.length-1],n=`backup_${e}_${s.target}`;this.originalJSBackups.has(n)&&(i[o]=this.originalJSBackups.get(n),this.originalJSBackups.delete(n))}return this.appliedPatches.splice(t,1),!0}catch(t){return console.error("__autoheal_internal__ Error removing patch:",t),!1}}getAppliedPatches(){return[...this.appliedPatches]}},I=new _;var C=class{container=null;badge=null;currentErrors=[];onHealHandler=null;constructor(){}init(e){this.onHealHandler=e,this.injectStyles(),this.createBadge(),this.createFab(),this.createWidgetContainer()}reportSoftError(e){this.currentErrors.find(t=>t.id===e.id)||(this.currentErrors.push(e),this.updateBadgeCount())}triggerHardCrashOverlay(e){this.reportSoftError(e),this.openDiagnosticModal(e,!0)}updateBadgeCount(){if(!this.badge)return;let e=this.currentErrors.length;if(e>0){this.badge.style.display="flex";let t=this.badge.querySelector(".ah-badge-count");t&&(t.textContent=String(e));let s=this.currentErrors[this.currentErrors.length-1],a=this.badge.querySelector(".ah-badge-text");a&&(a.textContent=s.type==="crash"?"System Crash Caught!":`Soft Error: ${s.message.substring(0,24)}...`),this.badge.classList.remove("ah-pulse"),this.badge.offsetWidth,this.badge.classList.add("ah-pulse")}else this.badge.style.display="none"}createBadge(){document.getElementById("autoheal-badge")||(this.badge=document.createElement("div"),this.badge.id="autoheal-badge",this.badge.className="ah-badge-pill",this.badge.style.display="none",this.badge.innerHTML=`
      <div class="ah-badge-icon">\u{1FA7A}</div>
      <div class="ah-badge-details">
        <span class="ah-badge-text">Errors Detected</span>
        <span class="ah-badge-count">0</span>
      </div>
    `,this.badge.addEventListener("click",()=>{if(this.currentErrors.length>0){let e=this.currentErrors[this.currentErrors.length-1];this.openDiagnosticModal(e,!1)}}),document.body.appendChild(this.badge))}createWidgetContainer(){document.getElementById("autoheal-container")||(this.container=document.createElement("div"),this.container.id="autoheal-container",this.container.className="ah-modal-overlay",document.body.appendChild(this.container))}createFab(){if(document.getElementById("autoheal-fab"))return;let e=document.createElement("div");e.id="autoheal-fab",e.className="ah-fab",e.innerHTML="\u2728",e.title="Ask AI to build a feature",e.addEventListener("click",()=>{this.openFeatureModal()}),document.body.appendChild(e)}openFeatureModal(){if(!this.container)return;this.container.classList.remove("ah-hard-crash"),this.container.style.display="flex",this.container.innerHTML=`
      <div class="ah-diag-modal">
        <div class="ah-diag-header">
          <div class="ah-diag-title">
            <span class="ah-pulse-dot" style="background:#00f0ff"></span>
            <span>AUTOHEAL AI STUDIO</span>
          </div>
          <div>
            <button class="ah-settings-btn" id="ah-settings-btn" title="Settings">\u2699\uFE0F</button>
            <button class="ah-close-btn" id="ah-close-modal-btn">\u2715</button>
          </div>
        </div>
        
        <div class="ah-diag-body" id="ah-feature-view">
          <div class="ah-section">
            <div class="ah-section-title">\u2728 What would you like to build?</div>
            <textarea class="ah-feature-input" id="ah-feature-prompt" placeholder="e.g. Add a contact form to this page, or change the background to dark mode..."></textarea>
          </div>

          <div class="ah-section ah-diag-flow">
            <div class="ah-console" id="ah-diag-console" style="display:none; height:150px"></div>
          </div>

          <div class="ah-section ah-patch-section" id="ah-patch-box" style="display: none;">
            <div class="ah-section-title">\u{1F52E} Proposed UI Upgrade</div>
            <div class="ah-diff-viewer" id="ah-diff-box">
              <!-- Content filled dynamically -->
            </div>
          </div>
        </div>

        <div class="ah-diag-footer" id="ah-feature-footer">
          <div class="ah-status-message" id="ah-footer-status">Ready to build.</div>
          <div class="ah-actions">
            <button class="ah-btn primary" id="ah-build-btn">
              <span class="ah-btn-spinner" id="ah-btn-loader" style="display: none;"></span>
              <span id="ah-btn-text">BUILD FEATURE \u{1F680}</span>
            </button>
          </div>
        </div>

        <div class="ah-diag-body" id="ah-settings-view" style="display:none;">
          <div class="ah-section">
            <div class="ah-section-title">\u2699\uFE0F AI Provider Settings</div>
            <p style="color:#aaa; font-size:13px; margin-bottom:12px; line-height: 1.4;">Configure your own API key to power the AI Studio. Your key is securely stored in the AutoHeal Master Database.</p>
            <div style="margin-bottom: 12px;">
              <label style="display:block; font-size:12px; color:#888; margin-bottom:4px;">Groq API Key (Llama 3)</label>
              <input type="password" id="ah-groq-key-input" class="ah-feature-input" style="height:40px; border-radius:4px; font-family: monospace;" placeholder="gsk_..." />
            </div>
          </div>
        </div>
        
        <div class="ah-diag-footer" id="ah-settings-footer" style="display:none;">
          <div class="ah-status-message" id="ah-settings-status" style="color: #4ade80;"></div>
          <div class="ah-actions">
            <button class="ah-btn primary" id="ah-save-settings-btn">SAVE SETTINGS</button>
          </div>
        </div>
      </div>
    `,document.getElementById("ah-close-modal-btn")?.addEventListener("click",()=>this.closeDiagnosticModal());let e=document.getElementById("ah-feature-view"),t=document.getElementById("ah-feature-footer"),s=document.getElementById("ah-settings-view"),a=document.getElementById("ah-settings-footer"),i=!1;document.getElementById("ah-settings-btn")?.addEventListener("click",async()=>{if(i=!i,i){e.style.display="none",t.style.display="none",s.style.display="block",a.style.display="flex";try{let r=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",p=window.AUTOHEAL_SITE_ID||window.location.host,c=await(await fetch(`${r}/api/settings`,{headers:{"x-site-id":p}})).json();c.groqKey&&(document.getElementById("ah-groq-key-input").value=c.groqKey)}catch(r){console.warn("AutoHeal: Could not fetch settings",r)}}else e.style.display="block",t.style.display="flex",s.style.display="none",a.style.display="none"}),document.getElementById("ah-save-settings-btn")?.addEventListener("click",async()=>{let r=document.getElementById("ah-groq-key-input").value.trim();if(!r)return;let p=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",g=window.AUTOHEAL_SITE_ID||window.location.host,c=document.getElementById("ah-settings-status");c.textContent="Saving...";try{(await(await fetch(`${p}/api/settings`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":g},body:JSON.stringify({settings:{groqKey:r,modelProvider:"groq"}})})).json()).success?c.textContent="Settings saved successfully! \u2705":c.textContent="Error saving settings."}catch{c.textContent="Failed to connect to Master Server."}});let o=document.getElementById("ah-build-btn"),n=document.getElementById("ah-feature-prompt");o.addEventListener("click",()=>{let r=n.value.trim();if(!r)return;n.disabled=!0,o.disabled=!0,o.classList.add("disabled");let p=document.getElementById("ah-btn-loader");p&&(p.style.display="inline-block");let g=document.getElementById("ah-btn-text");g&&(g.textContent="BUILDING...");let c=document.getElementById("ah-diag-console");c&&(c.style.display="block");let m={id:"feature_"+Date.now(),type:"feature",message:r,timestamp:new Date().toISOString(),source:window.location.pathname==="/"?"src/App.jsx":window.location.pathname};this.runDiagnosticEngine(m,o)})}openDiagnosticModal(e,t){if(!this.container)return;t?(document.body.classList.add("ah-blur-active"),this.container.classList.add("ah-hard-crash")):this.container.classList.remove("ah-hard-crash"),this.container.style.display="flex";let s=new Date(e.timestamp).toLocaleTimeString();this.container.innerHTML=`
      <div class="ah-diag-modal">
        <div class="ah-diag-header">
          <div class="ah-diag-title">
            <span class="ah-pulse-dot red"></span>
            <span>AUTOHEAL SYSTEM DIAGNOSTICS</span>
          </div>
          <button class="ah-close-btn" id="ah-close-modal-btn">\u2715</button>
        </div>
        
        <div class="ah-diag-body">
          <div class="ah-section">
            <div class="ah-section-title">\u{1F6D1} Captured Exception [${e.type.toUpperCase()}]</div>
            <div class="ah-error-card">
              <div class="ah-error-msg">${e.message}</div>
              ${e.source?`<div class="ah-error-source">URL: <span>${e.source}</span> ${e.line?`(Line ${e.line}:${e.column})`:""}</div>`:""}
              ${e.domContext?`<div class="ah-error-dom">DOM: <code>${this.escapeHTML(e.domContext)}</code></div>`:""}
              <div class="ah-timestamp">Caught at ${s} \u2022 Logs emailed to developer inbox \u2709\uFE0F</div>
            </div>
          </div>

          <div class="ah-section ah-diag-flow">
            <div class="ah-scanner-container" id="ah-scanner-box">
              <div class="ah-radar">
                <div class="ah-radar-sweep"></div>
                <div class="ah-radar-circle circle-1"></div>
                <div class="ah-radar-circle circle-2"></div>
                <div class="ah-radar-circle circle-3"></div>
              </div>
              <div class="ah-scanner-label">SCANNING FOR SOLUTIONS...</div>
            </div>

            <div class="ah-console" id="ah-diag-console">
              <div class="ah-console-line comment">> AutoHeal SDK initialized.</div>
              <div class="ah-console-line error">> INTERCEPTED: ${e.type.toUpperCase()} error detected.</div>
              <div class="ah-console-line">> Packaging dump data...</div>
              <div class="ah-console-line success">> Error log emailed to developer email address successfully!</div>
              <div class="ah-console-line info">> Spawning AI Healing Agent...</div>
            </div>
          </div>

          <div class="ah-section ah-patch-section" id="ah-patch-box" style="display: none;">
            <div class="ah-section-title">\u{1F52E} Proposed Repair Patch</div>
            <div class="ah-diff-viewer" id="ah-diff-box">
              <!-- Content filled dynamically -->
            </div>
          </div>
        </div>

        <div class="ah-diag-footer">
          <div class="ah-status-message" id="ah-footer-status">Analyzing stack trace...</div>
          <div class="ah-actions">
            <button class="ah-btn secondary" id="ah-ignore-btn">Ignore Error</button>
            <button class="ah-btn primary disabled" id="ah-patch-btn" disabled>
              <span class="ah-btn-spinner" id="ah-btn-loader" style="display: inline-block;"></span>
              <span id="ah-btn-text">Waiting for AI...</span>
            </button>
          </div>
        </div>
      </div>
    `,document.getElementById("ah-close-modal-btn")?.addEventListener("click",()=>this.closeDiagnosticModal()),document.getElementById("ah-ignore-btn")?.addEventListener("click",()=>this.closeDiagnosticModal());let a=document.getElementById("ah-patch-btn");this.runDiagnosticEngine(e,a)}async runDiagnosticEngine(e,t){let s=document.getElementById("ah-diag-console"),a=document.getElementById("ah-footer-status"),i=document.getElementById("ah-scanner-box"),o=document.getElementById("ah-patch-box"),n=document.getElementById("ah-diff-box");if(!s)return;let r=(h,l="default")=>{let d=document.createElement("div");d.className=`ah-console-line ${l}`,d.textContent=`> ${h}`,s.appendChild(d),s.scrollTop=s.scrollHeight};await this.delay(1e3),r("Analyzing stack trace patterns...","info"),a&&(a.textContent="Analyzing source-code stack trace..."),await this.delay(1200),r("Extracting code context around error location...","info"),await this.delay(1e3),r("Consulting AI LLM healing patterns...","comment"),a&&(a.textContent="Generating surgical repair code...");let p=!1,g="",c="",m="",b=e.source||"sandbox";if(this.onHealHandler)try{let h=await this.onHealHandler(e);p=h.success,g=h.diffCode,c=h.explanation||"",m=h.healedFileContent||"",h.targetPath&&(b=h.targetPath)}catch{r("Failed to contact AI Healer Agent.","error")}if(await this.delay(800),p&&g){if(r("Surgical fix generated successfully!","success"),r("Ready to hot-patch runtime environment.","success"),a&&(a.textContent="Patch compiled successfully!"),i&&(i.style.display="none"),o&&(o.style.display="block"),n&&(n.innerHTML=this.renderDiff(g)),t){t.disabled=!1,t.classList.remove("disabled");let h=document.getElementById("ah-btn-loader");h&&(h.style.display="none");let l=document.getElementById("ah-btn-text");l&&(l.textContent="APPLY LIVE PATCH \u{1FA7A}"),t.onclick=async()=>{t.disabled=!0,t.classList.add("disabled"),h&&(h.style.display="inline-block"),l&&(l.textContent="Applying Patch..."),a&&(a.textContent="Injecting runtime hot-patch...");try{let d=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",f=window.AUTOHEAL_SITE_ID||window.location.host,y=await(await fetch(`${d}/api/apply-patch`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":f},body:JSON.stringify({content:m,file:b,prompt:e.message})})).json();y.success?this.showToast("\u{1F680} Code Pushed to GitHub! Vercel is building...","success"):this.showToast(`\u274C Push Failed: ${y.error}`,"error")}catch{this.showToast("\u274C Network error communicating with Master Server","error")}this.currentErrors=this.currentErrors.filter(d=>d.id!==e.id),this.updateBadgeCount(),this.closeDiagnosticModal(),r("Hot-patch successfully applied! Site recovered.","success")}}}else if(r(`AI agent failed: ${c||"Could not determine a safe patch."}`,"error"),a&&(a.textContent="Healing failed. Manual debug required."),t){t.disabled=!1,t.classList.remove("disabled");let h=document.getElementById("ah-btn-loader");h&&(h.style.display="none");let l=document.getElementById("ah-btn-text");l&&(l.textContent="Unable to heal")}}renderDiff(e){return e.split(`
`).map(s=>{let a="normal";return s.startsWith("+")?a="add":s.startsWith("-")&&(a="delete"),`<div class="ah-diff-line ${a}">${this.escapeHTML(s)}</div>`}).join("")}showToast(e,t="success"){let s=document.createElement("div");s.className=`ah-toast ${t}`,s.innerHTML=`
      <span class="ah-toast-icon">${t==="success"?"\u26A1":"\u26A0\uFE0F"}</span>
      <span>${e}</span>
    `,document.body.appendChild(s),setTimeout(()=>s.classList.add("visible"),50),setTimeout(()=>{s.classList.remove("visible"),setTimeout(()=>s.remove(),400)},4e3)}closeDiagnosticModal(){this.container&&(this.container.style.display="none",document.body.classList.remove("ah-blur-active"))}escapeHTML(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}delay(e){return new Promise(t=>setTimeout(t,e))}injectStyles(){if(document.getElementById("autoheal-widget-styles"))return;let e=document.createElement("style");e.id="autoheal-widget-styles",e.textContent=`
      /* Font settings for premium console */
      @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');

      /* Warning Pulsing Badge */
      .ah-badge-pill {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        background: rgba(18, 22, 33, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 68, 68, 0.45);
        border-radius: 50px;
        padding: 10px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 10px 30px rgba(255, 68, 68, 0.25), inset 0 0 10px rgba(255, 68, 68, 0.1);
        color: #fff;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .ah-badge-pill:hover {
        transform: translateY(-4px) scale(1.02);
        border-color: #ff4444;
        box-shadow: 0 15px 40px rgba(255, 68, 68, 0.4);
      }
      .ah-badge-icon {
        font-size: 20px;
      }
      .ah-badge-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .ah-badge-text {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 600;
      }
      .ah-badge-count {
        font-size: 14px;
        font-weight: 700;
        color: #ff4444;
      }
      
      @keyframes ah-pulse-animation {
        0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
        70% { box-shadow: 0 0 0 15px rgba(255, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
      }
      .ah-pulse {
        animation: ah-pulse-animation 1.5s infinite;
      }

      /* Modal Background Overlay */
      .ah-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 100000;
        background: rgba(10, 12, 16, 0.4);
        backdrop-filter: blur(2px);
        display: none;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', sans-serif;
        color: #e6edf3;
        transition: all 0.3s ease;
      }
      .ah-modal-overlay.ah-hard-crash {
        background: rgba(10, 12, 16, 0.7);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
      }
      
      /* Blur Body Effect */
      body.ah-blur-active > *:not(.ah-modal-overlay):not(.ah-toast) {
        filter: blur(8px);
        transition: filter 0.3s ease;
      }

      /* Diagnostic Modal box */
      .ah-diag-modal {
        background: rgba(17, 22, 34, 0.95);
        border: 1px solid rgba(0, 240, 255, 0.3);
        border-radius: 16px;
        width: 90%;
        max-width: 760px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 240, 255, 0.1);
        overflow: hidden;
        animation: ah-modal-slide 0.4s cubic-bezier(0.19, 1, 0.22, 1);
      }
      @keyframes ah-modal-slide {
        from { transform: translateY(40px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      /* Header */
      .ah-diag-header {
        background: rgba(10, 14, 23, 0.9);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ah-diag-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 0.08em;
        color: #00f0ff;
        text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
      }
      .ah-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }
      .ah-pulse-dot.red {
        background: #ff4444;
        box-shadow: 0 0 8px #ff4444;
        animation: ah-dot-glow 1s infinite alternate;
      }
      @keyframes ah-dot-glow {
        from { opacity: 0.5; }
        to { opacity: 1; }
      }
      .ah-close-btn { background: none; border: none; color: #888; font-size: 20px; cursor: pointer; transition: color 0.2s; padding: 0; line-height: 1; }
      .ah-close-btn:hover { color: #fff; }
      .ah-settings-btn { background: none; border: none; color: #888; font-size: 18px; cursor: pointer; transition: color 0.2s; padding: 0; line-height: 1; margin-right: 12px; }
      .ah-settings-btn:hover { color: #fff; transform: rotate(45deg); }

      /* Body */
      .ah-diag-body { padding: 20px; flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
      .ah-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ah-section-title {
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 0.08em;
      }
      
      /* Captured Error Card */
      .ah-error-card {
        background: rgba(255, 68, 68, 0.07);
        border: 1px solid rgba(255, 68, 68, 0.25);
        border-radius: 8px;
        padding: 16px;
        font-family: 'Inter', sans-serif;
      }
      .ah-error-msg {
        color: #ff6b6b;
        font-weight: 700;
        font-size: 15px;
        margin-bottom: 8px;
        line-height: 1.4;
      }
      .ah-error-source {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 4px;
      }
      .ah-error-source span {
        color: #00f0ff;
        font-family: 'Fira Code', monospace;
      }
      .ah-error-dom {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 4px;
      }
      .ah-error-dom code {
        color: #ffd700;
        font-family: 'Fira Code', monospace;
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .ah-timestamp {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 8px;
      }

      /* Flow Layout: Scanner & Console */
      .ah-diag-flow {
        display: grid;
        grid-template-columns: 240px 1fr;
        gap: 16px;
        min-height: 160px;
      }
      @media (max-width: 600px) {
        .ah-diag-flow {
          grid-template-columns: 1fr;
        }
      }

      /* Radar Scanner */
      .ah-scanner-container {
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 16px;
      }
      .ah-radar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        position: relative;
        background: radial-gradient(circle, rgba(0, 240, 255, 0.03) 0%, rgba(0, 240, 255, 0.15) 100%);
        border: 1px solid rgba(0, 240, 255, 0.2);
        overflow: hidden;
      }
      .ah-radar-sweep {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: conic-gradient(from 0deg, rgba(0, 240, 255, 0.5) 0deg, transparent 90deg);
        border-radius: 50%;
        animation: ah-spin 2s linear infinite;
      }
      .ah-radar-circle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        border: 1px dashed rgba(0, 240, 255, 0.15);
      }
      .circle-1 { width: 25%; height: 25%; }
      .circle-2 { width: 50%; height: 50%; }
      .circle-3 { width: 75%; height: 75%; }
      
      @keyframes ah-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .ah-scanner-label {
        font-size: 10px;
        font-weight: 700;
        color: #00f0ff;
        letter-spacing: 0.1em;
        text-align: center;
        animation: ah-fade 1.5s infinite alternate;
      }
      @keyframes ah-fade {
        from { opacity: 0.4; }
        to { opacity: 1; }
      }

      /* Dev Console */
      .ah-console {
        background: #0d1117;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 14px;
        font-family: 'Fira Code', monospace;
        font-size: 11px;
        line-height: 1.6;
        height: 160px;
        overflow-y: auto;
        color: #c9d1d9;
        box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
      }
      .ah-console-line {
        margin-bottom: 4px;
        word-break: break-all;
      }
      .ah-console-line.comment { color: #8b949e; }
      .ah-console-line.error { color: #ff6b6b; }
      .ah-console-line.success { color: #56d364; }
      .ah-console-line.info { color: #38bdf8; }

      /* Code Diff Box */
      .ah-patch-section {
        animation: ah-fade-in 0.5s ease;
      }
      @keyframes ah-fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .ah-diff-viewer {
        background: #0d1117;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        max-height: 200px;
        overflow-y: auto;
        font-family: 'Fira Code', monospace;
        font-size: 11px;
        padding: 10px 0;
      }
      .ah-diff-line {
        padding: 2px 16px;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .ah-diff-line.add {
        background-color: rgba(46, 160, 67, 0.15);
        color: #3fb950;
        border-left: 3px solid #2ea043;
      }
      .ah-diff-line.delete {
        background-color: rgba(248, 81, 73, 0.15);
        color: #f85149;
        border-left: 3px solid #f85149;
        text-decoration: line-through;
      }
      .ah-diff-line.normal {
        color: #8b949e;
        opacity: 0.7;
      }

      /* Footer Controls */
      .ah-diag-footer {
        background: rgba(10, 14, 23, 0.9);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding: 16px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }
      @media (max-width: 500px) {
        .ah-diag-footer {
          flex-direction: column;
          align-items: stretch;
          text-align: center;
        }
      }

      /* Floating Action Button (FAB) */
      .ah-fab {
        position: fixed;
        bottom: 24px;
        left: 24px;
        width: 48px;
        height: 48px;
        border-radius: 24px;
        background: linear-gradient(135deg, #00f0ff 0%, #bd00ff 100%);
        box-shadow: 0 4px 15px rgba(0, 240, 255, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        z-index: 99999;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .ah-fab:hover {
        transform: scale(1.1) rotate(5deg);
        box-shadow: 0 8px 25px rgba(189, 0, 255, 0.6);
      }

      /* Feature Input Textarea */
      .ah-feature-input {
        width: 100%;
        min-height: 100px;
        background: rgba(10, 15, 26, 0.8);
        border: 1px solid rgba(0, 240, 255, 0.3);
        border-radius: 8px;
        padding: 12px;
        color: #fff;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        resize: vertical;
        box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
        outline: none;
        transition: border-color 0.2s;
      }
      .ah-feature-input:focus {
        border-color: #00f0ff;
        box-shadow: inset 0 2px 10px rgba(0,0,0,0.5), 0 0 10px rgba(0,240,255,0.2);
      }
      
      .ah-status-message {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 500;
      }
      .ah-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      /* Custom Premium Buttons */
      .ah-btn {
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      .ah-btn.primary {
        background: linear-gradient(135deg, #00f0ff 0%, #bd00ff 100%);
        border: none;
        color: #fff;
        box-shadow: 0 4px 15px rgba(0, 240, 255, 0.25);
      }
      .ah-btn.primary:not(.disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 240, 255, 0.4);
      }
      .ah-btn.secondary {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.7);
      }
      .ah-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
      }
      .ah-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none !important;
      }
      
      /* Button Spinner */
      .ah-btn-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: ah-spin 0.8s linear infinite;
      }

      /* Toast Notification */
      .ah-toast {
        position: fixed;
        bottom: 30px;
        left: 30px;
        z-index: 100001;
        background: rgba(18, 22, 33, 0.95);
        border-left: 4px solid #56d364;
        border-radius: 8px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', sans-serif;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .ah-toast.visible {
        transform: translateY(0);
        opacity: 1;
      }
      .ah-toast.warning {
        border-left-color: #ffd700;
      }
      .ah-toast-icon {
        font-size: 18px;
      }
    `,document.head.appendChild(e)}},v=new C;var D=class{container=null;isConnected=!0;errorList=[];currentTerminalLogs=[];settings={n8nWebhook:"",vercelDeployHook:"",gitBranch:"main",modelProvider:"groq",geminiKey:"",groqKey:""};scores={polish:52,spacing:60,mobile:45,conversion:55};constructor(){window.addEventListener("__autoheal_telemetry_update__",(e=>{this.errorList=e.detail,this.render()}))}getMockErrors(){let e=Date.now();return[{id:"mock_crash_1",type:"crash",message:"TypeError: Cannot read properties of undefined (reading 'map') in SandboxView.tsx:67",stack:`TypeError: Cannot read properties of undefined (reading 'map')
    at SandboxView (file:///c:/auomation/playground/src/components/SandboxView.tsx:67:32)
    at renderWithHooks (file:///c:/auomation/node_modules/react-dom/cjs/react-dom.development.js:15486:18)`,source:"file:///c:/auomation/playground/src/components/SandboxView.tsx",line:67,column:32,timestamp:new Date(e-300*1e3).toISOString()},{id:"mock_promise_1",type:"promise",message:"Unhandled Promise Rejection: Error: Network Error - Failed to fetch endpoint 'https://api.broken-endpoint.dev/data/v1/telemetry'",stack:`Error: Network Error
    at fetchTelemetryData (file:///c:/auomation/playground/src/utils/api.ts:14:11)
    at async loadDashboardData (file:///c:/auomation/playground/src/App.tsx:92:24)`,source:"file:///c:/auomation/playground/src/utils/api.ts",line:14,column:11,timestamp:new Date(e-900*1e3).toISOString()},{id:"mock_asset_1",type:"asset",message:"Failed to load resource: net::ERR_FILE_NOT_FOUND (broken-cyber-chip-image.jpg)",source:"file:///c:/auomation/playground/src/assets/broken-cyber-chip-image.jpg",timestamp:new Date(e-1920*1e3).toISOString()},{id:"mock_console_1",type:"console_error",message:'[React] Mismatched Hydration Warning: expected text node containing "AutoHeal // Evolution Deck" but found HTML tag <div>',source:"file:///c:/auomation/node_modules/react-dom/cjs/react-dom.development.js",timestamp:new Date(e-2880*1e3).toISOString()}]}async printDiffToTerminal(e){let t=e.split(`
`);for(let s of t){let a="default";s.startsWith("+")&&!s.startsWith("+++")?a="success":s.startsWith("-")&&!s.startsWith("---")?a="error":s.startsWith("@@")||s.startsWith("Index:")||s.startsWith("===")?a="comment":(s.startsWith("---")||s.startsWith("+++"))&&(a="info"),this.addTerminalLog(s,a),await this.delay(120)}}async initData(){try{let t={"x-site-id":window.location.host};this.addTerminalLog("Connecting to live patcher backend database...","comment");let[s,a,i]=await Promise.all([fetch("http://localhost:3001/api/telemetry",{headers:t}),fetch("http://localhost:3001/api/settings",{headers:t}),fetch("http://localhost:3001/api/scores",{headers:t})]),[o,n,r]=await Promise.all([s.json(),a.json(),i.json()]);o.success&&o.errors&&(this.errorList=o.errors,window.__autoheal_errors_cache__=this.errorList),n.success&&n.settings&&(this.settings={...this.settings,...n.settings}),r.success&&r.scores&&(this.scores={...this.scores,...r.scores}),this.addTerminalLog("Successfully synced workspace state with live multi-tenant backend.","success"),this.render()}catch(e){this.addTerminalLog(`Backend offline: ${e.message}. Operating in Dev-Simulation Mode.`,"info");let t=window.__autoheal_errors_cache__||[];t.length===0?(this.errorList=this.getMockErrors(),window.__autoheal_errors_cache__=this.errorList):this.errorList=t,this.render()}}mount(e){let t=typeof e=="string"?document.querySelector(e):e;if(!t){console.error("__autoheal_internal__ Dashboard mount target not found:",e);return}this.container=t,this.injectStyles(),this.addTerminalLog("AutoHeal Evolution Dashboard mounted successfully."),this.addTerminalLog("Telemetry connection secure. Monitoring live traffic..."),this.initData()}addTerminalLog(e,t="default"){let s=new Date().toLocaleTimeString(),a="> ";t==="success"?a="\u2713 ":t==="error"?a="\u2717 ":t==="info"&&(a="\u2139 "),this.currentTerminalLogs.push(`[${s}] ${a}${e}`),this.currentTerminalLogs.length>50&&this.currentTerminalLogs.shift();let i=document.getElementById("ah-dash-terminal");if(i){let o=document.createElement("div");o.className=`ah-term-line ${t}`,o.textContent=`[${s}] ${a}${e}`,i.appendChild(o),i.scrollTop=i.scrollHeight}}async saveSettings(e,t,s,a,i,o){let n={n8nWebhook:e.trim(),vercelDeployHook:t.trim(),gitBranch:s.trim()};a&&(n.modelProvider=a),i!==void 0&&(n.geminiKey=i.trim()),o!==void 0&&(n.groqKey=o.trim()),this.settings={...this.settings,...n};try{let p=await(await fetch("http://localhost:3001/api/settings",{method:"POST",headers:{"Content-Type":"application/json","x-site-id":window.location.host},body:JSON.stringify({settings:n})})).json();if(p.success&&p.settings)this.settings={...this.settings,...p.settings},this.addTerminalLog("Cloud Git-Bridge settings saved to remote database.","success");else throw new Error("Failed to save settings: server did not return success.")}catch(r){this.addTerminalLog(`Failed to save settings to backend: ${r.message}. Saved locally in memory.`,"error")}this.render()}async dispatchWebhook(e){let t=this.settings.n8nWebhook||"",s=this.settings.vercelDeployHook||"",a=this.settings.gitBranch||"main";if(this.addTerminalLog(`Initiating Cloud Git-Bridge dispatch for file: ${e.file}...`,"info"),await this.delay(1e3),this.addTerminalLog(`Resolving payload changes (diff size: ${e.diffCode.split(`
`).length} lines).`,"default"),await this.delay(800),!t)return this.addTerminalLog("FAILED: N8N Webhook Endpoint not configured! operating in Dev-Simulation.","error"),this.addTerminalLog("[SIMULATION] Dispatching Webhook payload to mock receiver...","info"),await this.delay(1200),this.addTerminalLog('[SIMULATION] N8N Workflow Triggered: "selfheal-patch-handler"',"success"),await this.delay(1e3),this.addTerminalLog(`[SIMULATION] Git Commit pushed to branch "${a}" successfully.`,"success"),await this.delay(1200),this.addTerminalLog("[SIMULATION] Vercel Deploy Hook triggered! Rebuilding live site...","info"),await this.delay(1500),this.addTerminalLog("[SIMULATION] Deployed version completed. Evolution goes Live!","success"),{success:!0,simulated:!0};try{this.addTerminalLog(`Dispatched POST webhook request to: ${t}`,"comment");let i=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...e,vercelDeployHook:s,gitBranch:a,timestamp:new Date().toISOString()})});if(!i.ok)throw new Error(`N8N Endpoint returned status code: ${i.status}`);return this.addTerminalLog("N8N Webhook response successful!","success"),s&&this.addTerminalLog("Vercel live deployment triggered concurrently.","info"),{success:!0}}catch(i){return this.addTerminalLog(`Webhook dispatch error: ${i.message}`,"error"),{success:!1,error:i.message}}}async triggerSimulatedHeal(e){this.addTerminalLog(`Selected telemetry crash report: [${e.type.toUpperCase()}]`,"info"),this.addTerminalLog("Requesting repair suggestion from client-side AI agent...","comment");let t=this.settings.modelProvider||"gemini",s=t==="gemini"?this.settings.geminiKey:this.settings.groqKey,a=e.id.startsWith("mock_");a?this.addTerminalLog(`Mock exception recognized: [${e.id}]. Injecting static high-fidelity repair...`,"info"):s?this.addTerminalLog(`Active LPU provider: [${t.toUpperCase()}] running diagnostics...`,"info"):this.addTerminalLog("No active API Key found in settings! Using fallback simulation module.","comment"),await this.delay(1200);let i=!1,o="",n="playground/src/components/SandboxView.tsx";if(a)i=!0,e.id==="mock_crash_1"?(n="playground/src/components/SandboxView.tsx",o=`Index: playground/src/components/SandboxView.tsx
===================================================================
--- playground/src/components/SandboxView.tsx
+++ playground/src/components/SandboxView.tsx
@@ -64,5 +64,5 @@
-  const items = catalogData.items;
-  return items.map(item => <ItemCard key={item.id} data={item} />);
+  const items = catalogData?.items || [];
+  return items.map(item => <ItemCard key={item.id} data={item} />);`):e.id==="mock_promise_1"?(n="playground/src/utils/api.ts",o=`Index: playground/src/utils/api.ts
===================================================================
--- playground/src/utils/api.ts
+++ playground/src/utils/api.ts
@@ -11,5 +11,10 @@
-  const res = await fetch('https://api.broken-endpoint.dev/data/v1/telemetry');
-  const data = await res.json();
+  let data = [];
+  try {
+    const res = await fetch('https://api.broken-endpoint.dev/data/v1/telemetry');
+    if (res.ok) data = await res.json();
+  } catch (e) {
+    console.warn("Telemetry fallback enabled:", e);
+  }
+  return data;`):e.id==="mock_asset_1"?(n="playground/src/components/SandboxView.tsx",o=`Index: playground/src/components/SandboxView.tsx
===================================================================
--- playground/src/components/SandboxView.tsx
+++ playground/src/components/SandboxView.tsx
@@ -102,3 +102,6 @@
-  <img src="/assets/broken-cyber-chip-image.jpg" alt="Cyber Chip" />
+  <img 
+    src="/assets/broken-cyber-chip-image.jpg" 
+    onError={(e) => { e.currentTarget.src = "/assets/fallback-chip.png"; }} 
+    alt="Cyber Chip" 
+  />`):e.id==="mock_console_1"&&(n="packages/autoheal-sdk/src/dashboard.ts",o=`Index: packages/autoheal-sdk/src/dashboard.ts
===================================================================
--- packages/autoheal-sdk/src/dashboard.ts
+++ packages/autoheal-sdk/src/dashboard.ts
@@ -298,3 +298,3 @@
-              <div class="ah-brand-title">AUTOHEAL // EVOLUTION DECK</div>
-+              <div id="ah-brand-title-static" class="ah-brand-title">AUTOHEAL // EVOLUTION DECK</div>`);else if(window.AutoHeal&&window.AutoHeal.config&&window.AutoHeal.config.onHealRequest)try{let r=await window.AutoHeal.config.onHealRequest(e);i=r.success,o=r.diffCode}catch(r){this.addTerminalLog(`AI Agent pipeline crashed: ${r.message}`,"error")}else i=!0,o=`Index: ${e.source||"unknown-file.tsx"}
+++ ${e.source||"unknown-file.tsx"}
@@ -1,1 +1,2 @@
- /* error */
+ /* simulated AI cloud repair applied successfully */`;if(i&&o){if(this.addTerminalLog("AI Repair patch compiled successfully!","success"),this.addTerminalLog("Printing visual git patch diff...","info"),await this.printDiffToTerminal(o),(await this.dispatchWebhook({file:n,content:"/* Completed autonomous code replacement script context */",diffCode:o,explanation:`Surgically repaired exception: ${e.message}`,type:e.type})).success){try{let g=await(await fetch("http://localhost:3001/api/telemetry/clear",{method:"POST",headers:{"Content-Type":"application/json","x-site-id":window.location.host},body:JSON.stringify({id:e.id})})).json();g.success&&g.errors?(this.errorList=g.errors,window.__autoheal_errors_cache__=this.errorList):(this.errorList=this.errorList.filter(c=>c.id!==e.id),window.__autoheal_errors_cache__=this.errorList)}catch{this.errorList=this.errorList.filter(g=>g.id!==e.id),window.__autoheal_errors_cache__=this.errorList}window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:this.errorList})),this.render()}}else this.addTerminalLog("Repair algorithm aborted: AI agent could not generate safe replacement boundaries.","error")}async triggerSimulatedEvolution(e){this.addTerminalLog(`Starting visual layout evolution: [${e.toUpperCase()}]`,"info"),this.addTerminalLog("Studying DOM node alignment and mobile styling parameters...","comment"),await this.delay(1200),this.addTerminalLog("Generating updated Glassmorphic token stylesheet...","info");let t="",s="",a={...this.scores};if(e==="animation"?(t=`+ .sandbox-card {
+   animation: neon-glow-pulse-anim 5s infinite alternate;
+ }`,s="/* Injected animation keyframes */",a.polish=95):e==="spacing"?(t=`+ .sandbox-card {
+   backdrop-filter: blur(20px);
+   border: 1px solid rgba(255,255,255,0.08);
+ }`,s="/* Injected spacing tokens */",a.spacing=98):e==="mobile"?(t=`+ @media (max-width: 768px) {
+   .catalog-grid { grid-template-columns: 1fr; }
+ }`,s="/* Injected responsive overrides */",a.mobile=94):e==="conversion"&&(t=`+ .btn-buy {
+   background: linear-gradient(135deg, var(--neon-emerald), #059669);
+ }`,s="/* Injected CTA conversion elements */",a.conversion=97),this.scores=a,await this.delay(1e3),this.addTerminalLog("Visual upgrade stylesheet compiled successfully!","success"),(await this.dispatchWebhook({file:"playground/src/index.css",content:s,diffCode:t,explanation:`Evolved target design hook: ${e}`,type:"css"})).success){this.addTerminalLog("Evolved scoring variables completed! Redeployment is active.","success");try{let p=await(await fetch("http://localhost:3001/api/scores",{method:"POST",headers:{"Content-Type":"application/json","x-site-id":window.location.host},body:JSON.stringify({scores:a})})).json();p.success&&p.scores&&(this.scores=p.scores)}catch(r){this.addTerminalLog(`Failed to write evolved scores to backend DB: ${r.message}`,"error")}let o=`autoheal-evolution-style-${e}`,n=document.getElementById(o);n||(n=document.createElement("style"),n.id=o,document.head.appendChild(n)),e==="animation"?n.textContent=`
          @keyframes neon-glow-pulse-anim-dash {
            0% { box-shadow: 0 0 10px rgba(0, 240, 255, 0.25); }
            50% { box-shadow: 0 0 25px rgba(189, 0, 255, 0.45); }
            100% { box-shadow: 0 0 10px rgba(0, 240, 255, 0.25); }
          }
          .sandbox-card {
            animation: neon-glow-pulse-anim-dash 5s infinite alternate !important;
          }
        `:e==="spacing"?n.textContent=`
          .sandbox-card {
            background: rgba(10, 15, 26, 0.65) !important;
            backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
        `:e==="mobile"?n.textContent=`
          @media (max-width: 768px) {
            .catalog-grid { grid-template-columns: 1fr !important; }
          }
        `:e==="conversion"&&(n.textContent=`
          .btn-buy {
            background: linear-gradient(135deg, #00ff66 0%, #059669 100%) !important;
            box-shadow: 0 0 15px rgba(0, 255, 102, 0.4) !important;
          }
        `),this.render()}}render(){if(!this.container)return;let e=this.settings.n8nWebhook||"",t=this.settings.vercelDeployHook||"",s=this.settings.gitBranch||"main",a=this.scores.polish,i=this.scores.spacing,o=this.scores.mobile,n=this.scores.conversion;this.container.innerHTML=`
      <div class="ah-dash-wrapper">
        
        <!-- Dashboard Navigation Header -->
        <div class="ah-dash-header glass-panel">
          <div class="ah-dash-brand">
            <div class="ah-brand-icon">\u{1F9EC}</div>
            <div>
              <div class="ah-brand-title">AUTOHEAL // EVOLUTION DECK</div>
              <div class="ah-brand-sub">SaaS AUTONOMOUS WORKSPACE CONTROLLER</div>
            </div>
          </div>
          <div class="ah-dash-actions">
            <div class="ah-pill ${this.isConnected?"green":"red"}">
              <span class="ah-pulse-dot small ${this.isConnected?"green":"red"}"></span>
              <span>${this.isConnected?"GIT-BRIDGE CONNECTED":"OFFLINE"}</span>
            </div>
            <button class="ah-dash-btn secondary" id="ah-dash-reseed-trigger">\u{1F504} Re-Seed Data</button>
            <button class="ah-dash-btn secondary" id="ah-dash-settings-trigger">\u2699\uFE0F Cloud Settings</button>
          </div>
        </div>

        <div class="ah-dash-grid">
          
          <!-- LEFT SIDE: Error Hub Telemetry (Before) & Solution Deck (After) -->
          <div class="ah-dash-column col-left">
            
            <div class="ah-panel glass-panel">
              <div class="ah-panel-title">
                <span class="ah-icon-bullet red">\u{1F6D1}</span>
                <span>Telemetry Logs Hub (BEFORE)</span>
              </div>
              <div class="ah-panel-body scrollable">
                ${this.errorList.length===0?`
                  <div class="ah-empty-state">
                    <span class="ah-empty-icon">\u{1F6E1}\uFE0F</span>
                    <span class="ah-empty-text">No active telemetry exceptions caught in workspace.</span>
                    <button class="ah-dash-btn primary small" id="ah-dash-empty-reseed" style="margin-top: 12px;">\u{1F504} Re-Seed Mock Telemetry</button>
                  </div>
                `:`
                  <div class="ah-error-logs-list">
                    ${this.errorList.map(l=>`
                      <div class="ah-log-item-card">
                        <div class="ah-log-item-header">
                          <span class="ah-log-badge ${l.type==="crash"?"red":"yellow"}">${l.type.toUpperCase()}</span>
                          <span class="ah-log-time">${new Date(l.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div class="ah-log-message">${l.message}</div>
                        ${l.source?`<div class="ah-log-src">Source: <code>${l.source.substring(l.source.lastIndexOf("/")+1)}</code></div>`:""}
                        <div class="ah-log-footer">
                          <button class="ah-dash-btn primary small heal-trigger-btn" data-id="${l.id}">\u{1FA7A} AI Cloud Repair</button>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                `}
              </div>
            </div>

            <!-- Deployment Progress Terminal (AFTER) -->
            <div class="ah-panel glass-panel">
              <div class="ah-panel-title">
                <span class="ah-icon-bullet cyan">\u{1F4BB}</span>
                <span>Autonomous Git-Bridge Console</span>
              </div>
              <div class="ah-panel-body dark-terminal scrollable" id="ah-dash-terminal">
                ${this.currentTerminalLogs.map(l=>{let d="";return l.includes("\u2713")||l.includes("Live")?d="success":l.includes("\u2717")||l.includes("FAILED")?d="error":l.includes("\u2139")||l.includes("Initiating")?d="info":l.includes("comment")&&(d="comment"),`<div class="ah-term-line ${d}">${l}</div>`}).join("")}
              </div>
            </div>

          </div>

          <!-- RIGHT SIDE: Visual Layout Scoring Deck & Custom Evolutionary Prompt -->
          <div class="ah-dash-column col-right">
            
            <div class="ah-panel glass-panel">
              <div class="ah-panel-title">
                <span class="ah-icon-bullet purple">\u2728</span>
                <span>Visual Score Evolution Deck</span>
              </div>
              <div class="ah-panel-body">
                <div class="ah-gauges-container">
                  
                  <!-- Gauge 1: Motion & Polish -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">\u26A1 MOTION & POLISH</span>
                      <span class="ah-gauge-score ${a>=80?"green":"yellow"}">${a}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill yellow" style="width: ${a}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${a>=80?"Premium micro-animations active":"Static stylesheets detected"}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="animation">EVOLVE</button>
                    </div>
                  </div>

                  <!-- Gauge 2: Spacing & UI Design -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">\u{1F48E} DESIGN & SPACING</span>
                      <span class="ah-gauge-score ${i>=80?"green":"yellow"}">${i}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill cyan" style="width: ${i}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${i>=80?"High-contrast Glassmorphism active":"Outdated layout card models loaded"}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="spacing">EVOLVE</button>
                    </div>
                  </div>

                  <!-- Gauge 3: Mobile Sizing -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">\u{1F4F1} MOBILE RESPONSIVENESS</span>
                      <span class="ah-gauge-score ${o>=80?"green":"yellow"}">${o}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill purple" style="width: ${o}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${o>=80?"Fluid grid scaling configured":"Static pixel widths warning"}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="mobile">EVOLVE</button>
                    </div>
                  </div>

                  <!-- Gauge 4: Conversion CTA -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">\u{1F3A8} HIGH-CONVERSION CTA</span>
                      <span class="ah-gauge-score ${n>=80?"green":"yellow"}">${n}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill emerald" style="width: ${n}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${n>=80?"Glowing CTA gradient borders loaded":"Low CTA layout visibility"}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="conversion">EVOLVE</button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <!-- Evolutionary Settings Overlay trigger / Inline settings -->
            <div class="ah-panel glass-panel" id="ah-settings-panel" style="display: none;">
              <div class="ah-panel-title">
                <span class="ah-icon-bullet green">\u2699\uFE0F</span>
                <span>Git-Bridge & SaaS AI Setup</span>
              </div>
              <div class="ah-panel-body">
                <form class="ah-settings-form" id="ah-dash-settings-form">
                  <div class="ah-input-group">
                    <label>N8N Git-Bridge Webhook Endpoint URL</label>
                    <input type="text" id="ah-n8n-url-input" class="ah-text-input" placeholder="https://n8n.yourdomain.com/webhook/selfheal-patch" value="${e}" />
                  </div>
                  <div class="ah-input-group">
                    <label>Vercel / Render Live Deploy Hook URL</label>
                    <input type="text" id="ah-vercel-url-input" class="ah-text-input" placeholder="https://api.vercel.com/v1/integrations/deploy/..." value="${t}" />
                  </div>
                  <div class="ah-input-group">
                    <label>Target Git Repository Branch</label>
                    <input type="text" id="ah-git-branch-input" class="ah-text-input" placeholder="main" value="${s}" />
                  </div>
                  <div class="ah-input-group">
                    <label>Autonomous AI Engine Provider</label>
                    <select id="ah-model-provider-input" class="ah-text-input">
                      <option value="gemini" ${this.settings.modelProvider==="gemini"?"selected":""}>Google Gemini</option>
                      <option value="groq" ${this.settings.modelProvider==="groq"?"selected":""}>Groq (Llama 3)</option>
                    </select>
                  </div>
                  <div class="ah-input-group">
                    <label>Google Gemini API Key</label>
                    <input type="password" id="ah-gemini-key-input" class="ah-text-input" placeholder="Enter Gemini API Key..." value="${this.settings.geminiKey||""}" />
                  </div>
                  <div class="ah-input-group">
                    <label>Groq API Key</label>
                    <input type="password" id="ah-groq-key-input" class="ah-text-input" placeholder="Enter Groq API Key..." value="${this.settings.groqKey||""}" />
                  </div>
                  <div class="ah-settings-actions">
                    <button type="button" class="ah-dash-btn secondary" id="ah-settings-cancel">Cancel</button>
                    <button type="submit" class="ah-dash-btn green">Save Cloud Settings</button>
                  </div>
                </form>
              </div>
            </div>

          </div>

        </div>

      </div>
    `,this.container.querySelectorAll(".heal-trigger-btn").forEach(l=>{l.addEventListener("click",d=>{let f=d.currentTarget.dataset.id,x=this.errorList.find(y=>y.id===f);x&&this.triggerSimulatedHeal(x)})}),this.container.querySelectorAll(".evolve-trigger-btn").forEach(l=>{l.addEventListener("click",d=>{let f=d.currentTarget.dataset.gauge;f&&this.triggerSimulatedEvolution(f)})});let r=this.container.querySelector("#ah-dash-reseed-trigger");r&&r.addEventListener("click",async()=>{try{this.addTerminalLog("Requesting live mock database re-seeding...","comment");let d=await(await fetch("http://localhost:3001/api/telemetry/reseed",{method:"POST",headers:{"x-site-id":window.location.host}})).json();if(d.success&&d.errors)this.errorList=d.errors,window.__autoheal_errors_cache__=this.errorList,this.addTerminalLog("Reset & populated live mock telemetry database successfully.","success");else throw new Error("Reseed request failed on server.")}catch{this.errorList=this.getMockErrors(),window.__autoheal_errors_cache__=this.errorList,this.addTerminalLog("Reset & populated local mock telemetry dataset.","info")}window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:this.errorList})),this.render()});let p=this.container.querySelector("#ah-dash-empty-reseed");p&&p.addEventListener("click",async()=>{try{this.addTerminalLog("Requesting live mock database re-seeding...","comment");let d=await(await fetch("http://localhost:3001/api/telemetry/reseed",{method:"POST",headers:{"x-site-id":window.location.host}})).json();if(d.success&&d.errors)this.errorList=d.errors,window.__autoheal_errors_cache__=this.errorList,this.addTerminalLog("Populated live mock telemetry database successfully.","success");else throw new Error("Reseed request failed on server.")}catch{this.errorList=this.getMockErrors(),window.__autoheal_errors_cache__=this.errorList,this.addTerminalLog("Populated local mock telemetry dataset.","info")}window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:this.errorList})),this.render()});let g=this.container.querySelector("#ah-dash-settings-trigger"),c=this.container.querySelector("#ah-settings-panel"),m=this.container.querySelector("#ah-settings-cancel"),b=this.container.querySelector("#ah-dash-settings-form");g&&c&&g.addEventListener("click",()=>{c.style.display=c.style.display==="none"?"block":"none"}),m&&c&&m.addEventListener("click",()=>{c.style.display="none"}),b&&c&&b.addEventListener("submit",l=>{l.preventDefault();let d=document.getElementById("ah-n8n-url-input").value,f=document.getElementById("ah-vercel-url-input").value,x=document.getElementById("ah-git-branch-input").value,y=document.getElementById("ah-model-provider-input").value,H=document.getElementById("ah-gemini-key-input").value,$=document.getElementById("ah-groq-key-input").value;this.saveSettings(d,f,x,y,H,$),c.style.display="none"});let h=document.getElementById("ah-dash-terminal");h&&(h.scrollTop=h.scrollHeight)}delay(e){return new Promise(t=>setTimeout(t,e))}injectStyles(){if(document.getElementById("autoheal-dashboard-styles"))return;let e=document.createElement("style");e.id="autoheal-dashboard-styles",e.textContent=`
      @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');

      /* Cyberpunk Slate Variables */
      .ah-dash-wrapper {
        --dash-bg: #0a0d14;
        --dash-panel-bg: rgba(17, 22, 34, 0.7);
        --dash-border: rgba(255, 255, 255, 0.06);
        --dash-text: #e6edf3;
        --dash-text-muted: #8b949e;
        
        --neon-cyan: #00f0ff;
        --neon-purple: #bd00ff;
        --neon-emerald: #00ff66;
        --neon-red: #ff4444;
        --neon-yellow: #ffd700;
        
        font-family: 'Inter', sans-serif;
        background-color: var(--dash-bg);
        color: var(--dash-text);
        padding: 24px;
        min-height: 100vh;
        box-sizing: border-box;
      }

      .ah-dash-wrapper * {
        box-sizing: border-box;
      }

      /* Navigation Header */
      .ah-dash-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-radius: 12px;
        margin-bottom: 24px;
      }

      .ah-dash-brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .ah-brand-icon {
        font-size: 28px;
      }

      .ah-brand-title {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.05em;
        background: linear-gradient(90deg, #fff, var(--neon-cyan), var(--neon-purple));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .ah-brand-sub {
        font-size: 11px;
        color: var(--dash-text-muted);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 500;
        margin-top: 2px;
      }

      .ah-dash-actions {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      /* Layout grid */
      .ah-dash-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 24px;
      }

      @media (max-width: 1024px) {
        .ah-dash-grid {
          grid-template-columns: 1fr;
        }
      }

      .ah-dash-column {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      /* Panel system */
      .glass-panel {
        background: var(--dash-panel-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--dash-border);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }

      .ah-panel {
        display: flex;
        flex-direction: column;
        max-height: 520px;
      }

      .ah-panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--dash-border);
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .ah-panel-body {
        padding: 20px;
        overflow-y: auto;
      }

      .ah-panel-body.scrollable {
        max-height: 400px;
      }

      /* Telemetry log list */
      .ah-error-logs-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .ah-log-item-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--dash-border);
        border-radius: 8px;
        padding: 14px;
        transition: all 0.3s ease;
      }

      .ah-log-item-card:hover {
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.02);
      }

      .ah-log-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .ah-log-message {
        font-family: 'Fira Code', monospace;
        font-size: 12.5px;
        color: var(--dash-text);
        word-break: break-all;
        margin-bottom: 10px;
      }

      .ah-log-src {
        font-size: 11px;
        color: var(--dash-text-muted);
        margin-bottom: 12px;
      }

      .ah-log-src code {
        font-family: 'Fira Code', monospace;
        color: var(--neon-cyan);
      }

      /* Diagnostic console terminal */
      .dark-terminal {
        background: #06090e;
        border: 1px solid rgba(0, 240, 255, 0.15);
        border-radius: 8px;
        padding: 16px;
        font-family: 'Fira Code', monospace;
        font-size: 12px;
        height: 280px;
        box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.6);
      }

      .ah-term-line {
        margin-bottom: 8px;
        line-height: 1.5;
        color: #c9d1d9;
      }

      .ah-term-line.comment { color: #8b949e; }
      .ah-term-line.success { color: var(--neon-emerald); }
      .ah-term-line.error { color: var(--neon-red); }
      .ah-term-line.info { color: var(--neon-cyan); }

      /* Gauges spacer */
      .ah-gauges-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .ah-gauge-row {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--dash-border);
        border-radius: 8px;
        padding: 16px;
      }

      .ah-gauge-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .ah-gauge-name {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: rgba(255, 255, 255, 0.85);
      }

      .ah-gauge-score {
        font-size: 14px;
        font-weight: 800;
        font-family: 'Fira Code', monospace;
      }

      .ah-gauge-score.green { color: var(--neon-emerald); }
      .ah-gauge-score.yellow { color: var(--neon-yellow); }

      .ah-progress-track {
        background: rgba(255, 255, 255, 0.05);
        height: 6px;
        border-radius: 5px;
        margin-bottom: 12px;
        overflow: hidden;
      }

      .ah-progress-fill {
        height: 100%;
        border-radius: 5px;
      }

      .ah-progress-fill.yellow { background: var(--neon-yellow); box-shadow: 0 0 10px var(--neon-yellow); }
      .ah-progress-fill.cyan { background: var(--neon-cyan); box-shadow: 0 0 10px var(--neon-cyan); }
      .ah-progress-fill.purple { background: var(--neon-purple); box-shadow: 0 0 10px var(--neon-purple); }
      .ah-progress-fill.emerald { background: var(--neon-emerald); box-shadow: 0 0 10px var(--neon-emerald); }

      .ah-gauge-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: var(--dash-text-muted);
      }

      /* Buttons & input classes */
      .ah-dash-btn {
        background: transparent;
        color: var(--dash-text);
        border: 1px solid var(--dash-border);
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .ah-dash-btn:hover {
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.02);
      }

      .ah-dash-btn.primary {
        background: linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(189, 0, 255, 0.1) 100%);
        border-color: rgba(0, 240, 255, 0.45);
      }

      .ah-dash-btn.primary:hover {
        border-color: var(--neon-cyan);
        box-shadow: 0 0 12px rgba(0, 240, 255, 0.3);
      }

      .ah-dash-btn.purple {
        background: rgba(189, 0, 255, 0.1);
        border-color: rgba(189, 0, 255, 0.4);
        color: #fff;
      }

      .ah-dash-btn.purple:hover {
        border-color: var(--neon-purple);
        box-shadow: 0 0 12px rgba(189, 0, 255, 0.35);
      }

      .ah-dash-btn.green {
        background: rgba(0, 255, 102, 0.08);
        border-color: rgba(0, 255, 102, 0.4);
      }

      .ah-dash-btn.green:hover {
        border-color: var(--neon-emerald);
        box-shadow: 0 0 12px rgba(0, 255, 102, 0.3);
      }

      .ah-dash-btn.small {
        padding: 5px 10px;
        font-size: 11px;
      }

      /* Pills and badges */
      .ah-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        padding: 6px 12px;
        border-radius: 50px;
        border: 1px solid var(--dash-border);
      }

      .ah-pill.green {
        background: rgba(0, 255, 102, 0.05);
        color: var(--neon-emerald);
        border-color: rgba(0, 255, 102, 0.2);
      }

      .ah-pill.red {
        background: rgba(255, 68, 68, 0.05);
        color: var(--neon-red);
        border-color: rgba(255, 68, 68, 0.2);
      }

      .ah-log-badge {
        font-size: 9.5px;
        font-weight: 800;
        padding: 2.5px 6px;
        border-radius: 3px;
        letter-spacing: 0.05em;
      }

      .ah-log-badge.red { background: rgba(255, 68, 68, 0.15); color: var(--neon-red); }
      .ah-log-badge.yellow { background: rgba(255, 215, 0, 0.15); color: var(--neon-yellow); }

      .ah-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .ah-pulse-dot.green {
        background: var(--neon-emerald);
        box-shadow: 0 0 8px var(--neon-emerald);
      }

      .ah-pulse-dot.red {
        background: var(--neon-red);
        box-shadow: 0 0 8px var(--neon-red);
      }

      .ah-icon-bullet {
        font-size: 16px;
      }

      /* Empty states */
      .ah-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        border: 1px dashed var(--dash-border);
        border-radius: 8px;
      }

      .ah-empty-icon {
        font-size: 36px;
        margin-bottom: 12px;
      }

      .ah-empty-text {
        font-size: 12px;
        color: var(--dash-text-muted);
      }

      /* Input Forms settings */
      .ah-settings-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .ah-input-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .ah-input-group label {
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: var(--dash-text-muted);
      }

      .ah-text-input {
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid var(--dash-border);
        color: #fff;
        padding: 10px;
        border-radius: 6px;
        font-family: 'Fira Code', monospace;
        font-size: 12px;
        width: 100%;
      }

      .ah-text-input:focus {
        border-color: var(--neon-cyan);
        outline: none;
        box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
      }

      .ah-settings-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 10px;
      }
    `,document.head.appendChild(e)}},k=new D;var L=class{interceptor=new E;config={autoHealEnabled:!0};initialized=!1;caughtErrors=[];constructor(){}init(e){this.initialized||(this.initialized=!0,this.config={...this.config,...e},e.email&&w.setConfig(e.email),window.__autoheal_errors_cache__=this.caughtErrors,v.init(async t=>{if(this.config.onHealRequest)return await this.config.onHealRequest(t);let s=t.type==="feature",a=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",i=window.AUTOHEAL_SITE_ID||window.location.host;try{let n=await(await fetch(`${a}/api/generate-patch`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":i},body:JSON.stringify(s?{prompt:t.message,file:t.source||"sandbox"}:{error:t,file:t.source||"sandbox"})})).json();if(!n.success)throw new Error(n.explanation);return{success:!0,diffCode:n.diffCode,healedFileContent:n.healedFileContent,targetPath:n.targetPath||"sandbox"}}catch(o){return console.error("__autoheal_internal__ Standalone generation error:",o),{success:!1,diffCode:"",explanation:o.message}}}),this.interceptor.start(t=>{this.caughtErrors.push(t),window.__autoheal_errors_cache__=this.caughtErrors,fetch("http://localhost:3001/api/telemetry",{method:"POST",headers:{"Content-Type":"application/json","x-site-id":window.location.host},body:JSON.stringify({error:t})}).then(s=>s.json()).then(s=>{s.success&&s.errors&&window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:s.errors}))}).catch(s=>{console.warn("__autoheal_internal__ Telemetry database sync warning:",s),window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:this.caughtErrors}))}),w.sendErrorEmail(t),t.type==="crash"?v.triggerHardCrashOverlay(t):v.reportSoftError(t)}),console.log("__autoheal_internal__ AutoHealUI SDK active and monitoring logs."))}mountDashboard(e){k.mount(e)}shutdown(){this.interceptor.stop(),this.initialized=!1}get getConfig(){return this.config}get patcher(){return I}get emailer(){return w}get widget(){return v}get dashboard(){return k}},A=new L;typeof window<"u"&&window.AUTOHEAL_SITE_ID&&setTimeout(()=>{A.init({})},100);return j(R);})();
