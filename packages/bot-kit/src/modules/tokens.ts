import { createToken, type Token } from '../di/index.js';

import { CommandRouter } from './commands/router.js';

import type { ClientEventRouter } from './client-events/router.js';
import type { FeatureModule } from './module.js';
import type { Client } from 'discord.js';

export const InternalTokens = Object.freeze({
  Modules: createToken<FeatureModule[]>('raspberryvarg.Core.Internal.Modules'),
});

export const BotKitTokens = Object.freeze({
  Client: createToken<Client<true>>('BotKit.Client'),
  CommandRouter: createToken<CommandRouter>('BotKit.CommandRouter'),
  ClientEventRouter: createToken<ClientEventRouter>('BotKit.ClientEventRouter'),
} satisfies Record<string, Token<unknown>>);

export const BotKitModules = Object.freeze({
  Client: 'BotKit.Client',
  Commands: 'BotKit.Commands',
  ClientEvents: 'BotKit.ClientEvents',
} satisfies Record<string, string>);
