import type { Container } from '../di/index.js';
import type { AnyCommandHandler, EventHandler } from '../discord/index.js';
import type { AutoDiscoverable } from '../util/autoDiscover.js';
import type { MaybeReadonlyArray } from '../util/maybeReadonlyArray.js';

export type LifecycleMethod = keyof Pick<FeatureModule, 'register' | 'boot' | 'shutdown'>;

export interface FeatureModuleContext {
  readonly hmr?:
    | {
        readonly isReload: false;
      }
    | {
        readonly isReload: true;
        readonly previousContainer: Container;
      };
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
  dependsOn?: ReadonlyArray<FeatureModule | string>;

  /**
   * If defined, the module will only be registered and booted if the function returns true.
   */
  enabled?: () => boolean;

  /**
   * Events that will be auto-bound to the active {@link import('discord.js').Client Client}.
   */
  events?: MaybeReadonlyArray<AutoDiscoverable<EventHandler>>;

  /**
   * Command handlers or paths to search.
   */
  commands?: MaybeReadonlyArray<AutoDiscoverable<AnyCommandHandler>>;

  /**
   * Set up any DI implementations.
   */
  register?: (container: Container, ctx: FeatureModuleContext) => void | Promise<void>;

  /**
   * Start any workers, listeners, etc.
   *
   * Runs after all modules have called their {@link register} function.
   */
  boot?: (container: Container, ctx: FeatureModuleContext) => void | Promise<void>;

  /**
   * Tear down anything before the application shuts down.
   */
  shutdown?: (container: Container, ctx: FeatureModuleContext) => void | Promise<void>;

  /**
   * Configuration specific to HMR.
   */
  hmr?: {
    surviveSoftReload?: boolean;
  };
}

const ModulePrototype = {
  __isFeatureModule: true,
  toString() {
    return `[Module ${this.name}]`;
  },
} satisfies Partial<FeatureModule> & { toString: () => string };

/**
 * Define a module with a managed lifecycle.
 */
export function defineModule(
  module: Omit<FeatureModule, '__isFeatureModule'>,
): Readonly<FeatureModule> {
  const instance = Object.create(ModulePrototype);
  return Object.freeze(Object.assign(instance, module));
}

export function isModule(module: unknown): module is FeatureModule {
  return typeof module === 'object' && module !== null && '__isFeatureModule' in module;
}
