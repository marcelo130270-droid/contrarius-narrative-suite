import type {
  Consciencia,
  ContrariusIndex,
  ContrariusTipoEntidade,
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
  | 'cronologia'
  | 'lugares'
  | 'relacoes'
  | 'erros';

export type FiltroNaturezaConsciencial = 'todas' | 'humanas' | 'pre-humanas';

export type CategoriaDiagnostico = 'erro' | 'indexacao' | 'interno';
export type FiltroDiagnostico = 'todos' | CategoriaDiagnostico;

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
  categoria: CategoriaDiagnostico;
  nivel: 'aviso' | 'erro';
  filePath: string;
  mensagem: string;
  campo?: string;
  tipoEntidade?: ContrariusTipoEntidade;
}

export interface GrupoDiagnostico {
  categoria: CategoriaDiagnostico;
  nivel: 'aviso' | 'erro';
  mensagem: string;
  tipoEntidade?: ContrariusTipoEntidade;
  itens: readonly ContrariusDiagnostico[];
  quantidade: number;
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
  return { categoria: 'indexacao', nivel: 'aviso', ...warning };
}

function diagnosticFromError(error: IndexError): ContrariusDiagnostico {
  return { categoria: 'erro', nivel: 'erro', ...error };
}

type EntityWithAvisos = { filePath: string; avisos: readonly string[] };

export function construirDiagnosticos(index: ContrariusIndex): readonly ContrariusDiagnostico[] {
  const internos: ContrariusDiagnostico[] = [];
  const grupos: ReadonlyArray<readonly [ContrariusTipoEntidade, readonly EntityWithAvisos[]]> = [
    ['consciencia', index.consciencias],
    ['retrovida', index.retrovidas],
    ['evento', index.eventos],
    ['lugar', index.lugares],
    ['relacao', index.relacoes],
  ];
  for (const [tipoEntidade, entities] of grupos) {
    for (const entity of entities) {
      for (const mensagem of entity.avisos) {
        internos.push({ categoria: 'interno', nivel: 'aviso', filePath: entity.filePath, mensagem, tipoEntidade });
      }
    }
  }
  return [
    ...index.erros.map(diagnosticFromError),
    ...index.avisosIndexacao.map(diagnosticFromWarning),
    ...internos,
  ];
}

const CATEGORIA_ORDER: Readonly<Record<CategoriaDiagnostico, number>> = { erro: 0, indexacao: 1, interno: 2 };

export function agruparDiagnosticos(
  diagnostics: readonly ContrariusDiagnostico[],
): readonly GrupoDiagnostico[] {
  const map = new Map<string, ContrariusDiagnostico[]>();
  for (const d of diagnostics) {
    const key = `${d.categoria}\0${d.mensagem}\0${d.tipoEntidade ?? ''}`;
    const existing = map.get(key);
    if (existing !== undefined) {
      existing.push(d);
    } else {
      map.set(key, [d]);
    }
  }
  const groups: GrupoDiagnostico[] = [];
  for (const itens of map.values()) {
    const first = itens[0];
    groups.push({
      categoria: first.categoria,
      nivel: first.nivel,
      mensagem: first.mensagem,
      tipoEntidade: first.tipoEntidade,
      itens,
      quantidade: itens.length,
    });
  }
  groups.sort((a, b) => {
    const catDiff = CATEGORIA_ORDER[a.categoria] - CATEGORIA_ORDER[b.categoria];
    if (catDiff !== 0) return catDiff;
    const qDiff = b.quantidade - a.quantidade;
    if (qDiff !== 0) return qDiff;
    return a.mensagem.localeCompare(b.mensagem, 'pt-BR');
  });
  return groups;
}

export function contarDiagnosticosPorCategoria(
  diagnostics: readonly ContrariusDiagnostico[],
): Readonly<Record<CategoriaDiagnostico | 'todos', number>> {
  let erro = 0;
  let indexacao = 0;
  let interno = 0;
  for (const d of diagnostics) {
    if (d.categoria === 'erro') erro++;
    else if (d.categoria === 'indexacao') indexacao++;
    else interno++;
  }
  return { erro, indexacao, interno, todos: erro + indexacao + interno };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function filtrarGruposDiagnostico(
  groups: readonly GrupoDiagnostico[],
  filter: FiltroDiagnostico,
  query: string,
): readonly GrupoDiagnostico[] {
  const q = normalizeSearchText(query);
  if (filter === 'todos' && q === '') return groups;
  return groups.filter((group) => {
    if (filter !== 'todos' && group.categoria !== filter) return false;
    if (q === '') return true;
    if (normalizeSearchText(group.mensagem).includes(q)) return true;
    if (group.tipoEntidade !== undefined && normalizeSearchText(group.tipoEntidade).includes(q)) return true;
    return group.itens.some((item) => normalizeSearchText(item.filePath).includes(q));
  });
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

export function humanizarTituloTecnico(valorTecnico: string): string {
  let value = valorTecnico.trim();

  const lastSlash = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
  if (lastSlash >= 0) value = value.slice(lastSlash + 1);
  if (value.toLocaleLowerCase('pt-BR').endsWith('.md')) value = value.slice(0, -3);

  const afterClean = value;

  const retrovidaMatch = /^[CP]-\d+_V\d+_/.exec(value);
  if (retrovidaMatch !== null) {
    value = value.slice(retrovidaMatch[0].length);
  } else {
    const conscienciaMatch = /^[CP]-\d+_/.exec(value);
    if (conscienciaMatch !== null) value = value.slice(conscienciaMatch[0].length);
  }

  value = value.replace(/_/g, ' ');
  value = value.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])(\d)/g, '$1 $2');
  value = value.replace(/(\d)([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1 $2');
  value = value.replace(/\s+/g, ' ').trim();

  if (value !== '') return value;

  let fallback = afterClean.replace(/_/g, ' ');
  fallback = fallback.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])(\d)/g, '$1 $2');
  fallback = fallback.replace(/(\d)([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1 $2');
  fallback = fallback.replace(/\s+/g, ' ').trim();
  return fallback || valorTecnico;
}

function isTechnicalValue(name: string, item: { id: string; filePath: string }): boolean {
  const normalized = name.trim().toLocaleLowerCase('pt-BR');
  if (normalized === '') return true;
  const fp = item.filePath.replace(/\\/g, '/').trim().toLocaleLowerCase('pt-BR');
  const fpWithoutExt = fp.endsWith('.md') ? fp.slice(0, -3) : fp;
  const lastSlash = fp.lastIndexOf('/');
  const basename = lastSlash >= 0 ? fp.slice(lastSlash + 1) : fp;
  const basenameWithoutExt = basename.endsWith('.md') ? basename.slice(0, -3) : basename;
  const id = item.id.trim().toLocaleLowerCase('pt-BR');
  return (
    normalized === id
    || normalized === fp
    || normalized === fpWithoutExt
    || normalized === basename
    || normalized === basenameWithoutExt
  );
}

export function nomeConsciencia(item: Consciencia): string {
  const nomeExplicito = item.nome.trim();
  if (nomeExplicito !== '' && !isTechnicalValue(nomeExplicito, item)) return nomeExplicito;
  const identExtraf = item.identExtraf.trim();
  if (identExtraf !== '') return identExtraf;
  return humanizarTituloTecnico(item.id);
}

export function nomeRetrovida(item: Retrovida): string {
  const primeiros = item.nomes.filter((name) => name.trim() !== '');
  if (primeiros.length > 0 && !isTechnicalValue(primeiros[0], item)) return primeiros[0];
  return humanizarTituloTecnico(item.id);
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
