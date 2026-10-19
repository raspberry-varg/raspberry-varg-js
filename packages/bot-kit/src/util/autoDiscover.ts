import { coreLog } from '../internal/coreLog.js';

import { loadFolder } from './loadFolder.js';

import type { MaybeReadonlyArray } from './maybeReadonlyArray.js';
import type { TypeGuard } from './typeGuard.js';

export type AutoDiscoverable<T> = T | DiscoverSearchOptions;

export interface DiscoverSearchOptions {
  root: string;
  pattern?: string;
}

export async function discoverAll<T>(
  autos: MaybeReadonlyArray<AutoDiscoverable<T>>,
  typeGuard: TypeGuard<T>,
): Promise<T[]> {
  const resolved: T[] = [];
  const toResolve = Array.isArray(autos) ? autos : [autos];
  for (const resolvable of toResolve) {
    if (typeGuard(resolvable)) {
      resolved.push(resolvable);
    } else {
      resolved.push(...(await discover(resolvable, typeGuard)));
    }
  }
  return resolved;
}

export async function discover<T>(
  options: DiscoverSearchOptions,
  typeGuard: TypeGuard<T>,
): Promise<T[]> {
  const { root, pattern } = options;
  const loaded = await loadFolder(root, pattern);
  const discovered: T[] = [];
  for (let i = 0; i < loaded.length; i++) {
    for (const exported of Object.values(loaded[i])) {
      if (typeGuard(exported)) {
        coreLog.verbose(`Auto-discovered: ${String(exported)}`);
        discovered.push(exported);
      }
    }
  }
  return discovered;
}
