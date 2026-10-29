/**
 * Madrazo Cartel Bot - Branding Service Configuration
 * Centralized theme, assets, banners, and layout constants.
 */
import { config } from './defaults.js';

export const branding = {
  cartelName: 'Madrazo Cartel',
  motto: 'Honor • Loyalty • Supremacy',
  primaryColor: config.colors.primary,     // #8B0000 Deep Crimson
  darkColor: config.colors.dark,           // #121214 Charcoal
  goldColor: config.colors.gold,           // #D4AF37 Gold
  successColor: config.colors.success,     // #2ECC71
  errorColor: config.colors.error,         // #E74C3C
  warningColor: config.colors.warning,     // #F39C12

  footerText: 'Madrazo Cartel Operations • Official Bot System',
  footerIcon: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=100&auto=format&fit=crop&q=80',
  logoThumbnail: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?w=200&auto=format&fit=crop&q=80',

  banners: {
    ticketTop: config.ticketTopBannerUrl,
    ticketBottom: config.ticketBottomBannerUrl,
    applicationTop: config.applicationTopBannerUrl,
    applicationBottom: config.applicationBottomBannerUrl,
    serverInfoTop: config.serverInfoTopBannerUrl,
    serverInfoBottom: config.serverInfoBottomBannerUrl,
    giveawayTop: config.giveawayTopBannerUrl,
    giveawayBottom: config.giveawayBottomBannerUrl,
    ssuTop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
    welcomeTop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80'
  }
};
