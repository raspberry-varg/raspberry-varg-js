import type { Client, ClientEvents } from 'discord.js';

export interface EventContext {
  client: Client;
}

/**
 * Instantiated slash command handler definition.
 */
export interface EventHandler<K extends keyof ClientEvents = keyof ClientEvents> {
  __router_isEventHandler: true;
  /**
   * Disconnect the listener as soon as the first event is fired.
   */
  once?: boolean;
  event: K;
  execute: (...args: [...ClientEvents[K], EventContext]) => void | Promise<void>;
}

/**
 * Creates a slash command handler definition.
 */
export function defineEvent<K extends keyof ClientEvents>(
  definition: Omit<EventHandler<K>, '__router_isEventHandler'>,
): EventHandler<K> {
  return {
    ...definition,
    __router_isEventHandler: true,
  };
}

export function isEventHandler(value: unknown): value is EventHandler {
  return value != null && typeof value === 'object' && '__router_isEventHandler' in value;
}
