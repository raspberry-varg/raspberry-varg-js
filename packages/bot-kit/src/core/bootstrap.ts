import { Client } from 'discord.js';

import { bootstrapApp, type BootstrapAppResult } from '../app/bootstrapApp.js';
import { hydrateAppEmojis } from '../emojis/emojis.js';
import {
  ClientEventsModule,
  ClientModule,
  CommandModule,
  type FeatureModule,
} from '../modules/index.js';
import { BotKitTokens } from '../modules/tokens.js';
import { resolveMaybeReadonlyArray } from '../util/maybeReadonlyArray.js';

import { type BootstrapConfigPartial, configure } from './config.js';

import type { AutoDiscoverable } from '../util/autoDiscover.js';

export interface BootstrapResult extends BootstrapAppResult {
  client: Client;
}

export async function bootstrap(configPartial: BootstrapConfigPartial): Promise<BootstrapResult> {
  const config = configure(configPartial);

  const modules: Array<AutoDiscoverable<FeatureModule>> = [
    ClientModule.configure({
      client: new Client(config.client.options),
      token: config.client.token,
    }),
  ];

  if (config.commands) {
    modules.push(CommandModule.configure(config.commands));
  }

  if (config.events) {
    modules.push(ClientEventsModule.configure(config.events));
  }

  if (config.modules) {
    modules.push(...resolveMaybeReadonlyArray(config.modules));
  }

  const bootstrapAppResult = await bootstrapApp({
    ...config,
    modules,
  });

  const client = bootstrapAppResult.container.resolve(BotKitTokens.Client);
  hydrateAppEmojis(client.application);

  return {
    ...bootstrapAppResult,
    client,
  };
}
