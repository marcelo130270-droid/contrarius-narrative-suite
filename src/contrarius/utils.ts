export function deepCopyYaml(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return (value as unknown[]).map(deepCopyYaml);
  }
  const obj = value as Record<string, unknown>;
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    copy[key] = deepCopyYaml(obj[key]);
  }
  return copy;
}

export function extractBasename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const filename = parts[parts.length - 1] ?? '';
  if (filename.toLowerCase().endsWith('.md')) {
    return filename.slice(0, -3);
  }
  return filename;
}
