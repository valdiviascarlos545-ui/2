/**
 * Madrazo Cartel Bot - Slash Command Deployment Script
 * Deploys all 65 slash commands to Discord application REST endpoint.
 */
import { REST, Routes } from 'discord.js';
import { config } from '../../config/defaults.js';
import { commands } from './commands/index.js';
import { logger } from './utils/logger.js';

async function deploy() {
  if (!config.token || config.token === 'YOUR_BOT_TOKEN_HERE') {
    logger.error('Cannot deploy commands: TOKEN is not configured in .env');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(config.token);
  const payload = commands.map(cmd => cmd.data.toJSON());

  logger.info(`Started refreshing ${payload.length} application (/) commands.`);

  try {
    if (config.guildId) {
      try {
        // Guild-specific registration for instantaneous updates
        await rest.put(
          Routes.applicationGuildCommands(config.clientId, config.guildId),
          { body: payload }
        );
        logger.info(`Successfully registered ${payload.length} guild commands in guild ${config.guildId}.`);
        return;
      } catch (guildErr) {
        if (guildErr.code === 50001 || guildErr.status === 403) {
          logger.warn(`Bot is not yet a member of guild ${config.guildId} (Code 50001: Missing Access).`);
          logger.info(`Deploying ${payload.length} commands as Global Application Commands instead...`);
        } else {
          throw guildErr;
        }
      }
    }

    // Global registration (Available across all guilds the bot joins)
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: payload }
    );
    logger.info(`Successfully registered ${payload.length} global application commands in Discord.`);
    logger.info(`Bot Invite URL: https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=8&scope=bot%20applications.commands`);
  } catch (error) {
    logger.error('Error deploying slash commands to Discord API:', error);
    process.exit(1);
  }
}

deploy();
