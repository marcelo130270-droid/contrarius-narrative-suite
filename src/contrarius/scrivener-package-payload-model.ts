export type TipoItemPayloadScrivener =
  | 'consciencia'
  | 'retrovida'
  | 'evento'
  | 'lugar'
  | 'relacao'
  | 'grupo'
  | 'objeto'
  | 'nota';

export interface ItemPayloadScrivener {
  id: string;
  tipo: TipoItemPayloadScrivener;
  titulo: string;
  caminhoFonte?: string;
  livro?: string;
  periodo?: string;
  ordemNarrativa?: number;
  ordemCronologica?: number;
  tags?: string[];
  texto?: string;
  metadata?: Record<string, unknown>;
}

export interface PayloadScrivener {
  schema: 'contrarius-scrivener-payload/v1';
  geradoEm: string;
  manifestoId: string;
  totalItens: number;
  itens: ItemPayloadScrivener[];
}

const TIPOS_VALIDOS_PAYLOAD: readonly string[] = [
  'consciencia', 'retrovida', 'evento', 'lugar', 'relacao', 'grupo', 'objeto', 'nota',
];

export function normalizarItemPayloadScrivener(
  input: Partial<ItemPayloadScrivener>,
): ItemPayloadScrivener | null {
  const id = (input.id ?? '').trim();
  const tipoRaw = ((input.tipo as string | undefined) ?? '').trim();
  const titulo = (input.titulo ?? '').trim();

  if (!id || !TIPOS_VALIDOS_PAYLOAD.includes(tipoRaw) || !titulo) return null;

  const tipo = tipoRaw as TipoItemPayloadScrivener;
  const item: ItemPayloadScrivener = { id, tipo, titulo };

  const caminhoFonte = (input.caminhoFonte ?? '').trim();
  if (caminhoFonte) item.caminhoFonte = caminhoFonte;

  const livro = (input.livro ?? '').trim();
  if (livro) item.livro = livro;

  const periodo = (input.periodo ?? '').trim();
  if (periodo) item.periodo = periodo;

  if (input.ordemNarrativa !== undefined) item.ordemNarrativa = input.ordemNarrativa;
  if (input.ordemCronologica !== undefined) item.ordemCronologica = input.ordemCronologica;

  const texto = (input.texto ?? '').trim();
  if (texto) item.texto = texto;

  if (input.tags !== undefined) {
    item.tags = input.tags.map(t => t.trim()).filter(t => t.length > 0);
  }

  if (input.metadata !== undefined) {
    item.metadata = { ...input.metadata };
  }

  return item;
}

export function criarPayloadScrivener(args: {
  manifestoId: string;
  itens?: Partial<ItemPayloadScrivener>[];
  geradoEm?: Date | string;
}): PayloadScrivener {
  const geradoEm =
    args.geradoEm !== undefined
      ? args.geradoEm instanceof Date
        ? args.geradoEm.toISOString()
        : String(args.geradoEm)
      : new Date().toISOString();

  const itensValidos = (args.itens ?? [])
    .map(i => normalizarItemPayloadScrivener(i))
    .filter((i): i is ItemPayloadScrivener => i !== null);

  const itens = ordenarItensPayloadScrivener(itensValidos);

  return {
    schema: 'contrarius-scrivener-payload/v1',
    geradoEm,
    manifestoId: args.manifestoId,
    totalItens: itens.length,
    itens,
  };
}

export function ordenarItensPayloadScrivener(
  itens: readonly ItemPayloadScrivener[],
): ItemPayloadScrivener[] {
  return [...itens].sort((a, b) => {
    const aN = a.ordemNarrativa ?? Infinity;
    const bN = b.ordemNarrativa ?? Infinity;
    if (aN !== bN) return aN - bN;

    const aC = a.ordemCronologica ?? Infinity;
    const bC = b.ordemCronologica ?? Infinity;
    if (aC !== bC) return aC - bC;

    const tituloComp = a.titulo.localeCompare(b.titulo);
    if (tituloComp !== 0) return tituloComp;

    return a.id.localeCompare(b.id);
  });
}
