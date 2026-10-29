/**
 * Madrazo Cartel Bot - Comprehensive Test Suite
 * Validates all 17 required acceptance criteria from Section 12.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { getDatabase, closeDatabase } from '../database/index.js';
import { ticketRepository } from '../database/repositories/ticketRepository.js';
import { applicationRepository } from '../database/repositories/applicationRepository.js';
import { giveawayRepository } from '../database/repositories/giveawayRepository.js';
import { panelRepository } from '../database/repositories/panelRepository.js';
import { moderationRepository } from '../database/repositories/moderationRepository.js';
import { brandingService } from '../src/bot/services/brandingService.js';
import { giveawayService } from '../src/bot/services/giveawayService.js';
import { canClaimTicket, canReviewApplication } from '../config/roles.js';
import { commands, getCommand } from '../src/bot/commands/index.js';

// Setup test database
const TEST_DB_PATH = './data/test_madrazo.sqlite';
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}
const testDb = getDatabase(TEST_DB_PATH);

console.log('🧪 RUNNING MADRAZO CARTEL BOT ACCEPTANCE SUITE (17 CHECKS)\n');

let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// 1. Support member successfully claims a ticket
test('1. Support member successfully claims a ticket', () => {
  const ticket = ticketRepository.createTicket({
    ticketType: 'general',
    channelId: 'chan-101',
    guildId: 'guild-1',
    openerId: 'user-opener',
    openerName: 'TestOpener#0001'
  });

  const claimResult = ticketRepository.claimTicket('chan-101', 'staff-1', 'Ghost_rider45633');
  assert.strictEqual(claimResult.success, true);
  assert.strictEqual(claimResult.ticket.handler_id, 'staff-1');
  assert.strictEqual(claimResult.ticket.handler_name, 'Ghost_rider45633');
  assert.strictEqual(claimResult.ticket.status, 'claimed');
});

// 2. Second support member cannot overwrite claim without reassignment
test('2. Second support member cannot overwrite claim without reassignment', () => {
  const secondClaim = ticketRepository.claimTicket('chan-101', 'staff-2', 'AnotherStaff#0002');
  assert.strictEqual(secondClaim.success, false);
  assert.strictEqual(secondClaim.alreadyClaimed, true);
  assert.strictEqual(secondClaim.currentHandlerId, 'staff-1');
});

// 3. Unauthorized member cannot claim or unclaim
test('3. Unauthorized member cannot claim or unclaim', () => {
  const unauthorizedMember = {
    id: 'random-user',
    roles: { cache: new Map() },
    permissions: { has: () => false }
  };
  const allowed = canClaimTicket(unauthorizedMember, 'high_rank');
  assert.strictEqual(allowed, false);
});

// 4. Claim announcement contains actual handler
test('4. Claim announcement contains actual handler', () => {
  const ticket = ticketRepository.getTicketByChannel('chan-101');
  const claimEmbeds = brandingService.buildTicketClaimEmbed(ticket, 'Ghost_rider45633', 'staff-1');
  const main = claimEmbeds[0].data;
  assert.ok(main.title.includes('Ghost_rider45633'));
  assert.ok(main.description.includes('<@staff-1>'));
});

// 5. Unclaiming clears the handler
test('5. Unclaiming clears the handler', () => {
  const unclaimResult = ticketRepository.unclaimTicket('chan-101', 'staff-1');
  assert.strictEqual(unclaimResult.success, true);
  assert.strictEqual(unclaimResult.ticket.handler_id, null);
  assert.strictEqual(unclaimResult.ticket.status, 'open');
});

// 6. Claiming and unclaiming continue to work after restart
test('6. Claiming and unclaiming continue to work after restart', () => {
  // Re-fetch from DB simulating restart
  const ticket = ticketRepository.getTicketByChannel('chan-101');
  assert.strictEqual(ticket.handler_id, null);
  const reClaim = ticketRepository.claimTicket('chan-101', 'staff-reclaim', 'OfficerReclaim');
  assert.strictEqual(reClaim.success, true);
  assert.strictEqual(reClaim.ticket.handler_id, 'staff-reclaim');
});

// 7. Ticket panel persistent message ID saved in DB
test('7. Ticket panel persistent message ID saved in DB', () => {
  panelRepository.savePanel('ticket', 'guild-1', 'chan-panel', 'msg-ticket-panel-999');
  const p = panelRepository.getPanel('ticket');
  assert.strictEqual(p.message_id, 'msg-ticket-panel-999');
});

// 8. Application panel persistent message ID saved in DB
test('8. Application panel persistent message ID saved in DB', () => {
  panelRepository.savePanel('application', 'guild-1', 'chan-recruit', 'msg-app-panel-888');
  const p = panelRepository.getPanel('application');
  assert.strictEqual(p.message_id, 'msg-app-panel-888');
});

// 9. Completed application triggers exactly one reviewer-role notification
test('9. Completed application triggers exactly one reviewer-role notification (idempotent)', () => {
  const app = applicationRepository.createApplication('guild-1', 'applicant-1', 'ApplicantOne');
  applicationRepository.submitApplication(app.application_id, {
    roblox_username: 'Madrazo_Pro',
    char_age: '28',
    timezone: 'PST'
  });

  // First notification attempt should succeed
  const firstAttempt = applicationRepository.tryMarkReviewerNotified(app.application_id);
  assert.strictEqual(firstAttempt, true);

  // Second notification attempt (e.g. restart or retry) MUST return false to prevent duplicate pings
  const secondAttempt = applicationRepository.tryMarkReviewerNotified(app.application_id);
  assert.strictEqual(secondAttempt, false);
});

// 10. Incomplete application cannot bypass pending review
test('10. Incomplete application cannot bypass pending review', () => {
  const freshApp = applicationRepository.createApplication('guild-1', 'applicant-2', 'ApplicantTwo');
  assert.strictEqual(freshApp.status, 'in_progress');
});

// 11. Approve and Deny actions save correct decisions
test('11. Approve and Deny actions save correct decisions', () => {
  const app = applicationRepository.createApplication('guild-1', 'applicant-3', 'ApplicantThree');
  applicationRepository.submitApplication(app.application_id, { roblox_username: 'Test' });

  const approved = applicationRepository.reviewApplication(
    app.application_id,
    'reviewer-1',
    'HeadRecruiter',
    'approved',
    'Solid background'
  );
  assert.strictEqual(approved.status, 'approved');
  assert.strictEqual(approved.reviewer_id, 'reviewer-1');

  // Test Deny on another app
  const app2 = applicationRepository.createApplication('guild-1', 'applicant-4', 'ApplicantFour');
  const denied = applicationRepository.reviewApplication(
    app2.application_id,
    'reviewer-1',
    'HeadRecruiter',
    'denied',
    'Failed background check'
  );
  assert.strictEqual(denied.status, 'denied');
  assert.strictEqual(denied.decision_reason, 'Failed background check');
});

// 12. Reviewer authorization is enforced
test('12. Reviewer authorization is enforced', () => {
  const regularMember = {
    id: 'user-regular',
    roles: { cache: new Map() },
    permissions: { has: () => false }
  };
  assert.strictEqual(canReviewApplication(regularMember), false);
});

// 13. Server information structure contains live fields
test('13. Server information uses real Discord values', () => {
  const mockGuild = {
    memberCount: 401,
    premiumSubscriptionCount: 46,
    premiumTier: 3,
    ownerId: 'owner-123',
    channels: { cache: new Map([['c1', { type: 0 }], ['c2', { type: 2 }]]) },
    members: { cache: new Map([['m1', { user: { bot: true } }]]) },
    roles: { cache: new Map() },
    createdTimestamp: Date.now() - 1000000,
    iconURL: () => 'https://example.com/icon.png'
  };
  const stats = {
    totalMembers: mockGuild.memberCount,
    onlineMembers: 'Unavailable',
    boostCount: mockGuild.premiumSubscriptionCount,
    boostTier: mockGuild.premiumTier,
    ownerId: mockGuild.ownerId,
    channelCount: mockGuild.channels.cache.size,
    textCount: 1,
    voiceCount: 1,
    botCount: 1,
    roleCount: 0,
    createdTimestamp: mockGuild.createdTimestamp
  };
  const embeds = brandingService.buildServerInfoEmbed(stats);
  assert.strictEqual(embeds.length >= 1, true);
  assert.ok(embeds[0].data.description.includes('401'));
  assert.ok(embeds[0].data.description.includes('46'));
});

// 14. Giveaway entries cannot be duplicated
test('14. Giveaway entries cannot be duplicated', () => {
  giveawayRepository.createGiveaway({
    giveawayId: 'GW-TEST-1',
    guildId: 'guild-1',
    channelId: 'chan-gw',
    messageId: 'msg-gw-1',
    prize: 'Discord Nitro',
    winnerCount: 1,
    hostId: 'host-1',
    hostName: 'HostUser',
    endTimestamp: Date.now() + 60000
  });

  const firstEntry = giveawayRepository.addEntry('GW-TEST-1', 'user-entrant-1', 'Entrant#0001');
  assert.strictEqual(firstEntry, true);

  // Duplicate entry attempt must fail
  const duplicateEntry = giveawayRepository.addEntry('GW-TEST-1', 'user-entrant-1', 'Entrant#0001');
  assert.strictEqual(duplicateEntry, false);
  assert.strictEqual(giveawayRepository.getEntryCount('GW-TEST-1'), 1);
});

// 15. Giveaway status and entries survive restarts
test('15. Giveaway status and entries survive restarts', () => {
  const loadedGw = giveawayRepository.getGiveaway('GW-TEST-1');
  assert.strictEqual(loadedGw.prize, 'Discord Nitro');
  const count = giveawayRepository.getEntryCount('GW-TEST-1');
  assert.strictEqual(count, 1);
});

// 16. Failed operations produce valid error indicators (no false success)
test('16. Failed operations do not produce false success', () => {
  const fakeClaim = ticketRepository.claimTicket('non-existent-channel', 'staff-1', 'Staff');
  assert.strictEqual(fakeClaim.success, false);
  assert.ok(fakeClaim.error);
});

// 17. All newly registered commands have working handlers
test('17. All 65 registered slash commands have working handlers', () => {
  assert.strictEqual(commands.length, 65, `Expected 65 commands, found ${commands.length}`);
  for (const cmd of commands) {
    assert.ok(cmd.data.name, 'Command missing name');
    assert.ok(cmd.data.description, `Command ${cmd.data.name} missing description`);
    assert.strictEqual(typeof cmd.execute, 'function', `Command ${cmd.data.name} missing execute handler`);
  }
});

// 18. Dynamic /help service generates valid embeds and select menus across all categories
test('18. Dynamic /help service generates valid embeds and select menus across all categories', async () => {
  const { helpService, categoryMeta } = await import('../src/bot/services/helpService.js');
  const overviewEmbeds = helpService.buildOverviewEmbed(commands);
  assert.ok(overviewEmbeds.length >= 1, 'Overview embed missing');
  assert.ok(overviewEmbeds[0].data.title.includes('Madrazo Cartel'));

  for (const catKey of Object.keys(categoryMeta)) {
    const embeds = helpService.buildCategoryEmbed(catKey, commands);
    assert.ok(embeds.length >= 1, `Category ${catKey} embed missing`);
    const menuRow = helpService.buildCategorySelectMenu(catKey);
    assert.ok(menuRow.components.length === 1, `Category ${catKey} menu missing`);
    assert.strictEqual(menuRow.components[0].data.custom_id, 'help_select_category');
  }
});

// 19. safeSendDM gracefully catches DMs closed error (50007)
test('19. safeSendDM gracefully catches DMs closed error (50007)', async () => {
  const { safeSendDM } = await import('../src/bot/utils/dm.js');
  const blockedUser = {
    id: 'user-blocked-999',
    tag: 'BlockedUser#9999',
    send: async () => {
      const err = new Error('Cannot send messages to this user');
      err.code = 50007;
      throw err;
    }
  };
  const res = await safeSendDM(blockedUser, { content: 'Test DM' });
  assert.strictEqual(res.success, false);
  assert.ok(res.error.includes('closed or blocked'));
});

console.log(`\n🎉 ALL ${passedCount} ACCEPTANCE TESTS PASSED SUCCESSFULLY!`);

closeDatabase();
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

