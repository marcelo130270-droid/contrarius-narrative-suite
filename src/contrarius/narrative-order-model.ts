import type { ContrariusIndex, Evento } from './types';
import { nomeEvento } from './dashboard-model';

export const TODOS_OS_LIVROS_PLANO_NARRATIVO = '__todos__';
export const SEM_LIVRO_PLANO_NARRATIVO = '__sem_livro__';

export interface ItemPlanoNarrativo {
  readonly chave: string;
  readonly id: string;
  readonly titulo: string;
  readonly filePath: string;
  readonly livro: string;
  readonly livroChave: string;
  readonly ordemOriginal: number | null;
  readonly ordemAtual: number | null;
  readonly capituloOriginal: string;
  readonly capituloAtual: string;
  readonly cenaOriginal: string;
  readonly cenaAtual: string;
  readonly alterado: boolean;
}

export interface ProblemaPlanoNarrativo {
  readonly codigo: 'ordem_invalida' | 'ordem_duplicada' | 'arquivo_duplicado';
  readonly nivel: 'aviso' | 'erro';
  readonly chave: string;
  readonly mensagem: string;
  readonly relacionados: readonly string[];
}

export interface PlanoNarrativo {
  readonly livro: string;
  readonly itens: readonly ItemPlanoNarrativo[];
  readonly problemas: readonly ProblemaPlanoNarrativo[];
  readonly totalAlterados: number;
}

export interface EdicaoItemPlanoNarrativo {
  readonly ordemNarrativa?: number | null;
  readonly capitulo?: string;
  readonly cena?: string;
}

export interface OpcoesRenumeracaoNarrativa {
  readonly inicio: number;
  readonly passo: number;
}

