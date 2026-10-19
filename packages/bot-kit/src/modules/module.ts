import type { Container } from '../di/container.js';

export type LifecycleMethod = keyof Pick<FeatureModule, 'register' | 'boot' | 'shutdown'>;

export interface FeatureModuleAutoDiscovery {
  root: string;
  pattern: string;
}

export interface FeatureModule {
  readonly __isFeatureModule: true;

  /**
   * The name of the module. Must be unique across all modules.
   */
  name: string;

  /**
   * Modules that must be resolved before this module's lifecycle runs.
   */
  dependsOn?: readonly FeatureModule[];

  /**
   * If defined, the module will only be registered and booted if the function returns true.
   */
  enabled?: () => boolean;

  /**
   * Set up any DI implementations.
   */
  register?: (container: Container) => void | Promise<void>;

  /**
   * Start any workers, listeners, etc.
   *
   * Runs after all modules have called their {@link register} function.
   */
  boot?: (container: Container) => void | Promise<void>;

  /**
   * Tear down anything before the application shuts down.
   */
  shutdown?: (container: Container) => void | Promise<void>;

  /**
   * Configuration specific to HMR.
   */
  hmr?: {
    surviveSoftReload?: boolean;
  };
}

/**
 * Define a module with a managed lifecycle.
 */
export function defineModule(
  module: Omit<FeatureModule, '__isFeatureModule'>,
): Readonly<FeatureModule> {
  return {
    ...module,
    __isFeatureModule: true,
  };
}

export function isModule(module: unknown): module is FeatureModule {
  return typeof module === 'object' && module !== null && '__isFeatureModule' in module;
}
