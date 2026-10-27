import { createToken, type Token } from '../di/index.js';

import { CommandRouter } from './commands/router.js';

import type { ClientEventRouter } from './client-events/router.js';
import type { FeatureModule } from './module.js';
import type { Client } from 'discord.js';

export const InternalTokens = {
  Modules: createToken<FeatureModule[]>('raspberryvarg.Core.Internal.Modules'),
} as const;
Object.freeze(InternalTokens);

export const BotKitTokens = {
  Client: createToken<Client>('BotKit.Client'),
  CommandRouter: createToken<CommandRouter>('BotKit.CommandRouter'),
  ClientEventRouter: createToken<ClientEventRouter>('BotKit.ClientEventRouter'),
} as const satisfies Record<string, Token<unknown>>;
Object.freeze(BotKitTokens);

export const BotKitModules = {
  Client: 'BotKit.Client',
  Commands: 'BotKit.Commands',
  ClientEvents: 'BotKit.ClientEvents',
} as const satisfies Record<string, string>;
Object.freeze(BotKitModules);
