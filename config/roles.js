/**
 * Madrazo Cartel Bot - Role Hierarchy & Permissions
 * Role names mapped to configurable environment variables or defaults.
 */
import { config } from './defaults.js';

export const roles = {
  // Executive Roles
  executive: [
    { name: 'Owner', id: process.env.ROLE_OWNER_ID || '' },
    { name: 'Co-Owner', id: process.env.ROLE_CO_OWNER_ID || '' },
    { name: 'FalconEye.GG', id: process.env.ROLE_FALCONEYE_ID || '' },
    { name: 'Cartel Owner', id: process.env.ROLE_CARTEL_OWNER_ID || '' },
    { name: 'Cartel Co-Owner', id: process.env.ROLE_CARTEL_CO_OWNER_ID || '' },
    { name: 'Cartel Overseer', id: process.env.ROLE_CARTEL_OVERSEER_ID || '' }
  ],

  // National Command
  nationalCommand: [
    { name: 'National President', id: process.env.ROLE_NAT_PRES_ID || '' },
    { name: 'National Vice President', id: process.env.ROLE_NAT_VP_ID || '' },
    { name: 'President', id: process.env.ROLE_PRESIDENT_ID || '' },
    { name: 'Vice President', id: process.env.ROLE_VP_ID || '' },
    { name: 'Head of Security', id: process.env.ROLE_SECURITY_HEAD_ID || '' },
    { name: 'Secretary', id: process.env.ROLE_SECRETARY_ID || '' },
    { name: 'Treasurer', id: process.env.ROLE_TREASURER_ID || '' }
  ],

  // High Command
  highCommand: [
    { name: 'Regional Boss', id: process.env.ROLE_REGIONAL_BOSS_ID || '' },
    { name: 'Regional Commander', id: process.env.ROLE_REGIONAL_CDR_ID || '' }
  ],

  // Low Command
  lowCommand: [
    { name: 'Deputy Commander', id: process.env.ROLE_DEPUTY_CDR_ID || '' },
    { name: 'Squad Commander', id: process.env.ROLE_SQUAD_CDR_ID || '' }
  ],

  // Membership Ranks
  membership: [
    { name: 'Enforcer', id: process.env.ROLE_ENFORCER_ID || '' },
    { name: 'Made Member', id: process.env.ROLE_MADE_MEMBER_ID || '' },
    { name: 'Prospect', id: process.env.ROLE_PROSPECT_ID || '' },
    { name: 'Associate', id: process.env.ROLE_ASSOCIATE_ID || '' },
    { name: 'Friend of the Cartel', id: process.env.ROLE_FRIEND_ID || '' }
  ],

  // Staff & Functional Support
  staff: {
    ticketSupport: config.ticketGeneralSupportRoleId,
    ticketHighRank: config.ticketHighRankRoleId,
    ticketReport: config.ticketReportRoleId,
    ticketAppeal: config.ticketAppealRoleId,
    ticketRecruitment: config.ticketRecruitmentRoleId,
    applicationReviewer: config.applicationReviewerRoleId,
    moderator: process.env.MODERATOR_ROLE_ID || '',
    giveawayManager: process.env.GIVEAWAY_MANAGER_ROLE_ID || '',
    eventManager: process.env.EVENT_MANAGER_ROLE_ID || '',
    verifiedRole: process.env.VERIFIED_ROLE_ID || '',
    unverifiedRole: process.env.UNVERIFIED_ROLE_ID || ''
  }
};

/**
 * Check if a Discord member has permission to claim or handle a ticket
 */
export function canClaimTicket(member, ticketType) {
  if (!member) return false;
  
  // Server owners and bot developers always have claim rights
  if (config.ownerIds.includes(member.id) || config.developerIds.includes(member.id)) {
    return true;
  }

  // Administrator permission check
  if (member.permissions && member.permissions.has && member.permissions.has('Administrator')) {
    return true;
  }

  const memberRoleIds = member.roles?.cache ? Array.from(member.roles.cache.keys()) : (Array.isArray(member.roles) ? member.roles : []);

  // Category-specific support roles
  const categoryRoles = {
    general: [config.ticketGeneralSupportRoleId, config.ticketReviewerRoleId],
    high_rank: [config.ticketHighRankRoleId, ...roles.executive.map(r => r.id), ...roles.nationalCommand.map(r => r.id)],
    report: [config.ticketReportRoleId, roles.staff.moderator],
    appeal: [config.ticketAppealRoleId, ...roles.highCommand.map(r => r.id), ...roles.executive.map(r => r.id)],
    recruitment: [config.ticketRecruitmentRoleId, config.applicationReviewerRoleId]
  };

  const allowedRoles = categoryRoles[ticketType] || [config.ticketGeneralSupportRoleId, config.ticketReviewerRoleId];
  const activeAllowed = allowedRoles.filter(Boolean);

  // If specific roles are configured, check member roles
  if (activeAllowed.length > 0) {
    return activeAllowed.some(roleId => memberRoleIds.includes(roleId));
  }

  // Safe fallback: Require ManageMessages or ManageChannels if no roles configured
  return Boolean(member.permissions?.has && (member.permissions.has('ManageChannels') || member.permissions.has('ManageMessages')));
}

/**
 * Check if a Discord member has permission to review applications
 */
export function canReviewApplication(member) {
  if (!member) return false;

  if (config.ownerIds.includes(member.id) || config.developerIds.includes(member.id)) {
    return true;
  }

  if (member.permissions?.has && member.permissions.has('Administrator')) {
    return true;
  }

  const memberRoleIds = member.roles?.cache ? Array.from(member.roles.cache.keys()) : (Array.isArray(member.roles) ? member.roles : []);
  if (config.applicationReviewerRoleId && memberRoleIds.includes(config.applicationReviewerRoleId)) {
    return true;
  }

  // Check executive and recruitment roles
  const allowed = [
    config.ticketRecruitmentRoleId,
    ...roles.executive.map(r => r.id),
    ...roles.nationalCommand.map(r => r.id)
  ].filter(Boolean);

  return allowed.some(roleId => memberRoleIds.includes(roleId));
}
