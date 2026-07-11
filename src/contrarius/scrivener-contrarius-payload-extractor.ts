import type { ItemPayloadScrivener, TipoItemPayloadScrivener } from './scrivener-package-payload-model';
import { normalizarItemPayloadScrivener, ordenarItensPayloadScrivener } from './scrivener-package-payload-model';

export type TipoColecaoContrariusPayloadScrivener =
  | 'consciencias'
  | 'retrovidas'
  | 'eventos'
  | 'lugares'
  | 'relacoes'
  | 'grupos'
  | 'objetos'
  | 'notas';

export interface FontePayloadContrariusScrivener {
  consciencias?: readonly unknown[];
  retrovidas?: readonly unknown[];
  eventos?: readonly unknown[];
  lugares?: readonly unknown[];
  relacoes?: readonly unknown[];
  grupos?: readonly unknown[];
  objetos?: readonly unknown[];
  notas?: readonly unknown[];
}

export interface ResultadoExtracaoPayloadContrariusScrivener {
  itens: ItemPayloadScrivener[];
  totalItens: number;
  descartados: number;
  avisos: string[];
}

const MAPA_TIPO_COLECAO: Record<TipoColecaoContrariusPayloadScrivener, TipoItemPayloadScrivener> = {
  consciencias: 'consciencia',
  retrovidas: 'retrovida',
  eventos: 'evento',
  lugares: 'lugar',
  relacoes: 'relacao',
  grupos: 'grupo',
  objetos: 'objeto',
  notas: 'nota',
};

function getStr(obj: Record<string, unknown>, key: string): string {
  const val = obj[key];
  return typeof val === 'string' ? val.trim() : '';
}

function getNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      const n = Number(val.trim());
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function firstStringFromArrayOrString(val: unknown): string {
  if (typeof val === 'string' && val.trim()) return val.trim();
  if (Array.isArray(val)) {
    for (const item of val) {
      if (typeof item === 'string' && item.trim()) return item.trim();
    }
  }
  return '';
}

function extractTags(obj: Record<string, unknown>): string[] {
  const sources = [obj['tags'], obj['holopensenes'], obj['nucleo_geo'], obj['mov_historico']];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const src of sources) {
    const items = Array.isArray(src) ? src : typeof src === 'string' && src.trim() ? [src] : [];
    for (const item of items) {
      if (typeof item === 'string' && item.trim()) {
        const tag = item.trim();
        if (!seen.has(tag)) {
          seen.add(tag);
          result.push(tag);
        }
      }
    }
  }
  return result;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
    ? (val as Record<string, unknown>)
    : null;
}

