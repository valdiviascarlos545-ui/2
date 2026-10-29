/**
 * Madrazo Cartel Bot - SQLite Database Initializer
 * Sets up better-sqlite3 with WAL mode, foreign keys, and automatic schema initialization.
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config/defaults.js';
import { initializeSchema } from './schema.js';

let dbInstance = null;

export function getDatabase(customPath = null) {
  if (dbInstance) return dbInstance;

  const dbPath = customPath || config.databasePath;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(dbPath);
  
  // Pragmas for production durability & concurrency
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('synchronous = NORMAL');

  // Initialize all tables and migrations
  initializeSchema(dbInstance);

  return dbInstance;
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export default { getDatabase, closeDatabase };
