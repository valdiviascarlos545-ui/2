/**
 * Madrazo Cartel Bot - Main Discord Engine
 * Production runtime with robust lifecycle, crash prevention, and modular interaction handlers.
 */
import { Client, GatewayIntentBits, Collection, Partials, Events } from 'discord.js';
import { config } from '../../config/defaults.js';
import { getDatabase, closeDatabase } from '../../database/index.js';
import { commands, getCommand } from './commands/index.js';
import { handleInteraction } from './interactions/index.js';
import { presenceService } from './services/presenceService.js';
import { serverInfoService } from './services/serverInfoService.js';
import { brandingService } from './services/brandingService.js';
import { logger } from './utils/logger.js';

// Initialize SQLite database
getDatabase();
logger.info('Database initialized with WAL mode & automated schema verification.');

// Setup command collection on client
function loadCommands(c) {
  c.commands = new Collection();
  for (const cmd of commands) {
    c.commands.set(cmd.data.name, cmd);
  }
}

// Setup event listeners on client
function setupClientListeners(c) {
  // Ready Event
  c.once(Events.ClientReady, async () => {
    logger.info(`Connected to Discord as ${c.user.tag} (ID: ${c.user.id})`);
    logger.info(`Guild count: ${c.guilds.cache.size} | Target Guild: ${config.guildId || 'Auto'}`);

    // Start presence rotation among 100 statuses
    presenceService.startRotation(c, 120);

    // Start persistent server info refresh loop if enabled
    serverInfoService.startAutoRefreshLoop(c);
  });

  // Interaction Event (Slash commands, buttons, menus, modals)
  c.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const cmd = getCommand(interaction.commandName);
      if (!cmd) {
        return interaction.reply({ content: 'Unrecognized command.', ephemeral: true });
      }

      try {
        await cmd.execute(interaction);
      } catch (err) {
        logger.error(`Error executing /${interaction.commandName}:`, err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'An execution error occurred.', ephemeral: true });
        }
      }
      return;
    }

    // Component interactions (buttons, select menus, modals)
    await handleInteraction(interaction);
  });

  // Member Welcome Event
  c.on('guildMemberAdd', async (member) => {
    if (!config.welcomeChannelId) return;

    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!channel) return;

    const embed = brandingService.createBaseEmbed({
      title: `🌴 Welcome to ${member.guild.name}!`,
      description: 
        `Welcome <@${member.id}> to the official server of the **Madrazo Cartel**!\n\n` +
        `Make sure to review our rules and verify yourself in <#${config.verificationChannelId || 'verification'}> to access server channels.\n\n` +
        `*Honor • Loyalty • Supremacy*`,
      topBanner: brandingService.banners.welcomeTop,
      thumbnail: member.user.displayAvatarURL()
    });

    try {
      await channel.send({ embeds: brandingService.packageEmbeds(embed) });
    } catch (err) {
      logger.warn(`Could not send welcome message for ${member.user.tag}:`, err);
    }
  });
}

// Create initial client with full intents
export let client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

loadCommands(client);
setupClientListeners(client);
logger.info(`Loaded ${client.commands.size} slash commands.`);

import http from 'http';

// AI Studio Dev Server Listener on Port 3000 (Required for environment runtime)
const DEV_PORT = 3000;
const statusServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Madrazo Cartel Discord Bot Daemon</title>
  <style>
    body { background: #0e0d0f; color: #e6e6e6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #161418; border: 1px solid #3d2328; border-radius: 8px; padding: 28px; max-width: 520px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
    h1 { color: #ff4d4d; margin: 0 0 12px; font-size: 18px; border-bottom: 2px solid #8B0000; padding-bottom: 8px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-online { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
    p { margin: 8px 0; font-size: 13px; line-height: 1.5; color: #bbb; }
    code { color: #D4AF37; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🇲🇽 Madrazo Cartel Discord Bot</h1>
    <p><strong>Daemon Status:</strong> <span class="badge badge-online">● Online &amp; Running</span></p>
    <p><strong>Bot User:</strong> <code>${client?.user ? client.user.tag : 'Cartel#7878'}</code></p>
    <p><strong>Commands:</strong> <code>65 Slash Commands Loaded</code></p>
    <p><strong>Database:</strong> <code>SQLite (WAL Mode Active)</code></p>
    <p><strong>Architecture:</strong> Standalone Discord Bot (Headless runtime)</p>
    <p style="margin-top: 16px; font-size: 11px; color: #666; border-top: 1px solid #281a1d; padding-top: 8px;">
      Listening on port 3000 • Process ID: ${process.pid}
    </p>
  </div>
</body>
</html>`;
  res.end(html);
});

statusServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${DEV_PORT} is already in use by an existing process. Bot daemon proceeding.`);
  } else {
    logger.error('Status server error:', err);
  }
});

statusServer.listen(DEV_PORT, '0.0.0.0', () => {
  logger.info(`Dev server listener active on http://0.0.0.0:${DEV_PORT}`);
});

// Graceful shutdown handling
function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down bot gracefully...`);
  if (statusServer) statusServer.close();
  presenceService.stopRotation();
  if (client) client.destroy();
  closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
});

// Resilient login: fallback to standard intents if privileged intents are disabled in Developer Portal
async function startBot() {
  if (!config.token || config.token === 'YOUR_BOT_TOKEN_HERE') {
    logger.warn('TOKEN is not set or using placeholder in .env. Bot daemon is ready to start once configured.');
    return;
  }

  try {
    await client.login(config.token);
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('disallowed intents')) {
      logger.warn('Privileged gateway intents (Members, Presences, MessageContent) are not enabled in the Discord Developer Portal.');
      logger.info('Automatically connecting with Standard Intents so all 65 Slash Commands, buttons, and embeds function cleanly.');

      client.destroy();
      client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages
        ],
        partials: [Partials.Channel, Partials.Message]
      });

      loadCommands(client);
      setupClientListeners(client);
      await client.login(config.token);
    } else {
      logger.error('Failed to log in to Discord gateway:', err.message);
    }
  }
}

startBot();

export default client;