export interface AlteracaoNarrativaEvento {
  readonly chave: string;
  readonly id: string;
  readonly filePath: string;
  readonly antes: {
    readonly ordemNarrativa: number | null;
    readonly capitulo: string;
    readonly cena: string;
  };
  readonly depois: {
    readonly ordemNarrativa: number | null;
    readonly capitulo: string;
    readonly cena: string;
  };
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function normFP(fp: string): string {
  return fp.replace(/\\/g, '/').replace(/\/{2,}/g, '/').trim();
}

function normalizarChaveLivro(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function primeiroLivro(livro: readonly string[]): string {
  return livro.find((b) => b.trim() !== '') ?? '';
}

function criarChaveItem(evento: Evento): string {
  return `evento:${normFP(evento.filePath)}:${evento.id}`;
}

function normalizarOrdem(v: number | null): { valor: number | null; invalido: boolean } {
  if (v === null) return { valor: null, invalido: false };
  if (!Number.isFinite(v) || !Number.isInteger(v)) return { valor: null, invalido: true };
  return { valor: v, invalido: false };
}

function computarAlterado(
  ordemAtual: number | null,
  ordemOriginal: number | null,
  capituloAtual: string,
  capituloOriginal: string,
  cenaAtual: string,
  cenaOriginal: string,
): boolean {
  return ordemAtual !== ordemOriginal || capituloAtual !== capituloOriginal || cenaAtual !== cenaOriginal;
}

function computarProblemas(
  itens: readonly ItemPlanoNarrativo[],
  ordemInvalidaChaves: readonly string[],
): readonly ProblemaPlanoNarrativo[] {
  const problemas: ProblemaPlanoNarrativo[] = [];

  for (const chave of ordemInvalidaChaves) {
    problemas.push({
      codigo: 'ordem_invalida',
      nivel: 'aviso',
      chave,
      mensagem: 'Ordem narrativa inválida (não é número inteiro finito).',
      relacionados: [],
    });
  }

  const byFilePath = new Map<string, string[]>();
  for (const item of itens) {
    const existing = byFilePath.get(item.filePath);
    if (existing !== undefined) {
      existing.push(item.chave);
    } else {
      byFilePath.set(item.filePath, [item.chave]);
    }
  }
  for (const chaves of byFilePath.values()) {
    if (chaves.length <= 1) continue;
    for (const chave of chaves) {
      problemas.push({
        codigo: 'arquivo_duplicado',
        nivel: 'erro',
        chave,
        mensagem: 'Arquivo duplicado.',
        relacionados: chaves.filter((c) => c !== chave),
      });
    }
  }

  const byLivroOrdem = new Map<string, Map<number, string[]>>();
  for (const item of itens) {
    if (item.ordemAtual === null) continue;
    let orders = byLivroOrdem.get(item.livroChave);
    if (orders === undefined) {
      orders = new Map<number, string[]>();
      byLivroOrdem.set(item.livroChave, orders);
    }
    const existing = orders.get(item.ordemAtual);
    if (existing !== undefined) {
      existing.push(item.chave);
    } else {
      orders.set(item.ordemAtual, [item.chave]);
    }
  }
  for (const orders of byLivroOrdem.values()) {
    for (const [ordem, chaves] of orders) {
      if (chaves.length <= 1) continue;
      for (const chave of chaves) {
        problemas.push({
          codigo: 'ordem_duplicada',
          nivel: 'aviso',
          chave,
          mensagem: `Ordem narrativa ${ordem} duplicada no mesmo livro.`,
          relacionados: chaves.filter((c) => c !== chave),
        });
      }
    }
  }

  return problemas;
}

function makePlano(
  livro: string,
  itens: readonly ItemPlanoNarrativo[],
  ordemInvalidaChaves: readonly string[] = [],
): PlanoNarrativo {
  return {
    livro,
    itens,
    problemas: computarProblemas(itens, ordemInvalidaChaves),
    totalAlterados: itens.filter((i) => i.alterado).length,
  };
}

function compareItens(a: ItemPlanoNarrativo, b: ItemPlanoNarrativo): number {
  const lkDiff = a.livroChave.localeCompare(b.livroChave, 'pt-BR');
  if (lkDiff !== 0) return lkDiff;

  const aNull = a.ordemAtual === null;
  const bNull = b.ordemAtual === null;
  if (aNull !== bNull) return aNull ? 1 : -1;

  if (!aNull && a.ordemAtual !== b.ordemAtual) return a.ordemAtual! - b.ordemAtual!;

  const cDiff = a.capituloAtual.localeCompare(b.capituloAtual, 'pt-BR');
  if (cDiff !== 0) return cDiff;

  const sDiff = a.cenaAtual.localeCompare(b.cenaAtual, 'pt-BR');
  if (sDiff !== 0) return sDiff;

  const tDiff = a.titulo.localeCompare(b.titulo, 'pt-BR');
  if (tDiff !== 0) return tDiff;

  return a.filePath.localeCompare(b.filePath, 'pt-BR');
}

// ─── API pública ──────────────────────────────────────────────────────────────

export function construirPlanoNarrativo(index: ContrariusIndex, livro: string): PlanoNarrativo {
  const ordemInvalidaChaves: string[] = [];
  const itens: ItemPlanoNarrativo[] = [];

  for (const evento of index.eventos) {
    const primLivro = primeiroLivro(evento.livro);
    const livroChave = normalizarChaveLivro(primLivro);

    if (livro === TODOS_OS_LIVROS_PLANO_NARRATIVO) {
      // todos os eventos incluídos
    } else if (livro === SEM_LIVRO_PLANO_NARRATIVO) {
      if (primLivro !== '') continue;
    } else {
      if (livroChave !== normalizarChaveLivro(livro)) continue;
    }

    const chave = criarChaveItem(evento);
    const { valor: ordem, invalido } = normalizarOrdem(evento.ordemNarrativa);
    if (invalido) ordemInvalidaChaves.push(chave);

    const cap = evento.capitulo.trim();
    const cen = evento.cena.trim();

    itens.push({
      chave,
      id: evento.id,
      titulo: nomeEvento(evento),
      filePath: normFP(evento.filePath),
      livro: primLivro,
      livroChave,
      ordemOriginal: ordem,
      ordemAtual: ordem,
      capituloOriginal: cap,
      capituloAtual: cap,
      cenaOriginal: cen,
      cenaAtual: cen,
      alterado: false,
    });
  }

  itens.sort(compareItens);
  return makePlano(livro, itens, ordemInvalidaChaves);
}

export function editarItemPlanoNarrativo(
  plano: PlanoNarrativo,
  chave: string,
  edicao: EdicaoItemPlanoNarrativo,
): PlanoNarrativo {
  let encontrado = false;
  const ordemInvalidaChaves: string[] = [];
  const novosItens: ItemPlanoNarrativo[] = [];

  for (const item of plano.itens) {
    if (item.chave !== chave) {
      novosItens.push(item);
      continue;
    }
    encontrado = true;

    let ordemAtual = item.ordemAtual;
    if (edicao.ordemNarrativa !== undefined) {
      const ordemValor = edicao.ordemNarrativa;
      const { valor, invalido } = normalizarOrdem(ordemValor);
      if (invalido) {
        ordemInvalidaChaves.push(chave);
      } else {
        ordemAtual = valor;
      }
    }

    const capituloAtual = edicao.capitulo !== undefined ? edicao.capitulo.trim() : item.capituloAtual;
    const cenaAtual = edicao.cena !== undefined ? edicao.cena.trim() : item.cenaAtual;
    const alterado = computarAlterado(
      ordemAtual, item.ordemOriginal,
      capituloAtual, item.capituloOriginal,
      cenaAtual, item.cenaOriginal,
    );

    novosItens.push({ ...item, ordemAtual, capituloAtual, cenaAtual, alterado });
  }

  if (!encontrado) return makePlano(plano.livro, plano.itens);
  return makePlano(plano.livro, novosItens, ordemInvalidaChaves);
}

export function moverItemPlanoNarrativo(
  plano: PlanoNarrativo,
  chave: string,
  indiceDestino: number,
): PlanoNarrativo {
  const idx = plano.itens.findIndex((i) => i.chave === chave);
  if (idx === -1) return makePlano(plano.livro, plano.itens);

  const itens = [...plano.itens];
  const [item] = itens.splice(idx, 1);
  const destino = Math.max(0, Math.min(indiceDestino, itens.length));
  itens.splice(destino, 0, item);

  return makePlano(plano.livro, itens);
}

export function renumerarPlanoNarrativo(
  plano: PlanoNarrativo,
  opcoes: OpcoesRenumeracaoNarrativa,
): PlanoNarrativo {
  const { inicio, passo } = opcoes;

  if (
    !Number.isFinite(inicio) || !Number.isInteger(inicio) ||
    !Number.isFinite(passo) || !Number.isInteger(passo) ||
    passo === 0
  ) {
    const problemaInvalido: ProblemaPlanoNarrativo = {
      codigo: 'ordem_invalida',
      nivel: 'aviso',
      chave: '',
      mensagem: 'Parâmetros de renumeração inválidos (inicio ou passo não são inteiros finitos, ou passo é zero).',
      relacionados: [],
    };
    return {
      ...plano,
      problemas: [...computarProblemas(plano.itens, []), problemaInvalido],
    };
  }

  const isTodos = plano.livro === TODOS_OS_LIVROS_PLANO_NARRATIVO;
  let contador = inicio;
  let livroChaveAnterior: string | null = null;

  const novosItens = plano.itens.map((item) => {
    if (isTodos) {
      if (livroChaveAnterior !== null && item.livroChave !== livroChaveAnterior) {
        contador = inicio;
      }
      livroChaveAnterior = item.livroChave;
    }
    const ordemAtual = contador;
    contador += passo;
    const alterado = computarAlterado(
      ordemAtual, item.ordemOriginal,
      item.capituloAtual, item.capituloOriginal,
      item.cenaAtual, item.cenaOriginal,
    );
    return { ...item, ordemAtual, alterado };
  });

  return makePlano(plano.livro, novosItens);
}

export function restaurarItemPlanoNarrativo(plano: PlanoNarrativo, chave: string): PlanoNarrativo {
  const novosItens = plano.itens.map((item) =>
    item.chave !== chave
      ? item
      : {
          ...item,
          ordemAtual: item.ordemOriginal,
          capituloAtual: item.capituloOriginal,
          cenaAtual: item.cenaOriginal,
          alterado: false,
        },
  );
  return makePlano(plano.livro, novosItens);
}

export function restaurarPlanoNarrativo(plano: PlanoNarrativo): PlanoNarrativo {
  const novosItens = plano.itens.map((item) => ({
    ...item,
    ordemAtual: item.ordemOriginal,
    capituloAtual: item.capituloOriginal,
    cenaAtual: item.cenaOriginal,
    alterado: false,
  }));
  return makePlano(plano.livro, novosItens);
}

export function gerarAlteracoesPlanoNarrativo(plano: PlanoNarrativo): readonly AlteracaoNarrativaEvento[] {
  return plano.itens
    .filter((i) => i.alterado)
    .map((i) => ({
      chave: i.chave,
      id: i.id,
      filePath: i.filePath,
      antes: {
        ordemNarrativa: i.ordemOriginal,
        capitulo: i.capituloOriginal,
        cena: i.cenaOriginal,
      },
      depois: {
        ordemNarrativa: i.ordemAtual,
        capitulo: i.capituloAtual,
        cena: i.cenaAtual,
      },
    }));
}
