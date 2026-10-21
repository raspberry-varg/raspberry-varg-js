import { type AppConfig, appConfigDefaults } from '../app/config.js';

import type { ClientEventsModuleOptions, CommandModuleOptions } from '../modules/index.js';
import type { ClientOptions, Interaction } from 'discord.js';

/**
 * Configuration with keys with defaults marked as optional.
 */
export type BootstrapConfigPartial = Omit<BotKitConfig, keyof typeof globalConfigDefaults> &
  Partial<Pick<BotKitConfig, keyof typeof globalConfigDefaults>>;

/**
 * Middleware that runs before an interaction is routed. The final action is routing a command to
 * its defined command handler.
 *
 * @param interaction The received interaction.
 * @param next The next middleware in the chain.
 */
export type InteractionMiddleware = (
  interaction: Interaction,
  next: () => Promise<void>,
) => void | Promise<void>;

/**
 * Full configuration for BotKit.
 */
export interface BotKitConfig extends AppConfig {
  client: {
    options: ClientOptions;
    token: string;
  };

  /**
   * Configuration for command handlers and syncing commands to the Discord client.
   */
  commands?: CommandModuleOptions;

  /**
   * Configuration for handling {@link import('discord.js').Client Client} events.
   */
  events?: ClientEventsModuleOptions;
}

const globalConfigDefaults = {
  ...appConfigDefaults,
} satisfies Partial<BotKitConfig>;

let globalConfig: BotKitConfig | undefined;

export function configure(options: BootstrapConfigPartial): BotKitConfig {
  if (globalConfig != null) {
    throw new Error('BotKit has already been configured.');
  }
  globalConfig = { ...appConfigDefaults, ...options };
  return globalConfig;
}

export function getConfig(): Readonly<BotKitConfig> {
  if (globalConfig == null) {
    throw new Error('BotKit has not been configured.');
  }
  return globalConfig;
}
