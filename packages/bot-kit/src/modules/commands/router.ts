import {
  type Client,
  Collection,
  Events,
  type Interaction,
  type ReadonlyCollection,
} from 'discord.js';

import {
  type AnyCommandHandler,
  type ContextMenuCommandHandler,
  isContextMenuCommandHandler,
  isSlashCommandHandler,
  type SlashCommandHandler,
} from '../../discord/index.js';
import { coreLog } from '../../internal/coreLog.js';
import { assertNever } from '../../util/assertNever.js';

import type { InteractionMiddleware } from '../../core/index.js';
import type { DiscordRouter } from '../shared/discordRouter.js';

export interface CommandRouter extends DiscordRouter {
  register(handler: AnyCommandHandler): void;
  handle(interaction: Interaction): Promise<void>;
  getSlashCommands(): ReadonlyCollection<string, SlashCommandHandler>;
  getContextMenuCommands(): ReadonlyCollection<string, ContextMenuCommandHandler>;
}

export interface CommandRouterOptions {
  middleware?: readonly InteractionMiddleware[];
}

const logger = coreLog.namespaced('CommandRouter');
export class CommandRouterImpl implements CommandRouter {
  private readonly slashCommands = new Collection<string, SlashCommandHandler>();
  private readonly contextMenuCommands = new Collection<string, ContextMenuCommandHandler>();
  private boundHandle?: (interaction: Interaction) => Promise<void>;

  constructor(private readonly config: CommandRouterOptions) {}

  getSlashCommands(): ReadonlyCollection<string, SlashCommandHandler> {
    return this.slashCommands;
  }

  getContextMenuCommands(): ReadonlyCollection<string, ContextMenuCommandHandler> {
    return this.contextMenuCommands;
  }

  register(handler: AnyCommandHandler) {
    if (isSlashCommandHandler(handler)) {
      this.slashCommands.set(handler.data.name, handler);
    } else if (isContextMenuCommandHandler(handler)) {
      this.contextMenuCommands.set(handler.data.name, handler);
    } else {
      assertNever(handler);
    }
  }

  listen(client: Client): void {
    this.boundHandle ??= this.handle.bind(this);
    client.on(Events.InteractionCreate, this.boundHandle);
  }

  off(client: Client): void {
    if (this.boundHandle) {
      client.off(Events.InteractionCreate, this.boundHandle);
    }
  }

  async handle(interaction: Interaction) {
    const middlewares = this.config.middleware;
    try {
      if (!middlewares?.length) {
        await this.doHandle(interaction);
      } else {
        await executeMiddlewares(middlewares, interaction, this.doHandle);
      }
    } catch (error: unknown) {
      logger.error('Error while handling interaction', error, {
        id: interaction.id,
        type: interaction.type,
        userId: interaction.user.id,
      });
    }
  }

  private doHandle = async (interaction: Interaction): Promise<void> => {
    if (interaction.isChatInputCommand()) {
      logger.verbose(`Received chat input command: ${interaction.commandName}`);
      const handler = this.slashCommands.get(interaction.commandName);
      if (!handler) {
        logger.warn(`No handler found for command: ${interaction.commandName}`);
        return;
      }
      console.log(`Executing slash command: ${interaction.commandName}`);
      await handler.execute(interaction);
      console.log(`Slash command executed: ${interaction.commandName}`);
    }
    if (interaction.isAutocomplete()) {
      logger.verbose(`Received autocomplete request: ${interaction.commandName}`);
      const handler = this.slashCommands.get(interaction.commandName);
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
      const handler = this.contextMenuCommands.get(interaction.commandName);
      if (!handler) {
        logger.warn(`No handler found for command: ${interaction.commandName}`);
        return;
      }
      await handler.execute(interaction);
    }
  };
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
