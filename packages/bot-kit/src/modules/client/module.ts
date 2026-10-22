import { Client } from 'discord.js';

import { defineModule, type FeatureModule } from '../module.js';
import { BotKitTokens, BotKitModules } from '../tokens.js';

interface ClientModuleOptions {
  client: Client;
  token: string;
}

export const ClientModule = Object.freeze({
  configure: (options: ClientModuleOptions): FeatureModule => {
    return defineModule({
      name: BotKitModules.Client,
      register(container) {
        container.value(BotKitTokens.Client, options.client).lock(BotKitTokens.Client);
      },
      async boot(container) {
        const client = container.resolve(BotKitTokens.Client);
        await client.login(options.token);
      },
      async shutdown(container) {
        const client = container.resolve(BotKitTokens.Client);
        await client.destroy();
      },
      hmr: {
        surviveSoftReload: true,
      },
    });
  },
});
