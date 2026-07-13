export function getStr(fm: Record<string, unknown>, chave: string): string | undefined {
  const val = fm[chave];
  return typeof val === 'string' && val.trim() ? val.trim() : undefined;
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
