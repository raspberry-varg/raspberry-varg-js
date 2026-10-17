import { type BotKitConfig, getConfig, type InteractionMiddleware } from '../core/config.js';

import { discordLogger } from './logger.js';
import * as registry from './registry.js';

import type { Client, Interaction } from 'discord.js';

const logger = discordLogger.namespaced('router');
const hmr = globalThis as typeof globalThis & {
  hmr__onInteractionCreateHandler?: (interaction: Interaction) => void;
};

export function initializeRouter(config: BotKitConfig, client: Client): void {
  const handler = (config.supportHotReloading && hmr.hmr__onInteractionCreateHandler) || handle;
  if (config.supportHotReloading && hmr.hmr__onInteractionCreateHandler) {
    client.off('interactionCreate', hmr.hmr__onInteractionCreateHandler);
  }

  client.on('interactionCreate', handler);

  if (config.supportHotReloading) {
    hmr.hmr__onInteractionCreateHandler = handler;
  }
}

async function handle(interaction: Interaction): Promise<void> {
  const middlewares = getConfig().interactionMiddleware;
  try {
    if (middlewares.length === 0) {
      await doHandle(interaction);
    } else {
      await executeMiddlewares(middlewares, interaction, doHandle);
    }
  } catch (error: unknown) {
    logger.error('Error while handling interaction', error, {
      id: interaction.id,
      type: interaction.type,
      userId: interaction.user.id,
    });
  }
}

async function doHandle(interaction: Interaction): Promise<void> {
  if (interaction.isChatInputCommand()) {
    logger.verbose(`Received chat input command: ${interaction.commandName}`);
    const handler = registry.slashCommands.get(interaction.commandName);
    if (!handler) {
      logger.warn(`No handler found for command: ${interaction.commandName}`);
      return;
    }
    if (handler.autocomplete && interaction.isAutocomplete()) {
      await handler.autocomplete(interaction);
    } else {
      await handler.execute(interaction);
    }
  }
  if (interaction.isAutocomplete()) {
    logger.verbose(`Received autocomplete request: ${interaction.commandName}`);
    const handler = registry.slashCommands.get(interaction.commandName);
    if (!handler) {
      logger.warn(`No handler found for command: ${interaction.commandName}`);
      return;
    }
    if (!handler.autocomplete) {
      logger.warn(`No autocomplete handler found for command: ${interaction.commandName}`);
      return;
    }
    await handler.autocomplete(interaction);
  }
  if (interaction.isContextMenuCommand()) {
    logger.verbose(`Received context menu command: ${interaction.commandName}`);
    const handler = registry.contextMenuCommands.get(interaction.commandName);
    if (!handler) {
      logger.warn(`No handler found for command: ${interaction.commandName}`);
      return;
    }
    await handler.execute(interaction);
  }
}

async function executeMiddlewares(
  pipeline: readonly InteractionMiddleware[],
  interaction: Interaction,
  finalStep: (interaction: Interaction) => void | Promise<void>,
): Promise<void> {
  let index = -1;

  const dispatch = async (i: number): Promise<void> => {
    if (i <= index) throw new Error('next() called multiple times in middleware');
    index = i;

    if (i === pipeline.length) {
      await finalStep(interaction);
      return;
    }

    const middleware = pipeline[i];
    await middleware(interaction, () => dispatch(i + 1));
  };

  await dispatch(0);
}
