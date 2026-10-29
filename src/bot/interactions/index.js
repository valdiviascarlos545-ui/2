import { ticketService } from '../services/ticketService.js';
import { applicationService } from '../services/applicationService.js';
import { giveawayService } from '../services/giveawayService.js';
import { helpService } from '../services/helpService.js';
import { commands } from '../commands/index.js';
import { logger } from '../utils/logger.js';

export async function handleInteraction(interaction) {
  try {
    // 1. Button Interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId.startsWith('ticket_claim_')) {
        const channelId = customId.replace('ticket_claim_', '');
        return ticketService.handleClaim(interaction, channelId);
      }

      if (customId.startsWith('ticket_unclaim_')) {
        const channelId = customId.replace('ticket_unclaim_', '');
        return ticketService.handleUnclaim(interaction, channelId);
      }

      if (customId.startsWith('ticket_close_')) {
        const channelId = customId.replace('ticket_close_', '');
        await interaction.reply({ content: '🔒 Closing ticket...', ephemeral: false });
        setTimeout(() => interaction.channel?.delete().catch(() => {}), 2000);
        return;
      }

      if (customId.startsWith('ticket_reassign_')) {
        return interaction.reply({
          content: '🔄 To reassign, use `/ticket-add` or mention the replacement officer in this channel.',
          ephemeral: true
        });
      }

      if (customId === 'app_start_flow') {
        return applicationService.startApplicationModal(interaction);
      }

      if (customId.startsWith('app_approve_')) {
        const appId = customId.replace('app_approve_', '');
        return applicationService.handleApprove(interaction, appId);
      }

      if (customId.startsWith('app_deny_')) {
        const appId = customId.replace('app_deny_', '');
        return applicationService.showDenyModal(interaction, appId);
      }

      if (customId.startsWith('app_request_info_')) {
        const appId = customId.replace('app_request_info_', '');
        return applicationService.showRequestInfoModal(interaction, appId);
      }

      if (customId.startsWith('giveaway_enter_')) {
        const gwId = customId.replace('giveaway_enter_', '');
        return giveawayService.handleEnter(interaction, gwId);
      }

      if (customId.startsWith('giveaway_leave_')) {
        const gwId = customId.replace('giveaway_leave_', '');
        return giveawayService.handleLeave(interaction, gwId);
      }
    }

    // 2. Select Menu Interactions
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_select_category') {
        return ticketService.handleTicketSelect(interaction);
      }

      if (interaction.customId === 'help_select_category') {
        const selectedCat = interaction.values[0];
        const embeds = helpService.buildCategoryEmbed(selectedCat, commands);
        const components = [helpService.buildCategorySelectMenu(selectedCat)];
        return interaction.update({ embeds, components });
      }
    }

    // 3. Modal Submissions
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId.startsWith('app_modal_part1_')) {
        const appId = customId.replace('app_modal_part1_', '');
        return applicationService.handleModalSubmission(interaction, appId);
      }

      if (customId.startsWith('app_deny_modal_')) {
        const appId = customId.replace('app_deny_modal_', '');
        return applicationService.handleDenySubmission(interaction, appId);
      }

      if (customId.startsWith('app_reqinfo_modal_')) {
        const appId = customId.replace('app_reqinfo_modal_', '');
        return applicationService.handleRequestInfoSubmission(interaction, appId);
      }
    }
  } catch (err) {
    logger.error('Unhandled interaction routing error:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'An unexpected internal error occurred.', ephemeral: true }).catch(() => {});
    }
  }
}
