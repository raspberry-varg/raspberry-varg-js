import { type Client, type ClientEvents } from 'discord.js';

import { discoverAll } from '../util/autoDiscover.js';
import { resolveSerializableOr } from '../util/serializableOr.js';

import {
  isAnyCommandHandler,
  isContextMenuCommandHandler,
  isSlashCommandHandler,
} from './command.js';
import { type EventContext, isEventHandler } from './event.js';
import * as registry from './registry.js';

import type { BotKitConfig } from '../core/index.js';

export async function loadAllInteractions(config: BotKitConfig, client: Client) {
  const { commands = [], clientEvents = [] } = config.handlers;
  const [discoveredCommands, discoveredEvents] = await Promise.all([
    discoverAll(commands, isAnyCommandHandler),
    discoverAll(clientEvents, isEventHandler),
  ]);
  for (const exported of discoveredCommands) {
    handleOne(client, exported);
  }
  for (const exported of discoveredEvents) {
    handleOne(client, exported);
  }
}

function handleOne(client: Client, exported: unknown): void {
  if (isSlashCommandHandler(exported)) {
    const data = resolveSerializableOr(exported.data);
    exported.data = data;
    registry.slashCommands.set(data.name, exported);
  } else if (isContextMenuCommandHandler(exported)) {
    const data = resolveSerializableOr(exported.data);
    exported.data = data;
    registry.contextMenuCommands.set(data.name, exported);
  } else if (isEventHandler(exported)) {
    const { event, once, execute } = exported;
    const prev = registry.events.get(event);
    if (prev) {
      client.off(event as string, prev.execute);
      registry.events.delete(event);
    }

    const ctx: EventContext = {
      client,
    };
    const handler = (...args: ClientEvents[keyof ClientEvents]) => execute(...args, ctx);
    if (once) {
      client.once(event, handler);
    } else {
      client.on(event, handler);
    }
    registry.events.set(event, exported);
  }
}
