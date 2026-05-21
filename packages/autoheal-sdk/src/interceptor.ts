export interface ErrorData {
  id: string;
  type: 'crash' | 'promise' | 'console_error' | 'console_warn' | 'asset' | 'feature';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  timestamp: string;
  domContext?: string;
}

type ErrorCallback = (error: ErrorData) => void;

export class ErrorInterceptor {
  private active = false;
  private callback: ErrorCallback | null = null;
  
  // Save originals to restore later if needed
  private originalConsoleError = console.error;
  private originalConsoleWarn = console.warn;

  constructor() {}

  public start(callback: ErrorCallback) {
    if (this.active) return;
    this.active = true;
    this.callback = callback;

    // 1. Uncaught Javascript Errors (Crashes)
    window.addEventListener('error', this.handleUncaughtError);

    // 2. Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // 3. Asset Loading Failures (Capturing on capture phase since it doesn't bubble)
    window.addEventListener('error', this.handleAssetError, true);

    // 4. Overriding console.error
    console.error = (...args: any[]) => {
      this.originalConsoleError.apply(console, args);
      
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ');
      
      // Prevent infinite loops if our own dashboard/widget logs an error
      if (message.includes('__autoheal_internal__')) return;

      this.triggerCallback({
        id: 'err_' + Math.random().toString(36).substr(2, 9),
        type: 'console_error',
        message,
        timestamp: new Date().toISOString(),
      });
    };

    // 5. Overriding console.warn
    console.warn = (...args: any[]) => {
      this.originalConsoleWarn.apply(console, args);
      
      const message = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ');

      if (message.includes('__autoheal_internal__')) return;

      this.triggerCallback({
        id: 'warn_' + Math.random().toString(36).substr(2, 9),
        type: 'console_warn',
        message,
        timestamp: new Date().toISOString(),
      });
    };
  }

  public stop() {
    if (!this.active) return;
    this.active = false;
    this.callback = null;

    window.removeEventListener('error', this.handleUncaughtError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleAssetError, true);

    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
  }

  private triggerCallback(errorData: ErrorData) {
    if (this.callback) {
      this.callback(errorData);
    }
  }

  private handleUncaughtError = (event: ErrorEvent) => {
    // Skip resource errors as they are handled in handleAssetError
    if (event.target && (event.target !== window)) {
      return;
    }

    const errorData: ErrorData = {
      id: 'crash_' + Math.random().toString(36).substr(2, 9),
      type: 'crash',
      message: event.message || 'Unknown uncaught exception',
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error ? event.error.stack : new Error().stack,
      timestamp: new Date().toISOString(),
    };

    this.triggerCallback(errorData);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    let message = 'Promise rejected without reason';
    let stack = '';

    if (event.reason) {
      if (event.reason instanceof Error) {
        message = event.reason.message;
        stack = event.reason.stack || '';
      } else if (typeof event.reason === 'string') {
        message = event.reason;
      } else {
        message = JSON.stringify(event.reason);
      }
    }

    const errorData: ErrorData = {
      id: 'promise_' + Math.random().toString(36).substr(2, 9),
      type: 'promise',
      message,
      stack: stack || new Error().stack,
      timestamp: new Date().toISOString(),
    };

    this.triggerCallback(errorData);
  };

  private handleAssetError = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    const tagName = target.tagName;
    const isAsset = tagName === 'IMG' || tagName === 'SCRIPT' || tagName === 'LINK';
    if (!isAsset) return;

    const sourceAttr = tagName === 'LINK' ? 'href' : 'src';
    const assetUrl = target.getAttribute(sourceAttr) || 'unknown source';
    
    // Extract HTML element details safely
    const outerHTML = target.outerHTML ? target.outerHTML.substring(0, 150) + '...' : `<${tagName.toLowerCase()}>`;

    const errorData: ErrorData = {
      id: 'asset_' + Math.random().toString(36).substr(2, 9),
      type: 'asset',
      message: `Failed to load resource: ${tagName.toLowerCase()} load error.`,
      source: assetUrl,
      domContext: outerHTML,
      timestamp: new Date().toISOString(),
    };

    this.triggerCallback(errorData);
  };
}
