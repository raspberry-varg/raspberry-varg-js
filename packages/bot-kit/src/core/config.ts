import { type AppConfig, appConfigDefaults } from '../app/config.js';

import type { ClientOptions, Interaction } from 'discord.js';

/**
 * Configuration with keys with defaults marked as optional.
 */
export type BootstrapConfigPartial = Omit<BotKitConfig, keyof typeof globalConfig> &
  Partial<Pick<BotKitConfig, keyof typeof globalConfig>>;

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
  clientOptions: ClientOptions;
  clientToken: string;
  clientApplicationId: string;

  paths: readonly string[];

  commandSync: {
    shouldSync: (newHash: string) => boolean | Promise<boolean>;
    onSynced?: (newHash: string) => void | Promise<void>;
  } & (
    | {
        target: 'global';
      }
    | {
        target: 'development';
        testGuildIds: string | readonly string[];
      }
  );

  interactionMiddleware: readonly InteractionMiddleware[];
}

const globalConfig = {
  ...appConfigDefaults,
  paths: [] as BotKitConfig['paths'],
  interactionMiddleware: [] as BotKitConfig['interactionMiddleware'],
} satisfies Partial<BotKitConfig>;

export function configure(options: BootstrapConfigPartial): BotKitConfig {
  return Object.assign(globalConfig, options) as BotKitConfig;
}

export function getConfig(): Readonly<BotKitConfig> {
  return globalConfig as BotKitConfig;
}
