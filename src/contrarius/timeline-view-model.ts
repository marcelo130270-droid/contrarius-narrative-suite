import type {
  CodigoProblemaCronologia,
  CronologiaDuplaContrarius,
  ItemCronologiaContrarius,
  ModoCronologiaContrarius,
  PosicaoTemporalContrarius,
  ProblemaCronologiaContrarius,
} from './timeline-model';

export const TODOS_OS_LIVROS_CRONOLOGIA = '__todos__';
export const SEM_LIVRO_CRONOLOGIA = '__sem_livro__';

export interface FiltroVisaoCronologia {
  readonly modo: ModoCronologiaContrarius;
  readonly livro: string;
  readonly consulta: string;
}

export interface OpcaoLivroCronologia {
  readonly chave: string;
  readonly rotulo: string;
  readonly quantidade: number;
}

export interface LinhaCronologiaContrarius {
  readonly item: ItemCronologiaContrarius;
  readonly posicao: number;
  readonly rotuloTemporal: string;
  readonly rotuloContexto: string;
}

export interface VisaoCronologiaContrarius {
  readonly modo: ModoCronologiaContrarius;
  readonly posicionados: readonly LinhaCronologiaContrarius[];
  readonly naoPosicionados: readonly LinhaCronologiaContrarius[];
  readonly problemas: readonly ProblemaCronologiaContrarius[];
  readonly livros: readonly OpcaoLivroCronologia[];
  readonly totalAntesDosFiltros: number;
  readonly totalVisivel: number;
}

// ─── Normalização ─────────────────────────────────────────────────────────────

function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

// ─── Livro helpers ────────────────────────────────────────────────────────────

function firstBook(livro: readonly string[]): string {
  return livro.find((b) => b.trim() !== '') ?? '';
}

function bookChave(livro: readonly string[]): string {
  const book = firstBook(livro);
  if (book === '') return SEM_LIVRO_CRONOLOGIA;
  return normalizeForSearch(book);
}

function itemMatchesBook(item: ItemCronologiaContrarius, livro: string): boolean {
  if (livro === TODOS_OS_LIVROS_CRONOLOGIA) return true;
  return bookChave(item.livro) === livro;
}

// ─── Busca ────────────────────────────────────────────────────────────────────

function itemMatchesSearch(
  item: ItemCronologiaContrarius,
  query: string,
  rotuloTemporal: string,
): boolean {
  if (query === '') return true;
  const fields = [
    item.titulo,
    item.id,
    item.filePath,
    item.capitulo,
    item.cena,
    item.posicaoTemporal.textoOriginal,
    rotuloTemporal,
    ...item.livro,
  ];
  return fields.some((f) => normalizeForSearch(f).includes(query));
}

// ─── Rótulos temporais ────────────────────────────────────────────────────────

export function formatarPosicaoTemporal(posicao: PosicaoTemporalContrarius): string {
  const { precisao, textoOriginal, aproximada } = posicao;

  if (precisao === 'nao_posicionado') return 'Sem posição cronológica';

  let texto: string;

  if (precisao === 'ano_ordem') {
    const base = textoOriginal !== '' ? textoOriginal : '';
    texto = base !== '' ? `Ano de ordem: ${base}` : 'Ano de ordem';
  } else {
    texto = textoOriginal;
  }

  if (texto === '') return 'Sem posição cronológica';

  if (aproximada && !texto.startsWith('≈') && !texto.startsWith('~')) {
    texto = `≈ ${texto}`;
  }

  return texto;
}

function rotuloTemporalItem(
  item: ItemCronologiaContrarius,
  modo: ModoCronologiaContrarius,
  isPositioned: boolean,
): string {
  if (modo === 'cronologica') {
    return formatarPosicaoTemporal(item.posicaoTemporal);
  }
  if (isPositioned && item.ordemNarrativa !== null) {
    return `Ordem ${item.ordemNarrativa}`;
  }
  return 'Sem ordem narrativa';
}

function rotuloContextoItem(item: ItemCronologiaContrarius): string {
  const partes: string[] = [];
  const livro = firstBook(item.livro);
  if (livro !== '') partes.push(livro);
  const capitulo = item.capitulo.trim();
  if (capitulo !== '') partes.push(`Cap. ${capitulo}`);
  const cena = item.cena.trim();
  if (cena !== '') partes.push(`Cena ${cena}`);
  return partes.join(' · ');
}

// ─── Filtragem ────────────────────────────────────────────────────────────────

function filtrarItens(
  items: readonly ItemCronologiaContrarius[],
  livro: string,
  query: string,
  modo: ModoCronologiaContrarius,
  isPositioned: boolean,
): readonly ItemCronologiaContrarius[] {
  return items.filter((item) => {
    if (!itemMatchesBook(item, livro)) return false;
    if (query === '') return true;
    const rt = rotuloTemporalItem(item, modo, isPositioned);
    return itemMatchesSearch(item, query, rt);
  });
}

// ─── Linhas ───────────────────────────────────────────────────────────────────

