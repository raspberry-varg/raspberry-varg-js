import { coreLog } from '../internal/coreLog.js';

const isDev = process.env.NODE_ENV === 'development';

interface Injectable {
  token: symbol | string;
}

type Token<T> = ((abstract new (...args: unknown[]) => T) & Injectable) | string | symbol;
type Factory<T> = (container: Container) => T;

class Container {
  private registry = new Map<Token<unknown>, Factory<unknown>>();
  private instances = new Map<Token<unknown>, unknown>();

  register<T>(token: Token<T>, factory: Factory<T>) {
    if (typeof token === 'function') {
      token = token.token;
    }

    if (isDev) {
      // HMR
      if (this.registry.delete(token)) {
        coreLog.verbose(`HMR: Overriding inject for ${String(token)}`);
      }
      if (this.instances.delete(token)) {
        coreLog.verbose(`HMR: Invalidating constructed instance for ${String(token)}`);
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

    coreLog.verbose(`Resolving ${String(token)} dependency: ${String(factory)}`);
    const instance = factory(this);
    this.instances.set(token, instance);
    // oxlint-disable-next-line no-unsafe-type-assertion
    return instance as T;
  }
}

export const container = new Container();

export function inject<T>(token: Token<T>): T {
  return container.resolve(token);
}
