// oxlint-disable typescript/no-unsafe-type-assertion

const RegistryKey = Symbol.for('raspberryvarg.bot-kit.hmr.Registry');

const hmr = globalThis as typeof globalThis & {
  [RegistryKey]?: Map<string | symbol, unknown>;
};

const isHotReload = hmr[RegistryKey] !== undefined;

hmr[RegistryKey] ??= new Map();

export interface HmrKey<T> {
  key: string | symbol;
  __type?: T;
}

function ref<T>({ key }: HmrKey<T>, factory: () => T): T {
  const store = hmr[RegistryKey]!;
  if (store.has(key)) {
    return store.get(key) as T;
  }
  const value = factory();
  store.set(key, value);
  return value;
}

function getRef<T>({ key }: HmrKey<T>): T | undefined {
  return hmr[RegistryKey]!.get(key) as T | undefined;
}

function setRef<T>({ key }: HmrKey<T>, value: T): void {
  const store = hmr[RegistryKey]!;
  if (store.has(key)) {
    throw new Error(`HMR key ${String(key)} already exists`);
  }
  store.set(key, value);
}

function popRef<T>({ key }: HmrKey<T>): T | undefined {
  const r = hmr[RegistryKey]!.get(key);
  hmr[RegistryKey]?.delete(key);
  return r as T | undefined;
}

export const Hmr = {
  isHotReload,
  ref,
  setRef,
  popRef,
  getRef,
  key: <T>(key: string | symbol): HmrKey<T> => {
    return { key };
  },
} as const;
