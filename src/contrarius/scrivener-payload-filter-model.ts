import type { ItemPayloadScrivener, TipoItemPayloadScrivener } from './scrivener-package-payload-model';

export interface FiltrosPayloadScrivener {
  tipos?: readonly TipoItemPayloadScrivener[];
  livros?: readonly string[];
  periodos?: readonly string[];
  textoBusca?: string;
  incluirSemLivro?: boolean;
  incluirSemPeriodo?: boolean;
}

export interface ResultadoFiltroPayloadScrivener {
  itens: ItemPayloadScrivener[];
  totalOriginal: number;
  totalFiltrado: number;
  totalRemovido: number;
  filtrosAtivos: string[];
}

export function normalizarFiltrosPayloadScrivener(filtros?: FiltrosPayloadScrivener): FiltrosPayloadScrivener {
  if (!filtros) return {};

  const result: FiltrosPayloadScrivener = {};

  if (filtros.tipos && filtros.tipos.length > 0) {
    const seen = new Set<string>();
    const tipos: TipoItemPayloadScrivener[] = [];
    for (const t of filtros.tipos) {
      const n = (t as string).trim() as TipoItemPayloadScrivener;
      if (n && !seen.has(n)) { seen.add(n); tipos.push(n); }
    }
    if (tipos.length > 0) result.tipos = tipos;
  }

  if (filtros.livros && filtros.livros.length > 0) {
    const seen = new Set<string>();
    const livros: string[] = [];
    for (const l of filtros.livros) {
      const n = l.trim();
      if (n && !seen.has(n)) { seen.add(n); livros.push(n); }
    }
    if (livros.length > 0) result.livros = livros;
  }

  if (filtros.periodos && filtros.periodos.length > 0) {
    const seen = new Set<string>();
    const periodos: string[] = [];
    for (const p of filtros.periodos) {
      const n = p.trim();
      if (n && !seen.has(n)) { seen.add(n); periodos.push(n); }
    }
    if (periodos.length > 0) result.periodos = periodos;
  }

  if (filtros.textoBusca !== undefined) {
    const texto = filtros.textoBusca.trim();
    if (texto) result.textoBusca = texto;
  }

  if (filtros.incluirSemLivro !== undefined) result.incluirSemLivro = filtros.incluirSemLivro;
  if (filtros.incluirSemPeriodo !== undefined) result.incluirSemPeriodo = filtros.incluirSemPeriodo;

  return result;
}

function textoCorresponde(item: ItemPayloadScrivener, busca: string): boolean {
  const b = busca.toLowerCase();
  const campos = [
    item.titulo,
    item.id,
    item.caminhoFonte ?? '',
    item.livro ?? '',
    item.periodo ?? '',
    ...(item.tags ?? []),
  ];
  return campos.some(c => c.toLowerCase().includes(b));
}

export function filtrarItensPayloadScrivener(
  itens: readonly ItemPayloadScrivener[],
  filtros?: FiltrosPayloadScrivener,
): ResultadoFiltroPayloadScrivener {
  const f = normalizarFiltrosPayloadScrivener(filtros);
  const totalOriginal = itens.length;
  const filtrosAtivos: string[] = [];

  if (f.tipos && f.tipos.length > 0) {
    for (const t of f.tipos) filtrosAtivos.push(`tipo:${t}`);
  }
  if (f.livros && f.livros.length > 0) {
    for (const l of f.livros) filtrosAtivos.push(`livro:${l}`);
  }
  if (f.periodos && f.periodos.length > 0) {
    for (const p of f.periodos) filtrosAtivos.push(`periodo:${p}`);
  }
  if (f.textoBusca) filtrosAtivos.push(`busca:${f.textoBusca}`);
  if (f.incluirSemLivro) filtrosAtivos.push('incluirSemLivro');
  if (f.incluirSemPeriodo) filtrosAtivos.push('incluirSemPeriodo');

  let filtered: ItemPayloadScrivener[] = [...itens];

  if (f.tipos && f.tipos.length > 0) {
    const tiposSet = new Set(f.tipos);
    filtered = filtered.filter(i => tiposSet.has(i.tipo));
  }

  if (f.livros && f.livros.length > 0) {
    const livrosSet = new Set(f.livros.map(l => l.toLowerCase()));
    filtered = filtered.filter(i => {
      const semLivro = !i.livro || !i.livro.trim();
      if (semLivro) return !!f.incluirSemLivro;
      return livrosSet.has(i.livro!.toLowerCase());
    });
  }

  if (f.periodos && f.periodos.length > 0) {
    const periodosSet = new Set(f.periodos.map(p => p.toLowerCase()));
    filtered = filtered.filter(i => {
      const semPeriodo = !i.periodo || !i.periodo.trim();
      if (semPeriodo) return !!f.incluirSemPeriodo;
      return periodosSet.has(i.periodo!.toLowerCase());
    });
  }

  if (f.textoBusca) {
    const busca = f.textoBusca;
    filtered = filtered.filter(i => textoCorresponde(i, busca));
  }

  const totalFiltrado = filtered.length;
  const totalRemovido = totalOriginal - totalFiltrado;

  return { itens: filtered, totalOriginal, totalFiltrado, totalRemovido, filtrosAtivos };
}

export function filtrosPayloadScrivenerEstaoAtivos(filtros?: FiltrosPayloadScrivener): boolean {
  if (!filtros) return false;
  const f = normalizarFiltrosPayloadScrivener(filtros);
  return (
    (!!f.tipos && f.tipos.length > 0) ||
    (!!f.livros && f.livros.length > 0) ||
    (!!f.periodos && f.periodos.length > 0) ||
    !!f.textoBusca ||
    !!f.incluirSemLivro ||
    !!f.incluirSemPeriodo
  );
}
