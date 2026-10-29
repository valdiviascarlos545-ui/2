/**
 * Madrazo Cartel Bot - Ticket Service
 * Manages ticket channels, atomic claiming, unclaiming, reassignments, closures, and persistent panels.
 */
import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  ChannelType, 
  PermissionFlagsBits 
} from 'discord.js';
import { ticketRepository } from '../../../database/repositories/ticketRepository.js';
import { panelRepository } from '../../../database/repositories/panelRepository.js';
import { moderationRepository } from '../../../database/repositories/moderationRepository.js';
import { brandingService } from './brandingService.js';
import { ticketCategories, getCategoryById } from '../../../config/tickets.js';
import { canClaimTicket } from '../../../config/roles.js';
import { config } from '../../../config/defaults.js';
import { logger } from '../utils/logger.js';

export const ticketService = {
  /**
   * Builds the 7 ticket control buttons
   */
  buildTicketControlButtons(ticket) {
    const isClaimed = Boolean(ticket.handler_id);

    // Row 1: Primary workflow actions
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_claim_${ticket.channel_id}`)
        .setLabel(isClaimed ? `Claimed by ${ticket.handler_name || 'Staff'}` : 'Claim Ticket')
        .setEmoji('🛄')
        .setStyle(isClaimed ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(isClaimed),
      new ButtonBuilder()
        .setCustomId(`ticket_unclaim_${ticket.channel_id}`)
        .setLabel('Unclaim Ticket')
        .setEmoji('🔓')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!isClaimed),
      new ButtonBuilder()
        .setCustomId(`ticket_reassign_${ticket.channel_id}`)
        .setLabel('Reassign')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticket.channel_id}`)
        .setLabel('Close')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    );

    // Row 2: Secondary member & transcript actions
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_transcript_${ticket.channel_id}`)
        .setLabel('Transcript')
        .setEmoji('📄')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket_add_member_${ticket.channel_id}`)
        .setLabel('Add Member')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket_remove_member_${ticket.channel_id}`)
        .setLabel('Remove Member')
        .setEmoji('➖')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
  },

  /**
   * Publishes or refreshes the persistent ticket selection panel
   */
  async publishTicketPanel(channel, refresh = false) {
    const existing = panelRepository.getPanel('ticket');
    const embeds = brandingService.buildTicketPanelEmbed();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select_category')
      .setPlaceholder('Select inquiry category...')
      .addOptions(
        ticketCategories.map(cat => ({
          label: cat.label,
          value: cat.id,
          description: cat.description.substring(0, 100),
          emoji: cat.emoji
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    if (refresh && existing && existing.channel_id === channel.id) {
      try {
        const msg = await channel.messages.fetch(existing.message_id);
        if (msg) {
          await msg.edit({ embeds, components: [row] });
          panelRepository.savePanel('ticket', channel.guild.id, channel.id, msg.id);
          return { success: true, messageId: msg.id, refreshed: true };
        }
      } catch (err) {
        logger.warn(`Could not fetch existing ticket panel ${existing.message_id}, creating new one.`, err);
      }
    }

    const newMsg = await channel.send({ embeds, components: [row] });
    panelRepository.savePanel('ticket', channel.guild.id, channel.id, newMsg.id);
    return { success: true, messageId: newMsg.id, refreshed: false };
  },

  /**
   * Handles user selecting a category from the panel dropdown
   */
  async handleTicketSelect(interaction) {
    const categoryId = interaction.values[0];
    const category = getCategoryById(categoryId);
    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild) {
      return interaction.reply({ content: 'This action can only be performed in a server.', ephemeral: true });
    }

    // Acknowledge promptly
    await interaction.deferReply({ ephemeral: true });

    // Check for existing open tickets in this category by this user
    const existingTickets = ticketRepository.getAllTickets('open').filter(
      t => t.opener_id === member.id && t.ticket_type === category.id
    );

    if (existingTickets.length > 0) {
      const active = existingTickets[0];
      return interaction.editReply({
        content: `You already have an active ${category.label} ticket: <#${active.channel_id}>.`
      });
    }

    // Provision private ticket channel
    const ticketNumber = ticketRepository.getNextTicketNumber();
    const ticketId = `TIC-${ticketNumber}`;
    const channelName = `${category.channelPrefix}-${ticketNumber}`;

    // Permissions: deny @everyone, allow bot, allow opener, allow support role
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles
        ]
      }
    ];

    if (category.supportRoleId) {
      permissionOverwrites.push({
        id: category.supportRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles
        ]
      });
    }

    let ticketChannel;
    try {
      ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites,
        reason: `Madrazo Cartel ticket created by ${member.user.tag}`
      });
    } catch (err) {
      logger.error('Failed to create ticket channel:', err);
      return interaction.editReply({ content: 'Failed to create ticket channel. Verify bot permissions.' });
    }

    // Insert ticket record in SQLite
    const ticketRecord = ticketRepository.createTicket({
      ticketType: category.id,
      channelId: ticketChannel.id,
      guildId: guild.id,
      openerId: member.id,
      openerName: member.user.tag
    });

    // Send ticket opening embed & buttons
    const openingEmbeds = brandingService.buildTicketOpeningEmbed(ticketRecord, category);
    const buttons = this.buildTicketControlButtons(ticketRecord);

    const pingContent = category.supportRoleId 
      ? `<@&${category.supportRoleId}> | <@${member.id}>` 
      : `<@${member.id}>`;

    await ticketChannel.send({
      content: pingContent,
      embeds: openingEmbeds,
      components: buttons
    });

    // Send ephemeral confirmation with real channel link (never fake URL)
    await interaction.editReply({
      content: `Successfully created your ticket — [Open Ticket](https://discord.com/channels/${guild.id}/${ticketChannel.id}) (<#${ticketChannel.id}>)`
    });

    moderationRepository.logAudit(
      'TICKET_CREATED',
      member.id,
      member.user.tag,
      ticketChannel.id,
      { ticketId: ticketRecord.ticket_id, category: category.id }
    );
  },

  /**
   * Handles staff claiming a ticket atomically
   */
  async handleClaim(interaction, channelId) {
    const member = interaction.member;
    const ticket = ticketRepository.getTicketByChannel(channelId);

    if (!ticket) {
      return interaction.reply({ content: 'Ticket not found in database.', ephemeral: true });
    }

    // 1. Permission check: Only configured roles, executives, or admins
    if (!canClaimTicket(member, ticket.ticket_type)) {
      return interaction.reply({
        content: 'You do not possess the required staff permissions to claim this ticket.',
        ephemeral: true
      });
    }

    // 2. Prevent ticket opener from claiming their own ticket
    if (member.id === ticket.opener_id && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'Ticket openers cannot claim their own ticket.',
        ephemeral: true
      });
    }

    // 3. Atomic conditional update to prevent double-clicks & race conditions
    const claimResult = ticketRepository.claimTicket(channelId, member.id, member.displayName || member.user.username);

    if (!claimResult.success) {
      if (claimResult.alreadyClaimed) {
        return interaction.reply({
          content: `This ticket is already claimed by <@${claimResult.currentHandlerId}>.`,
          ephemeral: true
        });
      }
      return interaction.reply({ content: claimResult.error || 'Failed to claim ticket.', ephemeral: true });
    }

    // Prompt interaction acknowledgment
    await interaction.deferReply({ ephemeral: false });

    // 4. Send claim announcement inside ticket channel
    const updatedTicket = claimResult.ticket;
    const claimEmbeds = brandingService.buildTicketClaimEmbed(
      updatedTicket,
      member.displayName || member.user.username,
      member.id
    );

    await interaction.editReply({ embeds: claimEmbeds });

    // 5. Update the main ticket message controls
    await this.updateMainTicketMessage(interaction.channel, updatedTicket);

    // 6. Log claim event
    moderationRepository.logAudit(
      'TICKET_CLAIMED',
      member.id,
      member.user.tag,
      channelId,
      { ticketId: updatedTicket.ticket_id, handler: member.id }
    );
  },

  /**
   * Handles unclaiming a ticket
   */
  async handleUnclaim(interaction, channelId) {
    const member = interaction.member;
    const ticket = ticketRepository.getTicketByChannel(channelId);

    if (!ticket) {
      return interaction.reply({ content: 'Ticket not found in database.', ephemeral: true });
    }

    if (!ticket.handler_id) {
      return interaction.reply({ content: 'This ticket has no assigned handler.', ephemeral: true });
    }

    // Only current handler or an admin can unclaim
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    if (member.id !== ticket.handler_id && !isAdmin) {
      return interaction.reply({
        content: `Only the assigned handler (<@${ticket.handler_id}>) or an Administrator can unclaim this ticket.`,
        ephemeral: true
      });
    }

    const unclaimResult = ticketRepository.unclaimTicket(channelId, member.id);
    if (!unclaimResult.success) {
      return interaction.reply({ content: unclaimResult.error, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: false });

    // Send unclaim announcement
    const unclaimEmbeds = brandingService.buildTicketUnclaimEmbed(
      unclaimResult.ticket,
      member.displayName || member.user.username,
      member.id
    );

    await interaction.editReply({ embeds: unclaimEmbeds });
    await this.updateMainTicketMessage(interaction.channel, unclaimResult.ticket);

    moderationRepository.logAudit(
      'TICKET_UNCLAIMED',
      member.id,
      member.user.tag,
      channelId,
      { ticketId: ticket.ticket_id }
    );
  },

  /**
   * Updates the channel's initial control message
   */
  async updateMainTicketMessage(channel, ticket) {
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      // Find initial bot message with buttons
      const botMsg = messages.find(m => m.author.id === channel.client.user.id && m.components.length > 0);
      if (botMsg) {
        const category = getCategoryById(ticket.ticket_type);
        const openingEmbeds = brandingService.buildTicketOpeningEmbed(ticket, category);
        const buttons = this.buildTicketControlButtons(ticket);
        await botMsg.edit({ embeds: openingEmbeds, components: buttons });
      }
    } catch (err) {
      logger.warn(`Could not update initial ticket message in ${channel.id}:`, err);
    }
  }
};
