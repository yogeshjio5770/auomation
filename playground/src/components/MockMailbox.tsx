import React, { useState, useEffect } from 'react';
import { Mail, Inbox, Calendar, User, FileText, ChevronRight, X } from 'lucide-react';
import { emailerInstance } from '../../../packages/autoheal-sdk/src/emailer.ts';

interface EmailPayload {
  subject: string;
  recipient: string;
  body: string;
  timestamp: string;
  sentReal: boolean;
}

export const MockMailbox: React.FC = () => {
  const [emails, setEmails] = useState<EmailPayload[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailPayload | null>(null);
  const [newMailPulse, setNewMailPulse] = useState(false);

  useEffect(() => {
    // Subscribe to SDK Emailer events!
    const unsubscribe = emailerInstance.subscribe((payload: EmailPayload) => {
      setEmails(prev => [payload, ...prev]);
      setNewMailPulse(true);
      setTimeout(() => setNewMailPulse(false), 2000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleClear = () => {
    setEmails([]);
    setSelectedEmail(null);
  };

  return (
    <div className="mailbox-card glass-panel">
      <div className="mailbox-header">
        <div className="mailbox-title">
          <div className={`mailbox-icon-container ${newMailPulse ? 'pulse-green' : ''}`}>
            <Inbox size={18} className="neon-cyan" />
          </div>
          <span>Developer Mailbox</span>
          {emails.length > 0 && (
            <span className="email-badge-count">{emails.length} new</span>
          )}
        </div>
        {emails.length > 0 && (
          <button onClick={handleClear} className="btn-clear-mailbox">
            Clear Inbox
          </button>
        )}
      </div>

      <div className="mailbox-body">
        {emails.length === 0 ? (
          <div className="mailbox-empty">
            <Mail size={40} className="empty-mailbox-icon" />
            <div className="empty-mailbox-text">Waiting for Error Reports...</div>
            <p className="empty-mailbox-desc">
              When an error is triggered in the sandbox, the AutoHeal SDK will immediately package the dump file and email it here!
            </p>
          </div>
        ) : (
          <div className="email-list">
            {emails.map((email, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedEmail(email)}
                className={`email-item-pill ${selectedEmail === email ? 'active' : ''} ${idx === 0 && newMailPulse ? 'incoming-glow' : ''}`}
              >
                <div className="email-item-header">
                  <span className="email-item-tag">REPORT</span>
                  <span className="email-item-time">
                    {new Date(email.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="email-item-subject">{email.subject}</div>
                <div className="email-item-preview">
                  Recipient: <span className="neon-cyan">{email.recipient}</span>
                  {email.sentReal && <span className="real-sent-badge">Web3Forms sent</span>}
                </div>
                <ChevronRight size={14} className="email-chevron" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-out Email Reader */}
      {selectedEmail && (
        <div className="email-reader-overlay">
          <div className="email-reader-card">
            <div className="email-reader-header">
              <div className="email-reader-meta">
                <div className="meta-line">
                  <User size={14} />
                  <span>From: <strong>AutoHeal SDK Diagnostics</strong></span>
                </div>
                <div className="meta-line">
                  <Mail size={14} />
                  <span>To: <strong className="neon-cyan">{selectedEmail.recipient}</strong></span>
                </div>
                <div className="meta-line">
                  <Calendar size={14} />
                  <span>Date: <strong>{new Date(selectedEmail.timestamp).toLocaleString()}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmail(null)}
                className="email-reader-close"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="email-reader-subject">
              {selectedEmail.subject}
            </div>

            <div className="email-reader-body-container">
              <div className="body-title-badge">
                <FileText size={12} />
                <span>LOG_FILE_DUMP.txt</span>
              </div>
              <pre className="email-raw-body">
                {selectedEmail.body}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
