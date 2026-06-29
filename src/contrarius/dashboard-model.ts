import type {
  Consciencia,
  ContrariusIndex,
  Evento,
  IndexError,
  IndexWarning,
  Lugar,
  NaturezaConsciencial,
  Relacao,
  Retrovida,
} from './types';

export type ContrariusDashboardTab =
  | 'resumo'
  | 'consciencias'
  | 'retrovidas'
  | 'eventos'
  | 'lugares'
  | 'relacoes'
  | 'erros';

export type FiltroNaturezaConsciencial = 'todas' | 'humanas' | 'pre-humanas';

export interface ContrariusDashboardResumo {
  consciencias: number;
  conscienciasPreHumanas: number;
  retrovidas: number;
  retrovidasPreHumanas: number;
  eventos: number;
  lugares: number;
  relacoes: number;
  avisosInternos: number;
  avisosIndexacao: number;
  avisos: number;
  erros: number;
  totalEntidades: number;
}

export interface ContrariusDiagnostico {
  nivel: 'aviso' | 'erro';
  filePath: string;
  mensagem: string;
  campo?: string;
}

function contarAvisos<T extends { avisos: readonly string[] }>(items: readonly T[]): number {
  return items.reduce((total, item) => total + item.avisos.length, 0);
}

function contarNatureza<T extends { naturezaConsciencial: NaturezaConsciencial }>(
  items: readonly T[],
  natureza: NaturezaConsciencial,
): number {
  return items.filter((item) => item.naturezaConsciencial === natureza).length;
}

export function construirResumo(index: ContrariusIndex): ContrariusDashboardResumo {
  const avisosInternos =
    contarAvisos(index.consciencias) +
    contarAvisos(index.retrovidas) +
    contarAvisos(index.eventos) +
    contarAvisos(index.lugares) +
    contarAvisos(index.relacoes);
  const avisosIndexacao = index.avisosIndexacao.length;

  return {
    consciencias: index.consciencias.length,
    conscienciasPreHumanas: contarNatureza(index.consciencias, 'pre-humana'),
    retrovidas: index.retrovidas.length,
    retrovidasPreHumanas: contarNatureza(index.retrovidas, 'pre-humana'),
    eventos: index.eventos.length,
    lugares: index.lugares.length,
    relacoes: index.relacoes.length,
    avisosInternos,
    avisosIndexacao,
    avisos: avisosInternos + avisosIndexacao,
    erros: index.erros.length,
    totalEntidades:
      index.consciencias.length +
      index.retrovidas.length +
      index.eventos.length +
      index.lugares.length +
      index.relacoes.length,
  };
}

function diagnosticFromWarning(warning: IndexWarning): ContrariusDiagnostico {
  return { nivel: 'aviso', ...warning };
}

function diagnosticFromError(error: IndexError): ContrariusDiagnostico {
  return { nivel: 'erro', ...error };
}

export function construirDiagnosticos(index: ContrariusIndex): readonly ContrariusDiagnostico[] {
  return [
    ...index.erros.map(diagnosticFromError),
    ...index.avisosIndexacao.map(diagnosticFromWarning),
  ];
}

