/**
 * Madrazo Cartel Bot - Dynamic Interactive Help Service
 * Generates interactive branded embeds and select-menu navigation built directly
 * from the real runtime command registry.
 */
import { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { brandingService } from './brandingService.js';
import { branding } from '../../../config/branding.js';

export const categoryMeta = {
  overview: {
    label: 'Overview & Main Menu',
    emoji: '🇲🇽',
    desc: 'Bot directory overview and quick guide'
  },
  moderation: {
    label: 'Moderation',
    emoji: '⚖️',
    desc: 'Bans, kicks, timeouts, warnings, channel locks, and audit cases'
  },
  tickets: {
    label: 'Ticket System',
    emoji: '🎫',
    desc: 'Panels, atomic claiming, unclaiming, reassigning, transcripts, and closures'
  },
  applications: {
    label: 'Recruitment & Applications',
    emoji: '📋',
    desc: 'Questionnaire panels, idempotent reviewer pings, approvals, and denials'
  },
  community: {
    label: 'Verification & Community',
    emoji: '👥',
    desc: 'Melonly sync, member info, server info, avatars, and suggestions'
  },
  giveaways: {
    label: 'Giveaways & Events',
    emoji: '🎉',
    desc: 'Cryptographic random draws, persistent entries, rerolls, and RP convoys'
  },
  executive: {
    label: 'Executive & Operations',
    emoji: '👑',
    desc: 'SSU sessions, rank promotions, Leave of Absence, announcements, and health'
  }
};

export const helpService = {
  /**
   * Builds the category navigation select menu
   */
  buildCategorySelectMenu(currentCategory = 'overview') {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_select_category')
      .setPlaceholder('Select department / command category...')
      .addOptions(
        Object.entries(categoryMeta).map(([key, meta]) => ({
          label: meta.label,
          value: key,
          description: meta.desc.substring(0, 100),
          emoji: meta.emoji,
          default: key === currentCategory
        }))
      );

    return new ActionRowBuilder().addComponents(menu);
  },

  /**
   * Builds main overview help embed
   */
  buildOverviewEmbed(commandsList) {
    const totalCmds = commandsList.length;
    const catCounts = {};
    for (const cmd of commandsList) {
      catCounts[cmd.category] = (catCounts[cmd.category] || 0) + 1;
    }

    const embed = brandingService.createBaseEmbed({
      title: '🇲🇽 Madrazo Cartel • Command Directory',
      description: 
        `**Official Tactical Operations & Management Bot**\n` +
        `Serving Roblox ER:LC & FiveM Cartel Roleplay Communities.\n\n` +
        `> **Active Slash Commands:** \`${totalCmds}\` registered and operational\n` +
        `> **System Architecture:** Standalone Node.js Engine (SQLite WAL)\n` +
        `> **Bot Identity:** \`${branding.cartelName}\` • *${branding.motto}*\n\n` +
        `Select any department from the dropdown menu below to view full command syntax, options, and required Discord permissions.`,
      color: branding.primaryColor,
      topBanner: branding.banners.ticketTop,
      fields: [
        { name: '⚖️ Moderation', value: `\`${catCounts.moderation || 15} commands\`\nDiscipline & forensics`, inline: true },
        { name: '🎫 Ticket Operations', value: `\`${catCounts.tickets || 12} commands\`\nAtomic claiming & panels`, inline: true },
        { name: '📋 Recruitment', value: `\`${catCounts.applications || 8} commands\`\nIdempotent reviews`, inline: true },
        { name: '👥 Community', value: `\`${catCounts.community || 10} commands\`\nStats & verification`, inline: true },
        { name: '🎉 Giveaways', value: `\`${catCounts.giveaways || 7} commands\`\nCrypto-secure draws`, inline: true },
        { name: '👑 Executive & Ops', value: `\`${catCounts.executive || 13} commands\`\nSSU sessions & hierarchy`, inline: true }
      ]
    });

    return brandingService.packageEmbeds(embed);
  },

  /**
   * Builds department-specific help embed
   */
  buildCategoryEmbed(categoryId, commandsList) {
    if (categoryId === 'overview' || !categoryMeta[categoryId]) {
      return this.buildOverviewEmbed(commandsList);
    }

    const meta = categoryMeta[categoryId];
    const categoryCommands = commandsList.filter(c => c.category === categoryId);

    const fields = categoryCommands.map(cmd => {
      const options = cmd.data.options ? cmd.data.options.map(o => o.name ? `\`${o.name}\`` : '').filter(Boolean).join(' ') : '';
      const perm = cmd.permission || (cmd.data.default_member_permissions ? 'Staff / Elevated' : 'Everyone');
      return {
        name: `/${cmd.data.name} ${options}`.trim(),
        value: `${cmd.data.description}\n*Permission:* \`${perm}\``,
        inline: false
      };
    });

    const embed = brandingService.createBaseEmbed({
      title: `${meta.emoji} ${meta.label} • Command Reference (${categoryCommands.length})`,
      description: `**${meta.desc}**\n\nUse the dropdown below to switch departments or return to the main overview.`,
      color: branding.goldColor,
      fields: fields.slice(0, 25), // Respect Discord 25-field limit
      topBanner: branding.banners.ticketTop
    });

    return brandingService.packageEmbeds(embed);
  }
};
