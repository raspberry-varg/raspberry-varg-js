import * as path from 'node:path';

import * as bun from 'bun';
import { type Client, type ClientEvents } from 'discord.js';

import { resolveSerializableOr } from '../util/serializableOr.js';

import { isContextMenuCommandHandler, isSlashCommandHandler } from './command.js';
import { type EventContext, isEventHandler } from './event.js';
import { discordLogger } from './logger.js';
import * as registry from './registry.js';

import type { BotKitConfig } from '../core/index.js';

const logger = discordLogger.namespaced('loader');

export async function loadAllInteractions(config: BotKitConfig, client: Client) {
  const paths = config.commandSync.paths;
  if (!paths?.length) {
    return;
  }

  await Promise.allSettled(
    paths.map((p) =>
      loadFolder(p, config, (module) => {
        for (const exported of Object.values(module)) {
          if (isSlashCommandHandler(exported)) {
            const data = resolveSerializableOr(exported.data);
            exported.data = data;
            registry.slashCommands.set(data.name, exported);
          } else if (isContextMenuCommandHandler(exported)) {
            const data = resolveSerializableOr(exported.data);
            exported.data = data;
            registry.contextMenuCommands.set(data.name, exported);
          } else if (isEventHandler(exported)) {
            const { event, once, execute } = exported;
            const prev = registry.events.get(event);
            if (prev) {
              client.off(event as string, prev.execute);
              registry.events.delete(event);
            }

            const ctx: EventContext = {
              client,
            };
            const handler = (...args: ClientEvents[keyof ClientEvents]) => execute(...args, ctx);
            if (once) {
              client.once(event, handler);
            } else {
              client.on(event, handler);
            }
            registry.events.set(event, exported);
          }
        }
      }),
    ),
  );
}

type FileLoadCallback = (file: Record<string, unknown>) => void;

async function loadFolder(dirPath: string, config: BotKitConfig, cb: FileLoadCallback) {
  const glob = new bun.Glob(`**/*.{ts,js,tsx,jsx}`);
  const filePaths = glob.scan(dirPath);
  const importOps: Array<Promise<void>> = [];

  let successCount = 0;
  for await (const file of filePaths) {
    const fullPath = path.join(dirPath, file);
    importOps.push(
      loadOne(fullPath, config, cb)
        .then(() => {
          successCount++;
          logger.verbose(`Loaded ${fullPath}`);
        })
        .catch((e: unknown) => {
          logger.error(`Failed to load ${fullPath}`, e);
        }),
    );
  }
  logger.verbose(
    `Kicked off ${importOps.length} import load operations in parallel for ${dirPath}`,
  );
  await Promise.all(importOps);
  logger.info(`Loaded ${successCount} files from ${dirPath}`);
}

async function loadOne(filePath: string, config: BotKitConfig, cb: FileLoadCallback) {
  const importPath = config.supportHotReloading ? `${filePath}?update=${Date.now()}` : filePath;
  const module = await import(importPath);
  cb(module);
}
