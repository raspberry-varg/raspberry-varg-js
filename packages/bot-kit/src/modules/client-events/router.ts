import { type Client, type ClientEvents, Collection, type ReadonlyCollection } from 'discord.js';

import { type EventContext, type EventHandler } from '../../discord/index.js';

import type { DiscordRouter } from '../shared/discordRouter.js';

export interface ClientEventRouter extends DiscordRouter {
  register(handler: EventHandler): void;
  getHandlers(): ReadonlyCollection<string, EventHandler>;
}

interface HandlerEntry {
  handler: EventHandler;
  bound?: (...args: ClientEvents[keyof ClientEvents]) => void | Promise<void>;
}

export class ClientEventRouterImpl implements ClientEventRouter {
  private readonly handlers = new Collection<string, HandlerEntry>();

  getHandlers(): ReadonlyCollection<string, EventHandler> {
    return new Collection(this.handlers.map((entry) => [entry.handler.event, entry.handler]));
  }

  register(handler: EventHandler) {
    this.handlers.set(handler.event, { handler });
  }

  listen(client: Client): void {
    const ctx: EventContext = { client };
    for (const [event, entry] of this.handlers) {
      entry.bound ??= (...args) => entry.handler.execute(...args, ctx);
      if (entry.handler.once) {
        client.once(event, entry.bound);
      } else {
        client.on(event, entry.bound);
      }
    }
  }

  off(client: Client): void {
    for (const [event, entry] of this.handlers) {
      if (entry.bound) {
        client.off(event, entry.bound);
      }
    }
  }
}
