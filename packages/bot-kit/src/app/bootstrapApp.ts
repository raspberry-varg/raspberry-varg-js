import { Container, setGlobalContainer } from '../di/container.js';
import { coreLog } from '../internal/coreLog.js';

import type { FeatureModule } from '../modules/index.js';
import type { AppConfig } from './config.js';

const hmr = globalThis as typeof globalThis & {
  hmr__globalContainer?: Container;
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

  let isHotReload = false;
  if (config.supportHotReloading && hmr.hmr__previousShutdown) {
    isHotReload = true;

    const { shutdown, shutdownWithExit } = hmr.hmr__previousShutdown;
    shutdown();
    if (shutdownWithExit) {
      process.off('SIGINT', shutdownWithExit);
      process.off('SIGTERM', shutdownWithExit);
    }
    hmr.hmr__previousShutdown = undefined;
  }

  const modules = config.modules.filter((m) => m.enabled == null || m.enabled());
  // TODO: Topological sort based on some dependency list.
  let success = true;
  for (const module of runnableModules(modules, 'register', isHotReload)) {
    try {
      await module.register(container);
      coreLog.verbose(`Registered module: ${module.name}`);
    } catch (error) {
      coreLog.error(`Error registering module: ${module.constructor.name}`, error);
      success = false;
    }
  }
  if (!success) {
    throw new Error('Failed to register one or more modules.');
  }

  for (const module of runnableModules(modules, 'boot', isHotReload)) {
    try {
      await module.boot(container);
      coreLog.verbose(`Booted module: ${module.name}`);
    } catch (error) {
      coreLog.error(`Error booting module: ${module.constructor.name}`, error);
      success = false;
    }
  }
  if (!success) {
    throw new Error('Failed to boot one or more modules.');
  }

  const shutdown: BootstrapAppResult['shutdown'] = async () => {
    for (const module of runnableModules(modules.toReversed(), 'shutdown', isHotReload)) {
      try {
        await module.shutdown(container);
        coreLog.verbose(`Shutdown module: ${module.name}`);
      } catch (error) {
        coreLog.error(`Error shutting down module: ${module.name}`, error);
      }
    }
    coreLog.info('Module shutdown complete.');
  };

  let shutdownWithExit: typeof shutdown | undefined;
  if (config.handleProcessSignals) {
    shutdownWithExit = async () => {
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

function* runnableModules<K extends keyof Pick<FeatureModule, 'register' | 'boot' | 'shutdown'>>(
  modules: readonly FeatureModule[],
  property: K,
  isHotReload: boolean,
): Generator<FeatureModule & Required<Pick<FeatureModule, K>>> {
  for (const module of modules) {
    if (isHotReload && module.hmr?.surviveSoftReload) {
      continue;
    }
    if (module[property]) {
      yield module as FeatureModule & Required<Pick<FeatureModule, K>>;
    }
  }
}