export function agruparRetrovidasPorConsciencia(
  retrovidas: readonly Retrovida[],
): ReadonlyMap<string, readonly Retrovida[]> {
  const grouped = new Map<string, Retrovida[]>();
  for (const retrovida of retrovidas) {
    const key = retrovida.conscId.trim();
    if (key === '') continue;
    const current = grouped.get(key) ?? [];
    current.push(retrovida);
    grouped.set(key, current);
  }
  for (const items of grouped.values()) {
    items.sort((a, b) => {
      if (a.nascimento !== null && b.nascimento !== null && a.nascimento !== b.nascimento) {
        return a.nascimento - b.nascimento;
      }
      return a.id.localeCompare(b.id, 'pt-BR');
    });
  }
  return grouped;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function includesQuery(values: readonly string[], query: string): boolean {
  return values.some((value) => normalizeSearchText(value).includes(query));
}

function matchesNatureza(
  item: { naturezaConsciencial: NaturezaConsciencial },
  filter: FiltroNaturezaConsciencial,
): boolean {
  if (filter === 'todas') return true;
  if (filter === 'humanas') return item.naturezaConsciencial === 'humana';
  return item.naturezaConsciencial === 'pre-humana';
}

export function filtrarConsciencias(
  items: readonly Consciencia[],
  query: string,
  natureza: FiltroNaturezaConsciencial = 'todas',
): readonly Consciencia[] {
  const q = normalizeSearchText(query);
  if (q === '' && natureza === 'todas') return items;
  return items.filter((item) =>
    matchesNatureza(item, natureza) &&
    (q === '' || includesQuery(
      [item.id, item.nome, item.identExtraf, ...item.nucleoGeo, ...item.grupocarma],
      q,
    )),
  );
}

export function filtrarRetrovidas(
  items: readonly Retrovida[],
  query: string,
  natureza: FiltroNaturezaConsciencial = 'todas',
): readonly Retrovida[] {
  const q = normalizeSearchText(query);
  if (q === '' && natureza === 'todas') return items;
  return items.filter((item) =>
    matchesNatureza(item, natureza) &&
    (q === '' || includesQuery(
      [
        item.id,
        item.conscId,
        item.vida,
        ...item.nomes,
        ...item.periodo,
        ...item.nucleoGeo,
        ...item.livro,
      ],
      q,
    )),
  );
}

export function filtrarEventos(items: readonly Evento[], query: string): readonly Evento[] {
  const q = normalizeSearchText(query);
  if (q === '') return items;
  return items.filter((item) =>
    includesQuery(
      [
        item.id,
        item.titulo,
        item.data,
        item.dataInicio,
        item.dataFim,
        item.dataTextual,
        item.natureza,
        item.status,
        ...item.local,
        ...item.periodo,
        ...item.livro,
      ],
      q,
    ),
  );
}

export function filtrarLugares(items: readonly Lugar[], query: string): readonly Lugar[] {
  const q = normalizeSearchText(query);
  if (q === '') return items;
  return items.filter((item) =>
    includesQuery(
      [
        item.id,
        item.nomePreferido,
        item.nomeAtual,
        item.localidadeAtual,
        item.regiaoAtual,
        item.paisAtual,
        ...item.aliases,
        ...item.nomesHistoricos,
        ...item.nomesVariantes,
      ],
      q,
    ),
  );
}

export function filtrarRelacoes(items: readonly Relacao[], query: string): readonly Relacao[] {
  const q = normalizeSearchText(query);
  if (q === '') return items;
  return items.filter((item) =>
    includesQuery(
      [
        item.id,
        item.consciencia1,
        item.consciencia2,
        item.intensidade,
        item.estado,
        ...item.tipoRelacao,
        ...item.livro,
      ],
      q,
    ),
  );
}

export function nomeConsciencia(item: Consciencia): string {
  return item.nome.trim() || item.identExtraf.trim() || item.id;
}

export function nomeRetrovida(item: Retrovida): string {
  return item.nomes.find((name) => name.trim() !== '') ?? item.id;
}

export function nomeEvento(item: Evento): string {
  return item.titulo.trim() || item.id;
}

export function nomeLugar(item: Lugar): string {
  return item.nomePreferido.trim() || item.nomeAtual.trim() || item.id;
}

export function nomeRelacao(item: Relacao): string {
  const tipo = item.tipoRelacao.find((value) => value.trim() !== '') ?? 'Relação';
  const extremos = [item.consciencia1, item.consciencia2].filter((value) => value.trim() !== '');
  return extremos.length > 0 ? `${tipo}: ${extremos.join(' ↔ ')}` : item.id;
}
