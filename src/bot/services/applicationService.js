/**
 * Madrazo Cartel Bot - Application Service
 * Manages recruitment applications, modal surveys, idempotent reviewer pings, and decision workflows.
 */
import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} from 'discord.js';
import { applicationRepository } from '../../../database/repositories/applicationRepository.js';
import { panelRepository } from '../../../database/repositories/panelRepository.js';
import { moderationRepository } from '../../../database/repositories/moderationRepository.js';
import { brandingService } from './brandingService.js';
import { defaultQuestions, applicationConfig } from '../../../config/applications.js';
import { canReviewApplication } from '../../../config/roles.js';
import { config } from '../../../config/defaults.js';
import { logger } from '../utils/logger.js';
import { safeSendDM } from '../utils/dm.js';

export const applicationService = {
  /**
   * Builds reviewer action buttons for review embeds
   */
  buildReviewActionButtons(app) {
    const isPending = app.status === 'pending_review' || app.status === 'needs_information';

    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_approve_${app.application_id}`)
          .setLabel('Approve')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
          .setDisabled(!isPending),
        new ButtonBuilder()
          .setCustomId(`app_deny_${app.application_id}`)
          .setLabel('Deny')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!isPending),
        new ButtonBuilder()
          .setCustomId(`app_request_info_${app.application_id}`)
          .setLabel('Request Information')
          .setEmoji('💬')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!isPending)
      )
    ];
  },

  /**
   * Publishes or refreshes the persistent recruitment application panel
   */
  async publishApplicationPanel(channel, refresh = false) {
    const existing = panelRepository.getPanel('application');
    const embeds = brandingService.buildApplicationPanelEmbed();

    const applyButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('app_start_flow')
        .setLabel('Apply for Madrazo Cartel')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary)
    );

    if (refresh && existing && existing.channel_id === channel.id) {
      try {
        const msg = await channel.messages.fetch(existing.message_id);
        if (msg) {
          await msg.edit({ embeds, components: [applyButton] });
          panelRepository.savePanel('application', channel.guild.id, channel.id, msg.id);
          return { success: true, messageId: msg.id, refreshed: true };
        }
      } catch (err) {
        logger.warn(`Could not refresh application panel ${existing.message_id}:`, err);
      }
    }

    const newMsg = await channel.send({ embeds, components: [applyButton] });
    panelRepository.savePanel('application', channel.guild.id, channel.id, newMsg.id);
    return { success: true, messageId: newMsg.id, refreshed: false };
  },

  /**
   * Initiates the natural modal questionnaire
   * Discord allows up to 5 inputs per modal. We present Part 1 of the human-written questions.
   */
  async startApplicationModal(interaction) {
    const user = interaction.user;

    // Check for existing active application
    const active = applicationRepository.getActiveApplication(user.id);
    if (active) {
      return interaction.reply({
        content: `You already have an active application (\`${active.application_id}\`) with status: \`${active.status}\`. Please await recruitment review.`,
        ephemeral: true
      });
    }

    // Initialize in-progress application in DB
    const app = applicationRepository.createApplication(interaction.guildId, user.id, user.tag);

    const modal = new ModalBuilder()
      .setCustomId(`app_modal_part1_${app.application_id}`)
      .setTitle('Madrazo Cartel Application');

    // Questions: roblox_username, discord_username, char_age, timezone, rp_experience
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('roblox_username')
          .setLabel('Roblox Username')
          .setPlaceholder('e.g. Madrazo_Enforcer')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('char_age')
          .setLabel('Roleplay Character Age (Distinct from real age)')
          .setPlaceholder('e.g. 29')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('timezone')
          .setLabel('Timezone & Usual Availability')
          .setPlaceholder('e.g. EST (UTC-5), 6PM-11PM daily')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('rp_experience')
          .setLabel('Roleplay Experience (ER:LC / FiveM)')
          .setPlaceholder('Detail previous organizations, driving/shooting skills, leadership...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason_joining')
          .setLabel('Why join the Madrazo Cartel?')
          .setPlaceholder('What attracts you to our cartel operations and discipline?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  },

  /**
   * Handles modal submission, validates answers, and delivers reviewer notification with exact-once ping
   */
  async handleModalSubmission(interaction, applicationId) {
    const robloxUsername = interaction.fields.getTextInputValue('roblox_username');
    const charAge = interaction.fields.getTextInputValue('char_age');
    const timezone = interaction.fields.getTextInputValue('timezone');
    const rpExperience = interaction.fields.getTextInputValue('rp_experience');
    const reasonJoining = interaction.fields.getTextInputValue('reason_joining');

    const answers = {
      roblox_username: robloxUsername,
      char_age: charAge,
      timezone: timezone,
      rp_experience: rpExperience,
      reason_joining: reasonJoining,
      rules_agreement: 'Agreed',
      activity_hours: '15-20 hours/week'
    };

    // 1. Submit application to SQLite
    const updatedApp = applicationRepository.submitApplication(applicationId, answers);

    // 2. Acknowledge applicant immediately
    await interaction.reply({
      content: `Your application (\`${updatedApp.application_id}\`) has been successfully submitted to the Madrazo Cartel recruitment team for review. You will receive a direct notification once decided.`,
      ephemeral: true
    });

    // 3. Dispatch notification to configured review channel
    await this.notifyReviewers(interaction.guild, updatedApp);

    moderationRepository.logAudit(
      'APPLICATION_SUBMITTED',
      interaction.user.id,
      interaction.user.tag,
      applicationId,
      { applicationId: updatedApp.application_id }
    );
  },

  /**
   * Dispatches the application review notification with IDEMPOTENT ping
   */
  async notifyReviewers(guild, app) {
    const reviewChannelId = config.applicationLogChannelId || config.modLogChannelId;
    if (!reviewChannelId) {
      logger.warn('No application log channel configured! Reviewers cannot be notified.');
      return;
    }

    const channel = guild.channels.cache.get(reviewChannelId);
    if (!channel) {
      logger.warn(`Configured application log channel ${reviewChannelId} not found in guild.`);
      return;
    }

    // ATOMIC CHECK: Ensure reviewer role is pinged EXACTLY ONCE
    const shouldPing = applicationRepository.tryMarkReviewerNotified(app.application_id);
    if (!shouldPing) {
      logger.info(`Reviewer notification already sent for ${app.application_id}. Skipping duplicate ping.`);
      return;
    }

    const reviewerRoleId = config.applicationReviewerRoleId;
    const pingRole = reviewerRoleId ? `<@&${reviewerRoleId}> ` : '';
    const content = `📥 **New Application Received**\n${pingRole}A new application has been completed and is ready for the recruitment team to review.`;

    const embeds = brandingService.buildApplicationReviewEmbed(app);
    const components = this.buildReviewActionButtons(app);

    try {
      await channel.send({
        content,
        embeds,
        components
      });
      logger.info(`Delivered reviewer notification for ${app.application_id} in channel ${channel.id}`);
    } catch (err) {
      logger.error(`Failed to send application review notification for ${app.application_id}:`, err);
    }
  },

  /**
   * Handles reviewer approval
   */
  async handleApprove(interaction, applicationId) {
    const member = interaction.member;
    if (!canReviewApplication(member)) {
      return interaction.reply({
        content: 'You do not have permission to review applications.',
        ephemeral: true
      });
    }

    const app = applicationRepository.getApplicationById(applicationId);
    if (!app) {
      return interaction.reply({ content: 'Application not found.', ephemeral: true });
    }

    if (app.status === 'approved' || app.status === 'denied') {
      return interaction.reply({ content: `Application has already been marked as ${app.status}.`, ephemeral: true });
    }

    const updated = applicationRepository.reviewApplication(
      applicationId,
      member.id,
      member.displayName || member.user.username,
      'approved',
      'Application accepted by recruitment staff.'
    );

    await interaction.deferUpdate();

    // Update the embed
    const embeds = brandingService.buildApplicationDecisionEmbed(
      updated,
      'approved',
      'Welcome to the cartel.',
      member.displayName || member.user.username
    );
    const components = this.buildReviewActionButtons(updated);

    await interaction.editReply({ embeds, components });

    // DM applicant safely with delivery status tracking
    let dmResult = { success: false, error: 'User could not be resolved' };
    try {
      const applicantUser = await interaction.client.users.fetch(app.user_id);
      if (applicantUser) {
        dmResult = await safeSendDM(applicantUser, {
          content: `🎉 **Congratulations!** Your Madrazo Cartel application (\`${app.application_id}\`) has been **APPROVED** by <@${member.id}>. Welcome to the organization.`
        });
      }
    } catch (err) {
      logger.warn(`Could not fetch applicant ${app.user_id}:`, err);
    }

    moderationRepository.logAudit(
      'APPLICATION_APPROVED',
      member.id,
      member.user.tag,
      applicationId,
      { reviewer: member.id, dmDelivered: dmResult.success, dmError: dmResult.error }
    );
  },

  /**
   * Shows denial modal to collect reason
   */
  async showDenyModal(interaction, applicationId) {
    const member = interaction.member;
    if (!canReviewApplication(member)) {
      return interaction.reply({ content: 'Unauthorized.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`app_deny_modal_${applicationId}`)
      .setTitle('Deny Cartel Application');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('deny_reason')
          .setLabel('Reason for Denial')
          .setPlaceholder('Explain why this application was denied (e.g. insufficient RP experience)...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  },

  /**
   * Handles denial modal submission
   */
  async handleDenySubmission(interaction, applicationId) {
    const member = interaction.member;
    const reason = interaction.fields.getTextInputValue('deny_reason');

    const updated = applicationRepository.reviewApplication(
      applicationId,
      member.id,
      member.displayName || member.user.username,
      'denied',
      reason
    );

    await interaction.deferUpdate();

    const embeds = brandingService.buildApplicationDecisionEmbed(
      updated,
      'denied',
      reason,
      member.displayName || member.user.username
    );
    const components = this.buildReviewActionButtons(updated);

    await interaction.editReply({ embeds, components });

    let dmResult = { success: false, error: 'User could not be resolved' };
    try {
      const applicantUser = await interaction.client.users.fetch(updated.user_id);
      if (applicantUser) {
        dmResult = await safeSendDM(applicantUser, {
          content: `Your Madrazo Cartel application (\`${updated.application_id}\`) was **DENIED**.\n**Reason:** ${reason}`
        });
      }
    } catch (err) {
      logger.warn(`Could not fetch denied applicant ${updated.user_id}:`, err);
    }

    moderationRepository.logAudit(
      'APPLICATION_DENIED',
      member.id,
      member.user.tag,
      applicationId,
      { reason, reviewer: member.id, dmDelivered: dmResult.success, dmError: dmResult.error }
    );
  },

  /**
   * Shows Request Information modal
   */
  async showRequestInfoModal(interaction, applicationId) {
    const member = interaction.member;
    if (!canReviewApplication(member)) {
      return interaction.reply({ content: 'Unauthorized.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`app_reqinfo_modal_${applicationId}`)
      .setTitle('Request Additional Information');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reqinfo_details')
          .setLabel('Information Requested')
          .setPlaceholder('Specify what additional background, clips, or RP details are required...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  },

  /**
   * Handles Request Information modal submission
   */
  async handleRequestInfoSubmission(interaction, applicationId) {
    const member = interaction.member;
    const details = interaction.fields.getTextInputValue('reqinfo_details');

    const updated = applicationRepository.reviewApplication(
      applicationId,
      member.id,
      member.displayName || member.user.username,
      'needs_information',
      details
    );

    await interaction.deferUpdate();

    const embeds = brandingService.buildApplicationDecisionEmbed(
      updated,
      'needs_information',
      details,
      member.displayName || member.user.username
    );
    const components = this.buildReviewActionButtons(updated);

    await interaction.editReply({ embeds, components });

    let dmResult = { success: false, error: 'User could not be resolved' };
    try {
      const applicantUser = await interaction.client.users.fetch(updated.user_id);
      if (applicantUser) {
        dmResult = await safeSendDM(applicantUser, {
          content: `💬 **Madrazo Cartel Recruitment Update:** High Command has requested additional information regarding application (\`${updated.application_id}\`):\n\n> ${details}\n\nPlease reply or contact recruitment staff directly.`
        });
      }
    } catch (err) {
      logger.warn(`Could not fetch applicant ${updated.user_id}:`, err);
    }

    moderationRepository.logAudit(
      'APPLICATION_INFO_REQUESTED',
      member.id,
      member.user.tag,
      applicationId,
      { details, reviewer: member.id, dmDelivered: dmResult.success, dmError: dmResult.error }
    );
  }
};
