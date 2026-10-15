/**
 * Any object that can be used as a dependency injection token.
 */
export interface Injectable {
  readonly token: symbol | string;
}

/**
 * Type-safe injection token.
 */
export interface InjectionToken<T> extends Injectable {
  readonly __type?: T;
}

/**
 * Injection token based on a constructor instance.
 */
export type ConstructorInjectionToken<T> = (abstract new (...args: unknown[]) => T) & Injectable;

/**
 * All valid tokens for dependency injection.
 */
export type Token<T> = ConstructorInjectionToken<T> | InjectionToken<T> | string | symbol;

/**
 * Creates a type-safe injection token.
 */
export function createToken<T>(token: symbol | string): InjectionToken<T> {
  return { token };
}
