import type { Client, ClientEvents } from 'discord.js';

export interface EventContext {
  client: Client;
}

export interface EventHandlerDefinition<K extends keyof ClientEvents> {
  /**
   * Disconnect the listener as soon as the first event is fired.
   */
  once?: boolean;
  event: K;
  execute: (...args: [...ClientEvents[K], EventContext]) => void | Promise<void>;
}

/**
 * Instantiated slash command handler definition.
 */
export interface EventHandler<
  K extends keyof ClientEvents = keyof ClientEvents,
> extends EventHandlerDefinition<K> {
  __router_isEventHandler: true;
  toString(): string;
}

const eventHandlerPrototype = {
  __router_isEventHandler: true,
  toString(): string {
    return `[EventHandler '${this.event}']`;
  },
} satisfies Partial<EventHandler>;

/**
 * Creates a slash command handler definition.
 */
export function defineEvent<K extends keyof ClientEvents>(
  definition: EventHandlerDefinition<K>,
): EventHandler<K> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const instance = Object.create(eventHandlerPrototype) as typeof eventHandlerPrototype;
  return Object.assign(instance, definition);
}

export function isEventHandler(value: unknown): value is EventHandler {
  return value != null && typeof value === 'object' && '__router_isEventHandler' in value;
}
