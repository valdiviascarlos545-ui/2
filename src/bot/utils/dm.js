/**
 * Madrazo Cartel Bot - Safe Direct Message Utility
 * Handles delivery failures (e.g. DMs disabled, blocked bot) cleanly without throwing unhandled exceptions.
 */
import { logger } from './logger.js';

export async function safeSendDM(user, messagePayload) {
  if (!user || typeof user.send !== 'function') {
    return { success: false, error: 'Invalid user recipient' };
  }

  try {
    const sent = await user.send(messagePayload);
    return { success: true, messageId: sent.id };
  } catch (err) {
    // DiscordAPIError 50007: Cannot send messages to this user
    if (err.code === 50007) {
      logger.warn(`Could not deliver DM to user ${user.id} (${user.tag || 'unknown'}): User has DMs disabled or blocked the bot.`);
      return { success: false, error: 'Recipient has Direct Messages closed or blocked the bot.' };
    }
    logger.warn(`DM delivery to user ${user.id} failed:`, err.message);
    return { success: false, error: err.message };
  }
}
