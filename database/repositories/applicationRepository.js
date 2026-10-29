/**
 * Madrazo Cartel Bot - Application Repository
 * Handles persistent applications, answer storage, idempotent reviewer notifications, and decisions.
 */
import { getDatabase } from '../index.js';

export const applicationRepository = {
  getNextApplicationNumber() {
    const db = getDatabase();
    const update = db.prepare('UPDATE counters SET value = value + 1 WHERE name = ?');
    const select = db.prepare('SELECT value FROM counters WHERE name = ?');

    const increment = db.transaction(() => {
      update.run('application_number');
      const row = select.get('application_number');
      return row.value;
    });

    return increment();
  },

  createApplication(guildId, userId, username) {
    const db = getDatabase();
    const appNumber = this.getNextApplicationNumber();
    const applicationId = `APP-${appNumber}`;

    const stmt = db.prepare(`
      INSERT INTO applications (
        application_id, guild_id, user_id, username, status,
        reviewer_notified, created_at, answers_json
      ) VALUES (?, ?, ?, ?, 'in_progress', 0, ?, '{}')
    `);

    stmt.run(applicationId, guildId, userId, username, Date.now());
    return this.getApplicationById(applicationId);
  },

  getActiveApplication(userId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM applications 
      WHERE user_id = ? AND status IN ('in_progress', 'pending_review', 'needs_information')
      ORDER BY id DESC LIMIT 1
    `);
    const app = stmt.get(userId);
    if (app && app.answers_json) {
      try {
        app.answers = JSON.parse(app.answers_json);
      } catch {
        app.answers = {};
      }
    }
    return app || null;
  },

  getApplicationById(applicationId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM applications WHERE application_id = ?');
    const app = stmt.get(applicationId);
    if (app && app.answers_json) {
      try {
        app.answers = JSON.parse(app.answers_json);
      } catch {
        app.answers = {};
      }
    }
    return app || null;
  },

  /**
   * Submit completed answers and set status to pending_review
   */
  submitApplication(applicationId, answers) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE applications
      SET answers_json = ?, status = 'pending_review', submitted_at = ?
      WHERE application_id = ?
    `);
    stmt.run(JSON.stringify(answers), Date.now(), applicationId);
    return this.getApplicationById(applicationId);
  },

  /**
   * Atomically mark reviewer notification as sent.
   * Returns true if this call transitioned reviewer_notified from 0 to 1.
   * If already 1, returns false to prevent duplicate pings!
   */
  tryMarkReviewerNotified(applicationId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE applications
      SET reviewer_notified = 1
      WHERE application_id = ? AND reviewer_notified = 0
    `);
    const result = stmt.run(applicationId);
    return result.changes > 0;
  },

  /**
   * Review application: approve, deny, or request more information
   */
  reviewApplication(applicationId, reviewerId, reviewerName, status, reason = null) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE applications
      SET status = ?, reviewer_id = ?, reviewer_name = ?, decision_reason = ?, reviewed_at = ?
      WHERE application_id = ?
    `);
    stmt.run(status, reviewerId, reviewerName, reason, Date.now(), applicationId);
    return this.getApplicationById(applicationId);
  },

  getAllApplications(status = null) {
    const db = getDatabase();
    let rows;
    if (status) {
      rows = db.prepare('SELECT * FROM applications WHERE status = ? ORDER BY id DESC').all(status);
    } else {
      rows = db.prepare('SELECT * FROM applications ORDER BY id DESC').all();
    }
    return rows.map(app => {
      try {
        app.answers = app.answers_json ? JSON.parse(app.answers_json) : {};
      } catch {
        app.answers = {};
      }
      return app;
    });
  }
};
