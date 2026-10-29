/**
 * Madrazo Cartel Bot - Database Schema & Migrations
 * Creates tables, unique indexes, and versioned schema tracking.
 */

export function initializeSchema(db) {
  // 1. Migrations Tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  // 2. Tickets Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      ticket_number INTEGER UNIQUE NOT NULL,
      ticket_type TEXT NOT NULL,
      channel_id TEXT UNIQUE NOT NULL,
      guild_id TEXT NOT NULL,
      opener_id TEXT NOT NULL,
      opener_name TEXT,
      handler_id TEXT,
      handler_name TEXT,
      claim_timestamp INTEGER,
      unclaim_timestamp INTEGER,
      reassign_history TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      close_reason TEXT,
      closed_by_id TEXT,
      closed_by_name TEXT,
      created_at INTEGER NOT NULL,
      closed_at INTEGER,
      transcript_url TEXT,
      message_count INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_channel ON tickets(channel_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_opener ON tickets(opener_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
  `);

  // 3. Applications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id TEXT UNIQUE NOT NULL,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress',
      reviewer_id TEXT,
      reviewer_name TEXT,
      decision_reason TEXT,
      reviewer_notified INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      submitted_at INTEGER,
      reviewed_at INTEGER,
      answers_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
  `);

  // 4. Giveaways & Entries
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id TEXT UNIQUE NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT UNIQUE NOT NULL,
      prize TEXT NOT NULL,
      winner_count INTEGER DEFAULT 1,
      host_id TEXT NOT NULL,
      host_name TEXT,
      end_timestamp INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      required_role_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT,
      entered_at INTEGER NOT NULL,
      UNIQUE(giveaway_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS giveaway_winners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT,
      won_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_giveaway_entries ON giveaway_entries(giveaway_id);
  `);

  // 5. Persistent Panels
  db.exec(`
    CREATE TABLE IF NOT EXISTS persistent_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      panel_type TEXT UNIQUE NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 6. Moderation & Warnings
  db.exec(`
    CREATE TABLE IF NOT EXISTS moderation_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT UNIQUE NOT NULL,
      guild_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_name TEXT,
      moderator_id TEXT NOT NULL,
      moderator_name TEXT,
      reason TEXT,
      duration INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 7. Audit Logs & Counters
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT,
      target_id TEXT,
      details TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER DEFAULT 0
    );
  `);

  // 8. Suggestions & SSU Sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suggestion_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewer_id TEXT,
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ssu_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      host_id TEXT NOT NULL,
      host_name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      player_count INTEGER DEFAULT 0
    );
  `);

  // Ensure initial ticket & application counters exist
  const initCounter = db.prepare(`INSERT OR IGNORE INTO counters (name, value) VALUES (?, ?)`);
  initCounter.run('ticket_number', 1000);
  initCounter.run('application_number', 1000);
  initCounter.run('case_number', 100);

  // Record initial migration
  const checkMigration = db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get();
  if (!checkMigration) {
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)').run(Date.now());
  }
}
