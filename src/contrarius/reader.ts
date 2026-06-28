import type { TFile } from 'obsidian';
import { deepCopyYaml } from './utils';

/** Interface de dependências injetáveis — permite mock completo nos testes. */
export interface ReaderDeps {
  /** Caminho primário: MetadataCache do Obsidian. Retorna null enquanto o cache não populou. */
  getFileCache: (file: TFile) => { frontmatter?: Record<string, unknown> } | null;
  /** Caminho de fallback: lê o conteúdo bruto quando getFileCache não fornece frontmatter. */
  cachedRead: (file: TFile) => Promise<string>;
  /** Interpreta o bloco YAML extraído do conteúdo bruto no caminho de fallback. Importado do pacote obsidian. */
  parseYaml: (yaml: string) => unknown;
}

// U+FEFF: Byte Order Mark — single Unicode code point, one JS char
const UTF8_BOM = '﻿';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function extractFrontmatterBlock(content: string): string | null {
  const text = content.startsWith(UTF8_BOM) ? content.slice(1) : content;
  const normalized = text.replace(/\r\n/g, '\n');

  const firstNl = normalized.indexOf('\n');
  const firstLine = firstNl === -1 ? normalized : normalized.slice(0, firstNl);
  if (firstLine !== '---') return null;
  if (firstNl === -1) return null;

  const body = normalized.slice(firstNl + 1);
  const lines = body.split('\n');
  const closingIdx = lines.findIndex((line) => line === '---');

  if (closingIdx === -1) return null;

  const block = lines.slice(0, closingIdx).join('\n');
  return block.trim() === '' ? null : block;
}

/**
 * Lê o frontmatter de um arquivo sem nenhuma modificação.
 *
 * Estratégia:
 *   1. Caminho primário: deps.getFileCache(file).frontmatter (síncrono, via MetadataCache).
 *   2. Fallback: deps.cachedRead(file) → extrai bloco ---...--- → deps.parseYaml().
 */
export async function lerFrontmatter(
  file: TFile,
  deps: ReaderDeps,
): Promise<Record<string, unknown> | null> {
  const cached = deps.getFileCache(file);
  if (cached !== null && isPlainObject(cached.frontmatter)) {
    return deepCopyYaml(cached.frontmatter) as Record<string, unknown>;
  }

  let content: string;
  try {
    content = await deps.cachedRead(file);
  } catch {
    return null;
  }

  const block = extractFrontmatterBlock(content);
  if (block === null) return null;

  let parsed: unknown;
  try {
    parsed = deps.parseYaml(block);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) return null;

  return deepCopyYaml(parsed) as Record<string, unknown>;
}