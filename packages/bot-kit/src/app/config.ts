import { defaultAppLogger, getEnvLogLevel } from './defaultAppLogger.js';

import type { FeatureModule } from '../modules/module.js';
import type { AutoDiscoverable } from '../util/autoDiscover.js';
import type { MaybeReadonlyArray } from '../util/maybeReadonlyArray.js';
import type { AppLogger, LogLevelString } from './appLogger.js';

export interface AppConfig {
  /**
   * The level of logs to pass through to {@link logger}.
   */
  logLevel: LogLevelString;

  /**
   * Logger to use for framework logs.
   */
  logger: AppLogger;

  /**
   * Support Bun's --hot reloading (globalThis persistence of objects such as the router).
   */
  supportHotReloading: boolean;

  /**
   * All modules to load and manage lifecycles.
   */
  modules: MaybeReadonlyArray<AutoDiscoverable<FeatureModule>>;

  /**
   * Shut down modules when SIGINT or SIGTERM is received.
   */
  handleProcessSignals: boolean;
}

export const appConfigDefaults = {
  logLevel: getEnvLogLevel() ?? (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  logger: defaultAppLogger,
  supportHotReloading: process.env.NODE_ENV === 'development',
  modules: [] as AppConfig['modules'],
  handleProcessSignals: true,
} as const satisfies Partial<AppConfig>;
