# MADRAZO CARTEL DISCORD BOT — PRODUCTION MANUAL
### Advanced Management, Persistent Ticketing, Recruitment, & Roleplay Operations System
**Supporting Roblox ER:LC & FiveM Roleplay Communities**

---

## 1. TECHNOLOGY STACK & ARCHITECTURE

- **Runtime:** Node.js 20 or newer (Tested on Node.js 22 LTS).
- **Discord Framework:** `discord.js` v14.
- **Database Engine:** SQLite via `better-sqlite3` with Write-Ahead Logging (`WAL`) mode, foreign keys, and atomic conditional locking.
- **Environment Configuration:** `dotenv`.
- **Command Architecture:** 65 native Discord Slash Commands, structured interaction router, and persistent button/select-menu/modal handlers.
- **Branding Engine:** Centralized dark crimson (`#8B0000`), dark charcoal (`#121214`), and gold (`#D4AF37`) aesthetic with top & bottom banner pairing.

---

## 2. QUICKSTART INSTALLATION (WINDOWS & LINUX)

Open your terminal or Windows Command Prompt in the project root:

```bat
npm install
copy .env.example .env
node deploy-commands.js
node index.js
```

> **Note:** On Linux/macOS, use `cp .env.example .env` instead of `copy`.  
> Always configure your `TOKEN`, `CLIENT_ID`, and role/channel IDs in `.env` before deploying commands or launching the bot daemon.

---

## 3. DISCORD APPLICATION & GATEWAY SETUP

