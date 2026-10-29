/**
 * Madrazo Cartel Bot - Channel Defaults & Mappings
 */
import { config } from './defaults.js';

export const channels = {
  // Information
  welcome: config.welcomeChannelId || 'welcome-channel',
  announcements: config.announcementsChannelId || '📢│announcements',
  rideoutNotify: '🚨│rideout-notify',
  chainOfCommand: '⛓│chain-of-command',
  rules: '✅│rules',

  // General
  generalChat: '🔴│general-chat',
  offTopicChat: '⚪│off-topic-chat',
  botCommands: '🤖│bot-commands',
  suggestions: config.suggestionsChannelId || '💡│suggestions',

  // Ticketing & Requests
  ticketSelection: config.ticketPanelChannelId || '📥│ticket-selection',
  ticketLogs: config.ticketLogChannelId || 'ticket-logs',
  roleRequest: '📥│role-request',
  loaRequest: '✌│loa-request',

  // Recruitment
  applicationPanel: config.applicationPanelChannelId || 'recruitment-panel',
  applicationLogs: config.applicationLogChannelId || '📂│recruitment-logs',
  recruitmentAnnouncements: '📣│recruitment-announcements',

  // Logs & Forensics
  punishments: '🚫│punishments',
  modLogs: config.modLogChannelId || 'mod-logs',
  giveaways: config.giveawayChannelId || 'giveaways',
  serverInfo: config.serverInfoChannelId || 'server-info'
};
