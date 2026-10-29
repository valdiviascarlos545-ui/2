/**
 * Madrazo Cartel Bot - Central Branding Service
 * Provides consistent high-fidelity embeds with top & bottom banner pairing,
 * rich field structures, and dark crimson/gold cartel aesthetics.
 */
import { EmbedBuilder } from 'discord.js';
import { branding } from '../../../config/branding.js';

function isValidUrl(str) {
  if (!str || typeof str !== 'string') return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const brandingService = {
  /**
   * Create standard Madrazo Cartel embed with optional top banner
   */
  createBaseEmbed({
    title,
    description,
    color = branding.primaryColor,
    fields = [],
    topBanner = null,
    thumbnail = branding.logoThumbnail,
    footer = branding.footerText,
    footerIcon = branding.footerIcon,
    timestamp = true,
    author = null
  } = {}) {
    const embed = new EmbedBuilder().setColor(color);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (thumbnail && isValidUrl(thumbnail)) embed.setThumbnail(thumbnail);
    if (topBanner && isValidUrl(topBanner)) embed.setImage(topBanner);
    if (author) embed.setAuthor(author);
    if (footer) {
      const footerObj = { text: footer };
      if (footerIcon && isValidUrl(footerIcon)) {
        footerObj.iconURL = footerIcon;
      }
      embed.setFooter(footerObj);
    }
    if (timestamp) embed.setTimestamp(typeof timestamp === 'number' ? timestamp : Date.now());

    if (Array.isArray(fields) && fields.length > 0) {
      embed.addFields(fields);
    }

    return embed;
  },

  /**
   * Bottom banner helper: discord.js embeds don't have separate bottom banner image,
   * so bottom banners are attached as a companion image embed.
   */
  createBottomBannerEmbed(bannerUrl) {
    if (!bannerUrl || !isValidUrl(bannerUrl)) return null;
    return new EmbedBuilder()
      .setColor(branding.primaryColor)
      .setImage(bannerUrl);
  },

  /**
   * Bundle main embed with optional bottom banner into an embeds array
   */
  packageEmbeds(mainEmbed, bottomBannerUrl = null) {
    const embeds = [mainEmbed];
    if (bottomBannerUrl && isValidUrl(bottomBannerUrl)) {
      const bottom = this.createBottomBannerEmbed(bottomBannerUrl);
      if (bottom) embeds.push(bottom);
    }
    return embeds;
  },

  /* ==========================================================================
   * SPECIFIC TEMPLATES
   * ========================================================================== */

  /**
   * Ticket Panel Embed (for /ticket-panel)
   */
  buildTicketPanelEmbed() {
    const embed = this.createBaseEmbed({
      title: '🇲🇽 Madrazo Cartel • Support Operations',
      description: 
        'Welcome to the Madrazo Cartel automated ticketing directory.\n\n' +
        'Select the appropriate inquiry category from the dropdown menu below. ' +
        'A dedicated private channel will be provisioned immediately and assigned to the authorized response team.\n\n' +
        '**Rules & Guidelines:**\n' +
        '• Do not create duplicate tickets.\n' +
        '• Provide all relevant details and evidence upfront.\n' +
        '• Maintain cartel discipline and professional decorum.',
      color: branding.primaryColor,
      topBanner: branding.banners.ticketTop,
      fields: [
        { name: '🎫 General Support', value: 'Discord issues, server inquiries, member questions.', inline: true },
        { name: '👑 High Rank Support', value: 'Direct executive & High Command consultation.', inline: true },
        { name: '⚖️ Report a Member', value: 'Rule violations, internal affairs, conflict mediation.', inline: true },
        { name: '📜 Ban Appeal', value: 'Formal disciplinary review and blacklist appeals.', inline: true },
        { name: '📥 Recruitment Support', value: 'Cartel tryout queries and enlistment guidance.', inline: true }
      ]
    });

    return this.packageEmbeds(embed, branding.banners.ticketBottom);
  },

  /**
   * Ticket Opening Embed inside newly created ticket channel
   */
  buildTicketOpeningEmbed(ticket, category) {
    const embed = this.createBaseEmbed({
      title: `${category.emoji} ${category.label} • ${ticket.ticket_id}`,
      description: 
        `**Welcome <@${ticket.opener_id}> to Madrazo Cartel Support.**\n\n` +
        `${category.welcomeMessage}\n\n` +
        `> **Ticket ID:** \`${ticket.ticket_id}\`\n` +
        `> **Category:** ${category.label}\n` +
        `> **Status:** \`Open (Unclaimed)\`\n` +
        `> **Opened By:** <@${ticket.opener_id}>\n` +
        `> **Assigned Handler:** *Unclaimed — Awaiting Staff Claim*`,
      color: branding.primaryColor,
      topBanner: branding.banners.ticketTop,
      fields: [
        {
          name: '⚙️ Ticket Controls',
          value: 'Staff may claim this ticket below. The opener or staff can close or request transcripts anytime.',
          inline: false
        }
      ]
    });

    return this.packageEmbeds(embed, branding.banners.ticketBottom);
  },

  /**
   * Claim Announcement Embed inside ticket
   * Format requested in Section 1:
   * "D-89 • Ghost_rider45633 Claimed this ticket"
   */
  buildTicketClaimEmbed(ticket, handlerDisplayName, handlerId) {
    const embed = this.createBaseEmbed({
      title: `🛄 ${ticket.ticket_id} • ${handlerDisplayName} Claimed this ticket`,
      description: 
        `<@${handlerId}> (${handlerDisplayName}) has now claimed this ticket and will be the one assisting you today.\n\n` +
        `All subsequent inquiries in this channel are under their direct supervision.`,
      color: branding.goldColor,
      topBanner: branding.banners.ticketTop,
      fields: [
        { name: 'Assigned Handler', value: `<@${handlerId}>`, inline: true },
        { name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      ]
    });

    return this.packageEmbeds(embed, branding.banners.ticketBottom);
  },

  /**
   * Unclaim Announcement Embed inside ticket
   */
  buildTicketUnclaimEmbed(ticket, handlerDisplayName, handlerId) {
    const embed = this.createBaseEmbed({
      title: `🔓 ${ticket.ticket_id} • Ticket Released`,
      description: 
        `🔓 **${ticket.ticket_id} • ${handlerDisplayName}** has released this ticket.\n\n` +
        `It is now available for another staff member to claim.`,
      color: branding.warningColor,
      topBanner: branding.banners.ticketTop,
      fields: [
        { name: 'Previous Handler', value: `<@${handlerId}>`, inline: true },
        { name: 'Status', value: '`Open (Unclaimed)`', inline: true }
      ]
    });

    return this.packageEmbeds(embed, branding.banners.ticketBottom);
  },

  /**
   * Reassignment Announcement Embed
   */
  buildTicketReassignEmbed(ticket, newHandlerId, newHandlerName, actorName) {
    const embed = this.createBaseEmbed({
      title: `🔄 ${ticket.ticket_id} • Ticket Reassigned`,
      description: 
        `This ticket has been transferred by **${actorName}** to <@${newHandlerId}> (${newHandlerName}).\n\n` +
        `<@${newHandlerId}> is now your active handler.`,
      color: branding.primaryColor,
      fields: [
        { name: 'New Handler', value: `<@${newHandlerId}>`, inline: true },
        { name: 'Transferred By', value: actorName, inline: true }
      ]
    });

    return this.packageEmbeds(embed, branding.banners.ticketBottom);
  },

  /**
   * Ticket Closure Embed for DM & Audit Logs
   */
  buildTicketCloseEmbed(ticket, durationStr, messageCount) {
    const embed = this.createBaseEmbed({
      title: `🔒 Ticket #${ticket.ticket_number} — ${ticket.ticket_type.toUpperCase()} Closed`,
      description: 
        `Your ${ticket.ticket_type} ticket has been closed.\n\n` +
        `> **Handled By:** ${ticket.handler_id ? `<@${ticket.handler_id}>` : '*Unassigned*'}\n` +
        `> **Closed By:** <@${ticket.closed_by_id}>\n` +
        `> **Opened:** <t:${Math.floor(ticket.created_at / 1000)}:F>\n` +
        `> **Closed:** <t:${Math.floor((ticket.closed_at || Date.now()) / 1000)}:F>\n` +
        `> **Duration:** ${durationStr}\n` +
        `> **Messages Sent:** ${messageCount} messages\n` +
        `> **Reason:** ${ticket.close_reason || 'Resolved'}`,
      color: branding.darkColor,
      topBanner: branding.banners.ticketTop
    });

    return this.packageEmbeds(embed, branding.banners.ticketBottom);
  },

  /**
   * Application Panel Embed (/application-panel)
   */
  buildApplicationPanelEmbed() {
    const embed = this.createBaseEmbed({
      title: '📋 Madrazo Cartel • Enlistment & Recruitment',
      description: 
        '**Official Recruitment Office of the Madrazo Cartel (Roblox ER:LC & FiveM)**\n\n' +
        'We seek disciplined, skilled roleplayers committed to cartel operations, tactical dominance, and unwavering loyalty.\n\n' +
        '**Prerequisites:**\n' +
        '• Must be in good standing within the community.\n' +
        '• Adherence to ER:LC server rules and cartel gunplay regulations.\n' +
        '• Character backstory & distinct RP identity.\n' +
        '• Reliable weekly activity.\n\n' +
        'Click **Apply Now** below to begin your enlistment application.',
      color: branding.primaryColor,
      topBanner: branding.banners.applicationTop
    });

    return this.packageEmbeds(embed, branding.banners.applicationBottom);
  },

  /**
   * Application Review Notification Embed (Sent to Reviewer Channel with ping!)
   */
  buildApplicationReviewEmbed(app) {
    const answers = app.answers || {};
    const embed = this.createBaseEmbed({
      title: `📥 New Application Received • ${app.application_id}`,
      description: 
        `**Applicant:** <@${app.user_id}> (${app.username})\n` +
        `**Application ID:** \`${app.application_id}\`\n` +
        `**Status:** \`Pending Review\`\n\n` +
        `A new application has been completed and is ready for the recruitment team to review.`,
      color: branding.goldColor,
      topBanner: branding.banners.applicationTop,
      fields: [
        { name: 'Roblox Username', value: answers.roblox_username || 'N/A', inline: true },
        { name: 'Character Age', value: answers.char_age || 'N/A', inline: true },
        { name: 'Timezone', value: answers.timezone || 'N/A', inline: true },
        { name: 'Roleplay Experience', value: (answers.rp_experience || 'None provided').substring(0, 1024), inline: false },
        { name: 'Reason for Joining', value: (answers.reason_joining || 'None provided').substring(0, 1024), inline: false },
        { name: 'Weekly Availability', value: answers.activity_hours || 'N/A', inline: true },
        { name: 'Rules Agreed', value: answers.rules_agreement || 'Yes', inline: true }
      ]
    });

    return this.packageEmbeds(embed, branding.banners.applicationBottom);
  },

  /**
   * Application Decision Embed (Approved / Denied)
   */
  buildApplicationDecisionEmbed(app, decision, reason, reviewerName) {
    const isApproved = decision === 'approved';
    const color = isApproved ? branding.successColor : branding.errorColor;
    const title = isApproved 
      ? `✅ Application Approved • ${app.application_id}`
      : `❌ Application Denied • ${app.application_id}`;

    const embed = this.createBaseEmbed({
      title,
      description: 
        `**Applicant:** <@${app.user_id}>\n` +
        `**Decision:** \`${decision.toUpperCase()}\`\n` +
        `**Reviewed By:** ${reviewerName}\n` +
        `**Date:** <t:${Math.floor(Date.now() / 1000)}:f>\n\n` +
        `> **Reason / Instructions:**\n${reason || (isApproved ? 'Welcome to the Madrazo Cartel.' : 'Application did not meet requirements.')}`,
      color,
      topBanner: branding.banners.applicationTop
    });

    return this.packageEmbeds(embed, branding.banners.applicationBottom);
  },

  /**
   * Server Information Embed (/server-info and /server-info-panel)
   */
  buildServerInfoEmbed(guildData) {
    const embed = this.createBaseEmbed({
      title: '🏙️ Madrazo Cartel • Server Information',
      description: 
        `**Official Hub of the Madrazo Cartel Roleplay Community**\n\n` +
        `> **Total Members:** \`${guildData.totalMembers}\`\n` +
        `> **Online Members:** \`${guildData.onlineMembers}\`\n` +
        `> **Server Boosts:** \`${guildData.boostCount}\` (Level ${guildData.boostTier})\n` +
        `> **Server Owner:** <@${guildData.ownerId}>\n` +
        `> **Established:** <t:${Math.floor(guildData.createdTimestamp / 1000)}:D>`,
      color: branding.primaryColor,
      topBanner: branding.banners.serverInfoTop,
      fields: [
        {
          name: '📊 Channel Overview',
          value: `• **Total Channels:** \`${guildData.channelCount}\`\n• **Text Channels:** \`${guildData.textCount}\`\n• **Voice Channels:** \`${guildData.voiceCount}\``,
          inline: true
        },
        {
          name: '🛡️ Roles & Security',
          value: `• **Configured Roles:** \`${guildData.roleCount}\`\n• **Verification:** \`Melonly & Bot Sync\`\n• **Bot Operatives:** \`${guildData.botCount}\``,
          inline: true
        }
      ]
    });

    return this.packageEmbeds(embed, branding.banners.serverInfoBottom);
  },

  /**
   * Giveaway Embed
   */
  buildGiveawayEmbed(giveaway, entryCount, winners = null) {
    const hasEnded = giveaway.status === 'ended';
    const isCancelled = giveaway.status === 'cancelled';
    const color = hasEnded ? branding.darkColor : (isCancelled ? branding.errorColor : branding.primaryColor);

    let statusLine = `Ends: <t:${Math.floor(giveaway.end_timestamp / 1000)}:R> (<t:${Math.floor(giveaway.end_timestamp / 1000)}:f>)`;
    if (hasEnded) {
      statusLine = `Ended: <t:${Math.floor(giveaway.end_timestamp / 1000)}:R>`;
    } else if (isCancelled) {
      statusLine = '`CANCELLED BY HOST`';
    }

    const embed = this.createBaseEmbed({
      title: '🎉 Madrazo Cartel • Community Giveaway',
      description: 
        `**Prize:** \`${giveaway.prize}\`\n` +
        `**Hosted By:** <@${giveaway.host_id}>\n` +
        `**Winners:** \`${giveaway.winner_count}\`\n` +
        `**Entries:** \`${entryCount}\`\n` +
        `**Status:** ${statusLine}\n\n` +
        (giveaway.required_role_id ? `*Required Role:* <@&${giveaway.required_role_id}>\n\n` : '') +
        (hasEnded 
          ? (winners && winners.length > 0 
              ? `🏆 **Winner(s):** ${winners.map(w => `<@${w.user_id}>`).join(', ')}`
              : '🏆 **Winner(s):** *No valid entries were received.*')
          : 'Click **🎉 Enter Giveaway** to secure your ticket!'),
      color,
      topBanner: branding.banners.giveawayTop
    });

    return this.packageEmbeds(embed, branding.banners.giveawayBottom);
  }
};
