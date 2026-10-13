import * as path from 'node:path';

import * as bun from 'bun';
import { type Client } from 'discord.js';

import { coreLog } from '../internal/coreLog.js';

import { isContextMenuCommandHandler, isSlashCommandHandler } from './command.js';
import { type EventContext, isEventHandler } from './event.js';
import * as registry from './registry.js';

import type { BotKitConfig } from '../core/index.js';

const isDev = process.env.NODE_ENV === 'development';

export async function loadAllInteractions(config: BotKitConfig, client: Client) {
  if (!config.paths?.length) {
    return;
  }

  await Promise.allSettled(
    config.paths.map((p) =>
      loadFolder(p, (module) => {
        for (const exported of Object.values(module)) {
          if (isSlashCommandHandler(exported)) {
            registry.slashCommands.set(exported.data.name, exported);
          } else if (isContextMenuCommandHandler(exported)) {
            registry.contextMenuCommands.set(exported.data.name, exported);
          } else if (isEventHandler(exported)) {
            const { event, once, execute } = exported;
            const name = String(event);
            const prev = registry.events.get(name);
            if (prev) {
              client.off(name, prev.execute);
              registry.events.delete(name);
            }

            const ctx: EventContext = {
              client,
            };
            const handler = (...args: unknown[]) =>
              (execute as (...args: unknown[]) => unknown)(...args, ctx);
            if (once) {
              client.once(name, handler);
            } else {
              client.on(name, handler);
            }
            registry.events.set(event, exported);
          }
        }
      }),
    ),
  );
}

type FileLoadCallback = (file: Record<string, unknown>) => void;

async function loadFolder(dirPath: string, cb: FileLoadCallback) {
  const glob = new bun.Glob(`**/*.{ts,js,tsx,jsx}`);
  const filePaths = glob.scan(dirPath);
  const importOps: Array<Promise<void>> = [];

  let successCount = 0;
  for await (const file of filePaths) {
    const fullPath = path.join(dirPath, file);
    importOps.push(
      loadOne(fullPath, cb)
        .then(() => {
          successCount++;
          coreLog.verbose(`Loaded ${fullPath}`);
        })
        .catch((e: unknown) => {
          coreLog.error(`Failed to load ${fullPath}`, e);
        }),
    );
  }
  coreLog.verbose(
    `Kicked off ${importOps.length} import load operations in parallel for ${dirPath}`,
  );
  await Promise.all(importOps);
  coreLog.info(`Loaded ${successCount} files from ${dirPath}`);
}

async function loadOne(filePath: string, cb: FileLoadCallback) {
  try {
    const importPath = isDev ? `${filePath}?update=${Date.now()}` : filePath;
    const module = await import(importPath);
    cb(module);
    coreLog.verbose(`Loaded ${importPath}`);
  } catch (error: unknown) {
    coreLog.error(`Failed to hot-load command: ${filePath}`, error);
  }
}
