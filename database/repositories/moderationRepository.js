/**
 * Madrazo Cartel Bot - Moderation & Audit Repository
 */
import { getDatabase } from '../index.js';

export const moderationRepository = {
  getNextCaseNumber() {
    const db = getDatabase();
    const update = db.prepare('UPDATE counters SET value = value + 1 WHERE name = ?');
    const select = db.prepare('SELECT value FROM counters WHERE name = ?');

    const increment = db.transaction(() => {
      update.run('case_number');
      const row = select.get('case_number');
      return row.value;
    });

    return increment();
  },

  createCase(data) {
    const db = getDatabase();
    const caseNumber = this.getNextCaseNumber();
    const caseId = `CASE-${caseNumber}`;

    const stmt = db.prepare(`
      INSERT INTO moderation_cases (
        case_id, guild_id, action, target_id, target_name,
        moderator_id, moderator_name, reason, duration, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      caseId,
      data.guildId,
      data.action,
      data.targetId,
      data.targetName,
      data.moderatorId,
      data.moderatorName,
      data.reason || 'No reason provided',
      data.duration || null,
      Date.now()
    );

    return this.getCase(caseId);
  },

  getCase(caseId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM moderation_cases WHERE case_id = ?').get(caseId) || null;
  },

  addWarning(guildId, userId, moderatorId, reason) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(guildId, userId, moderatorId, reason, Date.now());
    return this.getWarnings(userId);
  },

  getWarnings(userId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM warnings WHERE user_id = ? ORDER BY id DESC').all(userId);
  },

  clearWarnings(userId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM warnings WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  },

  logAudit(action, actorId, actorName, targetId, details) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, actor_id, actor_name, target_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(action, actorId, actorName, targetId, typeof details === 'object' ? JSON.stringify(details) : String(details), Date.now());
  },

  getRecentAuditLogs(limit = 50) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(limit);
  }
};
