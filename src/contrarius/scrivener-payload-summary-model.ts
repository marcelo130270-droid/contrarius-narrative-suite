import type { ResultadoExtracaoPayloadContrariusScrivener } from './scrivener-contrarius-payload-extractor';

export type NivelResumoPayloadScrivener = 'empty' | 'ok' | 'warning';

export interface ContagemPayloadScrivener {
  chave: string;
  total: number;
}

export interface ResumoPayloadScrivener {
  nivel: NivelResumoPayloadScrivener;
  totalItens: number;
  totalDescartados: number;
  totalAvisos: number;
  porTipo: ContagemPayloadScrivener[];
  porLivro: ContagemPayloadScrivener[];
  porPeriodo: ContagemPayloadScrivener[];
  primeirosAvisos: string[];
  descricao: string;
}

function contarPorChave(chaves: readonly string[]): ContagemPayloadScrivener[] {
  const mapa = new Map<string, number>();
  for (const chave of chaves) {
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }
  return Array.from(mapa.entries())
    .map(([chave, total]) => ({ chave, total }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.chave.localeCompare(b.chave);
    });
}

export function resumirExtracaoPayloadScrivener(
  extracao: ResultadoExtracaoPayloadContrariusScrivener,
  limiteAvisos = 5,
): ResumoPayloadScrivener {
  const totalItens = extracao.totalItens;
  const totalDescartados = extracao.descartados;
  const totalAvisos = extracao.avisos.length;

  const porTipo = contarPorChave(extracao.itens.map(i => i.tipo));

  const porLivro = contarPorChave(
    extracao.itens
      .filter(i => i.livro && i.livro.trim())
      .map(i => i.livro as string),
  );

  const porPeriodo = contarPorChave(
    extracao.itens
      .filter(i => i.periodo && i.periodo.trim())
      .map(i => i.periodo as string),
  );

  const primeirosAvisos = extracao.avisos.slice(0, limiteAvisos);

  let nivel: NivelResumoPayloadScrivener;
  if (totalItens === 0 && totalDescartados === 0 && totalAvisos === 0) {
    nivel = 'empty';
  } else if (totalDescartados > 0 || totalAvisos > 0) {
    nivel = 'warning';
  } else {
    nivel = 'ok';
  }

  let descricao: string;
  if (nivel === 'empty') {
    descricao = 'No payload items found.';
  } else if (nivel === 'ok') {
    descricao = `Payload ready with ${totalItens} items.`;
  } else {
    descricao = `Payload ready with ${totalItens} items, ${totalDescartados} discarded and ${totalAvisos} warnings.`;
  }

  return {
    nivel,
    totalItens,
    totalDescartados,
    totalAvisos,
    porTipo,
    porLivro,
    porPeriodo,
    primeirosAvisos,
    descricao,
  };
}
