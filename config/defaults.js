/**
 * Madrazo Cartel Bot - Default Configuration
 * Central configuration loader with robust environment fallback and validation.
 */
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Bot Credentials & Environment
  token: process.env.TOKEN || '',
  clientId: process.env.CLIENT_ID || '123456789012345678',
  guildId: process.env.GUILD_ID || '123456789012345678',
  ownerIds: (process.env.OWNER_IDS || '').split(',').map(id => id.trim()).filter(Boolean),
  developerIds: (process.env.DEVELOPER_IDS || '').split(',').map(id => id.trim()).filter(Boolean),
  databasePath: process.env.DATABASE_PATH || './data/madrazo.sqlite',
  logLevel: process.env.LOG_LEVEL || 'info',
  timezone: process.env.TIMEZONE || 'America/Los_Angeles',

  // Ticket Support Role IDs
  ticketReviewerRoleId: process.env.TICKET_REVIEWER_ROLE_ID || '',
  ticketGeneralSupportRoleId: process.env.TICKET_GENERAL_SUPPORT_ROLE_ID || '',
  ticketHighRankRoleId: process.env.TICKET_HIGH_RANK_ROLE_ID || '',
  ticketReportRoleId: process.env.TICKET_REPORT_ROLE_ID || '',
  ticketAppealRoleId: process.env.TICKET_APPEAL_ROLE_ID || '',
  ticketRecruitmentRoleId: process.env.TICKET_RECRUITMENT_ROLE_ID || '',

  // Ticket Channels
  ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID || '',
  ticketPanelChannelId: process.env.TICKET_PANEL_CHANNEL_ID || '',

  // Application Roles & Channels
  applicationReviewerRoleId: process.env.APPLICATION_REVIEWER_ROLE_ID || '',
  applicationLogChannelId: process.env.APPLICATION_LOG_CHANNEL_ID || '',
  applicationPanelChannelId: process.env.APPLICATION_PANEL_CHANNEL_ID || '',

  // Server Info Panel
  serverInfoChannelId: process.env.SERVER_INFO_CHANNEL_ID || '',
  serverInfoPanelEnabled: process.env.SERVER_INFO_PANEL_ENABLED === 'true',
  serverInfoUpdateIntervalSeconds: parseInt(process.env.SERVER_INFO_UPDATE_INTERVAL_SECONDS || '300', 10),

  // Core Channel IDs
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',
  verificationChannelId: process.env.VERIFICATION_CHANNEL_ID || '',
  modLogChannelId: process.env.MOD_LOG_CHANNEL_ID || '',
  giveawayChannelId: process.env.GIVEAWAY_CHANNEL_ID || '',
  ssuChannelId: process.env.SSU_CHANNEL_ID || '',
  suggestionsChannelId: process.env.SUGGESTIONS_CHANNEL_ID || '',
  announcementsChannelId: process.env.ANNOUNCEMENTS_CHANNEL_ID || '',

  // Branding Banners
  ticketTopBannerUrl: process.env.TICKET_TOP_BANNER_URL || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80',
  ticketBottomBannerUrl: process.env.TICKET_BOTTOM_BANNER_URL || '',
  applicationTopBannerUrl: process.env.APPLICATION_TOP_BANNER_URL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  applicationBottomBannerUrl: process.env.APPLICATION_BOTTOM_BANNER_URL || '',
  serverInfoTopBannerUrl: process.env.SERVER_INFO_TOP_BANNER_URL || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&auto=format&fit=crop&q=80',
  serverInfoBottomBannerUrl: process.env.SERVER_INFO_BOTTOM_BANNER_URL || '',
  giveawayTopBannerUrl: process.env.GIVEAWAY_TOP_BANNER_URL || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&auto=format&fit=crop&q=80',
  giveawayBottomBannerUrl: process.env.GIVEAWAY_BOTTOM_BANNER_URL || '',

  // External Transcript API
  cookieApiKey: process.env.COOKIE_API_KEY || '',
  cookieApiEndpoint: process.env.COOKIE_API_ENDPOINT || 'https://www.cookie-api.com/api/transcripts',

  // Theme Colors
  colors: {
    primary: 0x8B0000,      // Deep Madrazo Crimson
    dark: 0x121214,         // Dark Charcoal
    gold: 0xD4AF37,         // Gold Accent
    success: 0x2ECC71,      // Success Green
    error: 0xE74C3C,        // Crimson Error
    warning: 0xF39C12,      // Alert Orange
    info: 0x3498DB          // Steel Blue
  }
};
