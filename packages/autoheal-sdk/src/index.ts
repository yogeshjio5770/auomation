import { ErrorInterceptor, type ErrorData } from './interceptor.ts';
import { emailerInstance, type EmailConfig } from './emailer.ts';
import { patcherInstance } from './patcher.ts';
import { widgetInstance } from './widget.ts';
import { dashboardInstance } from './dashboard.ts';

export interface AutoHealConfig {
  email?: EmailConfig;
  autoHealEnabled?: boolean;
  onHealRequest?: (error: ErrorData) => Promise<{ success: boolean; diffCode: string }>;
}

export class AutoHealSDK {
  private interceptor = new ErrorInterceptor();
  private config: AutoHealConfig = { autoHealEnabled: true };
  private initialized = false;
  private caughtErrors: ErrorData[] = [];

  constructor() {}

  public init(config: AutoHealConfig) {
    if (this.initialized) return;
    this.initialized = true;
    this.config = { ...this.config, ...config };

    // 1. Configure Emailer
    if (config.email) {
      emailerInstance.setConfig(config.email);
    }

    // Initialize global errors cache
    (window as any).__autoheal_errors_cache__ = this.caughtErrors;

    // 2. Configure UI Healing Widget Callback
    widgetInstance.init(async (error) => {
      if (this.config.onHealRequest) {
        return await this.config.onHealRequest(error);
      }
      return { success: false, diffCode: '' };
    });

    // 3. Start intercepting errors
    this.interceptor.start((error) => {
      // Add to internal list and cache
      this.caughtErrors.push(error);
      (window as any).__autoheal_errors_cache__ = this.caughtErrors;

      // Save error dynamically to the backend database (multi-tenant siteId)
      fetch('http://localhost:3001/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-site-id': window.location.host
        },
        body: JSON.stringify({ error })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.errors) {
          // Notify any active dashboards with updated DB errors
          window.dispatchEvent(new CustomEvent('__autoheal_telemetry_update__', { detail: data.errors }));
        }
      })
      .catch(e => {
        console.warn('__autoheal_internal__ Telemetry database sync warning:', e);
        // Fallback custom event trigger
        window.dispatchEvent(new CustomEvent('__autoheal_telemetry_update__', { detail: this.caughtErrors }));
      });

      // Always package and send email log (will hit mock or real inbox)
      emailerInstance.sendErrorEmail(error);

      // Handle visual routing
      if (error.type === 'crash') {
        // Uncaught exceptions cause a hard screen lock/overlay
        widgetInstance.triggerHardCrashOverlay(error);
      } else {
        // Soft errors (console.error, console.warn, broken assets) trigger pulsing corner badge
        widgetInstance.reportSoftError(error);
      }
    });

    console.log('__autoheal_internal__ AutoHealUI SDK active and monitoring logs.');
  }

  public mountDashboard(selector: string | HTMLElement) {
    dashboardInstance.mount(selector);
  }

  public shutdown() {
    this.interceptor.stop();
    this.initialized = false;
  }

  // Expose config for dashboard callback referencing
  public get getConfig() {
    return this.config;
  }

  // Expose sub-modules for convenience
  public get patcher() {
    return patcherInstance;
  }

  public get emailer() {
    return emailerInstance;
  }

  public get widget() {
    return widgetInstance;
  }

  public get dashboard() {
    return dashboardInstance;
  }
}

export const AutoHeal = new AutoHealSDK();
export { patcherInstance, emailerInstance, widgetInstance, dashboardInstance };
export type { ErrorData };

