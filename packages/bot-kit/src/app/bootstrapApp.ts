import { Container, setGlobalContainer } from '../di/container.js';
import { coreLog } from '../internal/coreLog.js';
import {
  type FeatureModule,
  type FeatureModuleContext,
  isModule,
  type LifecycleMethod,
} from '../modules/index.js';
import { resolveModuleGraph } from '../modules/resolveModuleGraph.js';
import { InternalTokens } from '../modules/tokens.js';
import { discoverAll } from '../util/autoDiscover.js';
import { Hmr } from '../util/hmr.js';
import { topologicalSort } from '../util/topologicalSort.js';

import type { AppConfig } from './config.js';

const moduleLoaderLogger = coreLog.namespaced('modules').namespaced('loader');

const PreviousGlobalContainerKey = Hmr.key<Container>('bootstrapApp.previousGlobalContainer');
const PreviousShutdownKey = Hmr.key<{
  shutdown: BootstrapAppResult['shutdown'];
  shutdownWithExit?: ShutdownFn;
}>('bootstrapApp.previousShutdown');

type ShutdownFn = () => Promise<void>;

export interface BootstrapAppResult {
  container: Container;
  shutdown: ShutdownFn;
}

export async function bootstrapApp(config: AppConfig): Promise<BootstrapAppResult> {
  const container = new Container();
  setGlobalContainer(container);

  const previousContainer = Hmr.popRef(PreviousGlobalContainerKey);

  if (Hmr.isHotReload) {
    const previousShutdown = Hmr.popRef(PreviousShutdownKey);
    moduleLoaderLogger.info('Hot reload detected. Shutting down previous modules.');
    if (previousContainer) {
      await executeAll(
        previousContainer,
        previousContainer.resolve(InternalTokens.Modules).toReversed(),
        'shutdown',
        false,
        previousContainer,
      );
    }
    if (previousShutdown?.shutdownWithExit) {
      removeShutdownHandler(previousShutdown.shutdownWithExit);
    }
  }

  const resolvedModules = await discoverAll(config.modules, isModule);
  const enabledModules = resolveModuleGraph(resolvedModules).filter(
    (m) => m.enabled == null || m.enabled(),
  );
  const sortedModules = sortModules(enabledModules);

  container.value(InternalTokens.Modules, sortedModules);

  if (!(await executeAll(container, sortedModules, 'register', true, previousContainer))) {
    throw new Error('Failed to register one or more modules.');
  }

  if (!(await executeAll(container, sortedModules, 'boot', false, previousContainer))) {
    throw new Error('Failed to boot one or more modules.');
  }

  const shutdown: BootstrapAppResult['shutdown'] = async () => {
    await executeAll(container, sortedModules.toReversed(), 'shutdown', false, previousContainer);
    moduleLoaderLogger.info('Module shutdown complete.');
  };

  let shutdownWithExit: typeof shutdown | undefined;
  if (config.handleProcessSignals) {
    let run = false;
    const fn: typeof shutdown = (shutdownWithExit = async () => {
      if (run) {
        return;
      }
      run = true;
      removeShutdownHandler(fn);

      await executeAll(container, sortedModules.toReversed(), 'shutdown', true, previousContainer);
      moduleLoaderLogger.info('Module shutdown complete. Exiting.');
      process.exit(0);
    });
    setShutdownHandler(fn);
  }

  if (config.supportHotReloading) {
    Hmr.setRef(PreviousGlobalContainerKey, container);
    Hmr.setRef(PreviousShutdownKey, {
      shutdown,
      shutdownWithExit,
    });
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
        let name: string;

        if (typeof dependency === 'string') {
          name = dependency;
        } else {
          if (dependency == null) {
            throw new Error(
              `Dependency for module '${module.name}' at index ${i} is undefined. Is there a ` +
                `circular dependency?`,
            );
          }
          name = dependency.name;
        }
        if (!name.length) {
          throw new Error(`Dependency ID for module '${module.name}' at index ${i} is empty.`);
        }
        resolved.push(name);
      }

      return resolved;
    },
  );
}

function setShutdownHandler(handler: ShutdownFn): void {
  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
}

function removeShutdownHandler(handler: ShutdownFn): void {
  process.off('SIGINT', handler);
  process.off('SIGTERM', handler);
}

function createHmrCtx(
  previousContainer: Container | undefined,
): NonNullable<FeatureModuleContext['hmr']> {
  return previousContainer
    ? {
        isReload: true,
        previousContainer,
      }
    : {
        isReload: false,
      };
}

async function executeAll(
  container: Container,
  modules: readonly FeatureModule[],
  method: LifecycleMethod,
  ignoreSurvive: boolean,
  previousContainerForHmr: Container | undefined,
): Promise<boolean> {
  let errored = false;

  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    const logPrefix = `(Module ➔ ${method} ${i + 1}/${modules.length}) ${module.name} \t-`;
    if (module[method] == null) {
      moduleLoaderLogger.verbose(`${logPrefix} Skipping: Not provided`);
      continue;
    }
    if (Hmr.isHotReload && !ignoreSurvive && module.hmr?.surviveSoftReload) {
      moduleLoaderLogger.verbose(`${logPrefix} Skipping: Keep-alive`);
      continue;
    }

    try {
      moduleLoaderLogger.verbose(`${logPrefix} Executing...`);
      await module[method](container, {
        hmr: previousContainerForHmr ? createHmrCtx(previousContainerForHmr) : undefined,
      });
      moduleLoaderLogger.verbose(`${logPrefix} Done.`);
    } catch (error) {
      moduleLoaderLogger.error(`${logPrefix} Error during execution`, error);
      errored = true;
    }
  }

  return !errored;
}