function extrairItemDaEntidade(
  tipoColecao: TipoColecaoContrariusPayloadScrivener,
  entidade: unknown,
): Partial<ItemPayloadScrivener> | null {
  const obj = asRecord(entidade);
  if (!obj) return null;

  const tipo = MAPA_TIPO_COLECAO[tipoColecao];
  const fileObj = asRecord(obj['file']);

  // id
  let id = '';
  for (const key of ['id', 'codigo', 'consc_id', 'id_evento', 'id_lugar']) {
    const v = getStr(obj, key);
    if (v) { id = v; break; }
  }
  if (!id && fileObj) id = getStr(fileObj, 'path');
  if (!id) id = getStr(obj, 'path');

  // titulo
  let titulo = '';
  for (const key of ['titulo', 'nome', 'nome_atual']) {
    const v = getStr(obj, key);
    if (v) { titulo = v; break; }
  }
  if (!titulo && fileObj) titulo = getStr(fileObj, 'basename');
  if (!titulo) titulo = getStr(obj, 'basename');
  if (!titulo) titulo = id;

  // caminhoFonte
  let caminhoFonte = getStr(obj, 'caminhoFonte');
  if (!caminhoFonte && fileObj) caminhoFonte = getStr(fileObj, 'path');
  if (!caminhoFonte) caminhoFonte = getStr(obj, 'path');

  // livro
  const livroRaw = obj['livro'] !== undefined ? obj['livro'] : obj['livros'];
  let livro = firstStringFromArrayOrString(livroRaw);
  if (!livro) {
    const meta = asRecord(obj['metadata']);
    if (meta) livro = firstStringFromArrayOrString(meta['livro']);
  }

  // periodo
  let periodo = firstStringFromArrayOrString(obj['periodo']);
  if (!periodo) {
    const meta = asRecord(obj['metadata']);
    if (meta) periodo = firstStringFromArrayOrString(meta['periodo']);
  }

  // ordens
  const ordemNarrativa = getNumber(obj, 'ordemNarrativa', 'ordem_narrativa', 'ordem', 'narrativa_ordem');
  const ordemCronologica = getNumber(obj, 'ordemCronologica', 'ordem_cronologica', 'ano_ordem', 'data_inicio', 'nascimento');

  // tags
  const tags = extractTags(obj);

  // texto
  let texto: string | undefined;
  for (const key of ['texto', 'conteudo', 'body']) {
    const v = getStr(obj, key);
    if (v) { texto = v; break; }
  }

  const metadata: Record<string, unknown> = { origemColecao: tipoColecao };

  const item: Partial<ItemPayloadScrivener> = { id, tipo, titulo, metadata };
  if (caminhoFonte) item.caminhoFonte = caminhoFonte;
  if (livro) item.livro = livro;
  if (periodo) item.periodo = periodo;
  if (ordemNarrativa !== undefined) item.ordemNarrativa = ordemNarrativa;
  if (ordemCronologica !== undefined) item.ordemCronologica = ordemCronologica;
  if (tags.length > 0) item.tags = tags;
  if (texto) item.texto = texto;

  return item;
}

export function extrairItensPayloadColecaoContrariusScrivener(
  tipoColecao: TipoColecaoContrariusPayloadScrivener,
  colecao: readonly unknown[],
): ResultadoExtracaoPayloadContrariusScrivener {
  const itens: ItemPayloadScrivener[] = [];
  const avisos: string[] = [];
  let descartados = 0;

  for (let i = 0; i < colecao.length; i++) {
    const parcial = extrairItemDaEntidade(tipoColecao, colecao[i]);

    if (!parcial) {
      descartados++;
      avisos.push(`[${tipoColecao}][${i}] entidade ignorada: formato inválido`);
      continue;
    }

    const item = normalizarItemPayloadScrivener(parcial);

    if (!item) {
      descartados++;
      avisos.push(`[${tipoColecao}][${i}] item descartado: id, tipo ou titulo ausente`);
      continue;
    }

    itens.push(item);
  }

  const itensOrdenados = ordenarItensPayloadScrivener(itens);

  return {
    itens: itensOrdenados,
    totalItens: itensOrdenados.length,
    descartados,
    avisos,
  };
}

export function extrairItensPayloadContrariusScrivener(
  fonte: FontePayloadContrariusScrivener,
): ResultadoExtracaoPayloadContrariusScrivener {
  const ordem: TipoColecaoContrariusPayloadScrivener[] = [
    'consciencias', 'retrovidas', 'eventos', 'lugares', 'relacoes', 'grupos', 'objetos', 'notas',
  ];

  const todosItens: ItemPayloadScrivener[] = [];
  const todosAvisos: string[] = [];
  let totalDescartados = 0;

  for (const tipo of ordem) {
    const colecao = fonte[tipo];
    if (!colecao || colecao.length === 0) continue;

    const resultado = extrairItensPayloadColecaoContrariusScrivener(tipo, colecao);
    todosItens.push(...resultado.itens);
    todosAvisos.push(...resultado.avisos);
    totalDescartados += resultado.descartados;
  }

  const itensOrdenados = ordenarItensPayloadScrivener(todosItens);

  return {
    itens: itensOrdenados,
    totalItens: itensOrdenados.length,
    descartados: totalDescartados,
    avisos: todosAvisos,
  };
}
