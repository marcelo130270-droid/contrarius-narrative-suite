import type { ContrariusIndex, Evento } from './types';
import { nomeEvento } from './dashboard-model';
import { resolveEntityReference } from './entity-details-model';

export type ModoCronologiaContrarius = 'cronologica' | 'narrativa';

export type PrecisaoTemporalContrarius =
  | 'dia'
  | 'mes'
  | 'ano'
  | 'ano_ordem'
  | 'intervalo'
  | 'nao_posicionado';

export type CodigoProblemaCronologia =
  | 'data_invalida'
  | 'intervalo_invertido'
  | 'ordem_narrativa_ausente'
  | 'ordem_narrativa_duplicada'
  | 'referencia_evento_nao_encontrada'
  | 'referencia_evento_ambigua'
  | 'restricao_cronologica_violada'
  | 'ciclo_de_dependencia';

export interface PosicaoTemporalContrarius {
  readonly inicio: number | null;
  readonly fim: number | null;
  readonly precisao: PrecisaoTemporalContrarius;
  readonly textoOriginal: string;
  readonly aproximada: boolean;
}

export interface ItemCronologiaContrarius {
  readonly id: string;
  readonly titulo: string;
  readonly filePath: string;
  readonly posicaoTemporal: PosicaoTemporalContrarius;
  readonly ordemNarrativa: number | null;
  readonly livro: readonly string[];
  readonly capitulo: string;
  readonly cena: string;
}

export interface ProblemaCronologiaContrarius {
  readonly codigo: CodigoProblemaCronologia;
  readonly nivel: 'aviso' | 'erro';
  readonly eventoId: string;
  readonly filePath: string;
  readonly mensagem: string;
  readonly relacionados: readonly string[];
}

export interface SequenciaCronologiaContrarius {
  readonly modo: ModoCronologiaContrarius;
  readonly posicionados: readonly ItemCronologiaContrarius[];
  readonly naoPosicionados: readonly ItemCronologiaContrarius[];
}

export interface CronologiaDuplaContrarius {
  readonly cronologica: SequenciaCronologiaContrarius;
  readonly narrativa: SequenciaCronologiaContrarius;
  readonly problemas: readonly ProblemaCronologiaContrarius[];
}

// ─── Date parsing ────────────────────────────────────────────────────────────

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if (month === 4 || month === 6 || month === 9 || month === 11) return 30;
  return 31;
}

interface ParsedDate {
  key: number;
  precisao: 'dia' | 'mes' | 'ano';
  valid: boolean;
}

