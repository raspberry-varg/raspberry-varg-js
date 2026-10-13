import { coreLog } from '../internal/coreLog.js';

import * as registry from './registry.js';

import type { Client, Interaction } from 'discord.js';

const isDev = process.env.NODE_ENV === 'development';
const hmr = globalThis as typeof globalThis & {
  onInteractionCreateHandler: (interaction: Interaction) => void;
};

export function initializeRouter(client: Client): void {
  const handler = (isDev && hmr.onInteractionCreateHandler) || handle;
  if (isDev && hmr.onInteractionCreateHandler) {
    client.off('interactionCreate', hmr.onInteractionCreateHandler);
  }

  client.on('interactionCreate', handler);

  if (isDev) {
    hmr.onInteractionCreateHandler = handler;
  }
}

async function handle(interaction: Interaction): Promise<void> {
  try {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    await doHandle(interaction);
  } catch (error: unknown) {
    coreLog.error('Error while handling interaction', error, {
      id: interaction.id,
      type: interaction.type,
      userId: interaction.user.id,
    });
  }
}

async function doHandle(interaction: Interaction): Promise<void> {
  if (interaction.isChatInputCommand()) {
    coreLog.verbose(`Received chat input command: ${interaction.commandName}`);
    const handler = registry.slashCommands.get(interaction.commandName);
    if (!handler) {
      coreLog.warn(`No handler found for command: ${interaction.commandName}`);
      return;
    }
    if (handler.autocomplete && interaction.isAutocomplete()) {
      await handler.autocomplete(interaction);
    } else {
      await handler.execute(interaction);
    }
  }
  if (interaction.isAutocomplete()) {
    coreLog.verbose(`Received autocomplete request: ${interaction.commandName}`);
    const handler = registry.slashCommands.get(interaction.commandName);
    if (!handler) {
      coreLog.warn(`No handler found for command: ${interaction.commandName}`);
      return;
    }
    if (!handler.autocomplete) {
      coreLog.warn(`No autocomplete handler found for command: ${interaction.commandName}`);
      return;
    }
    await handler.autocomplete(interaction);
  }
  if (interaction.isContextMenuCommand()) {
    coreLog.verbose(`Received context menu command: ${interaction.commandName}`);
    const handler = registry.contextMenuCommands.get(interaction.commandName);
    if (!handler) {
      coreLog.warn(`No handler found for command: ${interaction.commandName}`);
      return;
    }
    await handler.execute(interaction);
  }
}
