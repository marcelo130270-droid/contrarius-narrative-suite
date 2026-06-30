import {
  nomeConsciencia,
  nomeEvento,
  nomeLugar,
  nomeRelacao,
  nomeRetrovida,
} from './dashboard-model';
import type {
  Consciencia,
  ContrariusIndex,
  ContrariusTipoEntidade,
  Evento,
  Lugar,
  Relacao,
  Retrovida,
} from './types';
import { extractBasename } from './utils';

export interface ContrariusEntityKey {
  tipoEntidade: ContrariusTipoEntidade;
  filePath: string;
}

export interface ContrariusRelatedItem {
  key: ContrariusEntityKey;
  tipoEntidade: ContrariusTipoEntidade;
  title: string;
  filePath: string;
  id?: string;
}

export type ContrariusReferenceResolution =
  | {
      status: 'resolved';
      reference: string;
      item: ContrariusRelatedItem;
    }
  | {
      status: 'not-found';
      reference: string;
      expectedType?: ContrariusTipoEntidade;
    }
  | {
      status: 'ambiguous';
      reference: string;
      expectedType?: ContrariusTipoEntidade;
      candidates: readonly ContrariusRelatedItem[];
    };

export interface ContrariusDetailField {
  label: string;
  value: string;
}

export interface ContrariusRelatedSection {
  id: string;
  label: string;
  items: readonly ContrariusRelatedItem[];
  derived?: boolean;
}

export interface ContrariusUnresolvedReference {
  context: string;
  reference: string;
  status: 'not-found' | 'ambiguous';
  expectedType?: ContrariusTipoEntidade;
  candidates: readonly ContrariusRelatedItem[];
}

export interface ContrariusEntityDetail {
  key: ContrariusEntityKey;
  tipoEntidade: ContrariusTipoEntidade;
  title: string;
  id?: string;
  filePath: string;
  fields: readonly ContrariusDetailField[];
  relatedSections: readonly ContrariusRelatedSection[];
  unresolvedReferences: readonly ContrariusUnresolvedReference[];
}

type ContrariusEntity = Consciencia | Retrovida | Evento | Lugar | Relacao;

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/{2,}/g, '/').trim();
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function cleanReference(reference: string): string {
  let value = reference.trim();
  if (value.startsWith('[[') && value.endsWith(']]')) {
    value = value.slice(2, -2);
  }
  const aliasIndex = value.indexOf('|');
  if (aliasIndex >= 0) value = value.slice(0, aliasIndex);
  const headingIndex = value.indexOf('#');
  if (headingIndex >= 0) value = value.slice(0, headingIndex);
  return normalizeSpaces(normalizePath(value));
}

function pathWithoutMarkdownExtension(filePath: string): string {
  return filePath.toLocaleLowerCase('pt-BR').endsWith('.md')
    ? filePath.slice(0, -3)
    : filePath;
}

function allEntities(index: ContrariusIndex): readonly ContrariusEntity[] {
  return [
    ...index.consciencias,
    ...index.retrovidas,
    ...index.eventos,
    ...index.lugares,
    ...index.relacoes,
  ];
}

function getEntityId(entity: ContrariusEntity): string {
  return entity.id.trim();
}

function getEntityTitle(entity: ContrariusEntity): string {
  switch (entity.tipoEntidade) {
    case 'consciencia':
      return nomeConsciencia(entity);
    case 'retrovida':
      return nomeRetrovida(entity);
    case 'evento':
      return nomeEvento(entity);
    case 'lugar':
      return nomeLugar(entity);
    case 'relacao':
      return nomeRelacao(entity);
  }
}

function entityTokens(entity: ContrariusEntity): readonly string[] {
  const filePath = normalizePath(entity.filePath);
  const tokens = [
    getEntityId(entity),
    filePath,
    pathWithoutMarkdownExtension(filePath),
    extractBasename(filePath),
  ];
  return uniqueStrings(tokens);
}

