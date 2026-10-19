import {
  type AutocompleteInteraction,
  type Awaitable,
  type ChatInputCommandInteraction,
  type ContextMenuCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

import {
  type ResolvedSerializableOr,
  resolveSerializableOr,
  type SerializableOr,
} from '../util/serializableOr.js';

/**
 * Any valid command handler.
 */
export type AnyCommandHandler = SlashCommandHandler | ContextMenuCommandHandler;

export function isAnyCommandHandler(value: unknown): value is AnyCommandHandler {
  return isSlashCommandHandler(value) || isContextMenuCommandHandler(value);
}

/**
 * Valid data for slash commands.
 */
export type SlashCommandData = SerializableOr<RESTPostAPIChatInputApplicationCommandsJSONBody>;

/**
 * Valid data for context menu commands.
 */
export type ContextMenuCommandData =
  SerializableOr<RESTPostAPIContextMenuApplicationCommandsJSONBody>;

interface SlashCommandHandlerBase {
  execute: (interaction: ChatInputCommandInteraction) => Awaitable<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Awaitable<void>;
}

export interface SlashCommandHandlerDefinition extends SlashCommandHandlerBase {
  data: SlashCommandData;
}

export interface SlashCommandHandler extends SlashCommandHandlerBase {
  __router_isSlashCommandHandler: true;
  data: ResolvedSerializableOr<SlashCommandData>;
  toString(): string;
}

const SlashCommandPrototype = {
  __router_isSlashCommandHandler: true,
  toString(): string {
    return `[SlashCommandHandler '${this.data?.name}']`;
  },
} satisfies Partial<SlashCommandHandler>;

/**
 * Creates a slash command handler definition.
 */
export function defineSlashCommand(definition: SlashCommandHandlerDefinition): SlashCommandHandler {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const instance = Object.create(SlashCommandPrototype) as typeof SlashCommandPrototype;
  return Object.assign(instance, {
    data: resolveSerializableOr(definition.data),
    execute: definition.execute,
    autocomplete: definition.autocomplete,
  });
}

/**
 * Returns true if the value is a slash command handler created with {@link defineSlashCommand}.
 */
export function isSlashCommandHandler(value: unknown): value is SlashCommandHandler {
  return value != null && typeof value === 'object' && '__router_isSlashCommandHandler' in value;
}

interface ContextMenuCommandHandlerDefinitionBase {
  execute: (interaction: ContextMenuCommandInteraction) => Awaitable<void>;
}

export interface ContextMenuCommandHandlerDefinition extends ContextMenuCommandHandlerDefinitionBase {
  data: ContextMenuCommandData;
}

export interface ContextMenuCommandHandler extends ContextMenuCommandHandlerDefinitionBase {
  __router_isContextMenuCommandHandler: true;
  data: ResolvedSerializableOr<ContextMenuCommandData>;
  toString(): string;
}

const ContextMenuCommandPrototype = {
  __router_isContextMenuCommandHandler: true,
  toString(): string {
    return `[ContextMenuCommandHandler '${this.data?.name}']`;
  },
} satisfies Partial<ContextMenuCommandHandler>;

/**
 * Creates a context menu command handler definition.
 */
export function defineContextMenuCommand(
  definition: ContextMenuCommandHandlerDefinition,
): ContextMenuCommandHandler {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const instance = Object.create(ContextMenuCommandPrototype) as typeof ContextMenuCommandPrototype;
  return Object.assign(instance, {
    data: resolveSerializableOr(definition.data),
    execute: definition.execute,
  });
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
