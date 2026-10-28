import { type EventHandler, isEventHandler } from '../../discord/index.js';
import { type AutoDiscoverable, discoverAll, normalizeSearch } from '../../util/autoDiscover.js';
import {
  type MaybeReadonlyArray,
  resolveMaybeReadonlyArray,
} from '../../util/maybeReadonlyArray.js';
import { defineModule, type FeatureModule } from '../module.js';
import { BotKitModules, BotKitTokens, InternalTokens } from '../tokens.js';

import { ClientEventRouterImpl } from './router.js';

export interface ClientEventsModuleOptions {
  global?: MaybeReadonlyArray<AutoDiscoverable<EventHandler>>;
}

export const ClientEventsModule = {
  configure: (options: ClientEventsModuleOptions): FeatureModule => {
    return defineModule({
      name: BotKitModules.ClientEvents,
      dependsOn: [BotKitModules.Client],
      register(container) {
        container
          .singleton(BotKitTokens.ClientEventRouter, () => new ClientEventRouterImpl())
          .lock(BotKitTokens.ClientEventRouter);
      },
      async boot(container) {
        const modules = container.resolve(InternalTokens.Modules);
        const client = container.resolve(BotKitTokens.Client);
        const clientEventRouter = container.resolve(BotKitTokens.ClientEventRouter);

        const discoverable: Array<AutoDiscoverable<EventHandler>> = [];
        if (options.global) {
          discoverable.push(...resolveMaybeReadonlyArray(options.global));
        }
        for (const module of modules) {
          if (module.events) {
            const root = module.root ?? module.__dirname;
            if (!root) {
              throw new Error(
                'Module must define a root or __dirname property when auto-discovering events.',
              );
            }
            const events = resolveMaybeReadonlyArray(module.events).map((event) =>
              isEventHandler(event) ? event : normalizeSearch(event, root),
            );
            discoverable.push(...events);
          }
        }
        const discovered = await discoverAll(discoverable, isEventHandler);
        for (const handler of discovered) {
          clientEventRouter.register(handler);
        }
        clientEventRouter.listen(client);
      },
      shutdown(container) {
        const client = container.resolve(BotKitTokens.Client);
        const router = container.resolve(BotKitTokens.ClientEventRouter);
        router.off(client);
      },
    });
  },
} as const;
Object.freeze(ClientEventsModule);