function buildLinha(
  item: ItemCronologiaContrarius,
  posicao: number,
  modo: ModoCronologiaContrarius,
  isPositioned: boolean,
): LinhaCronologiaContrarius {
  return {
    item,
    posicao,
    rotuloTemporal: rotuloTemporalItem(item, modo, isPositioned),
    rotuloContexto: rotuloContextoItem(item),
  };
}

// ─── Livros ───────────────────────────────────────────────────────────────────

function buildLivros(
  posicionados: readonly ItemCronologiaContrarius[],
  naoPosicionados: readonly ItemCronologiaContrarius[],
): readonly OpcaoLivroCronologia[] {
  const allItems = [...posicionados, ...naoPosicionados];
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();

  for (const item of allItems) {
    const chave = bookChave(item.livro);
    const rotulo = chave === SEM_LIVRO_CRONOLOGIA ? 'Sem livro' : firstBook(item.livro);
    counts.set(chave, (counts.get(chave) ?? 0) + 1);
    if (!labels.has(chave)) labels.set(chave, rotulo);
  }

  const namedOptions: OpcaoLivroCronologia[] = [];
  for (const [chave, quantidade] of counts.entries()) {
    if (chave === SEM_LIVRO_CRONOLOGIA) continue;
    namedOptions.push({ chave, rotulo: labels.get(chave)!, quantidade });
  }
  namedOptions.sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));

  const result: OpcaoLivroCronologia[] = [
    { chave: TODOS_OS_LIVROS_CRONOLOGIA, rotulo: 'Todos os livros', quantidade: allItems.length },
    ...namedOptions,
  ];

  const semLivroCount = counts.get(SEM_LIVRO_CRONOLOGIA);
  if (semLivroCount !== undefined) {
    result.push({ chave: SEM_LIVRO_CRONOLOGIA, rotulo: 'Sem livro', quantidade: semLivroCount });
  }

  return result;
}

// ─── Problemas ────────────────────────────────────────────────────────────────

export function rotuloProblemaCronologia(codigo: CodigoProblemaCronologia): string {
  switch (codigo) {
    case 'data_invalida': return 'Data inválida';
    case 'intervalo_invertido': return 'Intervalo invertido';
    case 'ordem_narrativa_ausente': return 'Ordem narrativa ausente';
    case 'ordem_narrativa_duplicada': return 'Ordem narrativa duplicada';
    case 'referencia_evento_nao_encontrada': return 'Referência de evento não encontrada';
    case 'referencia_evento_ambigua': return 'Referência de evento ambígua';
    case 'restricao_cronologica_violada': return 'Restrição cronológica violada';
    case 'ciclo_de_dependencia': return 'Ciclo de dependência';
  }
}

function filtrarProblemas(
  problemas: readonly ProblemaCronologiaContrarius[],
  visibleIds: ReadonlySet<string>,
): readonly ProblemaCronologiaContrarius[] {
  const filtered = problemas.filter((p) => visibleIds.has(p.eventoId));
  return [...filtered].sort((a, b) => {
    if (a.nivel !== b.nivel) return a.nivel === 'erro' ? -1 : 1;
    const labelDiff = rotuloProblemaCronologia(a.codigo).localeCompare(
      rotuloProblemaCronologia(b.codigo),
      'pt-BR',
    );
    if (labelDiff !== 0) return labelDiff;
    const idDiff = a.eventoId.localeCompare(b.eventoId, 'pt-BR');
    if (idDiff !== 0) return idDiff;
    return a.filePath.localeCompare(b.filePath, 'pt-BR');
  });
}

// ─── API pública ──────────────────────────────────────────────────────────────

export function construirVisaoCronologia(
  cronologia: CronologiaDuplaContrarius,
  filtro: FiltroVisaoCronologia,
): VisaoCronologiaContrarius {
  const sequencia = cronologia[filtro.modo];
  const { posicionados: allPos, naoPosicionados: allNaoPos } = sequencia;

  const livros = buildLivros(allPos, allNaoPos);
  const totalAntesDosFiltros = allPos.length + allNaoPos.length;

  const query = normalizeForSearch(filtro.consulta);
  const filteredPos = filtrarItens(allPos, filtro.livro, query, filtro.modo, true);
  const filteredNaoPos = filtrarItens(allNaoPos, filtro.livro, query, filtro.modo, false);
  const totalVisivel = filteredPos.length + filteredNaoPos.length;

  const visibleIds = new Set<string>();
  for (const item of filteredPos) visibleIds.add(item.id);
  for (const item of filteredNaoPos) visibleIds.add(item.id);

  const linhasPos = filteredPos.map((item, i) => buildLinha(item, i + 1, filtro.modo, true));
  const linhasNaoPos = filteredNaoPos.map((item, i) => buildLinha(item, i + 1, filtro.modo, false));

  return {
    modo: filtro.modo,
    posicionados: linhasPos,
    naoPosicionados: linhasNaoPos,
    problemas: filtrarProblemas(cronologia.problemas, visibleIds),
    livros,
    totalAntesDosFiltros,
    totalVisivel,
  };
}
