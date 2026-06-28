import { readFileSync } from 'node:fs';
import { parseYaml } from 'obsidian';

export function readFixtureFrontmatter(path: string): Record<string, unknown> {
  const content = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(content);
  if (match === null) throw new Error(`Fixture sem frontmatter válido: ${path}`);
  const parsed: unknown = parseYaml(match[1]);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Frontmatter raiz não é objeto: ${path}`);
  }
  return parsed as Record<string, unknown>;
}
