/**
 * Madrazo Cartel Bot - SSU (Server Start-Up) Service
 * Manages roleplay session start-ups, state persistence, and session embeds.
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getDatabase } from '../../../database/index.js';
import { panelRepository } from '../../../database/repositories/panelRepository.js';
import { brandingService } from './brandingService.js';
import { branding } from '../../../config/branding.js';

export const ssuService = {
  getActiveSession(guildId) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM ssu_sessions WHERE guild_id = ? AND status = "active" ORDER BY id DESC LIMIT 1').get(guildId) || null;
  },

  startSession(guildId, hostId, hostName) {
    const db = getDatabase();
    // End any existing active sessions
    db.prepare('UPDATE ssu_sessions SET status = "ended", ended_at = ? WHERE guild_id = ? AND status = "active"').run(Date.now(), guildId);

    const stmt = db.prepare(`
      INSERT INTO ssu_sessions (guild_id, host_id, host_name, status, started_at)
      VALUES (?, ?, ?, 'active', ?)
    `);
    stmt.run(guildId, hostId, hostName, Date.now());
    return this.getActiveSession(guildId);
  },

  endSession(guildId) {
    const db = getDatabase();
    db.prepare('UPDATE ssu_sessions SET status = "ended", ended_at = ? WHERE guild_id = ? AND status = "active"').run(Date.now(), guildId);
  },

  buildSsuEmbed(session) {
    const isActive = session && session.status === 'active';
    const elapsedMinutes = isActive ? Math.floor((Date.now() - session.started_at) / 60000) : 0;

    const embed = brandingService.createBaseEmbed({
      title: '🚨 Madrazo Cartel • Roleplay Server Start-Up (SSU)',
      description: isActive
        ? `**A Madrazo Cartel Roleplay Session is CURRENTLY ACTIVE!**\n\n` +
          `All members, prospects, and allies are requested in-game and on comms.\n\n` +
          `> **Session Host:** <@${session.host_id}>\n` +
          `> **Started:** <t:${Math.floor(session.started_at / 1000)}:R>\n` +
          `> **Elapsed:** \`${elapsedMinutes} minutes\`\n` +
          `> **Game Code / Direct Join:** Join via ER:LC Server Browser under **Madrazo Roleplay**\n` +
          `> **Radio Frequency:** \`92.4 FM\``
        : `**No Active Roleplay Session Currently Running.**\n\n` +
          `Stay alert in <#${branding.cartelName}> for the next official rideout notification.`,
      color: isActive ? branding.primaryColor : branding.darkColor,
      topBanner: branding.banners.ssuTop
    });

    return brandingService.packageEmbeds(embed);
  }
};
