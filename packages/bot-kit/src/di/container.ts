import { getConfig } from '../core/index.js';

import { diLogger } from './logger.js';

import type { Token } from './token.js';

type ImplFactory<T> = (container: Container) => T;
type Lifetime = 'singleton' | 'transient';

interface Entry {
  factory: ImplFactory<unknown>;
  lifetime: Lifetime;
}

/**
 * Dependency injection container. One is provided globally.
 */
export class Container {
  private registry = new Map<Token<unknown>, Entry>();
  private singletons = new Map<Token<unknown>, unknown>();

  /**
   * @deprecated Please explicitly define lifetime, or use {@link singleton} as a direct
   * replacement as the default is to register as a singleton as the previous behavior.
   */
  register<T>(token: Token<T>, factory: ImplFactory<T>): this;
  /**
   * Register an implementation factory for a given token.
   */
  register<T>(token: Token<T>, factory: ImplFactory<T>, lifetime: Lifetime): this;
  register<T>(token: Token<T>, factory: ImplFactory<T>, lifetime: Lifetime = 'singleton'): this {
    if (typeof token === 'function') {
      token = token.token;
    }

    if (getConfig().supportHotReloading) {
      if (this.registry.delete(token)) {
        diLogger.verbose(`HMR: Overriding inject for ${tokenToString(token)}`);
      }
      if (this.singletons.delete(token)) {
        diLogger.verbose(`HMR: Invalidating singleton instance for ${tokenToString(token)}`);
      }
    }

    if (this.registry.has(token)) {
      throw new Error(
        `Injectable factory has already been registered with the token: ${tokenToString(token)}`,
      );
    }
    if (this.singletons.has(token)) {
      throw new Error(
        `Injectable has already been resolved with the token: ${tokenToString(token)}`,
      );
    }

    this.registry.set(token, { factory, lifetime });
    return this;
  }

  /**
   * Registers an implementation for a singleton, returning a cached instance per {@link resolve}.
   */
  singleton<T>(token: Token<T>, factory: ImplFactory<T>): this {
    return this.register(token, factory, 'singleton');
  }

  /**
   * Registers an implementation for a transient dependency, creating a new instance each time it is
   * resolved.
   */
  transient<T>(token: Token<T>, factory: ImplFactory<T>): this {
    return this.register(token, factory, 'transient');
  }

  resolve<T>(token: Token<T>): T {
    if (typeof token === 'function') {
      token = token.token;
    }

    if (this.singletons.has(token)) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      return this.singletons.get(token) as T;
    }

    const entry = this.registry.get(token);
    if (!entry) {
      throw new Error(`Missing dependency: ${tokenToString(token)}`);
    }

    diLogger.verbose(`Resolving ${tokenToString(token)}`);
    const instance = entry.factory(this);
    if (entry.lifetime === 'singleton') {
      this.singletons.set(token, instance);
    }
    // oxlint-disable-next-line no-unsafe-type-assertion
    return instance as T;
  }
}

export const container = new Container();

/**
 * Inject a registered dependency.
 *
 * @throws {Error} If the dependency is not registered.
 */
export function inject<T>(token: Token<T>): T {
  return container.resolve(token);
}

function tokenToString(token: Token<unknown>): string {
  if (typeof token === 'object') {
    token = token.token;
  }
  if (typeof token === 'function') {
    token = token.token || token.constructor.name;
  }

  return String(token);
}
