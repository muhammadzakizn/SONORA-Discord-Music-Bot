/**
 * Developer Access Control
 * Only whitelisted emails and Discord IDs can access developer dashboard
 */

// Whitelisted Developer Emails
export const DEVELOPER_EMAILS = [
  "muhammadzakizn.07@gmail.com",
  "muhammadzakizn@icloud.com",
];

// Whitelisted Developer Discord IDs (usernames)
export const DEVELOPER_DISCORD_IDS = [
  "thixxert",
  "zacksylvn",
];

// Email OTP Daily Limit
export const EMAIL_OTP_DAILY_LIMIT = 150;

// Check if user is developer
export function isDeveloper(email?: string, discordUsername?: string): boolean {
  if (email && DEVELOPER_EMAILS.includes(email.toLowerCase())) {
    return true;
  }
  if (discordUsername && DEVELOPER_DISCORD_IDS.includes(discordUsername.toLowerCase())) {
    return true;
  }
  return false;
}

// Check if Discord user is developer by username
export function isDeveloperByDiscord(username: string): boolean {
  return DEVELOPER_DISCORD_IDS.includes(username.toLowerCase());
}
