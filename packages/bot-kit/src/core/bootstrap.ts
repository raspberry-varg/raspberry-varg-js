import crypto from 'crypto';

import { Client, REST, Routes } from 'discord.js';

import { loadAllInteractions } from '../discord/load.js';
import { type AnyApplicationCommandsJSONBody, gatherCommandsToJson } from '../discord/registry.js';
import { initializeRouter } from '../discord/router.js';
import { coreLog } from '../internal/coreLog.js';

import { type BotKitConfig, type BotKitConfigPartial, configure } from './config.js';

const isDev = process.env.NODE_ENV === 'development';

const hmr = globalThis as typeof globalThis & {
  discordClient?: Client;
  discordClientLoggedIn?: boolean;
};

export async function bootstrap(configPartial: BotKitConfigPartial): Promise<void> {
  const config = configure(configPartial);
  let client: Client;
  if (!isDev) {
    client = new Client(config.clientOptions);
  } else {
    if (hmr.discordClient) {
      coreLog.info('🔥 HMR: Reusing existing client.');
      client = hmr.discordClient;
    } else {
      client = new Client(config.clientOptions);
    }
  }

  await loadAllInteractions(config, client);
  await deployCommandsIfNecessary(config);

  if (isDev && hmr.discordClientLoggedIn) {
    coreLog.info('🔥 HMR: Skipping Discord client login.');
    return;
  }

  await client.login(config.clientToken);
  if (isDev) {
    hmr.discordClientLoggedIn = true;
  }
  initializeRouter(client);
  coreLog.info('Client successfully logged in.');
}

async function deployCommandsIfNecessary(config: BotKitConfig): Promise<void> {
  const { commandSync } = config;

  let commands = gatherCommandsToJson();
  if (!commands.length) {
    coreLog.info('No commands found. Skipping deployment.');
    return;
  }
  commands = commands.toSorted((a, b) => a.name.localeCompare(b.name));

  const currentHash = crypto.createHash('md5').update(JSON.stringify(commands)).digest('hex');
  const shouldSync = await commandSync.shouldSync(currentHash);
  if (!shouldSync) {
    coreLog.info('Commands are up to date. Skipping deployment.');
    return;
  }
  coreLog.info('Detected command definition changes. Redeploying.');

  await deployCommands(
    config,
    commands,
    commandSync.target === 'global'
      ? {
          syncGlobally: true,
        }
      : {
          syncGlobally: false,
          guildIds:
            typeof commandSync.testGuildIds === 'string'
              ? [commandSync.testGuildIds]
              : commandSync.testGuildIds,
        },
  );

  commandSync.onSynced?.(currentHash);
}

type SyncCommandsOptions =
  | {
      syncGlobally?: false;
      guildIds: string[];
    }
  | {
      syncGlobally: true;
    };

async function deployCommands(
  config: BotKitConfig,
  commands: readonly AnyApplicationCommandsJSONBody[],
  options: SyncCommandsOptions,
): Promise<void> {
  const Rest = new REST({ version: '10' }).setToken(config.clientToken);

  if (options.syncGlobally) {
    coreLog?.info('Syncing all global application commands...');
    await Rest.put(Routes.applicationCommands(config.clientApplicationId), {
      body: commands,
    });
  } else if (options.guildIds) {
    const putQueue = [];
    const ids = options.guildIds;
    for (const id of ids) {
      coreLog?.info(`Syncing guild application commands for guildId: ${id}`);
      putQueue.push(
        Rest.put(Routes.applicationGuildCommands(config.clientApplicationId, id), {
          body: commands,
        }),
      );
    }
    await Promise.all(putQueue);
  }
  coreLog?.info('Application command sync complete');
}
