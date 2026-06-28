const OBSIDIAN_LINK_RE = /^!?\[\[([^\]|]+)(?:\|[^\]]*)?]]/;

export function stripObsidianLink(value: string): string {
  const trimmed = value.trim();
  const match = OBSIDIAN_LINK_RE.exec(trimmed);
  if (match !== null && match[0] === trimmed) {
    return match[1].trim();
  }
  return trimmed;
}

export function normStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    return stripObsidianLink(value);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normStr(item);
      if (normalized !== '') return normalized;
    }
    return '';
  }
  return '';
}

export function normList(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  const items: unknown[] = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = normStr(item);
    if (normalized !== '' && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

export function normNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

const TRUE_VALUES = new Set(['true', 'yes', 'sim', '1', 'on']);
const FALSE_VALUES = new Set(['false', 'no', 'não', 'nao', '0', 'off', '']);

export function normBool(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return false;
    return value !== 0;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (TRUE_VALUES.has(lower)) return true;
    if (FALSE_VALUES.has(lower)) return false;
    return false;
  }
  return false;
}

export function primeiroPresente(
  frontmatter: Readonly<Record<string, unknown>>,
  chaves: readonly string[],
): unknown {
  for (const chave of chaves) {
    if (!Object.prototype.hasOwnProperty.call(frontmatter, chave)) continue;
    const value = frontmatter[chave];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    return value;
  }
  return undefined;
}
