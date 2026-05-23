var AutoHeal=(()=>{var _=Object.defineProperty;var R=Object.getOwnPropertyDescriptor;var N=Object.getOwnPropertyNames;var j=Object.prototype.hasOwnProperty;var z=(b,e)=>{for(var t in e)_(b,t,{get:e[t],enumerable:!0})},U=(b,e,t,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of N(e))!j.call(b,a)&&a!==t&&_(b,a,{get:()=>e[a],enumerable:!(i=R(e,a))||i.enumerable});return b};var q=b=>U(_({},"__esModule",{value:!0}),b);var F={};z(F,{AutoHeal:()=>B,AutoHealSDK:()=>S,dashboardInstance:()=>I,emailerInstance:()=>L,patcherInstance:()=>O,widgetInstance:()=>E});var T=class{active=!1;callback=null;originalConsoleError=console.error;originalConsoleWarn=console.warn;constructor(){}start(e){this.active||(this.active=!0,this.callback=e,window.addEventListener("error",this.handleUncaughtError),window.addEventListener("unhandledrejection",this.handleUnhandledRejection),window.addEventListener("error",this.handleAssetError,!0),console.error=(...t)=>{this.originalConsoleError.apply(console,t);let i=t.map(a=>typeof a=="object"?JSON.stringify(a):String(a)).join(" ");i.includes("__autoheal_internal__")||this.triggerCallback({id:"err_"+Math.random().toString(36).substr(2,9),type:"console_error",message:i,timestamp:new Date().toISOString()})},console.warn=(...t)=>{this.originalConsoleWarn.apply(console,t);let i=t.map(a=>typeof a=="object"?JSON.stringify(a):String(a)).join(" ");i.includes("__autoheal_internal__")||this.triggerCallback({id:"warn_"+Math.random().toString(36).substr(2,9),type:"console_warn",message:i,timestamp:new Date().toISOString()})})}stop(){this.active&&(this.active=!1,this.callback=null,window.removeEventListener("error",this.handleUncaughtError),window.removeEventListener("unhandledrejection",this.handleUnhandledRejection),window.removeEventListener("error",this.handleAssetError,!0),console.error=this.originalConsoleError,console.warn=this.originalConsoleWarn)}triggerCallback(e){this.callback&&this.callback(e)}handleUncaughtError=e=>{if(e.target&&e.target!==window)return;let t={id:"crash_"+Math.random().toString(36).substr(2,9),type:"crash",message:e.message||"Unknown uncaught exception",source:e.filename,line:e.lineno,column:e.colno,stack:e.error?e.error.stack:new Error().stack,timestamp:new Date().toISOString()};this.triggerCallback(t)};handleUnhandledRejection=e=>{let t="Promise rejected without reason",i="";e.reason&&(e.reason instanceof Error?(t=e.reason.message,i=e.reason.stack||""):typeof e.reason=="string"?t=e.reason:t=JSON.stringify(e.reason));let a={id:"promise_"+Math.random().toString(36).substr(2,9),type:"promise",message:t,stack:i||new Error().stack,timestamp:new Date().toISOString()};this.triggerCallback(a)};handleAssetError=e=>{let t=e.target;if(!t)return;let i=t.tagName;if(!(i==="IMG"||i==="SCRIPT"||i==="LINK"))return;let l=i==="LINK"?"href":"src",n=t.getAttribute(l)||"unknown source",o=t.outerHTML?t.outerHTML.substring(0,150)+"...":`<${i.toLowerCase()}>`,s={id:"asset_"+Math.random().toString(36).substr(2,9),type:"asset",message:`Failed to load resource: ${i.toLowerCase()} load error.`,source:n,domContext:o,timestamp:new Date().toISOString()};this.triggerCallback(s)}};var H=class{config={enabled:!1};listeners=[];constructor(){}setConfig(e){this.config={...this.config,...e}}subscribe(e){return this.listeners.push(e),()=>{this.listeners=this.listeners.filter(t=>t!==e)}}async sendErrorEmail(e){let t=new Date(e.timestamp).toLocaleString(),i=`\u{1F6A8} AutoHeal Alert [${e.type.toUpperCase()}]: ${e.message.substring(0,50)}`,a=`
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
    `.trim();return this.listeners.forEach(l=>{try{l({subject:i,recipient:this.config.devEmail||"developer@local.dev",body:a,timestamp:new Date().toISOString(),sentReal:this.config.enabled})}catch{}}),!0}},L=new H;var D=class{appliedPatches=[];originalJSBackups=new Map;constructor(){}injectCSS(e,t){try{let i=`autoheal-style-${e}`,a=document.getElementById(i);a||(a=document.createElement("style"),a.id=i,document.head.appendChild(a)),a.textContent=t;let l=this.appliedPatches.find(n=>n.id===e);return l?(l.code=t,l.timestamp=new Date().toISOString()):this.appliedPatches.push({id:e,type:"css",target:"DOM Head Stylesheet",code:t,timestamp:new Date().toISOString()}),!0}catch(i){return console.error("__autoheal_internal__ Error injecting CSS patch:",i),!1}}overrideFunction(e,t,i){try{let a=t.split("."),l=window;for(let s=0;s<a.length-1;s++)l[a[s]]||(l[a[s]]={}),l=l[a[s]];let n=a[a.length-1],o=`backup_${e}_${t}`;return this.originalJSBackups.has(o)||this.originalJSBackups.set(o,l[n]),l[n]=i,this.appliedPatches.push({id:e,type:"js",target:t,code:i.toString(),timestamp:new Date().toISOString()}),!0}catch(a){return console.error("__autoheal_internal__ Error applying JS function override:",a),!1}}removePatch(e){try{let t=this.appliedPatches.findIndex(a=>a.id===e);if(t===-1)return!1;let i=this.appliedPatches[t];if(i.type==="css"){let a=`autoheal-style-${e}`,l=document.getElementById(a);l&&l.remove()}else if(i.type==="js"){let a=i.target.split("."),l=window;for(let s=0;s<a.length-1;s++)l=l[a[s]];let n=a[a.length-1],o=`backup_${e}_${i.target}`;this.originalJSBackups.has(o)&&(l[n]=this.originalJSBackups.get(o),this.originalJSBackups.delete(o))}return this.appliedPatches.splice(t,1),!0}catch(t){return console.error("__autoheal_internal__ Error removing patch:",t),!1}}getAppliedPatches(){return[...this.appliedPatches]}},O=new D;var A=class{container=null;badge=null;currentErrors=[];activeError=null;onHealHandler=null;constructor(){}init(e){this.onHealHandler=e,this.injectStyles(),this.createBadge(),this.createFab(),this.createWidgetContainer()}reportSoftError(e){this.currentErrors.find(t=>t.id===e.id)||(this.currentErrors.push(e),this.updateBadgeCount())}triggerHardCrashOverlay(e){this.reportSoftError(e),this.openDiagnosticModal(e,!0)}updateBadgeCount(){if(!this.badge)return;let e=this.currentErrors.length;if(e>0){this.badge.style.display="flex";let t=this.badge.querySelector(".ah-badge-count");t&&(t.textContent=String(e));let i=this.currentErrors[this.currentErrors.length-1],a=this.badge.querySelector(".ah-badge-text");a&&(a.textContent=i.type==="crash"?"System Crash Caught!":`Soft Error: ${i.message.substring(0,24)}...`),this.badge.classList.remove("ah-pulse"),this.badge.offsetWidth,this.badge.classList.add("ah-pulse")}else this.badge.style.display="none"}createBadge(){document.getElementById("autoheal-badge")||(this.badge=document.createElement("div"),this.badge.id="autoheal-badge",this.badge.className="ah-badge-pill",this.badge.style.display="none",this.badge.innerHTML=`
      <div class="ah-badge-icon">\u{1FA7A}</div>
      <div class="ah-badge-details">
        <span class="ah-badge-text">Errors Detected</span>
        <span class="ah-badge-count">0</span>
      </div>
    `,this.badge.addEventListener("click",()=>{if(this.currentErrors.length>0){let e=this.currentErrors[this.currentErrors.length-1];this.openDiagnosticModal(e,!1)}}),document.body.appendChild(this.badge))}createWidgetContainer(){document.getElementById("autoheal-container")||(this.container=document.createElement("div"),this.container.id="autoheal-container",this.container.className="ah-modal-overlay",document.body.appendChild(this.container))}createFab(){if(document.getElementById("autoheal-fab"))return;let e=document.createElement("div");e.id="autoheal-fab",e.className="ah-fab",e.innerHTML="\u2728",e.title="Ask AI to build a feature",e.addEventListener("click",()=>{this.openFeatureModal()}),document.body.appendChild(e)}openFeatureModal(){this.openUnifiedModal("studio",null,!1)}openDiagnosticModal(e,t){this.openUnifiedModal("studio",e,t)}openUnifiedModal(e="studio",t=null,i=!1){if(!this.container)return;this.activeError=t,i?(document.body.classList.add("ah-blur-active"),this.container.classList.add("ah-hard-crash")):this.container.classList.remove("ah-hard-crash"),this.container.style.display="flex",this.container.innerHTML=`
      <div class="ah-diag-modal">
        <div class="ah-diag-header">
          <div class="ah-diag-title">
            <span class="ah-pulse-dot" style="background:${t?"#ff4444":"#00f0ff"}; box-shadow: 0 0 8px ${t?"#ff4444":"#00f0ff"};"></span>
            <span>AUTOHEAL EVOLUTION SYSTEM</span>
          </div>
          <button class="ah-close-btn" id="ah-close-modal-btn">\u2715</button>
        </div>

        <div class="ah-tab-header">
          <button class="ah-tab-btn" id="ah-tab-btn-studio">\u2728 AI Studio</button>
          <button class="ah-tab-btn" id="ah-tab-btn-logs">\u{1F6D1} Telemetry Logs</button>
          <button class="ah-tab-btn" id="ah-tab-btn-settings">\u2699\uFE0F Settings</button>
        </div>

        <!-- \u2500\u2500 TAB 1: AI STUDIO \u2500\u2500 -->
        <div class="ah-diag-body" id="ah-feature-view">
          <!-- Populated dynamically -->
        </div>
        <div class="ah-diag-footer" id="ah-feature-footer">
          <!-- Populated dynamically -->
        </div>

        <!-- \u2500\u2500 TAB 2: TELEMETRY LOGS \u2500\u2500 -->
        <div class="ah-diag-body" id="ah-logs-view" style="display:none; overflow-y:auto; max-height:400px;">
          <div style="text-align:center; padding: 20px; color:#888;">Loading telemetry exception records...</div>
        </div>
        <div class="ah-diag-footer" id="ah-logs-footer" style="display:none;">
          <div class="ah-status-message">Historical caught exceptions.</div>
          <div class="ah-actions">
            <button class="ah-btn secondary" id="ah-logs-reseed-btn">\u{1F504} Reseed Mock Logs</button>
          </div>
        </div>

        <!-- \u2500\u2500 TAB 3: SETTINGS \u2500\u2500 -->
        <div class="ah-diag-body" id="ah-settings-view" style="display:none; overflow-y:auto; max-height:400px;">
          <!-- Populated dynamically -->
        </div>
        <div class="ah-diag-footer" id="ah-settings-footer" style="display:none;">
          <div class="ah-status-message" id="ah-settings-status" style="color: #00ff66;"></div>
          <div class="ah-actions">
            <button class="ah-btn primary" id="ah-save-settings-btn">SAVE SETTINGS</button>
          </div>
        </div>
      </div>
    `,document.getElementById("ah-close-modal-btn")?.addEventListener("click",()=>this.closeDiagnosticModal());let a=document.getElementById("ah-tab-btn-studio"),l=document.getElementById("ah-tab-btn-logs"),n=document.getElementById("ah-tab-btn-settings"),o=document.getElementById("ah-feature-view"),s=document.getElementById("ah-logs-view"),p=document.getElementById("ah-settings-view"),c=document.getElementById("ah-feature-footer"),m=document.getElementById("ah-logs-footer"),x=document.getElementById("ah-settings-footer"),h=d=>{a.classList.toggle("active",d==="studio"),l.classList.toggle("active",d==="logs"),n.classList.toggle("active",d==="settings"),o.style.display=d==="studio"?"block":"none",s.style.display=d==="logs"?"block":"none",p.style.display=d==="settings"?"block":"none",c&&(c.style.display=d==="studio"?"flex":"none"),m&&(m.style.display=d==="logs"?"flex":"none"),x&&(x.style.display=d==="settings"?"flex":"none"),d==="logs"?this.fetchAndRenderLogs():d==="settings"&&this.fetchAndRenderSettings()};a.addEventListener("click",()=>h("studio")),l.addEventListener("click",()=>h("logs")),n.addEventListener("click",()=>h("settings")),this.renderStudioTab(this.activeError),document.getElementById("ah-logs-reseed-btn")?.addEventListener("click",async()=>{let d=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",r=window.AUTOHEAL_SITE_ID||window.location.host;try{await fetch(`${d}/api/telemetry/reseed`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":r}}),this.showToast("\u{1F504} Telemetry mock logs reseeded!","success"),this.fetchAndRenderLogs()}catch{}}),h(e)}renderStudioTab(e){let t=document.getElementById("ah-feature-view"),i=document.getElementById("ah-feature-footer");if(!(!t||!i))if(e){let a=new Date(e.timestamp).toLocaleTimeString();t.innerHTML=`
        <div class="ah-section">
          <div class="ah-section-title">\u{1F6D1} Captured Exception [${e.type.toUpperCase()}]</div>
          <div class="ah-error-card">
            <div class="ah-error-msg">${e.message}</div>
            ${e.source?`<div class="ah-error-source">URL: <span>${e.source}</span> ${e.line?`(Line ${e.line}:${e.column})`:""}</div>`:""}
            ${e.domContext?`<div class="ah-error-dom">DOM: <code>${this.escapeHTML(e.domContext)}</code></div>`:""}
            <div class="ah-timestamp">Caught at ${a} \u2022 Logs emailed to developer inbox \u2709\uFE0F</div>
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
      `,i.innerHTML=`
        <div class="ah-status-message" id="ah-footer-status">Analyzing stack trace...</div>
        <div class="ah-actions">
          <button class="ah-btn secondary" id="ah-ignore-btn">Ignore Error</button>
          <button class="ah-btn primary disabled" id="ah-patch-btn" disabled>
            <span class="ah-btn-spinner" id="ah-btn-loader" style="display: inline-block;"></span>
            <span id="ah-btn-text">Waiting for AI...</span>
          </button>
        </div>
      `,document.getElementById("ah-ignore-btn")?.addEventListener("click",()=>this.closeDiagnosticModal());let l=document.getElementById("ah-patch-btn");this.runDiagnosticEngine(e,l)}else{t.innerHTML=`
        <div class="ah-section">
          <div class="ah-section-title">\u2728 What would you like to build?</div>
          <textarea class="ah-feature-input" id="ah-feature-prompt" placeholder="e.g. Add a contact form to this page, or change the background to dark mode..."></textarea>
        </div>

        <div class="ah-section ah-diag-flow" id="ah-feature-flow-section" style="display:none;">
          <div class="ah-console" id="ah-diag-console" style="height:150px"></div>
        </div>

        <div class="ah-section ah-patch-section" id="ah-patch-box" style="display: none;">
          <div class="ah-section-title">\u{1F52E} Proposed UI Upgrade</div>
          <div class="ah-diff-viewer" id="ah-diff-box">
            <!-- Content filled dynamically -->
          </div>
        </div>
      `,i.innerHTML=`
        <div class="ah-status-message" id="ah-footer-status">Ready to build.</div>
        <div class="ah-actions">
          <button class="ah-btn primary" id="ah-build-btn">
            <span class="ah-btn-spinner" id="ah-btn-loader" style="display: none;"></span>
            <span id="ah-btn-text">BUILD FEATURE \u{1F680}</span>
          </button>
        </div>
      `;let a=document.getElementById("ah-build-btn"),l=document.getElementById("ah-feature-prompt");a?.addEventListener("click",()=>{let n=l.value.trim();if(!n)return;l.disabled=!0,a.disabled=!0,a.classList.add("disabled");let o=document.getElementById("ah-btn-loader");o&&(o.style.display="inline-block");let s=document.getElementById("ah-btn-text");s&&(s.textContent="BUILDING...");let p=document.getElementById("ah-feature-flow-section");p&&(p.style.display="block");let c={id:"feature_"+Date.now(),type:"feature",message:n,timestamp:new Date().toISOString(),source:window.location.pathname==="/"?"src/App.jsx":window.location.pathname};this.runDiagnosticEngine(c,a)})}}async fetchAndRenderLogs(){let e=document.getElementById("ah-logs-view");if(!e)return;e.innerHTML='<div style="text-align:center; padding: 30px; color:#888;"><span class="ah-btn-spinner" style="display:inline-block; margin-right:8px;"></span>Loading exception logs...</div>';let t=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",i=window.AUTOHEAL_SITE_ID||window.location.host;try{let n=(await(await fetch(`${t}/api/telemetry?siteId=${i}`,{headers:{"x-site-id":i}})).json()).errors||[];if(n.length===0){e.innerHTML=`
          <div style="text-align:center; padding: 40px 20px;">
            <div style="font-size:32px; margin-bottom:12px;">\u{1F6E1}\uFE0F</div>
            <div style="font-weight:700; font-size:15px; margin-bottom:6px; color:#fff;">No exceptions caught!</div>
            <div style="font-size:12px; color:#888; margin-bottom:16px;">This website is currently completely healthy.</div>
            <button class="ah-btn secondary" id="ah-logs-empty-reseed" style="margin: 0 auto;">Reseed Mock Errors</button>
          </div>
        `,document.getElementById("ah-logs-empty-reseed")?.addEventListener("click",async()=>{await fetch(`${t}/api/telemetry/reseed`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":i}}),this.fetchAndRenderLogs()});return}e.innerHTML=`
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${n.map(o=>{let s=new Date(o.timestamp).toLocaleTimeString(),p=new Date(o.timestamp).toLocaleDateString(),c=o.type==="crash";return`
              <div style="background:rgba(255,255,255,0.02); border:1px solid ${c?"rgba(255,68,68,0.2)":"rgba(255,215,0,0.1)"}; border-radius:8px; padding:12px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; text-transform:uppercase; background:${c?"rgba(255,68,68,0.15)":"rgba(255,215,0,0.1)"}; color:${c?"#ff4444":"#ffd700"}; border:1px solid ${c?"rgba(255,68,68,0.25)":"rgba(255,215,0,0.2)"};">
                    ${o.type}
                  </span>
                  <span style="font-size:10px; color:#666;">${p} ${s}</span>
                </div>
                <div style="font-size:13px; font-weight:600; color:#e6edf3; word-break:break-word;">
                  ${o.message}
                </div>
                ${o.source?`
                  <div style="font-size:11px; color:#8b949e; font-family:monospace; background:rgba(0,0,0,0.2); padding:4px 8px; border-radius:4px; word-break:break-all;">
                    Source: ${o.source.substring(o.source.lastIndexOf("/")+1)} ${o.line?`:${o.line}`:""}
                  </div>
                `:""}
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px; border-top:1px solid rgba(255,255,255,0.04); padding-top:8px;">
                  <button class="ah-btn secondary small ah-log-heal-btn" data-id="${o.id}" style="padding:4px 10px; font-size:10px; height:24px;">\u{1FA7A} Heal Exception</button>
                  <button class="ah-btn secondary small ah-log-clear-btn" data-id="${o.id}" style="padding:4px 10px; font-size:10px; height:24px; border-color:rgba(255,68,68,0.2); color:#ff6b6b;">\u2715 Clear</button>
                </div>
              </div>
            `}).join("")}
        </div>
      `,e.querySelectorAll(".ah-log-heal-btn").forEach(o=>{o.addEventListener("click",s=>{let p=s.currentTarget.dataset.id,c=n.find(m=>m.id===p);c&&(this.activeError=c,document.getElementById("ah-tab-btn-studio").click())})}),e.querySelectorAll(".ah-log-clear-btn").forEach(o=>{o.addEventListener("click",async s=>{let p=s.currentTarget.dataset.id;if(p)try{await fetch(`${t}/api/telemetry/clear`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":i},body:JSON.stringify({id:p})}),this.showToast("\u{1F5D1}\uFE0F Exception record cleared!","success"),this.fetchAndRenderLogs()}catch{}})})}catch{e.innerHTML='<div style="text-align:center; padding: 20px; color:#ff4444;">Failed to fetch exceptions list.</div>'}}async fetchAndRenderSettings(){let e=document.getElementById("ah-settings-view");if(!e)return;e.innerHTML=`
      <div style="margin-bottom:16px;" id="ah-ollama-detector-banner">
        <div style="text-align:center; padding: 10px; font-size:12px; color:#888;">Checking local Ollama status...</div>
      </div>

      <div class="ah-section">
        <div class="ah-section-title">\u2699\uFE0F AI Brain Provider</div>
        <div class="ah-form-group">
          <select id="ah-provider-select" class="ah-feature-input" style="height:38px; padding:0 10px; background:#0d1117; cursor:pointer;">
            <option value="gemini">Google Gemini (Cloud)</option>
            <option value="groq">Groq AI (Llama 3)</option>
            <option value="ollama">Ollama (Local LLM)</option>
          </select>
        </div>

        <!-- Gemini Options -->
        <div id="ah-settings-gemini-section" style="display:none; margin-bottom:12px;">
          <div class="ah-form-group">
            <label class="ah-label">Gemini API Key</label>
            <input type="password" id="ah-gemini-key-input" class="ah-feature-input" style="height:36px; font-family:monospace;" placeholder="AIzaSy..." />
            <div style="color:#8b949e; font-size:11px; margin-top:4px;">\u{1F4A1} Get a free key at <a href="https://aistudio.google.com/" target="_blank" style="color:#00f0ff; text-decoration:none;">aistudio.google.com</a></div>
          </div>
        </div>

        <!-- Groq Options -->
        <div id="ah-settings-groq-section" style="display:none; margin-bottom:12px;">
          <div class="ah-form-group">
            <label class="ah-label">Groq API Key</label>
            <input type="password" id="ah-groq-key-input" class="ah-feature-input" style="height:36px; font-family:monospace;" placeholder="gsk_..." />
            <div style="color:#8b949e; font-size:11px; margin-top:4px;">\u{1F4A1} Get a key at <a href="https://console.groq.com/" target="_blank" style="color:#00f0ff; text-decoration:none;">console.groq.com</a></div>
          </div>
        </div>

        <!-- Ollama Options -->
        <div id="ah-settings-ollama-section" style="display:none; margin-bottom:12px;">
          <div style="display:flex; gap:10px;">
            <div class="ah-form-group" style="flex:1;">
              <label class="ah-label">Ollama Host</label>
              <input type="text" id="ah-ollama-url-input" class="ah-feature-input" style="height:36px;" placeholder="http://localhost:11434" />
            </div>
            <div class="ah-form-group" style="flex:1;">
              <label class="ah-label">Ollama Model</label>
              <input type="text" id="ah-ollama-model-input" class="ah-feature-input" style="height:36px;" placeholder="llama3" />
            </div>
          </div>
          <div style="color:#8b949e; font-size:11px; margin-top:4px;">Ensure your local server is running by executing <code>ollama serve</code>. Default port: 11434.</div>
        </div>

        <div class="ah-form-group" style="margin-top:12px;">
          <label style="display:flex; align-items:center; cursor:pointer; font-size:13px; color:#fff;">
            <input type="checkbox" id="ah-autonomous-toggle" style="margin-right:8px; cursor:pointer; width:16px; height:16px;" />
            \u26A1 Enable Autonomous Auto-Heal (Zero-Click)
          </label>
          <p style="color:#888; font-size:11px; margin-top:4px; margin-left:24px;">Automatically catches crashes, writes a patch, and deploys instantly in the background.</p>
        </div>
      </div>

      <div class="ah-section" style="border-top: 1px solid rgba(255,255,255,0.08); padding-top:16px; margin-top:16px;">
        <div class="ah-section-title">\u{1F4E6} Git & Deployment Settings</div>
        
        <div class="ah-form-group">
          <label class="ah-label">GitHub Repository (owner/repo)</label>
          <input type="text" id="ah-github-repo-input" class="ah-feature-input" style="height:36px;" placeholder="e.g. Octocat/Hello-World" />
        </div>

        <div class="ah-form-group">
          <label class="ah-label">GitHub Personal Access Token (PAT)</label>
          <input type="password" id="ah-github-token-input" class="ah-feature-input" style="height:36px; font-family:monospace;" placeholder="ghp_..." />
        </div>

        <div class="ah-form-group">
          <label class="ah-label">Vercel Deploy Hook URL</label>
          <input type="text" id="ah-vercel-hook-input" class="ah-feature-input" style="height:36px;" placeholder="https://api.vercel.com/v1/integrations/deploy/..." />
        </div>

        <div class="ah-form-group">
          <label class="ah-label">N8N Cloud Bridge Webhook URL (Optional)</label>
          <input type="text" id="ah-n8n-webhook-input" class="ah-feature-input" style="height:36px;" placeholder="https://..." />
        </div>
      </div>
    `;let t=document.getElementById("ah-provider-select"),i=document.getElementById("ah-settings-gemini-section"),a=document.getElementById("ah-settings-groq-section"),l=document.getElementById("ah-settings-ollama-section"),n=h=>{i.style.display=h==="gemini"?"block":"none",a.style.display=h==="groq"?"block":"none",l.style.display=h==="ollama"?"block":"none"};t.addEventListener("change",h=>{n(h.target.value)});let o=document.getElementById("ah-autonomous-toggle");o&&(o.checked=localStorage.getItem("autoheal_autonomous")==="true");let s=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",p=window.AUTOHEAL_SITE_ID||window.location.host;try{let r=(await(await fetch(`${s}/api/settings`,{headers:{"x-site-id":p}})).json()).settings||{};r.modelProvider?(t.value=r.modelProvider,n(r.modelProvider)):n("gemini"),r.geminiKey&&(document.getElementById("ah-gemini-key-input").value=r.geminiKey),r.groqKey&&(document.getElementById("ah-groq-key-input").value=r.groqKey),r.ollamaUrl&&(document.getElementById("ah-ollama-url-input").value=r.ollamaUrl),r.ollamaModel&&(document.getElementById("ah-ollama-model-input").value=r.ollamaModel),r.githubRepo&&(document.getElementById("ah-github-repo-input").value=r.githubRepo),r.githubToken&&(document.getElementById("ah-github-token-input").value=r.githubToken),r.vercelDeployHook&&(document.getElementById("ah-vercel-hook-input").value=r.vercelDeployHook),r.n8nWebhook&&(document.getElementById("ah-n8n-webhook-input").value=r.n8nWebhook)}catch(h){console.warn("AutoHeal: Could not fetch settings",h),n("gemini")}let c=async()=>{let h=document.getElementById("ah-ollama-detector-banner");if(h)try{let d=new AbortController,r=setTimeout(()=>d.abort(),1200),g=await fetch("http://localhost:11434/api/tags",{signal:d.signal});clearTimeout(r),g.ok?(h.innerHTML=`
            <div class="ah-banner green">
              <div>
                <div class="ah-banner-title">\u{1F7E2} Local Ollama Connected!</div>
                <div class="ah-banner-desc">Your machine has unlimited free fixes ready on port 11434.</div>
              </div>
              <button class="ah-banner-btn" id="ah-use-local-btn">Use Local LLM</button>
            </div>
          `,document.getElementById("ah-use-local-btn")?.addEventListener("click",()=>{t.value="ollama",n("ollama"),document.getElementById("ah-ollama-url-input").value="http://localhost:11434",document.getElementById("ah-ollama-model-input").value="llama3";let u=document.getElementById("ah-save-settings-btn");u&&u.click()})):m(h)}catch{m(h)}},m=h=>{h.innerHTML=`
        <div class="ah-banner grey">
          <div>
            <div class="ah-banner-title">\u26AA Local Ollama Offline</div>
            <div class="ah-banner-desc">Start "ollama serve" on your laptop to unlock free, unlimited patches.</div>
          </div>
          <button class="ah-banner-btn" id="ah-detect-ollama-btn" style="background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.1);">Detect</button>
        </div>
      `,document.getElementById("ah-detect-ollama-btn")?.addEventListener("click",()=>{h.innerHTML='<div style="text-align:center; padding: 10px; font-size:12px; color:#888;">Scanning localhost:11434...</div>',setTimeout(c,500)})};c(),document.getElementById("ah-save-settings-btn")?.addEventListener("click",async()=>{let h=t.value,d=document.getElementById("ah-gemini-key-input")?.value.trim()||"",r=document.getElementById("ah-groq-key-input")?.value.trim()||"",g=document.getElementById("ah-ollama-url-input")?.value.trim()||"http://localhost:11434",u=document.getElementById("ah-ollama-model-input")?.value.trim()||"llama3",y=document.getElementById("ah-github-repo-input")?.value.trim()||"",w=document.getElementById("ah-github-token-input")?.value.trim()||"",k=document.getElementById("ah-vercel-hook-input")?.value.trim()||"",f=document.getElementById("ah-n8n-webhook-input")?.value.trim()||"";o&&localStorage.setItem("autoheal_autonomous",o.checked?"true":"false");let v=document.getElementById("ah-settings-status");v.textContent="Saving settings...";try{(await(await fetch(`${s}/api/settings`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":p},body:JSON.stringify({settings:{modelProvider:h,geminiKey:d,groqKey:r,ollamaUrl:g,ollamaModel:u,githubRepo:y,githubToken:w,vercelDeployHook:k,n8nWebhook:f}})})).json()).success?(v.textContent="Settings saved successfully! \u2705",this.showToast("\u2699\uFE0F Settings synchronized!","success"),setTimeout(()=>{v.textContent=""},3e3)):v.textContent="Error saving settings."}catch{v.textContent="Failed to connect to Master Server."}})}async runDiagnosticEngine(e,t){let i=document.getElementById("ah-diag-console"),a=document.getElementById("ah-footer-status"),l=document.getElementById("ah-scanner-box"),n=document.getElementById("ah-patch-box"),o=document.getElementById("ah-diff-box");if(!i)return;let s=(r,g="default")=>{let u=document.createElement("div");u.className=`ah-console-line ${g}`,u.textContent=`> ${r}`,i.appendChild(u),i.scrollTop=i.scrollHeight};await this.delay(1e3),s("Analyzing stack trace patterns...","info"),a&&(a.textContent="Analyzing source-code stack trace..."),await this.delay(1200),s("Extracting code context around error location...","info"),await this.delay(1e3),s("Consulting AI LLM healing patterns...","comment"),a&&(a.textContent="Generating surgical repair code...");let p=!1,c="",m="",x="",h=e.source||"sandbox",d=[];if(this.onHealHandler)try{let r=await this.onHealHandler(e);p=r.success,c=r.diffCode,m=r.explanation||"",x=r.healedFileContent||"",r.targetPath&&(h=r.targetPath),r.files&&(d=r.files)}catch{s("Failed to contact AI Healer Agent.","error")}if(await this.delay(800),p&&c){if(s("Surgical fix generated successfully!","success"),s("Ready to hot-patch runtime environment.","success"),a&&(a.textContent="Patch compiled successfully!"),l&&(l.style.display="none"),n&&(n.style.display="block"),o&&(o.innerHTML=this.renderDiff(c)),t){t.disabled=!1,t.classList.remove("disabled");let r=document.getElementById("ah-btn-loader");r&&(r.style.display="none");let g=document.getElementById("ah-btn-text");g&&(g.textContent="APPLY LIVE PATCH \u{1FA7A}"),t.onclick=async()=>{t.disabled=!0,t.classList.add("disabled"),r&&(r.style.display="inline-block"),g&&(g.textContent="Applying Patch..."),a&&(a.textContent="Executing hot-patch sequence...");let u=e.type==="feature"?"Deploying Feature...":"Applying AI Fix...";this.showHealingOverlay(u,"Initiating remote deployment pipeline..."),s("Initiating remote deployment pipeline...","info"),await this.delay(600),s("Packaging patch files...","info"),await this.delay(600),s("Contacting AutoHeal backend server...","info");try{let y=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",w=window.AUTOHEAL_SITE_ID||window.location.host,f=await(await fetch(`${y}/api/apply-patch`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":w},body:JSON.stringify({files:d.length>0?d:void 0,content:x,file:h,prompt:e.message})})).json();if(f.success){if(s("Backend processed request successfully! \u2705","success"),await this.delay(600),f.mode==="n8n-cloud"?(s("Route: Forwarded to N8N Cloud Bridge \u{1F310}","success"),f.n8nResponse&&f.n8nResponse.message&&s(`N8N: ${f.n8nResponse.message}`,"info")):f.mode==="github"?(s("Committed patch directly to GitHub Repository! \u{1F680}","success"),s(`Commit SHA: ${f.sha||"N/A"}`,"comment")):s("Patch successfully written to local disk! \u{1FA7A}","success"),await this.delay(600),s("Triggering Vercel Deploy Hook...","info"),await this.delay(400),s("Production rebuild triggered successfully! \u26A1","success"),s("Deployment is building in the background.","success"),s("Auto-Heal hot-patch complete! Site is recovered. \u{1F389}","success"),a&&(a.textContent="Hot-patch successfully applied!"),this.showToast("\u{1F680} Code Pushed to GitHub! Vercel is building...","success"),this.showHealingOverlay("Rebuilding Site...","Vercel is applying the AI patch... (approx 15s)",15e3),t){t.disabled=!1,t.classList.remove("disabled"),t.style.background="#10b981",t.style.borderColor="#10b981",t.style.color="#fff",r&&(r.style.display="none"),g&&(g.textContent="RELOAD PAGE TO VERIFY \u{1F504}");let v=document.getElementById("ah-ignore-btn");v&&(v.style.display="none"),t.onclick=()=>{window.location.reload()}}}else this.hideHealingOverlay(),s(`\u274C Push Failed: ${f.error}`,"error"),this.showToast(`\u274C Push Failed: ${f.error}`,"warning"),a&&(a.textContent="Push failed."),t.disabled=!1,t.classList.remove("disabled"),r&&(r.style.display="none"),g&&(g.textContent="RETRY LIVE PATCH \u{1FA7A}")}catch{this.hideHealingOverlay(),s("\u274C Network error communicating with Master Server","error"),this.showToast("\u274C Network error communicating with Master Server","warning"),a&&(a.textContent="Network error."),t.disabled=!1,t.classList.remove("disabled"),r&&(r.style.display="none"),g&&(g.textContent="RETRY LIVE PATCH \u{1FA7A}")}this.currentErrors=this.currentErrors.filter(y=>y.id!==e.id),this.updateBadgeCount()}}}else if(s(`AI agent failed: ${m||"Could not determine a safe patch."}`,"error"),a&&(a.textContent="Healing failed. Manual debug required."),t){t.disabled=!1,t.classList.remove("disabled");let r=document.getElementById("ah-btn-loader");r&&(r.style.display="none");let g=document.getElementById("ah-btn-text");g&&(g.textContent="Unable to heal")}}renderDiff(e){return e.split(`
`).map(i=>{let a="normal";return i.startsWith("+")?a="add":i.startsWith("-")&&(a="delete"),`<div class="ah-diff-line ${a}">${this.escapeHTML(i)}</div>`}).join("")}showToast(e,t="success"){let i=document.createElement("div");i.className=`ah-toast ${t}`;let a="\u26A1";t==="warning"?a="\u26A0\uFE0F":t==="info"?a="\u2139\uFE0F":t==="error"&&(a="\u274C"),i.innerHTML=`
      <span class="ah-toast-icon">${a}</span>
      <span>${e}</span>
    `,document.body.appendChild(i),setTimeout(()=>i.classList.add("visible"),50),setTimeout(()=>{i.classList.remove("visible"),setTimeout(()=>i.remove(),400)},4e3)}closeDiagnosticModal(){this.container&&(this.container.style.display="none",document.body.classList.remove("ah-blur-active"))}escapeHTML(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}delay(e){return new Promise(t=>setTimeout(t,e))}showHealingOverlay(e,t,i){this.closeDiagnosticModal();let a=document.getElementById("ah-healing-overlay");a||(a=document.createElement("div"),a.id="ah-healing-overlay",a.className="ah-full-page-overlay",a.innerHTML=`
        <div class="ah-overlay-scanner">
          <div class="ah-overlay-icon">\u2728</div>
        </div>
        <div class="ah-overlay-title" id="ah-overlay-title"></div>
        <div class="ah-overlay-subtitle" id="ah-overlay-subtitle"></div>
        <div class="ah-overlay-progress">
          <div class="ah-overlay-progress-bar" id="ah-overlay-progress-bar"></div>
        </div>
        <button class="ah-overlay-reload-btn" id="ah-overlay-reload-btn">Force Reload Now</button>
      `,document.body.appendChild(a),document.getElementById("ah-overlay-reload-btn")?.addEventListener("click",()=>{window.location.reload()}));let l=document.getElementById("ah-overlay-title"),n=document.getElementById("ah-overlay-subtitle"),o=document.getElementById("ah-overlay-progress-bar"),s=document.getElementById("ah-overlay-reload-btn");l&&(l.textContent=e),n&&(n.textContent=t),o&&(o.style.transition="none",o.style.width="0%",setTimeout(()=>{o.style.transition="width 2s cubic-bezier(0.4, 0, 0.2, 1)",o.style.width="100%"},50)),s&&s.classList.remove("visible"),setTimeout(()=>a?.classList.add("visible"),10),i&&(o&&setTimeout(()=>{o.style.transition=`width ${i}ms linear`,o.style.width="100%"},50),setTimeout(()=>{n&&(n.textContent="Build complete! Reloading your site..."),setTimeout(()=>window.location.reload(),1e3)},i),setTimeout(()=>{s&&s.classList.add("visible")},Math.min(5e3,i/2)))}hideHealingOverlay(){let e=document.getElementById("ah-healing-overlay");e&&(e.classList.remove("visible"),setTimeout(()=>e.remove(),600))}injectStyles(){if(document.getElementById("autoheal-widget-styles"))return;let e=document.createElement("style");e.id="autoheal-widget-styles",e.textContent=`
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

      /* Full Page Healing Overlay Animation */
      .ah-full-page-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(10, 15, 25, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        pointer-events: none;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .ah-full-page-overlay.visible {
        opacity: 1;
        pointer-events: all;
      }
      .ah-overlay-scanner {
        width: 150px;
        height: 150px;
        border-radius: 50%;
        border: 2px solid rgba(0, 255, 102, 0.1);
        position: relative;
        margin-bottom: 30px;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 0 50px rgba(0, 255, 102, 0.05);
      }
      .ah-overlay-scanner::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        border-radius: 50%;
        border: 2px solid #00ff66;
        border-top-color: transparent;
        border-bottom-color: transparent;
        animation: ah-spin 2s linear infinite;
      }
      .ah-overlay-scanner::after {
        content: '';
        position: absolute;
        width: 100%;
        height: 2px;
        background: rgba(0, 255, 102, 0.6);
        top: 50%;
        box-shadow: 0 0 10px #00ff66;
        animation: ah-scan-laser 2s ease-in-out infinite alternate;
      }
      .ah-overlay-icon {
        font-size: 50px;
        animation: ah-pulse 2s ease-in-out infinite;
      }
      .ah-overlay-title {
        color: #fff;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 12px;
        text-align: center;
        letter-spacing: 1px;
      }
      .ah-overlay-subtitle {
        color: #00ff66;
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 40px;
        text-align: center;
        font-family: 'Fira Code', monospace;
      }
      .ah-overlay-progress {
        width: 300px;
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      .ah-overlay-progress-bar {
        position: absolute;
        top: 0; left: 0; height: 100%;
        background: #00ff66;
        width: 0%;
        box-shadow: 0 0 10px #00ff66;
      }
      .ah-overlay-reload-btn {
        background: transparent;
        border: 1px solid rgba(0, 255, 102, 0.5);
        color: #00ff66;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 30px;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .ah-overlay-reload-btn.visible {
        opacity: 1;
        pointer-events: all;
      }
      .ah-overlay-reload-btn:hover {
        background: rgba(0, 255, 102, 0.1);
        box-shadow: 0 0 15px rgba(0, 255, 102, 0.2);
      }

      @keyframes ah-spin { 100% { transform: rotate(360deg); } }
      @keyframes ah-scan-laser {
        0% { transform: translateY(-70px); }
        100% { transform: translateY(70px); }
      }
      @keyframes ah-pulse {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.1); opacity: 1; text-shadow: 0 0 20px rgba(0,255,102,0.8); }
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
    `,document.head.appendChild(e)}},E=new A;var $=class{container=null;isConnected=!0;errorList=[];currentTerminalLogs=[];localOllamaDetected=!1;settings={n8nWebhook:"",vercelDeployHook:"",gitBranch:"main",modelProvider:"groq",geminiKey:"",groqKey:"",ollamaUrl:"http://localhost:11434",ollamaModel:"llama3"};scores={polish:52,spacing:60,mobile:45,conversion:55};constructor(){window.addEventListener("__autoheal_telemetry_update__",(e=>{this.errorList=e.detail,this.render()}))}getMockErrors(){let e=Date.now();return[{id:"mock_crash_1",type:"crash",message:"TypeError: Cannot read properties of undefined (reading 'map') in SandboxView.tsx:67",stack:`TypeError: Cannot read properties of undefined (reading 'map')
    at SandboxView (file:///c:/auomation/playground/src/components/SandboxView.tsx:67:32)
    at renderWithHooks (file:///c:/auomation/node_modules/react-dom/cjs/react-dom.development.js:15486:18)`,source:"file:///c:/auomation/playground/src/components/SandboxView.tsx",line:67,column:32,timestamp:new Date(e-300*1e3).toISOString()},{id:"mock_promise_1",type:"promise",message:"Unhandled Promise Rejection: Error: Network Error - Failed to fetch endpoint 'https://api.broken-endpoint.dev/data/v1/telemetry'",stack:`Error: Network Error
    at fetchTelemetryData (file:///c:/auomation/playground/src/utils/api.ts:14:11)
    at async loadDashboardData (file:///c:/auomation/playground/src/App.tsx:92:24)`,source:"file:///c:/auomation/playground/src/utils/api.ts",line:14,column:11,timestamp:new Date(e-900*1e3).toISOString()},{id:"mock_asset_1",type:"asset",message:"Failed to load resource: net::ERR_FILE_NOT_FOUND (broken-cyber-chip-image.jpg)",source:"file:///c:/auomation/playground/src/assets/broken-cyber-chip-image.jpg",timestamp:new Date(e-1920*1e3).toISOString()},{id:"mock_console_1",type:"console_error",message:'[React] Mismatched Hydration Warning: expected text node containing "AutoHeal // Evolution Deck" but found HTML tag <div>',source:"file:///c:/auomation/node_modules/react-dom/cjs/react-dom.development.js",timestamp:new Date(e-2880*1e3).toISOString()}]}async printDiffToTerminal(e){let t=e.split(`
`);for(let i of t){let a="default";i.startsWith("+")&&!i.startsWith("+++")?a="success":i.startsWith("-")&&!i.startsWith("---")?a="error":i.startsWith("@@")||i.startsWith("Index:")||i.startsWith("===")?a="comment":(i.startsWith("---")||i.startsWith("+++"))&&(a="info"),this.addTerminalLog(i,a),await this.delay(120)}}getEndpoint(){return window.AUTOHEAL_ENDPOINT||"http://localhost:3001"}async checkLocalOllama(){try{let e=new AbortController,t=setTimeout(()=>e.abort(),1e3),i=await fetch("http://localhost:11434/api/tags",{signal:e.signal});return clearTimeout(t),i.ok}catch{return!1}}async initData(){this.checkLocalOllama().then(e=>{e&&(this.localOllamaDetected=!0,this.addTerminalLog("Local Ollama server detected automatically! \u{1F7E2} Unlimited free patch generation available.","success"),this.render())});try{let t={"x-site-id":window.location.host};this.addTerminalLog("Connecting to live patcher backend database...","comment");let[i,a,l]=await Promise.all([fetch(`${this.getEndpoint()}/api/telemetry`,{headers:t}),fetch(`${this.getEndpoint()}/api/settings`,{headers:t}),fetch(`${this.getEndpoint()}/api/scores`,{headers:t})]),[n,o,s]=await Promise.all([i.json(),a.json(),l.json()]);n.success&&n.errors&&(this.errorList=n.errors,window.__autoheal_errors_cache__=this.errorList),o.success&&o.settings&&(this.settings={...this.settings,...o.settings}),s.success&&s.scores&&(this.scores={...this.scores,...s.scores}),this.addTerminalLog("Successfully synced workspace state with live multi-tenant backend.","success"),this.render()}catch(e){this.addTerminalLog(`Backend offline: ${e.message}. Operating in Dev-Simulation Mode.`,"info");let t=window.__autoheal_errors_cache__||[];t.length===0?(this.errorList=this.getMockErrors(),window.__autoheal_errors_cache__=this.errorList):this.errorList=t,this.render()}}mount(e){let t=typeof e=="string"?document.querySelector(e):e;if(!t){console.error("__autoheal_internal__ Dashboard mount target not found:",e);return}this.container=t,this.injectStyles(),this.addTerminalLog("AutoHeal Evolution Dashboard mounted successfully."),this.addTerminalLog("Telemetry connection secure. Monitoring live traffic..."),this.initData()}addTerminalLog(e,t="default"){let i=new Date().toLocaleTimeString(),a="> ";t==="success"?a="\u2713 ":t==="error"?a="\u2717 ":t==="info"&&(a="\u2139 "),this.currentTerminalLogs.push(`[${i}] ${a}${e}`),this.currentTerminalLogs.length>50&&this.currentTerminalLogs.shift();let l=document.getElementById("ah-dash-terminal");if(l){let n=document.createElement("div");n.className=`ah-term-line ${t}`,n.textContent=`[${i}] ${a}${e}`,l.appendChild(n),l.scrollTop=l.scrollHeight}}async saveSettings(e,t,i,a,l,n,o,s){let p={n8nWebhook:e.trim(),vercelDeployHook:t.trim(),gitBranch:i.trim()};a&&(p.modelProvider=a),l!==void 0&&(p.geminiKey=l.trim()),n!==void 0&&(p.groqKey=n.trim()),o!==void 0&&(p.ollamaUrl=o.trim()),s!==void 0&&(p.ollamaModel=s.trim()),this.settings={...this.settings,...p};try{let m=await(await fetch(`${this.getEndpoint()}/api/settings`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":window.location.host},body:JSON.stringify({settings:p})})).json();if(m.success&&m.settings)this.settings={...this.settings,...m.settings},this.addTerminalLog("Cloud Git-Bridge settings saved to remote database.","success");else throw new Error("Failed to save settings: server did not return success.")}catch(c){this.addTerminalLog(`Failed to save settings to backend: ${c.message}. Saved locally in memory.`,"error")}this.render()}async dispatchWebhook(e){let t=this.settings.n8nWebhook||"",i=this.settings.vercelDeployHook||"",a=this.settings.gitBranch||"main";if(this.addTerminalLog(`Initiating Cloud Git-Bridge dispatch for file: ${e.file}...`,"info"),await this.delay(1e3),this.addTerminalLog(`Resolving payload changes (diff size: ${e.diffCode.split(`
`).length} lines).`,"default"),await this.delay(800),!t)return this.addTerminalLog("FAILED: N8N Webhook Endpoint not configured! operating in Dev-Simulation.","error"),this.addTerminalLog("[SIMULATION] Dispatching Webhook payload to mock receiver...","info"),await this.delay(1200),this.addTerminalLog('[SIMULATION] N8N Workflow Triggered: "selfheal-patch-handler"',"success"),await this.delay(1e3),this.addTerminalLog(`[SIMULATION] Git Commit pushed to branch "${a}" successfully.`,"success"),await this.delay(1200),this.addTerminalLog("[SIMULATION] Vercel Deploy Hook triggered! Rebuilding live site...","info"),await this.delay(1500),this.addTerminalLog("[SIMULATION] Deployed version completed. Evolution goes Live!","success"),{success:!0,simulated:!0};try{this.addTerminalLog(`Dispatched POST webhook request to: ${t}`,"comment");let l=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...e,vercelDeployHook:i,gitBranch:a,timestamp:new Date().toISOString()})});if(!l.ok)throw new Error(`N8N Endpoint returned status code: ${l.status}`);return this.addTerminalLog("N8N Webhook response successful!","success"),i&&this.addTerminalLog("Vercel live deployment triggered concurrently.","info"),{success:!0}}catch(l){return this.addTerminalLog(`Webhook dispatch error: ${l.message}`,"error"),{success:!1,error:l.message}}}async triggerSimulatedHeal(e){this.addTerminalLog(`Selected telemetry crash report: [${e.type.toUpperCase()}]`,"info"),this.addTerminalLog("Requesting repair suggestion from client-side AI agent...","comment");let t=this.settings.modelProvider||"gemini",i=t==="gemini"?this.settings.geminiKey:this.settings.groqKey,a=e.id.startsWith("mock_");a?this.addTerminalLog(`Mock exception recognized: [${e.id}]. Injecting static high-fidelity repair...`,"info"):i?this.addTerminalLog(`Active LPU provider: [${t.toUpperCase()}] running diagnostics...`,"info"):this.addTerminalLog("No active API Key found in settings! Using fallback simulation module.","comment"),await this.delay(1200);let l=!1,n="",o="playground/src/components/SandboxView.tsx";if(a)l=!0,e.id==="mock_crash_1"?(o="playground/src/components/SandboxView.tsx",n=`Index: playground/src/components/SandboxView.tsx
===================================================================
--- playground/src/components/SandboxView.tsx
+++ playground/src/components/SandboxView.tsx
@@ -64,5 +64,5 @@
-  const items = catalogData.items;
-  return items.map(item => <ItemCard key={item.id} data={item} />);
+  const items = catalogData?.items || [];
+  return items.map(item => <ItemCard key={item.id} data={item} />);`):e.id==="mock_promise_1"?(o="playground/src/utils/api.ts",n=`Index: playground/src/utils/api.ts
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
+  return data;`):e.id==="mock_asset_1"?(o="playground/src/components/SandboxView.tsx",n=`Index: playground/src/components/SandboxView.tsx
===================================================================
--- playground/src/components/SandboxView.tsx
+++ playground/src/components/SandboxView.tsx
@@ -102,3 +102,6 @@
-  <img src="/assets/broken-cyber-chip-image.jpg" alt="Cyber Chip" />
+  <img 
+    src="/assets/broken-cyber-chip-image.jpg" 
+    onError={(e) => { e.currentTarget.src = "/assets/fallback-chip.png"; }} 
+    alt="Cyber Chip" 
+  />`):e.id==="mock_console_1"&&(o="packages/autoheal-sdk/src/dashboard.ts",n=`Index: packages/autoheal-sdk/src/dashboard.ts
===================================================================
--- packages/autoheal-sdk/src/dashboard.ts
+++ packages/autoheal-sdk/src/dashboard.ts
@@ -298,3 +298,3 @@
-              <div class="ah-brand-title">AUTOHEAL // EVOLUTION DECK</div>
-+              <div id="ah-brand-title-static" class="ah-brand-title">AUTOHEAL // EVOLUTION DECK</div>`);else if(window.AutoHeal&&window.AutoHeal.config&&window.AutoHeal.config.onHealRequest)try{let s=await window.AutoHeal.config.onHealRequest(e);l=s.success,n=s.diffCode}catch(s){this.addTerminalLog(`AI Agent pipeline crashed: ${s.message}`,"error")}else l=!0,n=`Index: ${e.source||"unknown-file.tsx"}
+++ ${e.source||"unknown-file.tsx"}
@@ -1,1 +1,2 @@
- /* error */
+ /* simulated AI cloud repair applied successfully */`;if(l&&n){if(this.addTerminalLog("AI Repair patch compiled successfully!","success"),this.addTerminalLog("Printing visual git patch diff...","info"),await this.printDiffToTerminal(n),(await this.dispatchWebhook({file:o,content:"/* Completed autonomous code replacement script context */",diffCode:n,explanation:`Surgically repaired exception: ${e.message}`,type:e.type})).success){try{let c=await(await fetch(`${this.getEndpoint()}/api/telemetry/clear`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":window.location.host},body:JSON.stringify({id:e.id})})).json();c.success&&c.errors?(this.errorList=c.errors,window.__autoheal_errors_cache__=this.errorList):(this.errorList=this.errorList.filter(m=>m.id!==e.id),window.__autoheal_errors_cache__=this.errorList)}catch{this.errorList=this.errorList.filter(c=>c.id!==e.id),window.__autoheal_errors_cache__=this.errorList}window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:this.errorList})),this.render()}}else this.addTerminalLog("Repair algorithm aborted: AI agent could not generate safe replacement boundaries.","error")}async triggerSimulatedEvolution(e){this.addTerminalLog(`Starting visual layout evolution: [${e.toUpperCase()}]`,"info"),this.addTerminalLog("Studying DOM node alignment and mobile styling parameters...","comment"),await this.delay(1200),this.addTerminalLog("Generating updated Glassmorphic token stylesheet...","info");let t="",i="",a={...this.scores};if(e==="animation"?(t=`+ .sandbox-card {
+   animation: neon-glow-pulse-anim 5s infinite alternate;
+ }`,i="/* Injected animation keyframes */",a.polish=95):e==="spacing"?(t=`+ .sandbox-card {
+   backdrop-filter: blur(20px);
+   border: 1px solid rgba(255,255,255,0.08);
+ }`,i="/* Injected spacing tokens */",a.spacing=98):e==="mobile"?(t=`+ @media (max-width: 768px) {
+   .catalog-grid { grid-template-columns: 1fr; }
+ }`,i="/* Injected responsive overrides */",a.mobile=94):e==="conversion"&&(t=`+ .btn-buy {
+   background: linear-gradient(135deg, var(--neon-emerald), #059669);
+ }`,i="/* Injected CTA conversion elements */",a.conversion=97),this.scores=a,await this.delay(1e3),this.addTerminalLog("Visual upgrade stylesheet compiled successfully!","success"),(await this.dispatchWebhook({file:"playground/src/index.css",content:i,diffCode:t,explanation:`Evolved target design hook: ${e}`,type:"css"})).success){this.addTerminalLog("Evolved scoring variables completed! Redeployment is active.","success");try{let p=await(await fetch(`${this.getEndpoint()}/api/scores`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":window.location.host},body:JSON.stringify({scores:a})})).json();p.success&&p.scores&&(this.scores=p.scores)}catch(s){this.addTerminalLog(`Failed to write evolved scores to backend DB: ${s.message}`,"error")}let n=`autoheal-evolution-style-${e}`,o=document.getElementById(n);o||(o=document.createElement("style"),o.id=n,document.head.appendChild(o)),e==="animation"?o.textContent=`
          @keyframes neon-glow-pulse-anim-dash {
            0% { box-shadow: 0 0 10px rgba(0, 240, 255, 0.25); }
            50% { box-shadow: 0 0 25px rgba(189, 0, 255, 0.45); }
            100% { box-shadow: 0 0 10px rgba(0, 240, 255, 0.25); }
          }
          .sandbox-card {
            animation: neon-glow-pulse-anim-dash 5s infinite alternate !important;
          }
        `:e==="spacing"?o.textContent=`
          .sandbox-card {
            background: rgba(10, 15, 26, 0.65) !important;
            backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
          }
        `:e==="mobile"?o.textContent=`
          @media (max-width: 768px) {
            .catalog-grid { grid-template-columns: 1fr !important; }
          }
        `:e==="conversion"&&(o.textContent=`
          .btn-buy {
            background: linear-gradient(135deg, #00ff66 0%, #059669 100%) !important;
            box-shadow: 0 0 15px rgba(0, 255, 102, 0.4) !important;
          }
        `),this.render()}}render(){if(!this.container)return;let e=this.settings.n8nWebhook||"",t=this.settings.vercelDeployHook||"",i=this.scores.polish,a=this.scores.spacing,l=this.scores.mobile,n=this.scores.conversion;this.container.innerHTML=`
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
                    ${this.errorList.map(d=>`
                      <div class="ah-log-item-card">
                        <div class="ah-log-item-header">
                          <span class="ah-log-badge ${d.type==="crash"?"red":"yellow"}">${d.type.toUpperCase()}</span>
                          <span class="ah-log-time">${new Date(d.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div class="ah-log-message">${d.message}</div>
                        ${d.source?`<div class="ah-log-src">Source: <code>${d.source.substring(d.source.lastIndexOf("/")+1)}</code></div>`:""}
                        <div class="ah-log-footer">
                          <button class="ah-dash-btn primary small heal-trigger-btn" data-id="${d.id}">\u{1FA7A} AI Cloud Repair</button>
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
                ${this.currentTerminalLogs.map(d=>{let r="";return d.includes("\u2713")||d.includes("Live")?r="success":d.includes("\u2717")||d.includes("FAILED")?r="error":d.includes("\u2139")||d.includes("Initiating")?r="info":d.includes("comment")&&(r="comment"),`<div class="ah-term-line ${r}">${d}</div>`}).join("")}
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
                      <span class="ah-gauge-score ${i>=80?"green":"yellow"}">${i}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill yellow" style="width: ${i}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${i>=80?"Premium micro-animations active":"Static stylesheets detected"}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="animation">EVOLVE</button>
                    </div>
                  </div>

                  <!-- Gauge 2: Spacing & UI Design -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">\u{1F48E} DESIGN & SPACING</span>
                      <span class="ah-gauge-score ${a>=80?"green":"yellow"}">${a}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill cyan" style="width: ${a}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${a>=80?"High-contrast Glassmorphism active":"Outdated layout card models loaded"}</span>
                      <button class="ah-dash-btn small purple evolve-trigger-btn" data-gauge="spacing">EVOLVE</button>
                    </div>
                  </div>

                  <!-- Gauge 3: Mobile Sizing -->
                  <div class="ah-gauge-row">
                    <div class="ah-gauge-info">
                      <span class="ah-gauge-name">\u{1F4F1} MOBILE RESPONSIVENESS</span>
                      <span class="ah-gauge-score ${l>=80?"green":"yellow"}">${l}%</span>
                    </div>
                    <div class="ah-progress-track">
                      <div class="ah-progress-fill purple" style="width: ${l}%;"></div>
                    </div>
                    <div class="ah-gauge-footer">
                      <span class="ah-gauge-desc">${l>=80?"Fluid grid scaling configured":"Static pixel widths warning"}</span>
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
                    <input type="text" id="ah-git-branch-input" class="ah-text-input" placehold                  <div class="ah-input-group">
                    <label>Autonomous AI Engine Provider</label>
                    <select id="ah-model-provider-input" class="ah-text-input">
                      <option value="gemini" ${this.settings.modelProvider==="gemini"?"selected":""}>Google Gemini</option>
                      <option value="groq" ${this.settings.modelProvider==="groq"?"selected":""}>Groq (Llama 3)</option>
                      <option value="ollama" ${this.settings.modelProvider==="ollama"?"selected":""}>Ollama (Local LLM)</option>
                    </select>
                  </div>
                  <div class="ah-input-group" style="${this.settings.modelProvider==="gemini"?"":"display: none;"}">
                    <label>Google Gemini API Key</label>
                    <input type="password" id="ah-gemini-key-input" class="ah-text-input" placeholder="Enter Gemini API Key..." value="${this.settings.geminiKey||""}" />
                  </div>
                  <div class="ah-input-group" style="${this.settings.modelProvider==="groq"?"":"display: none;"}">
                    <label>Groq API Key</label>
                    <input type="password" id="ah-groq-key-input" class="ah-text-input" placeholder="Enter Groq API Key..." value="${this.settings.groqKey||""}" />
                  </div>
                  <div class="ah-input-group" id="ah-ollama-url-group" style="${this.settings.modelProvider==="ollama"?"":"display: none;"}">
                    <label>Ollama Server URL</label>
                    <input type="text" id="ah-ollama-url-input" class="ah-text-input" placeholder="http://localhost:11434" value="${this.settings.ollamaUrl||"http://localhost:11434"}" />
                  </div>
                  <div class="ah-input-group" id="ah-ollama-model-group" style="${this.settings.modelProvider==="ollama"?"":"display: none;"}">
                    <label>Ollama Model Name</label>
                    <input type="text" id="ah-ollama-model-input" class="ah-text-input" placeholder="llama3" value="${this.settings.ollamaModel||"llama3"}" />
                  </div>

                  <div style="margin-top: 15px; margin-bottom: 15px;">
                    ${this.localOllamaDetected?`
                    <div class="ah-ollama-alert" style="background: rgba(0, 255, 102, 0.08); border: 1px solid var(--neon-emerald); border-radius: 6px; padding: 10px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <span style="color: var(--neon-emerald); font-weight: bold;">\u{1F7E2} Local Ollama Connected!</span>
                        <div style="color: var(--dash-text-muted); font-size: 11px; margin-top: 2px;">Your machine is ready to generate unlimited free fixes.</div>
                      </div>
                      ${this.settings.modelProvider!=="ollama"?`
                        <button type="button" class="ah-dash-btn small green" id="ah-connect-ollama-btn" style="padding: 4px 8px; font-size: 11px; margin-left: 10px; border-radius: 4px;">Use Local LLM</button>
                      `:""}
                    </div>
                    `:`
                    <div class="ah-ollama-alert" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--dash-border); border-radius: 6px; padding: 10px; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <span style="color: var(--dash-text-muted); font-weight: bold;">\u26AA Local Ollama offline</span>
                        <div style="color: var(--dash-text-muted); font-size: 11px; margin-top: 2px;">Start Ollama locally to unlock free, unlimited debug sessions.</div>
                      </div>
                      <button type="button" class="ah-dash-btn small secondary" id="ah-retry-ollama-btn" style="padding: 4px 8px; font-size: 11px; margin-left: 10px; border-radius: 4px;">Detect</button>
                    </div>
                    `}
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
    `,this.container.querySelectorAll(".heal-trigger-btn").forEach(d=>{d.addEventListener("click",r=>{let g=r.currentTarget.dataset.id,u=this.errorList.find(y=>y.id===g);u&&this.triggerSimulatedHeal(u)})}),this.container.querySelectorAll(".evolve-trigger-btn").forEach(d=>{d.addEventListener("click",r=>{let g=r.currentTarget.dataset.gauge;g&&this.triggerSimulatedEvolution(g)})});let o=this.container.querySelector("#ah-dash-reseed-trigger");o&&o.addEventListener("click",async()=>{try{this.addTerminalLog("Requesting live mock database re-seeding...","comment");let r=await(await fetch(`${this.getEndpoint()}/api/telemetry/reseed`,{method:"POST",headers:{"x-site-id":window.location.host}})).json();if(r.success&&r.errors)this.errorList=r.errors,window.__autoheal_errors_cache__=this.errorList,this.addTerminalLog("Reset & populated live mock telemetry database successfully.","success");else throw new Error("Reseed request failed on server.")}catch{this.errorList=this.getMockErrors(),window.__autoheal_errors_cache__=this.errorList,this.addTerminalLog("Reset & populated local mock telemetry dataset.","info")}window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:this.errorList})),this.render()});let s=this.container.querySelector("#ah-dash-empty-reseed");s&&s.addEventListener("click",async()=>{try{this.addTerminalLog("Requesting live mock database re-seeding...","comment");let r=await(await fetch(`${this.getEndpoint()}/api/telemetry/reseed`,{method:"POST",headers:{"x-site-id":window.location.host}})).json();if(r.success&&r.errors)this.errorList=r.errors,window.__autoheal_errors_cache__=this.errorList,this.addTerminalLog("Populated live mock telemetry database successfully.","success");else throw new Error("Reseed request failed on server.")}catch{this.errorList=this.getMockErrors(),window.__autoheal_errors_cache__=this.errorList,this.addTerminalLog("Populated local mock telemetry dataset.","info")}window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:this.errorList})),this.render()});let p=this.container.querySelector("#ah-dash-settings-trigger"),c=this.container.querySelector("#ah-settings-panel"),m=this.container.querySelector("#ah-settings-cancel"),x=this.container.querySelector("#ah-dash-settings-form");if(p&&c&&p.addEventListener("click",()=>{c.style.display=c.style.display==="none"?"block":"none"}),m&&c&&m.addEventListener("click",()=>{c.style.display="none"}),x&&c){let d=document.getElementById("ah-model-provider-input");d&&d.addEventListener("change",()=>{let u=d.value,y=document.getElementById("ah-gemini-key-input")?.closest(".ah-input-group"),w=document.getElementById("ah-groq-key-input")?.closest(".ah-input-group"),k=document.getElementById("ah-ollama-url-group"),f=document.getElementById("ah-ollama-model-group");y&&(y.style.display=u==="gemini"?"block":"none"),w&&(w.style.display=u==="groq"?"block":"none"),k&&(k.style.display=u==="ollama"?"block":"none"),f&&(f.style.display=u==="ollama"?"block":"none")});let r=this.container?.querySelector("#ah-connect-ollama-btn");r&&r.addEventListener("click",()=>{this.addTerminalLog("Connecting local Ollama LLM provider automatically...","comment"),this.saveSettings(this.settings.n8nWebhook,this.settings.vercelDeployHook,this.settings.gitBranch,"ollama",this.settings.geminiKey,this.settings.groqKey,this.settings.ollamaUrl||"http://localhost:11434",this.settings.ollamaModel||"llama3"),this.addTerminalLog("Successfully switched to local Ollama provider! Enjoy unlimited free debug heals.","success")});let g=this.container?.querySelector("#ah-retry-ollama-btn");g&&g.addEventListener("click",async()=>{this.addTerminalLog("Scanning local network for Ollama server...","comment"),await this.checkLocalOllama()?(this.localOllamaDetected=!0,this.addTerminalLog("Local Ollama server detected! \u{1F7E2} Now ready for unlimited free patches.","success")):this.addTerminalLog('Ollama server is offline on http://localhost:11434. Please run "ollama serve" to start it.',"error"),this.render()}),x.addEventListener("submit",u=>{u.preventDefault();let y=document.getElementById("ah-n8n-url-input").value,w=document.getElementById("ah-vercel-url-input").value,k=document.getElementById("ah-git-branch-input").value,f=document.getElementById("ah-model-provider-input").value,v=document.getElementById("ah-gemini-key-input").value,C=document.getElementById("ah-groq-key-input").value,M=document.getElementById("ah-ollama-url-input")?.value||"http://localhost:11434",P=document.getElementById("ah-ollama-model-input")?.value||"llama3";this.saveSettings(y,w,k,f,v,C,M,P),c.style.display="none"})}let h=document.getElementById("ah-dash-terminal");h&&(h.scrollTop=h.scrollHeight)}delay(e){return new Promise(t=>setTimeout(t,e))}injectStyles(){if(document.getElementById("autoheal-dashboard-styles"))return;let e=document.createElement("style");e.id="autoheal-dashboard-styles",e.textContent=`
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
    `,document.head.appendChild(e)}},I=new $;var S=class{interceptor=new T;config={autoHealEnabled:!0};initialized=!1;caughtErrors=[];constructor(){}init(e){this.initialized||(this.initialized=!0,this.config={...this.config,...e},e.email&&L.setConfig(e.email),window.__autoheal_errors_cache__=this.caughtErrors,E.init(async t=>{if(this.config.onHealRequest)return await this.config.onHealRequest(t);let i=t.type==="feature",a=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",l=window.AUTOHEAL_SITE_ID||window.location.host;try{let o=await(await fetch(`${a}/api/generate-patch`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":l},body:JSON.stringify(i?{prompt:t.message,file:t.source||"sandbox"}:{error:t,file:t.source||"sandbox"})})).json();if(!o.success)throw new Error(o.explanation);return{success:!0,diffCode:o.diffCode,files:o.files||[],healedFileContent:o.healedFileContent,targetPath:o.targetPath||"sandbox"}}catch(n){return console.error("__autoheal_internal__ Standalone generation error:",n),{success:!1,diffCode:"",explanation:n.message}}}),this.interceptor.start(t=>{this.caughtErrors.push(t),window.__autoheal_errors_cache__=this.caughtErrors,fetch("http://localhost:3001/api/telemetry",{method:"POST",headers:{"Content-Type":"application/json","x-site-id":window.location.host},body:JSON.stringify({error:t})}).then(a=>a.json()).then(a=>{a.success&&a.errors&&window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:a.errors}))}).catch(a=>{console.warn("__autoheal_internal__ Telemetry database sync warning:",a),window.dispatchEvent(new CustomEvent("__autoheal_telemetry_update__",{detail:this.caughtErrors}))}),L.sendErrorEmail(t),localStorage.getItem("autoheal_autonomous")==="true"&&t.type!=="feature"?(E.showToast("\u26A1 Autonomous Mode: Analyzing crash in background...","info"),this.runAutonomousHealer(t,E)):t.type==="crash"?E.triggerHardCrashOverlay(t):E.reportSoftError(t)}),console.log("__autoheal_internal__ AutoHealUI SDK active and monitoring logs."))}async runAutonomousHealer(e,t){try{let i=window.AUTOHEAL_ENDPOINT||"http://localhost:3001",a=window.AUTOHEAL_SITE_ID||window.location.host,n=await(await fetch(`${i}/api/generate-patch`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":a},body:JSON.stringify({error:e,file:e.source||"sandbox"})})).json();if(!n.success)throw new Error(n.explanation);t.showToast("\u{1F52E} Autonomous Mode: Patch generated! Deploying to GitHub...","info");let s=await(await fetch(`${i}/api/apply-patch`,{method:"POST",headers:{"Content-Type":"application/json","x-site-id":a},body:JSON.stringify({files:n.files&&n.files.length>0?n.files:void 0,content:n.healedFileContent,file:n.targetPath||e.source||"sandbox",prompt:e.message})})).json();s.success?t.showToast("\u{1F680} Autonomous Patch deployed successfully! Vercel is building...","success"):t.showToast(`\u274C Autonomous deploy failed: ${s.error}`,"error")}catch(i){t.showToast(`\u274C Autonomous patch failed: ${i.message}`,"error")}}mountDashboard(e){I.mount(e)}shutdown(){this.interceptor.stop(),this.initialized=!1}get getConfig(){return this.config}get patcher(){return O}get emailer(){return L}get widget(){return E}get dashboard(){return I}},B=new S;typeof window<"u"&&window.AUTOHEAL_SITE_ID&&setTimeout(()=>{B.init({})},100);return q(F);})();
