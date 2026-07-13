import { stripWikiLink } from '../../utils/WikiLinks';

export function getStr(fm: Record<string, unknown>, chave: string): string | undefined {
  const val = fm[chave];
  return typeof val === 'string' && val.trim() ? val.trim() : undefined;
}

// Alguns campos numéricos no Vault (ex. `vida: 1`) vêm como number no YAML, não como string.
export function getStrOuNumero(fm: Record<string, unknown>, chave: string): string | undefined {
  const val = fm[chave];
  if (typeof val === 'string' && val.trim()) return val.trim();
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val);
  return undefined;
}

export function getStrArray(fm: Record<string, unknown>, chave: string): string[] | undefined {
  const val = fm[chave];
  if (Array.isArray(val)) {
    const arr = val
      .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      .map((item) => item.trim());
    return arr.length > 0 ? arr : undefined;
  }
  if (typeof val === 'string' && val.trim()) return [val.trim()];
  return undefined;
}

// Para campos que referenciam outras notas via wikilink (ex. `local: ["[[L-001_Acra]]"]`).
// Aceita array ou item único, e devolve o alvo do link (sem colchetes/alias/heading).
export function getWikiLinkArray(fm: Record<string, unknown>, chave: string): string[] | undefined {
  const val = fm[chave];
  const bruto = Array.isArray(val) ? val : val !== undefined && val !== null ? [val] : [];
  const arr = bruto
    .map((item) => stripWikiLink(item))
    .filter((item): item is string => !!item);
  return arr.length > 0 ? arr : undefined;
}

export function getBool(fm: Record<string, unknown>, chave: string): boolean | undefined {
  const val = fm[chave];
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const normalizado = val.trim().toLowerCase();
    if (normalizado === 'true' || normalizado === 'sim') return true;
    if (normalizado === 'false' || normalizado === 'nao' || normalizado === 'não') return false;
  }
  return undefined;
}

export function extrairMetadata(fm: Record<string, unknown>, camposConhecidos: readonly string[]): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(fm)) {
    if (!camposConhecidos.includes(chave)) metadata[chave] = valor;
  }
  return metadata;
}