1. Navigate to the **[Discord Developer Portal](https://discord.com/developers/applications)**.
2. Click **New Application**, name it `Madrazo Cartel Bot`, and proceed.
3. Under the **Bot** tab:
   - Click **Reset Token** and copy your token to `TOKEN` in `.env`.
   - Under **Privileged Gateway Intents**, enable:
     - ✅ **PRESENCE INTENT** (Needed for live online member counts in `/server-info` and status rotation).
     - ✅ **SERVER MEMBERS INTENT** (Needed for join welcomes, role hierarchy verification, and Melonly role sync).
     - ✅ **MESSAGE CONTENT INTENT** (Needed for ticket conversation capture and HTML transcripts).
4. Under **OAuth2 -> URL Generator**:
   - Scopes: `bot`, `applications.commands`.
   - Bot Permissions: `Administrator` (or `Manage Roles`, `Manage Channels`, `Kick Members`, `Ban Members`, `Timeout Members`, `Manage Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `View Audit Log`).
   - Copy and open the generated invite link to authorize the bot into your Discord server.

---

## 4. ENVIRONMENT VARIABLES REFERENCE (`.env`)

```ini
# Core Bot Credentials
TOKEN="YOUR_BOT_TOKEN_HERE"
CLIENT_ID="123456789012345678"
GUILD_ID="123456789012345678"
OWNER_IDS="123456789012345678"
DEVELOPER_IDS="123456789012345678"
DATABASE_PATH="./data/madrazo.sqlite"
LOG_LEVEL="info"
TIMEZONE="America/Los_Angeles"

# Ticket Support Role IDs
TICKET_REVIEWER_ROLE_ID=""
TICKET_GENERAL_SUPPORT_ROLE_ID=""
TICKET_HIGH_RANK_ROLE_ID=""
TICKET_REPORT_ROLE_ID=""
TICKET_APPEAL_ROLE_ID=""
TICKET_RECRUITMENT_ROLE_ID=""

# Ticket Channels
TICKET_LOG_CHANNEL_ID=""
TICKET_PANEL_CHANNEL_ID=""

# Application Roles & Channels
APPLICATION_REVIEWER_ROLE_ID=""
APPLICATION_LOG_CHANNEL_ID=""
APPLICATION_PANEL_CHANNEL_ID=""

# Server Info Panel
SERVER_INFO_CHANNEL_ID=""
SERVER_INFO_PANEL_ENABLED=false
SERVER_INFO_UPDATE_INTERVAL_SECONDS=300

# Channels
WELCOME_CHANNEL_ID=""
VERIFICATION_CHANNEL_ID=""
MOD_LOG_CHANNEL_ID=""
GIVEAWAY_CHANNEL_ID=""
SSU_CHANNEL_ID=""
SUGGESTIONS_CHANNEL_ID=""
ANNOUNCEMENTS_CHANNEL_ID=""

# Banners
TICKET_TOP_BANNER_URL="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80"
TICKET_BOTTOM_BANNER_URL=""
APPLICATION_TOP_BANNER_URL="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80"
APPLICATION_BOTTOM_BANNER_URL=""
SERVER_INFO_TOP_BANNER_URL="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&auto=format&fit=crop&q=80"
SERVER_INFO_BOTTOM_BANNER_URL=""
GIVEAWAY_TOP_BANNER_URL="https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&auto=format&fit=crop&q=80"
GIVEAWAY_BOTTOM_BANNER_URL=""

# Transcript & Integrations
COOKIE_API_KEY=""
COOKIE_API_ENDPOINT="https://www.cookie-api.com/api/transcripts"
```

---

## 5. KEY UPGRADE HIGHLIGHTS

### 🛄 Atomic Ticket Claim System
- Controls: `[🛄 Claim Ticket]`, `[🔓 Unclaim Ticket]`, `[🔄 Reassign]`, `[🔒 Close]`, `[📄 Transcript]`, `[➕ Add Member]`, `[➖ Remove Member]`.
- Atomic locking via `UPDATE tickets SET handler_id = ? WHERE channel_id = ? AND handler_id IS NULL` prevents duplicate claims and race conditions.
- Sends claim announcement embed: `D-89 • Ghost_rider45633 Claimed this ticket`.
- Updates main ticket message controls and assigned handler live.
- Ephemeral rejection if already claimed by another staff member.

### 📋 Persistent Panels (`/ticket-panel` & `/application-panel`)
- Saves Discord message ID and channel ID in SQLite `persistent_panels` table.
- Component handlers persist across bot restarts with stable custom IDs.
- Refresh mode edits existing message rather than polluting channels with duplicates.

### 📥 Idempotent Application Review & Reviewer Role Ping
- Human-written, natural questions (Roblox username, character age, timezone, RP experience, reason for joining).
- Reviewer role (`APPLICATION_REVIEWER_ROLE_ID`) is mentioned **exactly once** upon completion.
- Database flag `tryMarkReviewerNotified` prevents double pings on bot restarts or retries.
- Interactive Review Controls: `[Approve]`, `[Deny]` (opens modal to collect reason), `[Request Information]`.

### 🏙️ Premium Server Information Embed (`/server-info` & `/server-info-panel`)
- Displays real live member count, online members (if cached or "Unavailable"), boost tier, boosts, channel counts, and creation date.
- Auto-updating panel runs non-overlapping interval loops.

### 🎉 Cryptographically Sound Giveaways
- Uses Node.js `crypto.randomInt` for unbiased winner selection.
- Unique entries enforced via `UNIQUE(giveaway_id, user_id)` in SQLite.
- Status, entries, and winner announcements survive restarts.

---

## 6. COMPLETE COMMAND INVENTORY (65 COMMANDS)

| Category | Command | Description | Permission |
| :--- | :--- | :--- | :--- |
| **Moderation** | `/ban` | Ban operative from server with reason | BanMembers |
| | `/unban` | Pardon and unban user ID | BanMembers |
| | `/kick` | Kick member from server | KickMembers |
| | `/timeout` | Timeout member for N minutes | ModerateMembers |
| | `/untimeout` | Revoke active timeout | ModerateMembers |
| | `/warn` | Issue formal warning in record | ModerateMembers |
| | `/warnings` | View member warnings | Public |
| | `/clear-warnings` | Clear all warnings on dossier | Administrator |
| | `/purge` | Bulk delete 1-100 messages | ManageMessages |
| | `/lock` | Lock channel discussion | ManageChannels |
| | `/unlock` | Restore channel messaging | ManageChannels |
| | `/slowmode` | Set rate limit delay | ManageChannels |
| | `/nickname` | Update member callsign | ManageNicknames |
| | `/modlog` | View recent disciplinary logs | ModerateMembers |
| | `/case` | Query case details by ID | ModerateMembers |
| **Tickets** | `/ticket-setup` | Check ticket configuration | Administrator |
| | `/ticket-panel` | Publish ticket selection panel | Administrator |
| | `/ticket-add` | Add member to current ticket | Support Role |
| | `/ticket-remove` | Remove member from ticket | Support Role |
| | `/ticket-claim` | Claim ticket handling | Support Role |
| | `/ticket-unclaim` | Release ticket back to queue | Handler/Admin |
| | `/ticket-close` | Close ticket and archive transcript | Support Role |
| | `/ticket-reopen` | Reopen closed ticket | ManageChannels |
| | `/ticket-transcript` | Generate HTML transcript | Support Role |
| | `/ticket-stats` | View ticket volume stats | Support Role |
| | `/ticket-rename` | Rename ticket channel | ManageChannels |
| | `/ticket-priority` | Set urgency level | Support Role |
| **Applications** | `/application-setup` | Verify recruitment settings | Administrator |
| | `/application-panel` | Publish application panel | Administrator |
| | `/application-review` | Inspect applicant dossier | Reviewer |
| | `/application-accept` | Approve applicant & notify | Reviewer |
| | `/application-deny` | Deny application with reason | Reviewer |
| | `/application-status` | Check your application status | Public |
| | `/application-questions` | List survey questions | Public |
| | `/recruitment-stats` | Recruitment pipeline metrics | Reviewer |
| **Community** | `/verification-setup`| Melonly sync configuration | Administrator |
| | `/verification-stats`| Verified member breakdown | Public |
| | `/welcome-setup` | Setup welcome channel | Administrator |
| | `/member-info` | Inspect cartel dossier | Public |
| | `/server-info` | Real server stats embed | Public |
| | `/avatar` | High-res operative avatar | Public |
| | `/userinfo` | Account creation & badges | Public |
| | `/role-request` | Request specialty role | Public |
| | `/roster` | View chain-of-command roster | Public |
| | `/suggestion-setup` | Setup suggestion channel | Administrator |
| **Giveaways** | `/giveaway-create` | Host branded giveaway | ManageGuild |
| | `/giveaway-end` | Conclude and draw winners | ManageGuild |
| | `/giveaway-reroll` | Reroll giveaway winners | ManageGuild |
| | `/giveaway-list` | View active giveaways | Public |
| | `/event-create` | Schedule cartel RP operation | ManageEvents |
| | `/event-end` | Mark operation as complete | ManageEvents |
| | `/event-list` | View scheduled events | Public |
| **Executive** | `/ssu-setup` | Setup SSU notification channel | Administrator |
| | `/ssu-start` | Initiate Server Start-Up | ManageGuild |
| | `/ssu-shutdown` | Conclude SSU roleplay session | ManageGuild |
| | `/ssu-status` | View active session duration | Public |
| | `/promotion` | Announce rank promotion | ManageRoles |
| | `/loa` | File operative Leave of Absence| Public |
| | `/announcement` | Broadcast leadership decree | Administrator |
| | `/embed-builder` | Build custom branded embed | ManageMessages |
| | `/config-check` | Forensic audit of .env config | Administrator |
| | `/channel-check` | Verify required channels exist | Administrator |
| | `/role-check` | Audit command role mappings | Administrator |
| | `/bot-stats` | Memory RSS, Uptime, SQLite info| Public |
| | `/help` | Complete command index | Public |

---

## 7. RUNNING TESTS

Run the automated acceptance suite verifying all 19 requirements:

```bat
npm test
```

Expected output:
```
🧪 RUNNING MADRAZO CARTEL BOT ACCEPTANCE SUITE (19 CHECKS)
✅ [PASS] 1. Support member successfully claims a ticket
✅ [PASS] 2. Second support member cannot overwrite claim without reassignment
✅ [PASS] 3. Unauthorized member cannot claim or unclaim
✅ [PASS] 4. Claim announcement contains actual handler
✅ [PASS] 5. Unclaiming clears the handler
✅ [PASS] 6. Claiming and unclaiming continue to work after restart
✅ [PASS] 7. Ticket panel persistent message ID saved in DB
✅ [PASS] 8. Application panel persistent message ID saved in DB
✅ [PASS] 9. Completed application triggers exactly one reviewer-role notification (idempotent)
✅ [PASS] 10. Incomplete application cannot bypass pending review
✅ [PASS] 11. Approve and Deny actions save correct decisions
✅ [PASS] 12. Reviewer authorization is enforced
✅ [PASS] 13. Server information uses real Discord values
✅ [PASS] 14. Giveaway entries cannot be duplicated
✅ [PASS] 15. Giveaway status and entries survive restarts
✅ [PASS] 16. Failed operations do not produce false success
✅ [PASS] 17. All 65 registered slash commands have working handlers
✅ [PASS] 18. Dynamic /help service generates valid embeds and select menus across all categories
✅ [PASS] 19. safeSendDM gracefully catches DMs closed error (50007)

🎉 ALL 19 ACCEPTANCE TESTS PASSED SUCCESSFULLY!
```
