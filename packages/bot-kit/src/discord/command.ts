import type {
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';

/**
 * Instantiated slash command handler definition.
 */
export interface SlashCommandHandler {
  __router_isSlashCommandHandler: true;
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
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

export function isSlashCommandHandler(value: unknown): value is SlashCommandHandler {
  return value != null && typeof value === 'object' && '__router_isSlashCommandHandler' in value;
}

/**
 * Instantiated context menu command handler definition.
 */
export interface ContextMenuCommandHandler {
  __router_isContextMenuCommandHandler: true;
  data: ContextMenuCommandBuilder;
  execute: (interaction: ContextMenuCommandInteraction) => Promise<void>;
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

export function isContextMenuCommandHandler(value: unknown): value is ContextMenuCommandHandler {
  return (
    value != null && typeof value === 'object' && '__router_isContextMenuCommandHandler' in value
  );
}
