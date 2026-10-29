/**
 * Madrazo Cartel Bot - Recruitment Questions & Configuration
 * Natural, human-written prompts for Roblox ER:LC and FiveM roleplay.
 */
import { config } from './defaults.js';

export const defaultQuestions = [
  {
    id: 'roblox_username',
    question: 'What is your Roblox username?',
    placeholder: 'e.g. Madrazo_Enforcer',
    required: true,
    maxLength: 50
  },
  {
    id: 'discord_username',
    question: 'What is your Discord username / Tag?',
    placeholder: 'e.g. ghost_rider45633',
    required: true,
    maxLength: 50
  },
  {
    id: 'roblox_id',
    question: 'What is your Roblox User ID (if available)?',
    placeholder: 'e.g. 182746192',
    required: false,
    maxLength: 30
  },
  {
    id: 'char_age',
    question: 'How old is your roleplay character? (Keep distinct from real age)',
    placeholder: 'e.g. 29 years old',
    required: true,
    maxLength: 30
  },
  {
    id: 'timezone',
    question: 'What is your primary timezone and typical availability?',
    placeholder: 'e.g. EST (UTC-5), available evenings 6PM-11PM',
    required: true,
    maxLength: 100
  },
  {
    id: 'reason_joining',
    question: 'Why do you want to join the Madrazo Cartel?',
    placeholder: 'Explain what attracts you to our cartel operations and discipline...',
    required: true,
    paragraph: true,
    maxLength: 1000
  },
  {
    id: 'rp_experience',
    question: 'Detail your previous roleplay experience (ER:LC / FiveM gangs or law enforcement).',
    placeholder: 'List past factions, organizations, leadership roles, or combat skills...',
    required: true,
    paragraph: true,
    maxLength: 1000
  },
  {
    id: 'activity_hours',
    question: 'How many active hours can you dedicate to cartel operations each week?',
    placeholder: 'e.g. 15-20 hours weekly',
    required: true,
    maxLength: 100
  },
  {
    id: 'rules_agreement',
    question: 'Do you agree to adhere strictly to all server rules, gun-rules, and cartel bylaws?',
    placeholder: 'Type "I Agree" to confirm commitment to cartel discipline',
    required: true,
    maxLength: 50
  },
  {
    id: 'additional_notes',
    question: 'Is there anything else the recruitment team should know about your character?',
    placeholder: 'Specialty skills (driver, gunsmith, medic), weapon proficiency, etc.',
    required: false,
    paragraph: true,
    maxLength: 500
  }
];

export const applicationConfig = {
  reviewerRoleId: config.applicationReviewerRoleId,
  logChannelId: config.applicationLogChannelId,
  panelChannelId: config.applicationPanelChannelId,
  topBannerUrl: config.applicationTopBannerUrl,
  bottomBannerUrl: config.applicationBottomBannerUrl,
  openingGreeting: 'Welcome to the Madrazo Cartel application. Please answer the following questions honestly. Once submitted, your application will be reviewed by our recruitment team.'
};
