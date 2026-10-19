import * as path from 'node:path';

import { Container, setGlobalContainer } from '../di/container.js';
import { coreLog } from '../internal/coreLog.js';
import {
  type FeatureModule,
  type FeatureModuleAutoDiscovery,
  isModule,
  type LifecycleMethod,
} from '../modules/index.js';
import { resolveModuleGraph } from '../modules/resolveModuleGraph.js';
import { topologicalSort } from '../util/topologicalSort.js';

import type { AppConfig } from './config.js';

const moduleLoaderLogger = coreLog.namespaced('modules').namespaced('loader');
const hmr = globalThis as typeof globalThis & {
  hmr__globalContainer?: Container;
  hmr__previousModules?: Map<string, FeatureModule>;
  hmr__previousShutdown?: {
    shutdown: BootstrapAppResult['shutdown'];
    shutdownWithExit?: ShutdownFn;
  };
};

type ShutdownFn = () => Promise<void>;

export interface BootstrapAppResult {
  container: Container;
  shutdown: ShutdownFn;
}

export async function bootstrapApp(config: AppConfig): Promise<BootstrapAppResult> {
  const container = (config.supportHotReloading && hmr.hmr__globalContainer) || new Container();
  setGlobalContainer(container);
  if (config.supportHotReloading) {
    hmr.hmr__globalContainer = container;
  }

  if (config.supportHotReloading && hmr.hmr__previousShutdown) {
    const { shutdown, shutdownWithExit } = hmr.hmr__previousShutdown;
    await shutdown();
    if (shutdownWithExit) {
      process.off('SIGINT', shutdownWithExit);
      process.off('SIGTERM', shutdownWithExit);
    }
    hmr.hmr__previousShutdown = undefined;
  }

  const previousModules: Map<string, FeatureModule> =
    config.supportHotReloading && hmr.hmr__previousModules ? hmr.hmr__previousModules : new Map();

  const resolvedModules = await resolveModules(config.modules);
  const enabledModules = resolveModuleGraph(resolvedModules).filter(
    (m) => m.enabled == null || m.enabled(),
  );
  const sortedModules = sortModules(enabledModules);
  const newModules = new Map(sortedModules.map((module) => [module.name, module]));

  const executeAll = async (
    modules: readonly FeatureModule[],
    method: LifecycleMethod,
  ): Promise<boolean> => {
    let errored = false;

    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      const logPrefix = `(Module ➔ ${method} ${i + 1}/${modules.length}) ${module.name} \t-`;
      if (module[method] == null) {
        moduleLoaderLogger.verbose(`${logPrefix} Skipping: Not provided`);
        continue;
      }
      if (previousModules.has(module.name)) {
        moduleLoaderLogger.verbose(`${logPrefix} Skipping: Keep-alive`);
        continue;
      }

      try {
        moduleLoaderLogger.verbose(`${logPrefix} Executing...`);
        await module[method](container);
        moduleLoaderLogger.verbose(`${logPrefix} Done.`);
      } catch (error) {
        moduleLoaderLogger.error(`${logPrefix} Error during execution`, error);
        errored = true;
      }
    }

    return !errored;
  };

  if (previousModules.size) {
    const toKill = popPrevModulesToKill(previousModules, newModules);
    if (toKill.length) await executeAll(toKill.toReversed(), 'shutdown');
  }

  if (!(await executeAll(sortedModules, 'register'))) {
    throw new Error('Failed to register one or more modules.');
  }

  if (!(await executeAll(sortedModules, 'boot'))) {
    throw new Error('Failed to boot one or more modules.');
  }

  for (const module of sortedModules) {
    previousModules.set(module.name, module);
  }

  const shutdown: BootstrapAppResult['shutdown'] = async () => {
    await executeAll(sortedModules.toReversed(), 'shutdown');
    moduleLoaderLogger.info('Module shutdown complete.');
  };

  let shutdownWithExit: typeof shutdown | undefined;
  if (config.handleProcessSignals) {
    shutdownWithExit = async () => {
      previousModules.clear();
      await shutdown();
      process.exit(0);
    };
    process.on('SIGINT', shutdownWithExit);
    process.on('SIGTERM', shutdownWithExit);
  }

  if (config.supportHotReloading) {
    hmr.hmr__previousShutdown = {
      shutdown,
      shutdownWithExit,
    };
  }

  return {
    container,
    shutdown,
  };
}

function sortModules(modules: readonly FeatureModule[]): FeatureModule[] {
  return topologicalSort(
    modules,
    (module) => module.name,
    (module) => {
      const dependsOn: Partial<FeatureModule['dependsOn']> = module.dependsOn;
      if (!dependsOn?.length) {
        return [];
      }

      const resolved: string[] = [];
      for (let i = 0; i < dependsOn.length; i++) {
        const dependency = dependsOn[i];
        if (dependency == null) {
          throw new Error(
            `Dependency for module '${module.name}' at index ${i} is undefined. Is there a ` +
              `circular dependency?`,
          );
        }
        resolved.push(dependency.name);
      }

      return resolved;
    },
  );
}

function popPrevModulesToKill(
  previousModules: Map<string, FeatureModule>,
  nextModules: ReadonlyMap<string, FeatureModule>,
): FeatureModule[] {
  const modulesToKill: FeatureModule[] = [];
  for (const [name, prev] of previousModules) {
    const next = nextModules.get(name);
    const survive = next && prev.hmr?.surviveSoftReload && next.hmr?.surviveSoftReload;

    if (!survive) {
      previousModules.delete(name);
      modulesToKill.push(prev);
    }
  }
  return modulesToKill;
}

async function resolveModules(toResolve: AppConfig['modules']): Promise<FeatureModule[]> {
  const resolved: FeatureModule[] = [];
  const asArray = Array.isArray(toResolve) ? toResolve : [toResolve];
  for (const moduleResolvable of asArray) {
    if (isModule(moduleResolvable)) {
      resolved.push(moduleResolvable);
    } else {
      resolved.push(...(await discoverModules(moduleResolvable)));
    }
  }
  return resolved;
}

async function discoverModules(
  moduleResolvable: FeatureModuleAutoDiscovery,
): Promise<FeatureModule[]> {
  const { root, pattern } = moduleResolvable;
  const scan = new Bun.Glob(pattern);
  const discovered: FeatureModule[] = [];
  for await (const file of scan.scan(root)) {
    const fullPath = path.join(root, file);
    const module = await import(fullPath);
    for (const exported of Object.values(module)) {
      if (isModule(exported)) {
        moduleLoaderLogger.verbose(`Auto-discovered module: ${exported.name}`);
        discovered.push(exported);
      }
    }
  }
  return discovered;
}
