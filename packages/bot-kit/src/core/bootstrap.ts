import crypto from 'crypto';

import { Client, REST, Routes } from 'discord.js';

import { bootstrapApp, type BootstrapAppResult } from '../app/bootstrapApp.js';
import { loadAllInteractions } from '../discord/load.js';
import { type AnyApplicationCommandsJSONBody, gatherCommandsToJson } from '../discord/registry.js';
import { initializeRouter } from '../discord/router.js';
import { coreLog } from '../internal/coreLog.js';

import {
  type BotKitConfig,
  type BootstrapConfigPartial,
  configure,
  type CommandDeployment,
} from './config.js';

const hmr = globalThis as typeof globalThis & {
  hmr__discordClient?: Client;
  hmr__discordClientLoggedIn?: boolean;
};

export interface BootstrapResult extends BootstrapAppResult {
  client: Client;
}

export async function bootstrap(configPartial: BootstrapConfigPartial): Promise<BootstrapResult> {
  const config = configure(configPartial);
  const bootstrapAppResult = await bootstrapApp(config);

  let client: Client;
  if (!config.supportHotReloading) {
    client = new Client(config.client.options);
  } else {
    if (hmr.hmr__discordClient) {
      coreLog.info('🔥 HMR: Reusing existing client.');
      client = hmr.hmr__discordClient;
    } else {
      client = new Client(config.client.options);
    }
  }

  await loadAllInteractions(config, client);
  await deployCommandsIfNecessary(config);

  const result: BootstrapResult = {
    ...bootstrapAppResult,
    client,
  };

  if (config.supportHotReloading && hmr.hmr__discordClientLoggedIn) {
    coreLog.info('🔥 HMR: Skipping Discord client login.');
    return result;
  }

  await client.login(config.client.token);
  if (config.supportHotReloading) {
    hmr.hmr__discordClientLoggedIn = true;
  }
  coreLog.info('Client successfully logged in.');

  initializeRouter(config, client);
  coreLog.verbose('Command router initialized.');

  return result;
}

async function deployCommandsIfNecessary(config: BotKitConfig): Promise<void> {
  const { commandSync } = config;

  let commands = gatherCommandsToJson();
  if (!commands.length) {
    coreLog.info('No commands provided. Skipping deployment.');
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

  await deployCommands(config, commands, commandSync.deploy);

  await commandSync.onSynced?.(currentHash);
}

async function deployCommands(
  config: BotKitConfig,
  commands: readonly AnyApplicationCommandsJSONBody[],
  options: CommandDeployment,
): Promise<void> {
  const Rest = new REST({ version: '10' }).setToken(config.client.token);

  if (options.target === 'global') {
    coreLog.info('Syncing all global application commands...');
    await Rest.put(Routes.applicationCommands(config.client.applicationId), {
      body: commands,
    });
  } else if (options.guildIds) {
    const putQueue = [];
    const ids: readonly string[] = Array.isArray(options.guildIds)
      ? options.guildIds
      : [options.guildIds];
    for (const id of ids) {
      coreLog.info(`Syncing guild application commands for guildId: ${id}`);
      putQueue.push(
        Rest.put(Routes.applicationGuildCommands(config.client.applicationId, id), {
          body: commands,
        }),
      );
    }
    await Promise.all(putQueue);
  }
  coreLog.info('Application command sync complete');
}
