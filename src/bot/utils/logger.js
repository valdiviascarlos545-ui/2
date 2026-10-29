/**
 * Madrazo Cartel Bot - Structured Production Logger
 * Formats timestamps, log levels, redacts tokens and sensitive data.
 */
import { config } from '../../../config/defaults.js';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[config.logLevel.toLowerCase()] ?? 1;

function redact(message) {
  if (typeof message !== 'string') return message;
  let clean = message;
  if (config.token) clean = clean.replaceAll(config.token, '[REDACTED_TOKEN]');
  if (config.cookieApiKey) clean = clean.replaceAll(config.cookieApiKey, '[REDACTED_KEY]');
  return clean;
}

function formatTime() {
  const d = new Date();
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

export const logger = {
  debug(...args) {
    if (currentLevel <= 0) {
      console.log(`[${formatTime()}] [DEBUG]`, ...args.map(a => typeof a === 'string' ? redact(a) : a));
    }
  },
  info(...args) {
    if (currentLevel <= 1) {
      console.log(`[${formatTime()}] [INFO]`, ...args.map(a => typeof a === 'string' ? redact(a) : a));
    }
  },
  warn(...args) {
    if (currentLevel <= 2) {
      console.warn(`[${formatTime()}] [WARN]`, ...args.map(a => typeof a === 'string' ? redact(a) : a));
    }
  },
  error(...args) {
    if (currentLevel <= 3) {
      console.error(`[${formatTime()}] [ERROR]`, ...args.map(a => typeof a === 'string' ? redact(a) : a));
    }
  }
};
