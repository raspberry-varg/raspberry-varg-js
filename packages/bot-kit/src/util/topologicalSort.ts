export function topologicalSort<T>(
  items: Iterable<T>,
  getKey: (item: T) => string,
  getDependencies: (item: T) => readonly string[],
): T[] {
  const sorted: T[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const keyToItem = new Map<string, T>();
  for (const item of items) {
    const key = getKey(item);
    if (keyToItem.has(key)) {
      throw new Error(`Item with key '${key}' already exists.`);
    }
    keyToItem.set(key, item);
  }

  const visit = (key: string, path: string[]) => {
    if (visited.has(key)) return;

    if (visiting.has(key)) {
      const cycle = [...path, key].join(' ➔ ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    const item = keyToItem.get(key);
    if (!item) {
      const parent = path[path.length - 1];
      throw new Error(`Missing dependency: '${key}' (required by '${parent}')`);
    }

    visiting.add(key);
    path.push(key);

    for (const depKey of getDependencies(item)) {
      visit(depKey, path);
    }

    path.pop();
    visiting.delete(key);
    visited.add(key);

    sorted.push(item);
  };

  for (const item of items) {
    visit(getKey(item), []);
  }

  return sorted;
}
