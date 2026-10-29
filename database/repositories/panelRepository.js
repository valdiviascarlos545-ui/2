/**
 * Madrazo Cartel Bot - Persistent Panels Repository
 * Manages message IDs and channels for persistent ticket, application, and server info panels.
 */
import { getDatabase } from '../index.js';

export const panelRepository = {
  savePanel(panelType, guildId, channelId, messageId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO persistent_panels (panel_type, guild_id, channel_id, message_id, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(panel_type) DO UPDATE SET
        guild_id = excluded.guild_id,
        channel_id = excluded.channel_id,
        message_id = excluded.message_id,
        updated_at = excluded.updated_at
    `);
    stmt.run(panelType, guildId, channelId, messageId, Date.now());
    return this.getPanel(panelType);
  },

  getPanel(panelType) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM persistent_panels WHERE panel_type = ?').get(panelType) || null;
  },

  getAllPanels() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM persistent_panels').all();
  },

  deletePanel(panelType) {
    const db = getDatabase();
    return db.prepare('DELETE FROM persistent_panels WHERE panel_type = ?').run(panelType);
  }
};
