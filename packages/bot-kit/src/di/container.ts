import { assertNever } from '../util/assertNever.js';

import { diLogger } from './logger.js';

import type { Token } from './token.js';

type ImplFactory<T> = (container: Container) => T;
type Lifetime = 'singleton' | 'transient';

interface Entry {
  factory: ImplFactory<unknown>;
  lifetime: Lifetime;
  locked?: boolean;
}

type ResolveTokenTuple<T extends readonly Token<unknown>[]> = {
  [K in keyof T]: T[K] extends Token<infer U> ? U : any;
};

/**
 * Dependency injection container. One is provided globally.
 */
export class Container {
  private registry = new Map<string | symbol, Entry>();
  private singletons = new Map<string | symbol, unknown>();

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
    token = tokenToString(token);
    this.assertNotLocked(token);

    if (this.registry.delete(token)) {
      diLogger.debug(`Overriding inject for ${tokenToString(token)}`);
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

  value<T>(token: Token<T>, value: T): this {
    return this.register(token, () => value, 'singleton');
  }

  /**
   * Resolve multiple tokens to their registered instances.
   */
  resolveAll<T extends ReadonlyArray<Token<any>>>(...tokens: [...T]): ResolveTokenTuple<T> {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return tokens.map((t) => this.resolve(t)) as ResolveTokenTuple<T>;
  }

  /**
   * Resolve a token to its registered instance.
   */
  resolve<T>(token: Token<T>): T {
    const stable = tokenToStable(token);

    if (this.singletons.has(stable)) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      return this.singletons.get(stable) as T;
    }

    const entry = this.registry.get(stable);
    if (!entry) {
      throw new Error(`Missing dependency: ${tokenToString(token)}`);
    }

    diLogger.verbose(`Resolving ${tokenToString(stable)}`);
    const instance = entry.factory(this);
    if (entry.lifetime === 'singleton') {
      this.singletons.set(stable, instance);
    }
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return instance as T;
  }

  lock(token: Token<unknown>): this {
    const entry = this.registry.get(tokenToStable(token));
    if (!entry) {
      throw new Error(`Tried to lock '${tokenToString(token)}', but it is not yet registered.`);
    }
    entry.locked = true;
    return this;
  }

  private assertNotLocked(token: Token<unknown>) {
    const existing = this.registry.get(tokenToStable(token));
    if (existing?.locked) {
      throw new Error(
        `Cannot overwrite '${tokenToString(token)}'. This binding is locked and can only be ` +
          'injected.',
      );
    }
  }
}

let globalContainer: Container | undefined;

export function setGlobalContainer(container: Container): void {
  globalContainer = container;
}

/**
 * Inject a registered dependency.
 *
 * @throws {Error} If the dependency is not registered.
 */
export function inject<T>(token: Token<T>): T {
  if (!globalContainer) {
    throw new Error('Global container is not set');
  }
  return globalContainer.resolve(token);
}

/**
 * Inject multiple registered dependencies at once.
 *
 * @throws {Error} If any dependency is not registered.
 */
export function injectAll<T extends ReadonlyArray<Token<any>>>(
  ...tokens: [...T]
): ResolveTokenTuple<T> {
  if (!globalContainer) {
    throw new Error('Global container is not set');
  }
  return globalContainer.resolveAll(...tokens);
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

function tokenToStable(token: Token<unknown>): string | symbol {
  if (typeof token === 'object') {
    token = token.token;
  }

  if (typeof token === 'function') {
    token = token.token;
  }

  if (typeof token !== 'string' && typeof token !== 'symbol') {
    assertNever(token);
  }

  return token;
}
