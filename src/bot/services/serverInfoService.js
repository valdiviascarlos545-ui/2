/**
 * Madrazo Cartel Bot - Server Information Service
 * Pulls real Discord guild statistics and powers the auto-updating persistent server info panel.
 */
import { ChannelType } from 'discord.js';
import { brandingService } from './brandingService.js';
import { panelRepository } from '../../../database/repositories/panelRepository.js';
import { config } from '../../../config/defaults.js';
import { logger } from '../utils/logger.js';

export const serverInfoService = {
  /**
   * Compiles real guild stats without fabricating numbers
   */
  getGuildStats(guild) {
    const totalMembers = guild.memberCount || 0;
    
    // Check if presence intent cache is available
    let onlineMembers = 'Unavailable';
    const cachedMembers = guild.members.cache;
    if (cachedMembers && cachedMembers.size > 0) {
      const onlineCount = cachedMembers.filter(m => m.presence && m.presence.status !== 'offline').size;
      if (onlineCount > 0) {
        onlineMembers = String(onlineCount);
      }
    }

    const channels = guild.channels.cache;
    const textCount = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceCount = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const botCount = cachedMembers.filter(m => m.user.bot).size;

    return {
      totalMembers,
      onlineMembers,
      boostCount: guild.premiumSubscriptionCount || 0,
      boostTier: guild.premiumTier || 0,
      ownerId: guild.ownerId,
      channelCount: channels.size,
      textCount,
      voiceCount,
      botCount: botCount > 0 ? botCount : 'N/A',
      roleCount: guild.roles.cache.size,
      createdTimestamp: guild.createdTimestamp,
      iconURL: guild.iconURL()
    };
  },

  /**
   * Publishes or refreshes the persistent server info panel
   */
  async publishServerInfoPanel(guild, channel, isRefresh = false) {
    const stats = this.getGuildStats(guild);
    const embeds = brandingService.buildServerInfoEmbed(stats);
    const existing = panelRepository.getPanel('server_info');

    if (existing && isRefresh) {
      try {
        const targetChannel = guild.channels.cache.get(existing.channel_id) || channel;
        const msg = await targetChannel.messages.fetch(existing.message_id);
        if (msg) {
          await msg.edit({ embeds });
          panelRepository.savePanel('server_info', guild.id, targetChannel.id, msg.id);
          return { success: true, messageId: msg.id, refreshed: true };
        }
      } catch (err) {
        logger.warn(`Could not refresh existing server info panel ${existing.message_id}:`, err);
      }
    }

    const msg = await channel.send({ embeds });
    panelRepository.savePanel('server_info', guild.id, channel.id, msg.id);
    return { success: true, messageId: msg.id, refreshed: false };
  },

  /**
   * Periodic non-overlapping panel refresh loop
   */
  startAutoRefreshLoop(client) {
    if (!config.serverInfoPanelEnabled) return;

    let isUpdating = false;
    const intervalMs = Math.max(config.serverInfoUpdateIntervalSeconds, 60) * 1000;

    setInterval(async () => {
      if (isUpdating) return; // Prevent overlapping loops
      isUpdating = true;
      try {
        const panel = panelRepository.getPanel('server_info');
        if (!panel) return;

        const guild = client.guilds.cache.get(panel.guild_id);
        if (!guild) return;

        const channel = guild.channels.cache.get(panel.channel_id);
        if (!channel) return;

        await this.publishServerInfoPanel(guild, channel, true);
        logger.debug('Refreshed persistent server info panel successfully.');
      } catch (err) {
        logger.warn('Error during server info panel refresh loop:', err);
      } finally {
        isUpdating = false;
      }
    }, intervalMs);

    logger.info(`Started server info panel auto-refresh loop (${config.serverInfoUpdateIntervalSeconds}s interval).`);
  }
};
