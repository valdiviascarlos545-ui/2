/**
 * Madrazo Cartel Bot - Presence Rotation Service
 * Cycles through the 100 statuses at a safe, rate-limit friendly interval.
 */
import { statuses } from '../../../config/statuses.js';
import { logger } from '../utils/logger.js';

let lastIndex = -1;
let rotationInterval = null;

export const presenceService = {
  startRotation(client, intervalSeconds = 120) {
    if (rotationInterval) clearInterval(rotationInterval);

    const updateStatus = () => {
      try {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * statuses.length);
        } while (nextIndex === lastIndex && statuses.length > 1);

        lastIndex = nextIndex;
        const template = statuses[nextIndex];

        // Calculate actual member count
        const totalMembers = client.guilds.cache.reduce((sum, g) => sum + (g.memberCount || 0), 0);
        const text = template.text.replace('{members}', totalMembers.toLocaleString());

        client.user.setPresence({
          activities: [{ name: text, type: template.type }],
          status: 'online'
        });
      } catch (err) {
        logger.warn('Presence update failed safely without crashing:', err);
      }
    };

    // Initial update
    updateStatus();

    // Safe rotation loop
    rotationInterval = setInterval(updateStatus, intervalSeconds * 1000);
    logger.info(`Presence rotation active: cycling 100 statuses every ${intervalSeconds}s.`);
  },

  stopRotation() {
    if (rotationInterval) {
      clearInterval(rotationInterval);
      rotationInterval = null;
    }
  }
};
