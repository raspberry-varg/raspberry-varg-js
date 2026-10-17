import {
  Collection,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

import { resolveSerializableOr } from '../util/serializableOr.js';

import { type ContextMenuCommandHandler, type SlashCommandHandler } from './command.js';

import type { EventHandler } from './event.js';

// TODO: Make registry creation lazy so we can use getConfig().supportHotReloading
const isDev = process.env.NODE_ENV === 'development';

const hmr = globalThis as typeof globalThis & {
  hotReloadCommandRegistry?: {
    slashCommands: Collection<string, SlashCommandHandler>;
    contextMenuCommands: Collection<string, ContextMenuCommandHandler>;
    events: Collection<string, EventHandler>;
  };
};

if (isDev && !hmr.hotReloadCommandRegistry) {
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
