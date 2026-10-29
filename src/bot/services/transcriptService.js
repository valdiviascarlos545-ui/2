/**
 * Madrazo Cartel Bot - HTML Transcript Generator & Cookie API integration
 * Generates secure, sanitized HTML transcripts of ticket channels.
 */
import fs from 'fs';
import path from 'path';
import { config } from '../../../config/defaults.js';
import { logger } from '../utils/logger.js';

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const transcriptService = {
  /**
   * Fetches messages and builds a clean, styled HTML document
   */
  async generateHtmlTranscript(channel, ticket) {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = Array.from(messages.values()).reverse();

    const messageHtml = sorted.map(m => {
      const timeStr = new Date(m.createdTimestamp).toLocaleString('en-US', { timeZone: config.timezone });
      const attachments = Array.from(m.attachments.values())
        .map(a => `<a class="attachment" href="${escapeHtml(a.url)}" target="_blank">📎 ${escapeHtml(a.name || 'Attachment')}</a>`)
        .join(' ');

      return `
        <div class="message">
          <div class="avatar">${escapeHtml(m.author.username.substring(0, 2).toUpperCase())}</div>
          <div class="content-box">
            <div class="header">
              <span class="username">${escapeHtml(m.author.username)}</span>
              <span class="timestamp">${timeStr}</span>
            </div>
            <div class="body">${escapeHtml(m.content)}</div>
            ${attachments ? `<div class="attachments">${attachments}</div>` : ''}
          </div>
        </div>
      `;
    }).join('\n');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Transcript • ${escapeHtml(ticket.ticket_id)}</title>
  <style>
    body { background-color: #121214; color: #E0E0E0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; }
    .container { max-width: 900px; margin: 0 auto; background: #1a1a1e; border: 1px solid #2d2d35; border-radius: 8px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    .ticket-header { border-bottom: 2px solid #8B0000; padding-bottom: 16px; margin-bottom: 24px; }
    .ticket-title { font-size: 24px; color: #ff4d4d; margin: 0 0 8px 0; font-weight: 700; }
    .ticket-meta { font-size: 14px; color: #888; display: flex; gap: 20px; flex-wrap: wrap; }
    .message { display: flex; gap: 14px; margin-bottom: 18px; line-height: 1.4; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: #8B0000; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-size: 14px; flex-shrink: 0; }
    .content-box { flex: 1; }
    .header { margin-bottom: 4px; }
    .username { font-weight: 600; color: #ffffff; margin-right: 8px; font-size: 15px; }
    .timestamp { font-size: 12px; color: #777; }
    .body { font-size: 14px; color: #d0d0d0; word-break: break-word; }
    .attachments { margin-top: 6px; }
    .attachment { font-size: 12px; color: #D4AF37; text-decoration: none; background: #26262b; padding: 4px 8px; border-radius: 4px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="ticket-header">
      <h1 class="ticket-title">Madrazo Cartel • ${escapeHtml(ticket.ticket_id)} Transcript</h1>
      <div class="ticket-meta">
        <div><strong>Type:</strong> ${escapeHtml(ticket.ticket_type)}</div>
        <div><strong>Opener:</strong> ${escapeHtml(ticket.opener_name || ticket.opener_id)}</div>
        <div><strong>Handler:</strong> ${escapeHtml(ticket.handler_name || 'Unassigned')}</div>
        <div><strong>Messages:</strong> ${sorted.length}</div>
      </div>
    </div>
    <div class="messages">
      ${messageHtml}
    </div>
  </div>
</body>
</html>
    `;
  },

  /**
   * Upload to Cookie API or save locally
   */
  async uploadTranscript(htmlContent, ticketId) {
    if (config.cookieApiKey && config.cookieApiEndpoint) {
      try {
        const res = await fetch(config.cookieApiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.cookieApiKey}`
          },
          body: JSON.stringify({
            html: htmlContent,
            ticketId
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            return { success: true, url: data.url };
          }
        }
        logger.warn(`Cookie API returned status ${res.status}. Falling back to local transcript.`);
      } catch (err) {
        logger.warn('Failed to upload transcript to Cookie API:', err);
      }
    }

    // Local fallback: save to data/transcripts/
    const dir = './data/transcripts';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${ticketId}.html`);
    fs.writeFileSync(filePath, htmlContent, 'utf-8');

    return {
      success: true,
      url: null,
      localFile: filePath,
      note: 'Saved locally in server transcripts directory'
    };
  }
};
