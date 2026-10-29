/**
 * Madrazo Cartel Bot - Giveaway Repository
 * Durable giveaway records, unique entries, and cryptographically sound winner storage.
 */
import { getDatabase } from '../index.js';

export const giveawayRepository = {
  createGiveaway(data) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO giveaways (
        giveaway_id, guild_id, channel_id, message_id, prize,
        winner_count, host_id, host_name, end_timestamp,
        status, required_role_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `);

    stmt.run(
      data.giveawayId,
      data.guildId,
      data.channelId,
      data.messageId,
      data.prize,
      data.winnerCount || 1,
      data.hostId,
      data.hostName,
      data.endTimestamp,
      data.requiredRoleId || null,
      Date.now()
    );

    return this.getGiveaway(data.giveawayId);
  },

  getGiveaway(giveawayId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM giveaways WHERE giveaway_id = ?').get(giveawayId) || null;
  },

  getGiveawayByMessage(messageId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId) || null;
  },

  addEntry(giveawayId, userId, username) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id, username, entered_at)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(giveawayId, userId, username, Date.now());
    return result.changes > 0;
  },

  removeEntry(giveawayId, userId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?');
    const result = stmt.run(giveawayId, userId);
    return result.changes > 0;
  },

  hasEntered(giveawayId, userId) {
    const db = getDatabase();
    const row = db.prepare('SELECT 1 FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?').get(giveawayId, userId);
    return Boolean(row);
  },

  getEntries(giveawayId) {
    const db = getDatabase();
    return db.prepare('SELECT user_id, username FROM giveaway_entries WHERE giveaway_id = ?').all(giveawayId);
  },

  getEntryCount(giveawayId) {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as count FROM giveaway_entries WHERE giveaway_id = ?').get(giveawayId);
    return row ? row.count : 0;
  },

  recordWinners(giveawayId, winners) {
    const db = getDatabase();
    const insert = db.prepare(`
      INSERT INTO giveaway_winners (giveaway_id, user_id, username, won_at)
      VALUES (?, ?, ?, ?)
    `);

    const updateStatus = db.prepare(`
      UPDATE giveaways SET status = 'ended' WHERE giveaway_id = ?
    `);

    const transaction = db.transaction(() => {
      // Clear previous winners if rerolling
      db.prepare('DELETE FROM giveaway_winners WHERE giveaway_id = ?').run(giveawayId);
      for (const w of winners) {
        insert.run(giveawayId, w.userId, w.username, Date.now());
      }
      updateStatus.run(giveawayId);
    });

    transaction();
    return this.getWinners(giveawayId);
  },

  getWinners(giveawayId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM giveaway_winners WHERE giveaway_id = ?').all(giveawayId);
  },

  getActiveGiveaways() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM giveaways WHERE status = "active"').all();
  }
};
