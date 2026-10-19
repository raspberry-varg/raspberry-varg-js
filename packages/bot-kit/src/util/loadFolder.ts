import path from 'node:path';

import bun from 'bun';

import { coreLog } from '../internal/coreLog.js';

type ImportedModule = Record<string, unknown>;

const logger = coreLog.namespaced('FileLoader');

export async function loadFolder(dirPath: string, pattern: string | undefined) {
  pattern ||= DefaultPattern ??= createDefaultPattern();
  const glob = new bun.Glob(pattern);
  const filePaths = glob.scan(dirPath);
  const importOps: Array<Promise<ImportedModule>> = [];

  let successCount = 0;
  for await (const file of filePaths) {
    const fullPath = path.join(dirPath, file);
    importOps.push(
      import(fullPath)
        .then((module) => {
          successCount++;
          logger.verbose(`Loaded ${fullPath}`);
          return module;
        })
        .catch((e: unknown) => {
          logger.error(`Failed to load ${fullPath}`, e);
        }),
    );
  }
  logger.verbose(
    `Kicked off ${importOps.length} import load operations in parallel for ${dirPath}`,
  );
  const result = await Promise.all(importOps);
  logger.debug(`Loaded ${successCount} files from ${dirPath}`);
  return result;
}

let DefaultPattern: string | undefined;

function createDefaultPattern() {
  const prefixes = ['', 'm', 'c'];
  const suffixes = ['', 'x'];
  const langs = ['js', 'ts'];
  const exts: string[] = [];
  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      for (const lang of langs) {
        exts.push(`${prefix}${lang}${suffix}`);
      }
    }
  }
  return `**/*.{${exts.join(',')}}`;
}
