import { type AppConfig, appConfigDefaults } from '../app/config.js';

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

export type CommandDeployment =
  | {
      target: 'global';
    }
  | {
      target: 'guilds';
      guildIds: string | readonly string[];
    };

/**
 * Full configuration for BotKit.
 */
export interface BotKitConfig extends AppConfig {
  client: {
    options: ClientOptions;
    token: string;
    applicationId: string;
  };

  commandSync: {
    /**
     * Paths to search for command and event handlers.
     */
    paths?: readonly string[];
    shouldSync: (newHash: string) => boolean | Promise<boolean>;
    onSynced?: (newHash: string) => void | Promise<void>;
    deploy: CommandDeployment;
  };

  interactionMiddleware: readonly InteractionMiddleware[];
}

const globalConfigDefaults = {
  ...appConfigDefaults,
  interactionMiddleware: [] as BotKitConfig['interactionMiddleware'],
} satisfies Partial<BotKitConfig>;

let globalConfig: BotKitConfig | undefined;

export function configure(options: BootstrapConfigPartial): BotKitConfig {
  if (globalConfig != null) {
    throw new Error('BotKit has already been configured.');
  }
  globalConfig = { ...globalConfigDefaults, ...options };
  return globalConfig;
}

export function getConfig(): Readonly<BotKitConfig> {
  if (globalConfig == null) {
    throw new Error('BotKit has not been configured.');
  }
  return globalConfig;
}
