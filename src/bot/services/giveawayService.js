/**
 * Madrazo Cartel Bot - Giveaway Service
 * Cryptographically random winner selection, atomic entries, and persistent giveaway embeds.
 */
import crypto from 'crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { giveawayRepository } from '../../../database/repositories/giveawayRepository.js';
import { moderationRepository } from '../../../database/repositories/moderationRepository.js';
import { brandingService } from './brandingService.js';
import { logger } from '../utils/logger.js';

export const giveawayService = {
  buildGiveawayButtons(giveaway) {
    const isEnded = giveaway.status === 'ended' || giveaway.status === 'cancelled';
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_enter_${giveaway.giveaway_id}`)
          .setLabel('🎉 Enter Giveaway')
          .setStyle(ButtonStyle.Success)
          .setDisabled(isEnded),
        new ButtonBuilder()
          .setCustomId(`giveaway_leave_${giveaway.giveaway_id}`)
          .setLabel('Leave')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(isEnded)
      )
    ];
  },

  /**
   * Cryptographically select N random winners from entries
   */
  pickRandomWinners(entries, count) {
    if (!entries || entries.length === 0) return [];
    const pool = [...entries];
    const winners = [];
    const targetCount = Math.min(count, pool.length);

    for (let i = 0; i < targetCount; i++) {
      const randomIndex = crypto.randomInt(0, pool.length);
      const chosen = pool.splice(randomIndex, 1)[0];
      winners.push({
        userId: chosen.user_id,
        username: chosen.username
      });
    }

    return winners;
  },

  async handleEnter(interaction, giveawayId) {
    const giveaway = giveawayRepository.getGiveaway(giveawayId);
    if (!giveaway) {
      return interaction.reply({ content: 'Giveaway not found.', ephemeral: true });
    }

    if (giveaway.status !== 'active') {
      return interaction.reply({ content: 'This giveaway is no longer active.', ephemeral: true });
    }

    // Role check if configured
    if (giveaway.required_role_id) {
      const member = interaction.member;
      const hasRole = member.roles.cache.has(giveaway.required_role_id);
      if (!hasRole) {
        return interaction.reply({
          content: `You must have the <@&${giveaway.required_role_id}> role to enter this giveaway.`,
          ephemeral: true
        });
      }
    }

    const user = interaction.user;
    const added = giveawayRepository.addEntry(giveawayId, user.id, user.tag);

    if (!added) {
      return interaction.reply({
        content: 'You have already entered this giveaway! Good luck.',
        ephemeral: true
      });
    }

    const count = giveawayRepository.getEntryCount(giveawayId);
    await interaction.reply({
      content: `🎉 You have entered the giveaway for **${giveaway.prize}**! Total entries: \`${count}\`.`,
      ephemeral: true
    });

    // Update giveaway message embed with new entry count
    try {
      const embeds = brandingService.buildGiveawayEmbed(giveaway, count);
      const components = this.buildGiveawayButtons(giveaway);
      await interaction.message.edit({ embeds, components });
    } catch (err) {
      logger.warn(`Could not update giveaway embed message:`, err);
    }
  },

  async handleLeave(interaction, giveawayId) {
    const giveaway = giveawayRepository.getGiveaway(giveawayId);
    if (!giveaway || giveaway.status !== 'active') {
      return interaction.reply({ content: 'Giveaway inactive.', ephemeral: true });
    }

    const removed = giveawayRepository.removeEntry(giveawayId, interaction.user.id);
    if (!removed) {
      return interaction.reply({ content: 'You are not currently entered in this giveaway.', ephemeral: true });
    }

    const count = giveawayRepository.getEntryCount(giveawayId);
    await interaction.reply({
      content: `You have left the giveaway. Current entries: \`${count}\`.`,
      ephemeral: true
    });

    try {
      const embeds = brandingService.buildGiveawayEmbed(giveaway, count);
      const components = this.buildGiveawayButtons(giveaway);
      await interaction.message.edit({ embeds, components });
    } catch (err) {
      logger.warn(`Could not update giveaway embed message:`, err);
    }
  },

  async endGiveaway(channel, giveawayId) {
    const giveaway = giveawayRepository.getGiveaway(giveawayId);
    if (!giveaway) return { success: false, error: 'Giveaway not found' };

    const entries = giveawayRepository.getEntries(giveawayId);
    const winners = this.pickRandomWinners(entries, giveaway.winner_count);

    giveawayRepository.recordWinners(giveawayId, winners);

    // Fetch and update original message
    try {
      const msg = await channel.messages.fetch(giveaway.message_id);
      if (msg) {
        const embeds = brandingService.buildGiveawayEmbed(giveaway, entries.length, winners);
        const components = this.buildGiveawayButtons({ ...giveaway, status: 'ended' });
        await msg.edit({ embeds, components });
      }
    } catch (err) {
      logger.warn(`Could not update ended giveaway message:`, err);
    }

    // Publish announcement
    if (winners.length > 0) {
      const winnerMentions = winners.map(w => `<@${w.userId}>`).join(', ');
      await channel.send({
        content: `🎉 **GIVEAWAY CONCLUDED!**\nCongratulations to ${winnerMentions} for winning **${giveaway.prize}**!`
      });
    } else {
      await channel.send({
        content: `🎉 **GIVEAWAY CONCLUDED!**\nNo valid entries were received for **${giveaway.prize}**.`
      });
    }

    moderationRepository.logAudit(
      'GIVEAWAY_ENDED',
      giveaway.host_id,
      giveaway.host_name,
      giveawayId,
      { winners: winners.map(w => w.userId) }
    );

    return { success: true, winners };
  }
};
