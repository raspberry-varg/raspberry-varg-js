import { Client, Events } from 'discord.js';

import { coreLog } from '../../internal/coreLog.js';
import { defineModule, type FeatureModule } from '../module.js';
import { BotKitModules, BotKitTokens } from '../tokens.js';

interface ClientModuleOptions {
  client: Client;
  token: string;
}

const logger = coreLog.namespaced('ClientModule');
export const ClientModule = {
  configure: (options: ClientModuleOptions): FeatureModule => {
    return defineModule({
      name: BotKitModules.Client,
      hmr: {
        surviveSoftReload: true,
      },
      register(container, { hmr }) {
        if (hmr?.isReload) {
          container
            .value(BotKitTokens.Client, hmr.previousContainer.resolve(BotKitTokens.Client))
            .lock(BotKitTokens.Client);
          return;
        }
        container.value(BotKitTokens.Client, options.client).lock(BotKitTokens.Client);
      },
      async boot(container) {
        const client = container.resolve(BotKitTokens.Client);
        if (client.isReady()) {
          logger.debug('Client already ready, skipping login and emoji fetch.');
          return;
        }

        await client.login(options.token);
        if (!client.isReady()) {
          let timeout: NodeJS.Timeout | undefined;
          await new Promise<void>((res, rej) => {
            timeout = setTimeout(() => {
              rej(new Error('Client did not become ready within timeout'));
            }, 10_000);
            logger.debug('Waiting for client to become ready...');
            client.once(Events.ClientReady, () => {
              logger.debug('Client is now ready, continuing boot.');
              clearTimeout(timeout);
              res();
            });
          });
        }

        await client.application!.emojis.fetch();
      },
      async shutdown(container) {
        const client = container.resolve(BotKitTokens.Client);
        await client.destroy();
      },
    });
  },
} as const;
Object.freeze(ClientModule);