function parseDateStr(s: string): ParsedDate | null {
  const trimmed = s.trim();
  if (trimmed === '') return null;
  const m = /^(-?\d+)(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(trimmed);
  if (m === null) return null;
  const year = parseInt(m[1], 10);
  if (!Number.isFinite(year)) return null;
  const month = m[2] !== undefined ? parseInt(m[2], 10) : null;
  const day = m[3] !== undefined ? parseInt(m[3], 10) : null;
  let valid = true;
  if (month !== null) {
    if (month < 1 || month > 12) {
      valid = false;
    } else if (day !== null && (day < 1 || day > daysInMonth(year, month))) {
      valid = false;
    }
  }
  const key = year * 10000 + (month ?? 0) * 100 + (day ?? 0);
  const precisao: 'dia' | 'mes' | 'ano' =
    day !== null ? 'dia' : month !== null ? 'mes' : 'ano';
  return { key, precisao, valid };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normFP(fp: string): string {
  return fp.replace(/\\/g, '/').replace(/\/{2,}/g, '/').trim();
}

function makeProblem(
  codigo: CodigoProblemaCronologia,
  nivel: 'aviso' | 'erro',
  evento: Evento,
  mensagem: string,
  relacionados: readonly string[] = [],
): ProblemaCronologiaContrarius {
  return { codigo, nivel, eventoId: evento.id, filePath: evento.filePath, mensagem, relacionados };
}

function normalizeForComp(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function firstBook(livro: readonly string[]): string {
  return livro.find((b) => b.trim() !== '') ?? '';
}

// ─── Temporal position ────────────────────────────────────────────────────────

interface TemporalResult {
  posicao: PosicaoTemporalContrarius;
  problemas: ProblemaCronologiaContrarius[];
}

function buildTemporalPosition(evento: Evento): TemporalResult {
  const problemas: ProblemaCronologiaContrarius[] = [];
  const aproximada = evento.dataAproximada;

  // 1. Try data
  const dataStr = evento.data.trim();
  if (dataStr !== '') {
    const parsed = parseDateStr(dataStr);
    if (parsed === null) {
      problemas.push(makeProblem('data_invalida', 'aviso', evento, `Data não reconhecida: "${evento.data}"`));
    } else if (!parsed.valid) {
      problemas.push(makeProblem('data_invalida', 'aviso', evento, `Data de calendário inválida: "${evento.data}"`));
    } else {
      return {
        posicao: { inicio: parsed.key, fim: parsed.key, precisao: parsed.precisao, textoOriginal: evento.data, aproximada },
        problemas,
      };
    }
  }

  // 2. Try dataInicio / dataFim
  const inicioStr = evento.dataInicio.trim();
  const fimStr = evento.dataFim.trim();
  if (inicioStr !== '' || fimStr !== '') {
    const parsedI = inicioStr !== '' ? parseDateStr(inicioStr) : null;
    const parsedF = fimStr !== '' ? parseDateStr(fimStr) : null;
    let inicioKey: number | null = null;
    let fimKey: number | null = null;

    if (parsedI !== null) {
      if (!parsedI.valid) {
        problemas.push(makeProblem('data_invalida', 'aviso', evento, `Data de início inválida: "${evento.dataInicio}"`));
      } else {
        inicioKey = parsedI.key;
      }
    }
    if (parsedF !== null) {
      if (!parsedF.valid) {
        problemas.push(makeProblem('data_invalida', 'aviso', evento, `Data de fim inválida: "${evento.dataFim}"`));
      } else {
        fimKey = parsedF.key;
      }
    }

    if (inicioKey !== null || fimKey !== null) {
      const finalInicio = inicioKey ?? fimKey!;
      const finalFim = fimKey ?? inicioKey!;
      const textoOriginal = [inicioStr, fimStr].filter((s) => s !== '').join(' – ');
      if (inicioKey !== null && fimKey !== null && inicioKey > fimKey) {
        problemas.push(makeProblem(
          'intervalo_invertido', 'aviso', evento,
          `Intervalo invertido: início "${evento.dataInicio}" posterior ao fim "${evento.dataFim}"`,
        ));
      }
      return {
        posicao: { inicio: finalInicio, fim: finalFim, precisao: 'intervalo', textoOriginal, aproximada },
        problemas,
      };
    }
  }

  // 3. Try anoOrdem
  if (evento.anoOrdem !== null && Number.isFinite(evento.anoOrdem)) {
    const key = evento.anoOrdem * 10000;
    return {
      posicao: { inicio: key, fim: key, precisao: 'ano_ordem', textoOriginal: String(evento.anoOrdem), aproximada },
      problemas,
    };
  }

  // 4. Not positioned
  return {
    posicao: { inicio: null, fim: null, precisao: 'nao_posicionado', textoOriginal: '', aproximada },
    problemas,
  };
}

// ─── Item construction ───────────────────────────────────────────────────────

function toItem(evento: Evento, posicao: PosicaoTemporalContrarius): ItemCronologiaContrarius {
  return {
    id: evento.id,
    titulo: nomeEvento(evento),
    filePath: normFP(evento.filePath),
    posicaoTemporal: posicao,
    ordemNarrativa: evento.ordemNarrativa,
    livro: [...evento.livro],
    capitulo: evento.capitulo,
    cena: evento.cena,
  };
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

function compareNullNum(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function sortCronologica(
  eventos: readonly Evento[],
  posicoes: ReadonlyMap<string, PosicaoTemporalContrarius>,
): Evento[] {
  return [...eventos].sort((a, b) => {
    const pa = posicoes.get(normFP(a.filePath))!;
    const pb = posicoes.get(normFP(b.filePath))!;
    const iDiff = compareNullNum(pa.inicio, pb.inicio);
    if (iDiff !== 0) return iDiff;
    const fDiff = compareNullNum(pa.fim, pb.fim);
    if (fDiff !== 0) return fDiff;
    const aoDiff = compareNullNum(a.anoOrdem, b.anoOrdem);
    if (aoDiff !== 0) return aoDiff;
    const tDiff = nomeEvento(a).localeCompare(nomeEvento(b), 'pt-BR');
    if (tDiff !== 0) return tDiff;
    return a.filePath.localeCompare(b.filePath, 'pt-BR');
  });
}

function sortNarrativa(eventos: readonly Evento[]): Evento[] {
  return [...eventos].sort((a, b) => {
    const bkA = normalizeForComp(firstBook(a.livro));
    const bkB = normalizeForComp(firstBook(b.livro));
    const bookDiff = bkA.localeCompare(bkB, 'pt-BR');
    if (bookDiff !== 0) return bookDiff;
    const onA = a.ordemNarrativa ?? 0;
    const onB = b.ordemNarrativa ?? 0;
    if (onA !== onB) return onA - onB;
    const cDiff = a.capitulo.localeCompare(b.capitulo, 'pt-BR');
    if (cDiff !== 0) return cDiff;
    const scDiff = a.cena.localeCompare(b.cena, 'pt-BR');
    if (scDiff !== 0) return scDiff;
    const tDiff = nomeEvento(a).localeCompare(nomeEvento(b), 'pt-BR');
    if (tDiff !== 0) return tDiff;
    return a.filePath.localeCompare(b.filePath, 'pt-BR');
  });
}

// ─── Narrative problems ───────────────────────────────────────────────────────

function buildNarrativaProblemas(eventos: readonly Evento[]): ProblemaCronologiaContrarius[] {
  const problemas: ProblemaCronologiaContrarius[] = [];

  for (const evento of eventos) {
    if (evento.ordemNarrativa === null || !Number.isFinite(evento.ordemNarrativa)) {
      problemas.push(makeProblem('ordem_narrativa_ausente', 'aviso', evento, 'Ordem narrativa ausente.'));
    }
  }

  const byBook = new Map<string, Map<number, Evento[]>>();
  for (const evento of eventos) {
    if (evento.ordemNarrativa === null || !Number.isFinite(evento.ordemNarrativa)) continue;
    const book = normalizeForComp(firstBook(evento.livro));
    let orders = byBook.get(book);
    if (orders === undefined) { orders = new Map(); byBook.set(book, orders); }
    const group = orders.get(evento.ordemNarrativa) ?? [];
    group.push(evento);
    orders.set(evento.ordemNarrativa, group);
  }

  for (const orders of byBook.values()) {
    for (const group of orders.values()) {
      if (group.length <= 1) continue;
      for (const evento of group) {
        const relacionados = group
          .filter((e) => e.filePath !== evento.filePath)
          .map((e) => e.id);
        problemas.push(makeProblem(
          'ordem_narrativa_duplicada', 'aviso', evento,
          `Ordem narrativa ${evento.ordemNarrativa} duplicada no livro "${firstBook(evento.livro)}".`,
          relacionados,
        ));
      }
    }
  }

  return problemas;
}

// ─── Constraint checking ──────────────────────────────────────────────────────

function detectCycles(
  allFilePaths: readonly string[],
  graph: Map<string, Set<string>>,
): string[][] {
  const color = new Map<string, 0 | 1 | 2>();
  for (const fp of allFilePaths) color.set(fp, 0);

  const reportedKeys = new Set<string>();
  const result: string[][] = [];
  const path: string[] = [];

  function dfs(fp: string): void {
    color.set(fp, 1);
    path.push(fp);
    const successors = graph.get(fp);
    if (successors !== undefined) {
      for (const succ of successors) {
        const c = color.get(succ);
        if (c === 1) {
          const idx = path.indexOf(succ);
          const cycle = path.slice(idx);
          const key = [...cycle].sort().join('\0');
          if (!reportedKeys.has(key)) {
            reportedKeys.add(key);
            result.push([...cycle]);
          }
        } else if (c === 0) {
          dfs(succ);
        }
      }
    }
    path.pop();
    color.set(fp, 2);
  }

  for (const fp of allFilePaths) {
    if (color.get(fp) === 0) dfs(fp);
  }
  return result;
}

function buildConstraintProblemas(
  index: ContrariusIndex,
  eventos: readonly Evento[],
  posicoes: ReadonlyMap<string, PosicaoTemporalContrarius>,
): ProblemaCronologiaContrarius[] {
  const problemas: ProblemaCronologiaContrarius[] = [];

  const byPath = new Map<string, Evento>();
  for (const e of eventos) byPath.set(normFP(e.filePath), e);

  const graph = new Map<string, Set<string>>();
  const edgesSeen = new Set<string>();

  function addEdge(from: string, to: string): void {
    const edgeKey = `${from}\0${to}`;
    if (edgesSeen.has(edgeKey)) return;
    edgesSeen.add(edgeKey);
    let set = graph.get(from);
    if (set === undefined) { set = new Set(); graph.set(from, set); }
    set.add(to);
  }

  for (const evento of eventos) {
    const fpA = normFP(evento.filePath);
    const posA = posicoes.get(fpA);

    for (const ref of evento.eventosAnteriores) {
      const res = resolveEntityReference(index, ref, 'evento');
      if (res.status === 'not-found') {
        problemas.push(makeProblem('referencia_evento_nao_encontrada', 'aviso', evento,
          `Referência a evento anterior não encontrada: "${ref}"`));
        continue;
      }
      if (res.status === 'ambiguous') {
        problemas.push(makeProblem('referencia_evento_ambigua', 'aviso', evento,
          `Referência a evento anterior ambígua: "${ref}"`));
        continue;
      }
      const fpB = normFP(res.item.filePath);
      addEdge(fpB, fpA); // B must precede A
      const posB = posicoes.get(fpB);
      if (posA !== undefined && posB !== undefined && posA.inicio !== null && posB.inicio !== null) {
        if (posB.inicio > posA.inicio) {
          const eB = byPath.get(fpB);
          problemas.push(makeProblem('restricao_cronologica_violada', 'aviso', evento,
            `Restrição violada: evento anterior "${eB?.id ?? fpB}" ocorre cronologicamente após "${evento.id}".`,
            [eB?.id ?? fpB]));
        }
      }
    }

    for (const ref of evento.eventosPosteriores) {
      const res = resolveEntityReference(index, ref, 'evento');
      if (res.status === 'not-found') {
        problemas.push(makeProblem('referencia_evento_nao_encontrada', 'aviso', evento,
          `Referência a evento posterior não encontrada: "${ref}"`));
        continue;
      }
      if (res.status === 'ambiguous') {
        problemas.push(makeProblem('referencia_evento_ambigua', 'aviso', evento,
          `Referência a evento posterior ambígua: "${ref}"`));
        continue;
      }
      const fpB = normFP(res.item.filePath);
      addEdge(fpA, fpB); // A must precede B
      const posB = posicoes.get(fpB);
      if (posA !== undefined && posB !== undefined && posA.inicio !== null && posB.inicio !== null) {
        if (posB.inicio < posA.inicio) {
          const eB = byPath.get(fpB);
          problemas.push(makeProblem('restricao_cronologica_violada', 'aviso', evento,
            `Restrição violada: evento posterior "${eB?.id ?? fpB}" ocorre cronologicamente antes de "${evento.id}".`,
            [eB?.id ?? fpB]));
        }
      }
    }
  }

  const allFPs = [...byPath.keys()];
  const cycles = detectCycles(allFPs, graph);
  for (const cycle of cycles) {
    const firstEvento = byPath.get(cycle[0]);
    if (firstEvento === undefined) continue;
    const relacionados = cycle
      .slice(1)
      .map((fp) => byPath.get(fp)?.id ?? fp)
      .filter((id) => id !== '');
    problemas.push(makeProblem(
      'ciclo_de_dependencia', 'erro', firstEvento,
      `Ciclo de dependência detectado envolvendo ${cycle.length} evento(s).`,
      relacionados,
    ));
  }

  return problemas;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function construirCronologiaDupla(index: ContrariusIndex): CronologiaDuplaContrarius {
  const eventos = index.eventos;
  const allProblemas: ProblemaCronologiaContrarius[] = [];

  const posicoes = new Map<string, PosicaoTemporalContrarius>();
  for (const evento of eventos) {
    const { posicao, problemas } = buildTemporalPosition(evento);
    posicoes.set(normFP(evento.filePath), posicao);
    allProblemas.push(...problemas);
  }

  const cronPos: Evento[] = [];
  const cronNaoPos: Evento[] = [];
  for (const evento of eventos) {
    const pos = posicoes.get(normFP(evento.filePath))!;
    (pos.inicio !== null ? cronPos : cronNaoPos).push(evento);
  }

  const narrPos: Evento[] = [];
  const narrNaoPos: Evento[] = [];
  for (const evento of eventos) {
    (evento.ordemNarrativa !== null && Number.isFinite(evento.ordemNarrativa) ? narrPos : narrNaoPos).push(evento);
  }

  allProblemas.push(...buildNarrativaProblemas(eventos));
  allProblemas.push(...buildConstraintProblemas(index, eventos, posicoes));

  return {
    cronologica: {
      modo: 'cronologica',
      posicionados: sortCronologica(cronPos, posicoes).map((e) => toItem(e, posicoes.get(normFP(e.filePath))!)),
      naoPosicionados: sortCronologica(cronNaoPos, posicoes).map((e) => toItem(e, posicoes.get(normFP(e.filePath))!)),
    },
    narrativa: {
      modo: 'narrativa',
      posicionados: sortNarrativa(narrPos).map((e) => toItem(e, posicoes.get(normFP(e.filePath))!)),
      naoPosicionados: sortNarrativa(narrNaoPos).map((e) => toItem(e, posicoes.get(normFP(e.filePath))!)),
    },
    problemas: allProblemas,
  };
}
