import {
  Collection,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

import { coreLog } from '../internal/coreLog.js';
import { resolveSerializableOr } from '../util/serializableOr.js';

import { type ContextMenuCommandHandler, type SlashCommandHandler } from './command.js';

import type { EventHandler } from './event.js';

const isDev = process.env.NODE_ENV === 'development';

const hmr = globalThis as typeof globalThis & {
  hotReloadCommandRegistry?: {
    slashCommands: Collection<string, SlashCommandHandler>;
    contextMenuCommands: Collection<string, ContextMenuCommandHandler>;
    events: Collection<string, EventHandler>;
  };
};

if (isDev && !hmr.hotReloadCommandRegistry) {
  coreLog.info('🔥 HMR: Initializing file registry.');
  hmr.hotReloadCommandRegistry = {
    slashCommands: new Collection(),
    contextMenuCommands: new Collection(),
    events: new Collection(),
  };
}

export const slashCommands =
  (isDev && hmr.hotReloadCommandRegistry!.slashCommands) ||
  new Collection<string, SlashCommandHandler>();

export const contextMenuCommands =
  (isDev && hmr.hotReloadCommandRegistry!.contextMenuCommands) ||
  new Collection<string, ContextMenuCommandHandler>();

export const events =
  (isDev && hmr.hotReloadCommandRegistry!.events) || new Collection<string, EventHandler>();

export type AnyApplicationCommandsJSONBody =
  | RESTPostAPIContextMenuApplicationCommandsJSONBody
  | RESTPostAPIChatInputApplicationCommandsJSONBody;

export function gatherCommandsToJson(): ReadonlyArray<AnyApplicationCommandsJSONBody> {
  return [
    ...slashCommands.map((handler) => handler.data),
    ...contextMenuCommands.map((handler) => handler.data),
  ].map((serializableOr) => resolveSerializableOr(serializableOr));
}
