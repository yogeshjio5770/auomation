import type { ErrorData } from './interceptor.ts';

export interface EmailConfig {
  accessKey?: string;
  devEmail?: string;
  enabled: boolean;
}

type EmailSentCallback = (payload: {
  subject: string;
  recipient: string;
  body: string;
  timestamp: string;
  sentReal: boolean;
}) => void;

export class Emailer {
  private config: EmailConfig = { enabled: false };
  private listeners: EmailSentCallback[] = [];

  constructor() {}

  public setConfig(config: Partial<EmailConfig>) {
    this.config = { ...this.config, ...config };
  }

  public subscribe(callback: EmailSentCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public async sendErrorEmail(error: ErrorData): Promise<boolean> {
    const timestamp = new Date(error.timestamp).toLocaleString();
    const subject = `🚨 AutoHeal Alert [${error.type.toUpperCase()}]: ${error.message.substring(0, 50)}`;
    
    const body = `
===================================================
AUTOHEAL CRITICAL EXCEPTION LOG REPORT
===================================================
Timestamp: ${timestamp}
Error Type: ${error.type.toUpperCase()}
Message: ${error.message}
${error.source ? `Source File: ${error.source}` : ''}
${error.line ? `Line: ${error.line} | Column: ${error.column}` : ''}
${error.domContext ? `DOM Node Element: ${error.domContext}` : ''}

---------------------------------------------------
STACK TRACE:
---------------------------------------------------
${error.stack || 'No stack trace captured.'}

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
    `.trim();

    // Trigger mock mailbox notifications
    this.listeners.forEach(listener => {
      try {
        listener({
          subject,
          recipient: this.config.devEmail || 'developer@local.dev',
          body,
          timestamp: new Date().toISOString(),
          sentReal: this.config.enabled,
        });
      } catch (e) {
        // Safe check
      }
    });

    return true;
  }
}
export const emailerInstance = new Emailer();
