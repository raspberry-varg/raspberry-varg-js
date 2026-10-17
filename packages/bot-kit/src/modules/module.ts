import type { Container } from '../di/container.js';

export interface FeatureModule {
  /**
   * The name of the module.
   *
   * Mainly for debugging, no real use case right now.
   */
  name: string;

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
export function defineModule(module: FeatureModule): Readonly<FeatureModule> {
  return module;
}
