import {
  type AutocompleteInteraction,
  type Awaitable,
  type ChatInputCommandInteraction,
  type ContextMenuCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

import type { SerializableOr } from '../util/serializableOr.js';

/**
 * Valid data for slash commands.
 */
export type SlashCommandData = SerializableOr<RESTPostAPIChatInputApplicationCommandsJSONBody>;

/**
 * Valid data for context menu commands.
 */
export type ContextMenuCommandData =
  SerializableOr<RESTPostAPIContextMenuApplicationCommandsJSONBody>;

/**
 * Slash command handler definition.
 */
export interface SlashCommandHandler {
  __router_isSlashCommandHandler: true;
  data: SlashCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Awaitable<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Awaitable<void>;
}

/**
 * Creates a slash command handler definition.
 */
export function defineSlashCommand(
  definition: Omit<SlashCommandHandler, '__router_isSlashCommandHandler'>,
): SlashCommandHandler {
  return {
    ...definition,
    __router_isSlashCommandHandler: true,
  };
}

/**
 * Returns true if the value is a slash command handler created with {@link defineSlashCommand}.
 */
export function isSlashCommandHandler(value: unknown): value is SlashCommandHandler {
  return value != null && typeof value === 'object' && '__router_isSlashCommandHandler' in value;
}

/**
 * Context menu command handler definition.
 */
export interface ContextMenuCommandHandler {
  __router_isContextMenuCommandHandler: true;
  data: ContextMenuCommandData;
  execute: (interaction: ContextMenuCommandInteraction) => Awaitable<void>;
}

/**
 * Creates a context menu command handler definition.
 */
export function defineContextMenuCommand(
  definition: Omit<ContextMenuCommandHandler, '__router_isContextMenuCommandHandler'>,
): ContextMenuCommandHandler {
  return {
    ...definition,
    __router_isContextMenuCommandHandler: true,
  };
}

/**
 * Returns true if the value is a context menu command handler created with
 * {@link defineContextMenuCommand}.
 */
export function isContextMenuCommandHandler(value: unknown): value is ContextMenuCommandHandler {
  return (
    value != null && typeof value === 'object' && '__router_isContextMenuCommandHandler' in value
  );
}
