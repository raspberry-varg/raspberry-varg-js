import crypto from 'crypto';

import { type AnyCommandHandler, isAnyCommandHandler } from '../../discord/index.js';
import { coreLog } from '../../internal/coreLog.js';
import { type AutoDiscoverable, discoverAll } from '../../util/autoDiscover.js';
import {
  type MaybeReadonlyArray,
  resolveMaybeReadonlyArray,
} from '../../util/maybeReadonlyArray.js';
import { resolveSerializableOr } from '../../util/serializableOr.js';
import { defineModule, type FeatureModule } from '../module.js';
import { BotKitModules, BotKitTokens, InternalTokens } from '../tokens.js';

import { deployCommands } from './deployCommands.js';
import { CommandRouterImpl } from './router.js';

import type { InteractionMiddleware } from '../../core/index.js';

export type CommandDeployment =
  | {
      target: 'global';
    }
  | {
      target: 'guilds';
      guildIds: string | readonly string[];
    };

export interface CommandModuleOptions {
  /**
   * Command handlers or paths to search.
   */
  global?: MaybeReadonlyArray<AutoDiscoverable<AnyCommandHandler>>;
  /**
   * Middleware to run before an interaction is routed. The final action is routing a command to
   * its defined command handler.
   */
  middleware?: readonly InteractionMiddleware[];
  /**
   * Optional configuration for syncing commands based on the hash of all the command data JSON.
   */
  sync?: {
    shouldSync: (newHash: string) => boolean | Promise<boolean>;
    onSynced?: (newHash: string) => void | Promise<void>;
    deploy: CommandDeployment;
  };
}

const logger = coreLog.namespaced('CommandModule');
export const CommandModule = {
  configure: (options: CommandModuleOptions): FeatureModule => {
    return defineModule({
      name: BotKitModules.Commands,
      dependsOn: [BotKitModules.Client],
      register(container) {
        container
          .singleton(
            BotKitTokens.CommandRouter,
            () =>
              new CommandRouterImpl({
                middleware: options.middleware,
              }),
          )
          .lock(BotKitTokens.CommandRouter);
      },
      async boot(container, ctx) {
        const modules = container.resolve(InternalTokens.Modules);
        const client = container.resolve(BotKitTokens.Client);
        const commandRouter = container.resolve(BotKitTokens.CommandRouter);

        const discoverable: Array<AutoDiscoverable<AnyCommandHandler>> = [];
        if (options.global) {
          discoverable.push(...resolveMaybeReadonlyArray(options.global));
        }
        for (const module of modules) {
          if (module.commands) {
            discoverable.push(...resolveMaybeReadonlyArray(module.commands));
          }
        }
        const discovered = await discoverAll(discoverable, isAnyCommandHandler);
        for (const handler of discovered) {
          commandRouter.register(handler);
        }
        commandRouter.listen(client);

        if (!ctx.hmr?.isReload) {
          const sync = options.sync;
          if (!sync) {
            return;
          }

          if (!client.isReady()) {
            throw new Error('Client is not ready. Commands cannot be deployed.');
          }

          const { shouldSync, onSynced, deploy } = sync;

          const commands = [
            ...commandRouter.getSlashCommands().map((handler) => handler.data),
            ...commandRouter.getContextMenuCommands().map((handler) => handler.data),
          ].map((serializableOr) => resolveSerializableOr(serializableOr));
          if (!commands.length) {
            logger.info('No commands provided. Skipping deployment.');
            return;
          }
          logger.info(`Found ${commands.length} command(s).`);
          commands.sort((a, b) => a.name.localeCompare(b.name));

          const currentHash = crypto
            .createHash('md5')
            .update(JSON.stringify(commands))
            .digest('hex');
          if (!(await shouldSync(currentHash))) {
            logger.info('Commands are up to date. Skipping deployment.');
            return;
          }
          logger.info('Detected command definition changes. Redeploying.');

          await deployCommands(logger, client, commands, deploy);

          await onSynced?.(currentHash);
        }
      },
      async shutdown(container) {
        const client = container.resolve(BotKitTokens.Client);
        const commandRouter = container.resolve(BotKitTokens.CommandRouter);
        commandRouter.off(client);
      },
    });
  },
} as const;
Object.freeze(CommandModule);
