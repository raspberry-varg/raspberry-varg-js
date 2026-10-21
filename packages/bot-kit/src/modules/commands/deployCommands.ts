import { type Client, REST, Routes } from 'discord.js';

import type { AnyApplicationCommandsJSONBody } from '../../discord/registry.js';
import type { InternalLogger } from '../../internal/internalLogger.js';
import type { CommandDeployment } from './module.js';

export async function deployCommands(
  logger: InternalLogger,
  client: Client<true>,
  commands: readonly AnyApplicationCommandsJSONBody[],
  options: CommandDeployment,
): Promise<void> {
  const Rest = new REST({ version: '10' }).setToken(client.token);

  if (options.target === 'global') {
    logger.info('Syncing all global application commands...');
    await Rest.put(Routes.applicationCommands(client.application.id), {
      body: commands,
    });
  } else if (options.guildIds) {
    const putQueue = [];
    const ids: readonly string[] = Array.isArray(options.guildIds)
      ? options.guildIds
      : [options.guildIds];
    for (const id of ids) {
      logger.info(`Syncing guild application commands for guildId: ${id}`);
      putQueue.push(
        Rest.put(Routes.applicationGuildCommands(client.application.id, id), {
          body: commands,
        }),
      );
    }
    await Promise.all(putQueue);
  }
  logger.info('Application command sync complete');
}
