import {
  type APIMessageComponentEmoji,
  type ApplicationEmoji,
  type ClientApplication,
  formatEmoji,
} from 'discord.js';

import { coreLog } from '../internal/coreLog.js';

let cached: Map<string, ApplicationEmoji> | undefined;

/**
 * Get and format an application emoji.
 */
export function e(appEmojiName: string): string {
  const emoji = getEmoji('e', appEmojiName);
  return emoji ? formatEmoji(emoji) : `:${appEmojiName}:`;
}

/**
 * Get an application emoji's id.
 */
e.id = (appEmojiName: string): string => {
  const emoji = getEmoji('e.id', appEmojiName);
  if (emoji == null) {
    throw new Error(`Emoji ${appEmojiName} not found, yet its id was requested.`);
  }
  return emoji.id;
};

/**
 * Returns an application emoji in the shape of an {@link APIMessageComponentEmoji}.
 */
e.component = (appEmojiName: string): APIMessageComponentEmoji => {
  const emoji = getEmoji('e.component', appEmojiName);
  if (!emoji) {
    throw new Error(
      `Emoji ${appEmojiName} not found, yet its message component shape was requested.`,
    );
  }
  return { id: emoji.id, name: emoji.name, animated: emoji.animated };
};

export function hydrateAppEmojis(application: ClientApplication): void {
  cached ??= new Map();
  cached.clear();

  const appEmojis = application.emojis.cache;
  for (const emoji of appEmojis.values()) {
    cached.set(emoji.name, emoji);
  }
  coreLog.info(`Loaded ${appEmojis.size} application emoji(s).`);
}

function getEmoji(requestingFn: string, requested: string): ApplicationEmoji | undefined {
  if (cached == null) {
    throw new Error(
      `${requestingFn}('${requested}') was called before the Discord client finished fetching application emojis.` +
        ' Was this used at the top-level of a module?',
    );
  }
  return cached.get(requested);
}
