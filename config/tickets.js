/**
 * Madrazo Cartel Bot - Ticket Categories & Configuration
 */
import { config } from './defaults.js';

export const ticketCategories = [
  {
    id: 'general',
    label: 'General Support',
    emoji: '🎫',
    description: 'Assistance with server permissions, Discord inquiries, and general cartel queries.',
    channelPrefix: 'general-support',
    supportRoleId: config.ticketGeneralSupportRoleId,
    welcomeTitle: 'General Support • Madrazo Cartel',
    welcomeMessage: 'Thank you for contacting Madrazo Cartel Support. Please describe your inquiry in detail. A support agent will claim this ticket shortly.'
  },
  {
    id: 'high_rank',
    label: 'High Rank Support',
    emoji: '👑',
    description: 'Direct consultation with High Command and Cartel Leadership.',
    channelPrefix: 'high-rank',
    supportRoleId: config.ticketHighRankRoleId,
    welcomeTitle: 'High Rank Consultation • Madrazo Cartel',
    welcomeMessage: 'Welcome to High Rank Support. This channel is monitored by Cartel High Command and National Leadership. State your business clearly.'
  },
  {
    id: 'report',
    label: 'Report a Member',
    emoji: '⚖️',
    description: 'Confidential reporting of cartel rule violations, failRP, or internal misconduct.',
    channelPrefix: 'report',
    supportRoleId: config.ticketReportRoleId,
    welcomeTitle: 'Internal Affairs & Member Report',
    welcomeMessage: 'Please provide the user ID or name of the individual being reported, exact timestamp, rule violated, and video/screenshot evidence.'
  },
  {
    id: 'appeal',
    label: 'Ban Appeal',
    emoji: '📜',
    description: 'Formal appeals for server or faction punishments and blacklists.',
    channelPrefix: 'appeal',
    supportRoleId: config.ticketAppealRoleId,
    welcomeTitle: 'Disciplinary & Ban Appeal',
    welcomeMessage: 'State the reason for your punishment, the staff member who issued it, and why your case should be reconsidered by High Command.'
  },
  {
    id: 'recruitment',
    label: 'Recruitment Support',
    emoji: '📥',
    description: 'Inquiries regarding cartel tryouts, training schedules, and application status.',
    channelPrefix: 'recruitment',
    supportRoleId: config.ticketRecruitmentRoleId,
    welcomeTitle: 'Cartel Recruitment Support',
    welcomeMessage: 'Recruitment inquiries regarding tryouts, chapter allocations, or application reviews will be addressed by our recruitment staff.'
  }
];

export function getCategoryById(id) {
  return ticketCategories.find(c => c.id === id) || ticketCategories[0];
}