function uniqueStrings(values: readonly string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const cleaned = normalizeSpaces(value);
    if (cleaned === '' || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

function toRelatedItem(entity: ContrariusEntity): ContrariusRelatedItem {
  const id = getEntityId(entity);
  return {
    key: createEntityKey(entity),
    tipoEntidade: entity.tipoEntidade,
    title: getEntityTitle(entity),
    filePath: normalizePath(entity.filePath),
    ...(id === '' ? {} : { id }),
  };
}

function keySignature(key: ContrariusEntityKey): string {
  return `${key.tipoEntidade}\0${normalizePath(key.filePath)}`;
}

function sameKey(left: ContrariusEntityKey, right: ContrariusEntityKey): boolean {
  return left.tipoEntidade === right.tipoEntidade
    && normalizePath(left.filePath) === normalizePath(right.filePath);
}

function deduplicateItems(items: readonly ContrariusRelatedItem[]): ContrariusRelatedItem[] {
  const result: ContrariusRelatedItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const signature = keySignature(item.key);
    if (seen.has(signature)) continue;
    seen.add(signature);
    result.push(item);
  }
  return result;
}

function sortRelatedItems(items: readonly ContrariusRelatedItem[]): ContrariusRelatedItem[] {
  return deduplicateItems(items).sort((left, right) => {
    const titleDifference = left.title.localeCompare(right.title, 'pt-BR');
    if (titleDifference !== 0) return titleDifference;
    return left.filePath.localeCompare(right.filePath, 'pt-BR');
  });
}

function resolveMany(
  index: ContrariusIndex,
  references: readonly string[],
  context: string,
  unresolved: ContrariusUnresolvedReference[],
  expectedType?: ContrariusTipoEntidade,
): ContrariusRelatedItem[] {
  const items: ContrariusRelatedItem[] = [];
  for (const reference of references) {
    const resolution = resolveEntityReference(index, reference, expectedType);
    if (resolution.status === 'resolved') {
      items.push(resolution.item);
      continue;
    }
    unresolved.push({
      context,
      reference: resolution.reference,
      status: resolution.status,
      ...(resolution.expectedType === undefined
        ? {}
        : { expectedType: resolution.expectedType }),
      candidates: resolution.status === 'ambiguous' ? resolution.candidates : [],
    });
  }
  return deduplicateItems(items);
}

function addField(
  fields: ContrariusDetailField[],
  label: string,
  rawValue: string | number | boolean | readonly string[] | null,
): void {
  let value = '';
  if (Array.isArray(rawValue)) {
    value = uniqueStrings(rawValue).join(', ');
  } else if (typeof rawValue === 'boolean') {
    value = rawValue ? 'Sim' : 'Não';
  } else if (typeof rawValue === 'number') {
    value = Number.isFinite(rawValue) ? String(rawValue) : '';
  } else if (typeof rawValue === 'string') {
    value = normalizeSpaces(rawValue);
  }
  if (value !== '') fields.push({ label, value });
}

function addSection(
  sections: ContrariusRelatedSection[],
  id: string,
  label: string,
  items: readonly ContrariusRelatedItem[],
  options: { preserveOrder?: boolean; derived?: boolean } = {},
): void {
  const normalizedItems = options.preserveOrder
    ? deduplicateItems(items)
    : sortRelatedItems(items);
  if (normalizedItems.length === 0) return;
  sections.push({
    id,
    label,
    items: normalizedItems,
    ...(options.derived === true ? { derived: true } : {}),
  });
}

function resolutionPointsTo(
  index: ContrariusIndex,
  reference: string,
  target: ContrariusEntityKey,
  expectedType?: ContrariusTipoEntidade,
): boolean {
  const resolution = resolveEntityReference(index, reference, expectedType);
  return resolution.status === 'resolved' && sameKey(resolution.item.key, target);
}

export function createEntityKey(entity: ContrariusEntity): ContrariusEntityKey {
  return {
    tipoEntidade: entity.tipoEntidade,
    filePath: normalizePath(entity.filePath),
  };
}

export function resolveEntityReference(
  index: ContrariusIndex,
  reference: string,
  expectedType?: ContrariusTipoEntidade,
): ContrariusReferenceResolution {
  const cleanedReference = cleanReference(reference);
  if (cleanedReference === '') {
    return {
      status: 'not-found',
      reference: cleanedReference,
      ...(expectedType === undefined ? {} : { expectedType }),
    };
  }

  const candidates = allEntities(index).filter(
    (entity) => expectedType === undefined || entity.tipoEntidade === expectedType,
  );
  const exact = candidates.filter((entity) =>
    entityTokens(entity).some((token) => token === cleanedReference));
  const exactItems = deduplicateItems(exact.map(toRelatedItem));
  if (exactItems.length === 1) {
    return { status: 'resolved', reference: cleanedReference, item: exactItems[0] };
  }
  if (exactItems.length > 1) {
    return {
      status: 'ambiguous',
      reference: cleanedReference,
      ...(expectedType === undefined ? {} : { expectedType }),
      candidates: sortRelatedItems(exactItems),
    };
  }

  const lowerReference = cleanedReference.toLocaleLowerCase('pt-BR');
  const insensitive = candidates.filter((entity) =>
    entityTokens(entity).some(
      (token) => token.toLocaleLowerCase('pt-BR') === lowerReference,
    ));
  const insensitiveItems = deduplicateItems(insensitive.map(toRelatedItem));
  if (insensitiveItems.length === 1) {
    return {
      status: 'resolved',
      reference: cleanedReference,
      item: insensitiveItems[0],
    };
  }
  if (insensitiveItems.length > 1) {
    return {
      status: 'ambiguous',
      reference: cleanedReference,
      ...(expectedType === undefined ? {} : { expectedType }),
      candidates: sortRelatedItems(insensitiveItems),
    };
  }

  return {
    status: 'not-found',
    reference: cleanedReference,
    ...(expectedType === undefined ? {} : { expectedType }),
  };
}

function buildConscienciaDetail(
  index: ContrariusIndex,
  entity: Consciencia,
): Pick<ContrariusEntityDetail, 'fields' | 'relatedSections' | 'unresolvedReferences'> {
  const fields: ContrariusDetailField[] = [];
  const sections: ContrariusRelatedSection[] = [];
  const unresolved: ContrariusUnresolvedReference[] = [];
  const key = createEntityKey(entity);

  addField(fields, 'Identidade extrafísica', entity.identExtraf);
  addField(fields, 'Natureza consciencial', entity.naturezaConsciencial);
  addField(fields, 'Núcleo geográfico', entity.nucleoGeo);
  addField(fields, 'Religião', entity.religiao);
  addField(fields, 'Holopensenes', entity.holopensenes);
  addField(fields, 'Grupocarma', entity.grupocarma);
  addField(fields, 'Reaparece', entity.reaparece);

  const retrovidas = index.retrovidas
    .filter((item) => resolutionPointsTo(index, item.conscId, key, 'consciencia'))
    .map(toRelatedItem);
  addSection(sections, 'retrovidas', 'Retrovidas', retrovidas);

  const relacoes = index.relacoes
    .filter((item) =>
      resolutionPointsTo(index, item.consciencia1, key, 'consciencia')
      || resolutionPointsTo(index, item.consciencia2, key, 'consciencia'))
    .map(toRelatedItem);
  addSection(sections, 'relacoes', 'Relações', relacoes);

  const eventos = index.eventos
    .filter((item) => item.participantes.some(
      (reference) => resolutionPointsTo(index, reference, key, 'consciencia'),
    ))
    .map(toRelatedItem);
  addSection(sections, 'eventos', 'Eventos', eventos);

  const lugares: ContrariusRelatedItem[] = [];
  for (const eventoItem of eventos) {
    const evento = index.eventos.find((candidate) => sameKey(
      createEntityKey(candidate),
      eventoItem.key,
    ));
    if (evento === undefined) continue;
    for (const reference of evento.local) {
      const resolution = resolveEntityReference(index, reference, 'lugar');
      if (resolution.status === 'resolved') lugares.push(resolution.item);
    }
  }
  addSection(
    sections,
    'lugares-derivados-de-eventos',
    'Lugares derivados dos Eventos',
    lugares,
    { derived: true },
  );

  return { fields, relatedSections: sections, unresolvedReferences: unresolved };
}

function buildRetrovidaDetail(
  index: ContrariusIndex,
  entity: Retrovida,
): Pick<ContrariusEntityDetail, 'fields' | 'relatedSections' | 'unresolvedReferences'> {
  const fields: ContrariusDetailField[] = [];
  const sections: ContrariusRelatedSection[] = [];
  const unresolved: ContrariusUnresolvedReference[] = [];
  const key = createEntityKey(entity);

  addField(fields, 'Vida', entity.vida);
  addField(fields, 'Natureza consciencial', entity.naturezaConsciencial);
  addField(fields, 'Nascimento', entity.nascimento);
  addField(fields, 'Morte', entity.morte);
  if (
    entity.nascimento !== null
    && entity.morte !== null
    && Number.isFinite(entity.nascimento)
    && Number.isFinite(entity.morte)
    && entity.morte >= entity.nascimento
  ) {
    addField(fields, 'Duração', entity.morte - entity.nascimento);
  }
  addField(fields, 'Livro', entity.livro);
  addField(fields, 'Período', entity.periodo);
  addField(fields, 'Núcleo geográfico', entity.nucleoGeo);
  addField(fields, 'Movimento histórico', entity.movHistorico);
  addField(fields, 'POV', entity.pov);
  addField(fields, 'Holopensenes', entity.holopensenes);
  addField(fields, 'Religião', entity.religiao);
  addField(fields, 'Classe social', entity.classeSocial);

  const consciencia = resolveMany(
    index,
    [entity.conscId],
    'Consciência correspondente',
    unresolved,
    'consciencia',
  );
  addSection(sections, 'consciencia', 'Consciência', consciencia, { preserveOrder: true });

  const eventos = index.eventos
    .filter((item) => item.retrovidas.some(
      (reference) => resolutionPointsTo(index, reference, key, 'retrovida'),
    ))
    .map(toRelatedItem);
  addSection(sections, 'eventos', 'Eventos com referência explícita', eventos);

  return { fields, relatedSections: sections, unresolvedReferences: unresolved };
}

function buildEventoDetail(
  index: ContrariusIndex,
  entity: Evento,
): Pick<ContrariusEntityDetail, 'fields' | 'relatedSections' | 'unresolvedReferences'> {
  const fields: ContrariusDetailField[] = [];
  const sections: ContrariusRelatedSection[] = [];
  const unresolved: ContrariusUnresolvedReference[] = [];

  addField(fields, 'Ano de ordenação', entity.anoOrdem);
  addField(fields, 'Data', entity.data);
  addField(fields, 'Data inicial', entity.dataInicio);
  addField(fields, 'Data final', entity.dataFim);
  addField(fields, 'Data textual', entity.dataTextual);
  addField(fields, 'Data aproximada', entity.dataAproximada);
  addField(fields, 'Período', entity.periodo);
  addField(fields, 'Natureza', entity.natureza);
  addField(fields, 'Status', entity.status);
  addField(fields, 'Núcleo geográfico', entity.nucleoGeo);
  addField(fields, 'Grupocarma', entity.grupocarma);
  addField(fields, 'Holopensenes', entity.holopensenes);
  addField(fields, 'Religião', entity.religiao);
  addField(fields, 'Movimento histórico', entity.movHistorico);
  addField(fields, 'Livro', entity.livro);
  addField(fields, 'Fontes', entity.fontes);
  addField(fields, 'Tags', entity.tags);

  addSection(
    sections,
    'lugares',
    'Lugares',
    resolveMany(index, entity.local, 'Lugar', unresolved, 'lugar'),
    { preserveOrder: true },
  );
  addSection(
    sections,
    'participantes',
    'Participantes',
    resolveMany(index, entity.participantes, 'Participante', unresolved),
    { preserveOrder: true },
  );
  addSection(
    sections,
    'retrovidas',
    'Retrovidas',
    resolveMany(index, entity.retrovidas, 'Retrovida', unresolved, 'retrovida'),
    { preserveOrder: true },
  );
  addSection(
    sections,
    'eventos-anteriores',
    'Eventos anteriores',
    resolveMany(index, entity.eventosAnteriores, 'Evento anterior', unresolved, 'evento'),
    { preserveOrder: true },
  );
  addSection(
    sections,
    'eventos-posteriores',
    'Eventos posteriores',
    resolveMany(index, entity.eventosPosteriores, 'Evento posterior', unresolved, 'evento'),
    { preserveOrder: true },
  );

  return { fields, relatedSections: sections, unresolvedReferences: unresolved };
}

function buildLugarDetail(
  index: ContrariusIndex,
  entity: Lugar,
): Pick<ContrariusEntityDetail, 'fields' | 'relatedSections' | 'unresolvedReferences'> {
  const fields: ContrariusDetailField[] = [];
  const sections: ContrariusRelatedSection[] = [];
  const unresolved: ContrariusUnresolvedReference[] = [];
  const key = createEntityKey(entity);

  addField(fields, 'Nome atual', entity.nomeAtual);
  addField(fields, 'Aliases', entity.aliases);
  addField(fields, 'Nomes variantes', entity.nomesVariantes);
  addField(fields, 'Nomes históricos', entity.nomesHistoricos);
  addField(fields, 'Categoria do lugar', entity.categoriaLugar);
  addField(fields, 'Status geográfico', entity.statusGeografico);
  addField(fields, 'Coordenadas', entity.coordenadas);
  addField(fields, 'Coordenadas Google Earth', entity.coordenadasGoogleEarth);
  addField(fields, 'Sistema geodésico', entity.sistemaGeodesico);
  addField(fields, 'Núcleo geográfico', entity.nucleoGeo);
  addField(fields, 'Localidade atual', entity.localidadeAtual);
  addField(fields, 'Departamento atual', entity.departamentoAtual);
  addField(fields, 'Região atual', entity.regiaoAtual);
  addField(fields, 'País atual', entity.paisAtual);
  addField(fields, 'Período', entity.periodo);
  addField(fields, 'Livros', entity.livros);
  addField(fields, 'Lugares relacionados', entity.lugaresRelacionados);
  addField(fields, 'Fontes', entity.fontes);
  addField(fields, 'Tags', entity.tags);

  const eventos = index.eventos
    .filter((item) => item.local.some(
      (reference) => resolutionPointsTo(index, reference, key, 'lugar'),
    ))
    .map(toRelatedItem);
  addSection(sections, 'eventos', 'Eventos', eventos);

  return { fields, relatedSections: sections, unresolvedReferences: unresolved };
}

function buildRelacaoDetail(
  index: ContrariusIndex,
  entity: Relacao,
): Pick<ContrariusEntityDetail, 'fields' | 'relatedSections' | 'unresolvedReferences'> {
  const fields: ContrariusDetailField[] = [];
  const sections: ContrariusRelatedSection[] = [];
  const unresolved: ContrariusUnresolvedReference[] = [];

  addField(fields, 'Tipo da relação', entity.tipoRelacao);
  addField(fields, 'Intensidade', entity.intensidade);
  addField(fields, 'Início', entity.inicio);
  addField(fields, 'Fim', entity.fim);
  addField(fields, 'Livro', entity.livro);
  addField(fields, 'Estado', entity.estado);
  addField(fields, 'Tags', entity.tags);

  const extremos = resolveMany(
    index,
    [entity.consciencia1, entity.consciencia2],
    'Extremo da relação',
    unresolved,
    'consciencia',
  );
  addSection(sections, 'extremos', 'Extremos', extremos, { preserveOrder: true });

  return { fields, relatedSections: sections, unresolvedReferences: unresolved };
}

export function buildEntityDetail(
  index: ContrariusIndex,
  key: ContrariusEntityKey,
): ContrariusEntityDetail | null {
  const entity = allEntities(index).find((candidate) => sameKey(createEntityKey(candidate), key));
  if (entity === undefined) return null;

  let content: Pick<
    ContrariusEntityDetail,
    'fields' | 'relatedSections' | 'unresolvedReferences'
  >;
  switch (entity.tipoEntidade) {
    case 'consciencia':
      content = buildConscienciaDetail(index, entity);
      break;
    case 'retrovida':
      content = buildRetrovidaDetail(index, entity);
      break;
    case 'evento':
      content = buildEventoDetail(index, entity);
      break;
    case 'lugar':
      content = buildLugarDetail(index, entity);
      break;
    case 'relacao':
      content = buildRelacaoDetail(index, entity);
      break;
  }

  const id = getEntityId(entity);
  return {
    key: createEntityKey(entity),
    tipoEntidade: entity.tipoEntidade,
    title: getEntityTitle(entity),
    ...(id === '' ? {} : { id }),
    filePath: normalizePath(entity.filePath),
    ...content,
  };
}
