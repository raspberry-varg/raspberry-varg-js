import { diLogger } from './logger.js';

import type { Token } from './token.js';

const isDev = process.env.NODE_ENV === 'development';

type ImplFactory<T> = (container: Container) => T;

/**
 * Dependency injection container. One is provided globally.
 */
export class Container {
  private registry = new Map<Token<unknown>, ImplFactory<unknown>>();
  private instances = new Map<Token<unknown>, unknown>();

  register<T>(token: Token<T>, factory: ImplFactory<T>) {
    if (typeof token === 'function') {
      token = token.token;
    }

    if (isDev) {
      // HMR
      if (this.registry.delete(token)) {
        diLogger.verbose(`HMR: Overriding inject for ${String(token)}`);
      }
      if (this.instances.delete(token)) {
        diLogger.verbose(`HMR: Invalidating constructed instance for ${String(token)}`);
      }
    }

    if (this.registry.has(token)) {
      throw new Error(
        `Injectable factory has already been registered with the token: ${String(token)}`,
      );
    }
    if (this.instances.has(token)) {
      throw new Error(`Injectable has already been resolved with the token: ${String(token)}`);
    }

    this.registry.set(token, factory);
  }

  resolve<T>(token: Token<T>): T {
    if (typeof token === 'function') {
      token = token.token;
    }

    if (this.instances.has(token)) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      return this.instances.get(token) as T;
    }

    const factory = this.registry.get(token);
    if (!factory) {
      throw new Error(`Missing dependency: ${String(token)}`);
    }

    diLogger.verbose(`Resolving ${tokenToString(token)} dependency: ${String(factory)}`);
    const instance = factory(this);
    this.instances.set(token, instance);
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
