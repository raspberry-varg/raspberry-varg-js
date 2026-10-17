import { Container, container } from '../di/container.js';
import { coreLog } from '../internal/coreLog.js';

import type { AppConfig } from './config.js';

const hmr = globalThis as typeof globalThis & {
  hmr__previousShutdown?: BootstrapAppResult['shutdown'];
  hmr__previousShutdownWithExit?: () => Promise<void>;
};

export interface BootstrapAppResult {
  container: Container;
  shutdown: () => Promise<void>;
}

export async function bootstrapApp(config: AppConfig): Promise<BootstrapAppResult> {
  if (config.supportHotReloading) {
    if (hmr.hmr__previousShutdown) {
      await hmr.hmr__previousShutdown();
      hmr.hmr__previousShutdown = undefined;
    }
    if (hmr.hmr__previousShutdownWithExit) {
      process.off('SIGINT', hmr.hmr__previousShutdownWithExit);
      process.off('SIGTERM', hmr.hmr__previousShutdownWithExit);
      hmr.hmr__previousShutdownWithExit = undefined;
    }
  }

  const { modules = [] } = config;
  // TODO: Topological sort based on some dependency list.
  let success = true;
  for (const module of modules) {
    if (!module.register) {
      continue;
    }
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

  for (const module of modules) {
    if (!module.boot) {
      continue;
    }
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
    for (const module of modules) {
      if (!module.shutdown) {
        continue;
      }
      try {
        await module.shutdown(container);
        coreLog.verbose(`Shutdown module: ${module.name}`);
      } catch (error) {
        coreLog.error(`Error shutting down module: ${module.name}`, error);
      }
    }
    coreLog.info('Module shutdown complete.');
  };

  if (config.supportHotReloading) {
    hmr.hmr__previousShutdown = shutdown;
  }

  if (config.handleProcessSignals) {
    const shutdownWithExit = async () => {
      await shutdown();
      process.exit(0);
    };
    if (config.supportHotReloading) {
      hmr.hmr__previousShutdownWithExit = shutdownWithExit;
    }
    process.on('SIGINT', shutdownWithExit);
    process.on('SIGTERM', shutdownWithExit);
  }

  return {
    container,
    shutdown,
  };
}
