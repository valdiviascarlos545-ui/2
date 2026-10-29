/**
 * Runtime Verification: Live Discord API Guild Fetch
 */
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { config } from '../config/defaults.js';

async function verifyGuildConnection() {
  console.log('Connecting to Discord Gateway with token...');
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  return new Promise((resolve, reject) => {
    client.once(Events.ClientReady, async (c) => {
      try {
        console.log(`[GATEWAY READY] Bot user: ${c.user.tag} (ID: ${c.user.id})`);
        console.log(`[GATEWAY READY] Cached guilds: ${c.guilds.cache.size}`);

        console.log(`Fetching target guild ID: ${config.guildId} directly from Discord API...`);
        const guild = await c.guilds.fetch(config.guildId);

        console.log('--- ACTUAL DISCORD GUILD DATA ---');
        console.log(`Guild Name: "${guild.name}"`);
        console.log(`Guild ID: "${guild.id}"`);
        console.log(`Member Count: ${guild.memberCount}`);
        console.log(`Owner ID: "${guild.ownerId}"`);
        console.log(`Created At: ${new Date(guild.createdTimestamp).toISOString()}`);
        console.log('---------------------------------');

        c.destroy();
        resolve({
          guildName: guild.name,
          guildId: guild.id,
          memberCount: guild.memberCount,
          ownerId: guild.ownerId
        });
      } catch (err) {
        c.destroy();
        reject(err);
      }
    });

    client.login(config.token).catch(reject);
  });
}

verifyGuildConnection()
  .then(() => {
    console.log('VERIFICATION CHECK 2: SUCCESS');
    process.exit(0);
  })
  .catch((err) => {
    console.error('VERIFICATION CHECK 2: FAILED -', err.message);
    process.exit(1);
  });
