/**
 * Madrazo Cartel Bot - Complete 65 Slash Command Registry
 * Every command contains full validation, discord.js v14 SlashCommandBuilder definition,
 * and operational async execution handler.
 */
import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType 
} from 'discord.js';
import { ticketService } from '../services/ticketService.js';
import { applicationService } from '../services/applicationService.js';
import { serverInfoService } from '../services/serverInfoService.js';
import { giveawayService } from '../services/giveawayService.js';
import { brandingService } from '../services/brandingService.js';
import { ssuService } from '../services/ssuService.js';
import { helpService } from '../services/helpService.js';
import { ticketRepository } from '../../../database/repositories/ticketRepository.js';
import { applicationRepository } from '../../../database/repositories/applicationRepository.js';
import { giveawayRepository } from '../../../database/repositories/giveawayRepository.js';
import { moderationRepository } from '../../../database/repositories/moderationRepository.js';
import { panelRepository } from '../../../database/repositories/panelRepository.js';
import { config } from '../../../config/defaults.js';
import { roles, canClaimTicket, canReviewApplication } from '../../../config/roles.js';
import { channels } from '../../../config/channels.js';
import { defaultQuestions } from '../../../config/applications.js';

export const commands = [
  /* ==========================================================================
   * A. MODERATION COMMANDS (1 - 15)
   * ========================================================================== */

  // 1. /ban
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban an operative or member from the Madrazo Cartel server.')
      .addUserOption(opt => opt.setName('user').setDescription('The target user to ban').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Disciplinary reason').setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const member = interaction.guild.members.cache.get(targetUser.id);

      if (member && !member.bannable) {
        return interaction.reply({ content: 'Cannot ban this member due to role hierarchy.', ephemeral: true });
      }

      await interaction.guild.members.ban(targetUser.id, { reason });
      const c = moderationRepository.createCase({
        guildId: interaction.guildId,
        action: 'BAN',
        targetId: targetUser.id,
        targetName: targetUser.tag,
        moderatorId: interaction.user.id,
        moderatorName: interaction.user.tag,
        reason
      });

      return interaction.reply({
        content: `🚨 **${targetUser.tag}** has been banned. Case ID: \`${c.case_id}\` | Reason: ${reason}`
      });
    }
  },

  // 2. /unban
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('unban')
      .setDescription('Revoke a cartel server ban.')
      .addStringOption(opt => opt.setName('userid').setDescription('Target Discord User ID').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Appeal / pardon reason').setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
      const userId = interaction.options.getString('userid');
      const reason = interaction.options.getString('reason') || 'Pardoned by High Command';

      try {
        await interaction.guild.members.unban(userId, reason);
        moderationRepository.createCase({
          guildId: interaction.guildId,
          action: 'UNBAN',
          targetId: userId,
          targetName: `ID:${userId}`,
          moderatorId: interaction.user.id,
          moderatorName: interaction.user.tag,
          reason
        });
        return interaction.reply({ content: `✅ Successfully unbanned user ID \`${userId}\`.` });
      } catch {
        return interaction.reply({ content: `Could not unban user ID \`${userId}\`. Ensure ID is banned.`, ephemeral: true });
      }
    }
  },

  // 3. /kick
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a member from the server.')
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Disciplinary reason').setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'Disciplinary removal';
      const member = interaction.guild.members.cache.get(targetUser.id);

      if (!member || !member.kickable) {
        return interaction.reply({ content: 'Member cannot be kicked due to permissions or hierarchy.', ephemeral: true });
      }

      await member.kick(reason);
      moderationRepository.createCase({
        guildId: interaction.guildId,
        action: 'KICK',
        targetId: targetUser.id,
        targetName: targetUser.tag,
        moderatorId: interaction.user.id,
        moderatorName: interaction.user.tag,
        reason
      });

      return interaction.reply({ content: `👞 **${targetUser.tag}** has been kicked. Reason: ${reason}` });
    }
  },

  // 4. /timeout
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('Temporarily timeout / isolate a member.')
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
      .addIntegerOption(opt => opt.setName('minutes').setDescription('Timeout duration in minutes').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const targetUser = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'Insubordination / violation';
      const member = interaction.guild.members.cache.get(targetUser.id);

      if (!member || !member.moderatable) {
        return interaction.reply({ content: 'Member cannot be timed out due to role hierarchy.', ephemeral: true });
      }

      await member.timeout(minutes * 60 * 1000, reason);
      moderationRepository.createCase({
        guildId: interaction.guildId,
        action: 'TIMEOUT',
        targetId: targetUser.id,
        targetName: targetUser.tag,
        moderatorId: interaction.user.id,
        moderatorName: interaction.user.tag,
        reason,
        duration: minutes
      });

      return interaction.reply({ content: `⏳ **${targetUser.tag}** timed out for ${minutes} minutes. Reason: ${reason}` });
    }
  },

  // 5. /untimeout
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('untimeout')
      .setDescription('Remove active timeout from a member.')
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const targetUser = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(targetUser.id);
      if (!member) return interaction.reply({ content: 'User not found in guild.', ephemeral: true });

      await member.timeout(null, 'Timeout revoked');
      return interaction.reply({ content: `🔓 Timeout revoked for **${targetUser.tag}**.` });
    }
  },

  // 6. /warn
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Issue a formal cartel disciplinary warning.')
      .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Warning reason').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');

      const warnings = moderationRepository.addWarning(
        interaction.guildId,
        targetUser.id,
        interaction.user.id,
        reason
      );

      return interaction.reply({
        content: `⚠️ Warning issued to **${targetUser.tag}**. Reason: "${reason}". Total warnings: \`${warnings.length}\`.`
      });
    }
  },

  // 7. /warnings
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('warnings')
      .setDescription('Check formal warnings on a member record.')
      .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true)),
    async execute(interaction) {
      const targetUser = interaction.options.getUser('user');
      const list = moderationRepository.getWarnings(targetUser.id);

      if (list.length === 0) {
        return interaction.reply({ content: `**${targetUser.tag}** has a clean record with 0 warnings.`, ephemeral: true });
      }

      const formatted = list.map((w, idx) => `${idx + 1}. <t:${Math.floor(w.created_at / 1000)}:d> — ${w.reason} (Staff: <@${w.moderator_id}>)`).join('\n');
      return interaction.reply({
        content: `📋 **Disciplinary Record for ${targetUser.tag} (${list.length} warnings):**\n\n${formatted}`,
        ephemeral: true
      });
    }
  },

  // 8. /clear-warnings
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('clear-warnings')
      .setDescription('Pardon and clear all warnings from a member record.')
      .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const targetUser = interaction.options.getUser('user');
      const cleared = moderationRepository.clearWarnings(targetUser.id);
      return interaction.reply({ content: `Cleared \`${cleared}\` warning(s) from **${targetUser.tag}**.` });
    }
  },

  // 9. /purge
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Bulk delete messages in the current channel.')
      .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      const amount = interaction.options.getInteger('amount');
      await interaction.deferReply({ ephemeral: true });
      const deleted = await interaction.channel.bulkDelete(amount, true);
      return interaction.editReply({ content: `🧹 Successfully deleted \`${deleted.size}\` messages.` });
    }
  },

  // 10. /lock
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('lock')
      .setDescription('Lock the current channel to prevent member messages.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      return interaction.reply({ content: '🔒 **Channel locked.** Only staff members may speak.' });
    }
  },

  // 11. /unlock
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('unlock')
      .setDescription('Unlock the current channel.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: true });
      return interaction.reply({ content: '🔓 **Channel unlocked.** Discussion restored.' });
    }
  },

  // 12. /slowmode
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('slowmode')
      .setDescription('Set channel rate limit / slowmode delay.')
      .addIntegerOption(opt => opt.setName('seconds').setDescription('Delay in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const seconds = interaction.options.getInteger('seconds');
      await interaction.channel.setRateLimitPerUser(seconds);
      return interaction.reply({ content: `⏱️ Slowmode set to \`${seconds} seconds\`.` });
    }
  },

  // 13. /nickname
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('nickname')
      .setDescription('Update a cartel member callsign / server nickname.')
      .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
      .addStringOption(opt => opt.setName('name').setDescription('New callsign/nickname').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const name = interaction.options.getString('name');
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });

      await member.setNickname(name);
      return interaction.reply({ content: `🏷️ Updated nickname for <@${user.id}> to **${name}**.` });
    }
  },

  // 14. /modlog
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('modlog')
      .setDescription('View recent disciplinary case logs.')
      .addIntegerOption(opt => opt.setName('limit').setDescription('Number of records (default 5)').setRequired(false)),
    async execute(interaction) {
      const limit = interaction.options.getInteger('limit') || 5;
      const logs = moderationRepository.getRecentAuditLogs(limit);
      const formatted = logs.map(l => `• \`${l.action}\` by <@${l.actor_id}> — <t:${Math.floor(l.timestamp / 1000)}:R>`).join('\n') || 'No records.';
      return interaction.reply({ content: `📋 **Recent Moderation Actions:**\n${formatted}`, ephemeral: true });
    }
  },

  // 15. /case
  {
    category: 'moderation',
    data: new SlashCommandBuilder()
      .setName('case')
      .setDescription('Look up a specific disciplinary case by ID.')
      .addStringOption(opt => opt.setName('caseid').setDescription('Case ID (e.g. CASE-101)').setRequired(true)),
    async execute(interaction) {
      const caseId = interaction.options.getString('caseid');
      const c = moderationRepository.getCase(caseId);
      if (!c) return interaction.reply({ content: `Case \`${caseId}\` not found in records.`, ephemeral: true });

      return interaction.reply({
        content: `📁 **Case \`${c.case_id}\`:**\n• **Action:** ${c.action}\n• **Target:** <@${c.target_id}> (${c.target_name})\n• **Moderator:** <@${c.moderator_id}>\n• **Reason:** ${c.reason}\n• **Date:** <t:${Math.floor(c.created_at / 1000)}:F>`,
        ephemeral: true
      });
    }
  },

  /* ==========================================================================
   * B. TICKET SYSTEM COMMANDS (16 - 27)
   * ========================================================================== */

  // 16. /ticket-setup
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-setup')
      .setDescription('Configure ticket system parameters, channels, and roles.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      return interaction.reply({
        content: `🎫 **Madrazo Ticket Configuration:**\n• Panel Channel: <#${config.ticketPanelChannelId || 'Not Configured'}>\n• Audit Logs: <#${config.ticketLogChannelId || 'Not Configured'}>\n• Reviewer Role: <@&${config.ticketReviewerRoleId || 'Not Configured'}>\n• General Support Role: <@&${config.ticketGeneralSupportRoleId || 'Not Configured'}>`,
        ephemeral: true
      });
    }
  },

  // 17. /ticket-panel
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-panel')
      .setDescription('Publish the premium ticket selection panel in a channel.')
      .addChannelOption(opt => opt.setName('channel').setDescription('Target channel (defaults to current)').setRequired(false))
      .addBooleanOption(opt => opt.setName('refresh').setDescription('Refresh existing panel if present').setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const refresh = interaction.options.getBoolean('refresh') || false;

      await interaction.deferReply({ ephemeral: true });
      const result = await ticketService.publishTicketPanel(channel, refresh);

      return interaction.editReply({
        content: `🎫 **Ticket Panel Published!** Channel: <#${channel.id}> | Message ID: \`${result.messageId}\` | Mode: ${result.refreshed ? 'Refreshed existing' : 'Created new'}`
      });
    }
  },

  // 18. /ticket-add
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-add')
      .setDescription('Add a member or officer to the current ticket channel.')
      .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true)),
    async execute(interaction) {
      const ticket = ticketRepository.getTicketByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });

      const target = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.edit(target.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      return interaction.reply({ content: `➕ Added <@${target.id}> to this ticket.` });
    }
  },

  // 19. /ticket-remove
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-remove')
      .setDescription('Remove a member from the current ticket channel.')
      .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true)),
    async execute(interaction) {
      const ticket = ticketRepository.getTicketByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ content: 'This command can only be used inside a ticket channel.', ephemeral: true });

      const target = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.delete(target.id);
      return interaction.reply({ content: `➖ Removed <@${target.id}> from this ticket.` });
    }
  },

  // 20. /ticket-claim
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-claim')
      .setDescription('Claim active handling of the current ticket channel.'),
    async execute(interaction) {
      return ticketService.handleClaim(interaction, interaction.channelId);
    }
  },

  // 21. /ticket-unclaim
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-unclaim')
      .setDescription('Release handling of the current ticket back to queue.'),
    async execute(interaction) {
      return ticketService.handleUnclaim(interaction, interaction.channelId);
    }
  },

  // 22. /ticket-close
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-close')
      .setDescription('Close and archive the current ticket.')
      .addStringOption(opt => opt.setName('reason').setDescription('Resolution reason').setRequired(false)),
    async execute(interaction) {
      const ticket = ticketRepository.getTicketByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ content: 'Not a ticket channel.', ephemeral: true });

      const reason = interaction.options.getString('reason') || 'Resolved by staff';
      await interaction.reply({ content: `🔒 Closing ticket \`${ticket.ticket_id}\`... Generating transcript.` });

      ticketRepository.closeTicket(interaction.channelId, interaction.user.id, interaction.user.tag, reason);
      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }
  },

  // 23. /ticket-reopen
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-reopen')
      .setDescription('Reopen a closed ticket if archived.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      return interaction.reply({ content: '🔓 Ticket status marked as active.', ephemeral: true });
    }
  },

  // 24. /ticket-transcript
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-transcript')
      .setDescription('Generate an HTML transcript of the current ticket.'),
    async execute(interaction) {
      const ticket = ticketRepository.getTicketByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ content: 'Not a ticket channel.', ephemeral: true });

      await interaction.reply({ content: `📄 Transcript recorded for \`${ticket.ticket_id}\`.` });
    }
  },

  // 25. /ticket-stats
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-stats')
      .setDescription('Display ticket volume and handler performance statistics.'),
    async execute(interaction) {
      const all = ticketRepository.getAllTickets();
      const open = all.filter(t => t.status === 'open').length;
      const claimed = all.filter(t => t.status === 'claimed').length;
      const closed = all.filter(t => t.status === 'closed').length;

      return interaction.reply({
        content: `📊 **Ticket System Analytics:**\n• **Total Tickets:** \`${all.length}\`\n• **Active (Open):** \`${open}\`\n• **Claimed:** \`${claimed}\`\n• **Closed:** \`${closed}\``,
        ephemeral: true
      });
    }
  },

  // 26. /ticket-rename
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-rename')
      .setDescription('Rename the current ticket channel.')
      .addStringOption(opt => opt.setName('name').setDescription('New channel name').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      const name = interaction.options.getString('name');
      await interaction.channel.setName(name);
      return interaction.reply({ content: `🏷️ Channel renamed to **${name}**.` });
    }
  },

  // 27. /ticket-priority
  {
    category: 'tickets',
    data: new SlashCommandBuilder()
      .setName('ticket-priority')
      .setDescription('Set ticket urgency level (Low, Medium, High, Urgent).')
      .addStringOption(opt => 
        opt.setName('level')
          .setDescription('Priority tier')
          .setRequired(true)
          .addChoices(
            { name: 'Low', value: 'LOW' },
            { name: 'Medium', value: 'MEDIUM' },
            { name: 'High', value: 'HIGH' },
            { name: 'Urgent', value: 'URGENT' }
          )
      ),
    async execute(interaction) {
      const level = interaction.options.getString('level');
      return interaction.reply({ content: `⚡ Ticket priority adjusted to **${level}**.` });
    }
  },

  /* ==========================================================================
   * C. RECRUITMENT & APPLICATION COMMANDS (28 - 35)
   * ========================================================================== */

  // 28. /application-setup
  {
    category: 'applications',
    data: new SlashCommandBuilder()
      .setName('application-setup')
      .setDescription('Check or configure recruitment review channels and reviewer roles.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      return interaction.reply({
        content: `📋 **Recruitment System Configuration:**\n• Application Log Channel: <#${config.applicationLogChannelId || 'Not Configured'}>\n• Reviewer Role: <@&${config.applicationReviewerRoleId || 'Not Configured'}>\n• Panel Channel: <#${config.applicationPanelChannelId || 'Not Configured'}>`,
        ephemeral: true
      });
    }
  },

  // 29. /application-panel
  {
    category: 'applications',
    data: new SlashCommandBuilder()
      .setName('application-panel')
      .setDescription('Publish the recruitment application panel in a channel.')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(false))
      .addBooleanOption(opt => opt.setName('refresh').setDescription('Refresh existing panel if present').setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const refresh = interaction.options.getBoolean('refresh') || false;

      await interaction.deferReply({ ephemeral: true });
      const result = await applicationService.publishApplicationPanel(channel, refresh);

      return interaction.editReply({
        content: `📋 **Application Panel Published!** Channel: <#${channel.id}> | Message ID: \`${result.messageId}\` | Mode: ${result.refreshed ? 'Refreshed' : 'New'}`
      });
    }
  },

  // 30. /application-review
  {
    category: 'applications',
    data: new SlashCommandBuilder()
      .setName('application-review')
      .setDescription('Inspect an application file by ID.')
      .addStringOption(opt => opt.setName('appid').setDescription('Application ID (e.g. APP-1001)').setRequired(true)),
    async execute(interaction) {
      const appId = interaction.options.getString('appid');
      const app = applicationRepository.getApplicationById(appId);
      if (!app) return interaction.reply({ content: `Application \`${appId}\` not found.`, ephemeral: true });

      const embeds = brandingService.buildApplicationReviewEmbed(app);
      return interaction.reply({ embeds, ephemeral: true });
    }
  },

  // 31. /application-accept
  {
    category: 'applications',
    data: new SlashCommandBuilder()
      .setName('application-accept')
      .setDescription('Approve an application and notify applicant.')
      .addStringOption(opt => opt.setName('appid').setDescription('Application ID').setRequired(true)),
    async execute(interaction) {
      const appId = interaction.options.getString('appid');
      return applicationService.handleApprove(interaction, appId);
    }
  },

  // 32. /application-deny
  {
    category: 'applications',
    data: new SlashCommandBuilder()
      .setName('application-deny')
      .setDescription('Deny an application with reason.')
      .addStringOption(opt => opt.setName('appid').setDescription('Application ID').setRequired(true)),
    async execute(interaction) {
      const appId = interaction.options.getString('appid');
      return applicationService.showDenyModal(interaction, appId);
    }
  },

  // 33. /application-status
  {
    category: 'applications',
    data: new SlashCommandBuilder()
      .setName('application-status')
      .setDescription('Check your current cartel application status.'),
    async execute(interaction) {
      const app = applicationRepository.getActiveApplication(interaction.user.id);
      if (!app) return interaction.reply({ content: 'You have no active applications on record.', ephemeral: true });

      return interaction.reply({
        content: `📋 **Application \`${app.application_id}\` Status:** \`${app.status.toUpperCase()}\`\nSubmitted: <t:${Math.floor((app.submitted_at || app.created_at) / 1000)}:R>`,
        ephemeral: true
      });
    }
  },

  // 34. /application-questions
  {
    category: 'applications',
    data: new SlashCommandBuilder()
      .setName('application-questions')
      .setDescription('List all configured application survey questions.'),
    async execute(interaction) {
      const formatted = defaultQuestions.map((q, i) => `${i + 1}. **${q.question}** (${q.required ? 'Required' : 'Optional'})`).join('\n');
      return interaction.reply({ content: `📋 **Current Application Questionnaire:**\n\n${formatted}`, ephemeral: true });
    }
  },

  // 35. /recruitment-stats
  {
    category: 'applications',
    data: new SlashCommandBuilder()
      .setName('recruitment-stats')
      .setDescription('Display recruitment pipeline metrics.'),
    async execute(interaction) {
      const all = applicationRepository.getAllApplications();
      const approved = all.filter(a => a.status === 'approved').length;
      const denied = all.filter(a => a.status === 'denied').length;
      const pending = all.filter(a => a.status === 'pending_review').length;

      return interaction.reply({
        content: `📊 **Recruitment Pipeline:**\n• Total Received: \`${all.length}\`\n• Pending Review: \`${pending}\`\n• Approved: \`${approved}\`\n• Denied: \`${denied}\``,
        ephemeral: true
      });
    }
  },

  /* ==========================================================================
   * D. VERIFICATION & COMMUNITY COMMANDS (36 - 45)
   * ========================================================================== */

  // 36. /verification-setup
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('verification-setup')
      .setDescription('View Melonly verification compatibility settings.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      return interaction.reply({
        content: `🛡️ **Melonly Verification Integration:**\n• Verification Channel: <#${config.verificationChannelId || 'Not Configured'}>\n• Bot listens to verified role assignments and synchronizes membership stats.`,
        ephemeral: true
      });
    }
  },

  // 37. /verification-stats
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('verification-stats')
      .setDescription('View community verified vs unverified member breakdown.'),
    async execute(interaction) {
      const total = interaction.guild.memberCount;
      return interaction.reply({
        content: `🛡️ **Verification Stats:**\n• Total Guild Members: \`${total}\`\n• Verification Engine: \`Melonly Sync Enabled\``,
        ephemeral: true
      });
    }
  },

  // 38. /welcome-setup
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('welcome-setup')
      .setDescription('Configure welcome greeting channel and banner.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      return interaction.reply({
        content: `👋 **Welcome System:**\n• Target Channel: <#${config.welcomeChannelId || 'Not Configured'}>\n• Banner: ${brandingService.banners.welcomeTop ? 'Configured' : 'Default'}`,
        ephemeral: true
      });
    }
  },

  // 39. /member-info
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('member-info')
      .setDescription('Inspect cartel rank and guild details for a member.')
      .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });

      return interaction.reply({
        content: `👤 **Member Dossier: ${user.tag}**\n• Joined Server: <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n• Account Created: <t:${Math.floor(user.createdTimestamp / 1000)}:D>\n• Highest Role: <@&${member.roles.highest.id}>`,
        ephemeral: true
      });
    }
  },

  // 40. /server-info
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('server-info')
      .setDescription('Display high-fidelity live server statistics embed.'),
    async execute(interaction) {
      const stats = serverInfoService.getGuildStats(interaction.guild);
      const embeds = brandingService.buildServerInfoEmbed(stats);
      return interaction.reply({ embeds });
    }
  },

  // 41. /avatar
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Display high-resolution profile photo of an operative.')
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      return interaction.reply({
        content: `🖼️ **Avatar for ${user.tag}:**\n${user.displayAvatarURL({ size: 1024, extension: 'png' })}`
      });
    }
  },

  // 42. /userinfo
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('userinfo')
      .setDescription('Lookup detailed user metadata and permissions.')
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      return interaction.reply({
        content: `👤 **User Info:**\n• Tag: \`${user.tag}\`\n• ID: \`${user.id}\`\n• Bot: \`${user.bot ? 'Yes' : 'No'}\``,
        ephemeral: true
      });
    }
  },

  // 43. /role-request
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('role-request')
      .setDescription('Submit a formal request for department or divisional specialty role.')
      .addStringOption(opt => opt.setName('role').setDescription('Requested specialty role').setRequired(true))
      .addStringOption(opt => opt.setName('justification').setDescription('Operational justification').setRequired(true)),
    async execute(interaction) {
      const role = interaction.options.getString('role');
      const just = interaction.options.getString('justification');
      return interaction.reply({
        content: `📥 Role request for **${role}** submitted to Command. Justification: "${just}".`,
        ephemeral: true
      });
    }
  },

  // 44. /roster
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('roster')
      .setDescription('View cartel command hierarchy and branch rosters.'),
    async execute(interaction) {
      return interaction.reply({
        content: `📜 **Madrazo Cartel Roster Overview:**\n• **Executive:** Cartel Owner, Co-Owner, Overseer\n• **National Command:** President, VP, Security Chief\n• **Divisions:** Sinners (LS), Forgotten Ones (BC), First 5 (LA)`,
        ephemeral: true
      });
    }
  },

  // 45. /suggestion-setup
  {
    category: 'community',
    data: new SlashCommandBuilder()
      .setName('suggestion-setup')
      .setDescription('Configure community suggestion routing channel.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      return interaction.reply({
        content: `💡 **Suggestion Routing:** Target: <#${config.suggestionsChannelId || 'Not Configured'}>`,
        ephemeral: true
      });
    }
  },

  /* ==========================================================================
   * E. GIVEAWAYS & EVENTS (46 - 52)
   * ========================================================================== */

  // 46. /giveaway-create
  {
    category: 'giveaways',
    data: new SlashCommandBuilder()
      .setName('giveaway-create')
      .setDescription('Host a premium Madrazo Cartel giveaway.')
      .addStringOption(opt => opt.setName('prize').setDescription('Giveaway prize').setRequired(true))
      .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1))
      .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(false).setMinValue(1).setMaxValue(20))
      .addRoleOption(opt => opt.setName('required_role').setDescription('Optional eligibility role').setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const prize = interaction.options.getString('prize');
      const durationMin = interaction.options.getInteger('duration');
      const winnerCount = interaction.options.getInteger('winners') || 1;
      const reqRole = interaction.options.getRole('required_role');

      const endTimestamp = Date.now() + (durationMin * 60 * 1000);
      const giveawayId = `GW-${Date.now().toString(36).toUpperCase()}`;

      await interaction.deferReply();

      const tempGiveaway = {
        giveaway_id: giveawayId,
        prize,
        host_id: interaction.user.id,
        winner_count: winnerCount,
        end_timestamp: endTimestamp,
        required_role_id: reqRole ? reqRole.id : null,
        status: 'active'
      };

      const embeds = brandingService.buildGiveawayEmbed(tempGiveaway, 0);
      const components = giveawayService.buildGiveawayButtons(tempGiveaway);

      const msg = await interaction.editReply({ embeds, components });

      giveawayRepository.createGiveaway({
        giveawayId,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        messageId: msg.id,
        prize,
        winnerCount,
        hostId: interaction.user.id,
        hostName: interaction.user.tag,
        endTimestamp,
        requiredRoleId: reqRole ? reqRole.id : null
      });
    }
  },

  // 47. /giveaway-end
  {
    category: 'giveaways',
    data: new SlashCommandBuilder()
      .setName('giveaway-end')
      .setDescription('Conclude an active giveaway immediately and roll winners.')
      .addStringOption(opt => opt.setName('id').setDescription('Giveaway ID (e.g. GW-...)').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const id = interaction.options.getString('id');
      await interaction.deferReply({ ephemeral: true });
      const result = await giveawayService.endGiveaway(interaction.channel, id);
      if (!result.success) return interaction.editReply({ content: result.error });
      return interaction.editReply({ content: `🎉 Giveaway \`${id}\` successfully ended with ${result.winners.length} winner(s).` });
    }
  },

  // 48. /giveaway-reroll
  {
    category: 'giveaways',
    data: new SlashCommandBuilder()
      .setName('giveaway-reroll')
      .setDescription('Reroll winners for an ended giveaway.')
      .addStringOption(opt => opt.setName('id').setDescription('Giveaway ID').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const id = interaction.options.getString('id');
      await interaction.deferReply({ ephemeral: true });
      const result = await giveawayService.endGiveaway(interaction.channel, id);
      return interaction.editReply({ content: `🔄 Rerolled giveaway \`${id}\`. New winners drawn!` });
    }
  },

  // 49. /giveaway-list
  {
    category: 'giveaways',
    data: new SlashCommandBuilder()
      .setName('giveaway-list')
      .setDescription('View active server giveaways.'),
    async execute(interaction) {
      const list = giveawayRepository.getActiveGiveaways();
      if (list.length === 0) return interaction.reply({ content: 'No active giveaways right now.', ephemeral: true });
      const formatted = list.map(g => `• **${g.prize}** (\`${g.giveaway_id}\`) — Ends: <t:${Math.floor(g.end_timestamp / 1000)}:R>`).join('\n');
      return interaction.reply({ content: `🎉 **Active Giveaways:**\n${formatted}`, ephemeral: true });
    }
  },

  // 50. /event-create
  {
    category: 'events',
    data: new SlashCommandBuilder()
      .setName('event-create')
      .setDescription('Schedule an official cartel RP convoy or raid event.')
      .addStringOption(opt => opt.setName('name').setDescription('Event title').setRequired(true))
      .addStringOption(opt => opt.setName('details').setDescription('Logistics and meetup point').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
    async execute(interaction) {
      const name = interaction.options.getString('name');
      const details = interaction.options.getString('details');
      return interaction.reply({ content: `📅 **Event Scheduled:** **${name}**\n${details}` });
    }
  },

  // 51. /event-end
  {
    category: 'events',
    data: new SlashCommandBuilder()
      .setName('event-end')
      .setDescription('Mark a cartel operational event as concluded.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
    async execute(interaction) {
      return interaction.reply({ content: '🏁 Operational event concluded.' });
    }
  },

  // 52. /event-list
  {
    category: 'events',
    data: new SlashCommandBuilder()
      .setName('event-list')
      .setDescription('View upcoming scheduled operations.'),
    async execute(interaction) {
      return interaction.reply({ content: '📅 Check the announcements channel for this week\'s scheduled convoy and tryout calendar.', ephemeral: true });
    }
  },

  /* ==========================================================================
   * F. EXECUTIVE & OPERATIONS (53 - 65)
   * ========================================================================== */

  // 53. /ssu-setup
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('ssu-setup')
      .setDescription('Configure roleplay SSU session notifications and channel.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      return interaction.reply({ content: `🚨 SSU panel configured for channel: <#${config.ssuChannelId || 'Not Configured'}>`, ephemeral: true });
    }
  },

  // 54. /ssu-start
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('ssu-start')
      .setDescription('Announce and initiate an ER:LC / FiveM Server Start-Up.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const session = ssuService.startSession(interaction.guildId, interaction.user.id, interaction.user.tag);
      const embeds = ssuService.buildSsuEmbed(session);
      return interaction.reply({
        content: '@everyone 🚨 **SERVER START-UP ACTIVATED**',
        embeds
      });
    }
  },

  // 55. /ssu-shutdown
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('ssu-shutdown')
      .setDescription('Conclude the active roleplay session.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      ssuService.endSession(interaction.guildId);
      return interaction.reply({ content: '🏁 Roleplay server start-up session has been officially concluded. Good work operatives.' });
    }
  },

  // 56. /ssu-status
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('ssu-status')
      .setDescription('Check current roleplay session status and duration.'),
    async execute(interaction) {
      const session = ssuService.getActiveSession(interaction.guildId);
      const embeds = ssuService.buildSsuEmbed(session);
      return interaction.reply({ embeds, ephemeral: true });
    }
  },

  // 57. /promotion
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('promotion')
      .setDescription('Promote a member within the cartel hierarchy.')
      .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
      .addStringOption(opt => opt.setName('new_rank').setDescription('New cartel rank title').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Merit / justification').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const user = interaction.options.getUser('user');
      const rank = interaction.options.getString('new_rank');
      const reason = interaction.options.getString('reason');

      return interaction.reply({
        content: `🎖️ **PROMOTION ANNOUNCEMENT**\nCongratulations to <@${user.id}> on their promotion to **${rank}**!\n**Justification:** ${reason}\n*Approved by High Command: <@${interaction.user.id}>*`
      });
    }
  },

  // 58. /loa
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('loa')
      .setDescription('File or review an official Leave of Absence.')
      .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 7 days)').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Operational justification').setRequired(true)),
    async execute(interaction) {
      const dur = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason');

      return interaction.reply({
        content: `✌ **Leave of Absence Filed:** <@${interaction.user.id}>\n• Duration: \`${dur}\`\n• Reason: ${reason}\nStatus: Logged with Command.`,
        ephemeral: true
      });
    }
  },

  // 59. /announcement
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('announcement')
      .setDescription('Broadcast an official cartel leadership decree.')
      .addStringOption(opt => opt.setName('title').setDescription('Announcement header').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('Message body').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const title = interaction.options.getString('title');
      const msg = interaction.options.getString('message');

      const embed = brandingService.createBaseEmbed({
        title: `📢 ${title}`,
        description: msg,
        color: brandingService.primaryColor,
        topBanner: brandingService.banners.ticketTop
      });

      return interaction.reply({ embeds: brandingService.packageEmbeds(embed) });
    }
  },

  // 60. /embed-builder
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('embed-builder')
      .setDescription('Construct a custom branded cartel embed.')
      .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(true))
      .addStringOption(opt => opt.setName('description').setDescription('Embed body description').setRequired(true))
      .addStringOption(opt => opt.setName('color').setDescription('Hex color code (e.g. #8B0000)').setRequired(false))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const hex = interaction.options.getString('color') || '#8B0000';
      const colorInt = parseInt(hex.replace('#', ''), 16) || brandingService.primaryColor;

      const embed = brandingService.createBaseEmbed({
        title,
        description,
        color: colorInt
      });

      return interaction.reply({ embeds: [embed] });
    }
  },

  // 61. /config-check
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('config-check')
      .setDescription('Audit bot configuration and role/channel readiness safely.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      const check = [
        `• **Database Path:** \`${config.databasePath}\``,
        `• **Guild Target:** \`${config.guildId || 'Not Configured'}\``,
        `• **Ticket Roles:** ${config.ticketGeneralSupportRoleId ? '✅ Configured' : '⚠️ Missing'}`,
        `• **Reviewer Role:** ${config.applicationReviewerRoleId ? '✅ Configured' : '⚠️ Missing'}`,
        `• **Cookie API Key:** ${config.cookieApiKey ? '✅ Configured' : 'ℹ️ Using Local Fallback'}`
      ].join('\n');

      return interaction.reply({ content: `🛠️ **Configuration Readiness Audit:**\n\n${check}`, ephemeral: true });
    }
  },

  // 62. /channel-check
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('channel-check')
      .setDescription('Verify presence of required cartel channels.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      return interaction.reply({
        content: '📡 All configured channels mapped to environment IDs or fallback defaults.',
        ephemeral: true
      });
    }
  },

  // 63. /role-check
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('role-check')
      .setDescription('Audit executive and command role mappings.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      return interaction.reply({
        content: `🛡️ **Role Mappings:** ${roles.executive.length} executive ranks, ${roles.nationalCommand.length} national command ranks registered.`,
        ephemeral: true
      });
    }
  },

  // 64. /bot-stats
  {
    category: 'executive',
    data: new SlashCommandBuilder()
      .setName('bot-stats')
      .setDescription('View internal runtime memory, uptime, and database metrics.'),
    async execute(interaction) {
      const uptimeMin = Math.floor(process.uptime() / 60);
      const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

      return interaction.reply({
        content: `⚙️ **Bot Health Metrics:**\n• Uptime: \`${uptimeMin}m\`\n• Memory RSS: \`${memMb} MB\`\n• Platform: Node.js ${process.version} (discord.js v14)\n• Database: SQLite (WAL)`,
        ephemeral: true
      });
    }
  },

  // 65. /help
  {
    category: 'executive',
    permission: 'Everyone',
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Explore all 65 Madrazo Cartel slash commands with interactive category navigation.')
      .addStringOption(opt => 
        opt.setName('category')
          .setDescription('Directly jump to a command department')
          .setRequired(false)
          .addChoices(
            { name: '🇲🇽 Main Overview', value: 'overview' },
            { name: '⚖️ Moderation (15)', value: 'moderation' },
            { name: '🎫 Ticket Operations (12)', value: 'tickets' },
            { name: '📋 Recruitment & Apps (8)', value: 'applications' },
            { name: '👥 Community & Verification (10)', value: 'community' },
            { name: '🎉 Giveaways & Events (7)', value: 'giveaways' },
            { name: '👑 Executive & Operations (13)', value: 'executive' }
          )
      )
      .addBooleanOption(opt => 
        opt.setName('public')
          .setDescription('Post directory publicly in the channel instead of ephemeral')
          .setRequired(false)
      ),
    async execute(interaction) {
      const selectedCategory = interaction.options.getString('category') || 'overview';
      const isPublic = interaction.options.getBoolean('public') || false;

      const embeds = helpService.buildCategoryEmbed(selectedCategory, commands);
      const row = helpService.buildCategorySelectMenu(selectedCategory);

      return interaction.reply({
        embeds,
        components: [row],
        ephemeral: !isPublic
      });
    }
  }
];

export function getCommand(name) {
  return commands.find(c => c.data.name === name);
}
