import type { FeatureModule } from './module.js';

export function resolveModuleGraph(rootModules: readonly FeatureModule[]): FeatureModule[] {
  const resolved = new Map<string, FeatureModule>();

  const traverse = (module: FeatureModule): void => {
    if (resolved.has(module.name)) {
      return;
    }

    resolved.set(module.name, module);
    if (module.dependsOn) {
      for (const dependency of module.dependsOn) {
        if (typeof dependency !== 'string') {
          traverse(dependency);
        }
      }
    }
  };

  for (const module of rootModules) {
    traverse(module);
  }

  return Array.from(resolved.values());
}
