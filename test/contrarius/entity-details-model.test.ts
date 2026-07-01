import { describe, expect, it } from 'vitest';
import {
  buildEntityDetail,
  createEntityKey,
  resolveEntityReference,
} from '../../src/contrarius/entity-details-model';
import type {
  Consciencia,
  ContrariusIndex,
  Evento,
  Lugar,
  Relacao,
  Retrovida,
} from '../../src/contrarius/types';

const base = {
  frontmatterRaw: {},
  camposDesconhecidos: {},
  avisos: [],
} as const;

function consciencia(overrides: Partial<Consciencia> = {}): Consciencia {
  return {
    ...base,
    tipoEntidade: 'consciencia',
    filePath: '02_Consciencias/C-001.md',
    id: 'C-001',
    nome: 'Ana',
    identExtraf: '',
    nucleoGeo: [],
    religiao: [],
    holopensenes: [],
    grupocarma: [],
    reaparece: true,
    naturezaConsciencial: 'humana',
    ...overrides,
  };
}

function retrovida(overrides: Partial<Retrovida> = {}): Retrovida {
  return {
    ...base,
    tipoEntidade: 'retrovida',
    filePath: '03_Retrovidas/C-001_V01_Ana.md',
    id: 'C-001_V01_Ana',
    conscId: 'C-001',
    vida: 'V01',
    nomes: ['Ana Antiga'],
    nascimento: 100,
    morte: 160,
    livro: ['Livro 1'],
    periodo: ['Sec II'],
    nucleoGeo: [],
    movHistorico: [],
    pov: 'fictício',
    holopensenes: [],
    religiao: [],
    classeSocial: [],
    naturezaConsciencial: 'humana',
    ...overrides,
  };
}

function evento(overrides: Partial<Evento> = {}): Evento {
  return {
    ...base,
    tipoEntidade: 'evento',
    filePath: '05_Eventos/E-001.md',
    id: 'E-001',
    titulo: 'Encontro',
    anoOrdem: 1200,
    data: '',
    dataInicio: '',
    dataFim: '',
    dataTextual: '',
    dataAproximada: false,
    periodo: ['Sec XIII'],
    natureza: '',
    status: '',
    local: [],
    nucleoGeo: [],
    participantes: [],
    retrovidas: [],
    grupocarma: [],
    holopensenes: [],
    religiao: [],
    movHistorico: [],
    eventosAnteriores: [],
    eventosPosteriores: [],
    livro: [],
    fontes: [],
    tags: [],
    ...overrides,
  };
}

function lugar(overrides: Partial<Lugar> = {}): Lugar {
  return {
    ...base,
    tipoEntidade: 'lugar',
    filePath: '06_Lugares/L-001_Acre.md',
    id: 'L-001',
    aliases: [],
    nomePreferido: 'Acre',
    nomeAtual: 'Akko',
    nomesVariantes: [],
    nomesHistoricos: [],
    categoriaLugar: [],
    statusGeografico: '',
    coordenadas: '',
    coordenadasGoogleEarth: '',
    sistemaGeodesico: '',
    nucleoGeo: [],
    localidadeAtual: '',
    departamentoAtual: '',
    regiaoAtual: '',
    paisAtual: '',
    periodo: [],
    livros: [],
    lugaresRelacionados: [],
    fontes: [],
    tags: [],
    ...overrides,
  };
}

function relacao(overrides: Partial<Relacao> = {}): Relacao {
  return {
    ...base,
    tipoEntidade: 'relacao',
    filePath: '04_Relacoes/R-001.md',
    id: 'R-001',
    consciencia1: 'C-001',
    consciencia2: 'C-002',
    tipoRelacao: ['amizade'],
    intensidade: '',
    inicio: '',
    fim: '',
    livro: [],
    estado: '',
    tags: [],
    ...overrides,
  };
}

function indexWith(overrides: Partial<ContrariusIndex> = {}): ContrariusIndex {
  return {
    consciencias: [],
    retrovidas: [],
    eventos: [],
    lugares: [],
    relacoes: [],
    avisosIndexacao: [],
    erros: [],
    ...overrides,
  };
}

function section(detail: ReturnType<typeof buildEntityDetail>, id: string) {
  return detail?.relatedSections.find((item) => item.id === id);
}

function field(detail: ReturnType<typeof buildEntityDetail>, label: string) {
  return detail?.fields.find((item) => item.label === label)?.value;
}

describe('entity details model', () => {
  it('cria chave estável por tipo e caminho normalizado', () => {
    expect(createEntityKey(consciencia({ filePath: '02_Consciencias\\C-001.md' }))).toEqual({
      tipoEntidade: 'consciencia',
      filePath: '02_Consciencias/C-001.md',
    });
  });

  it('limpa wikilink com alias e heading', () => {
    const index = indexWith({ consciencias: [consciencia()] });
    const result = resolveEntityReference(index, ' [[C-001#Trecho|Ana]] ');
    expect(result.status).toBe('resolved');
  });

  it('resolve por ID, caminho e basename', () => {
    const item = consciencia({ id: 'CID-1', filePath: '02_Consciencias/Basename.md' });
    const index = indexWith({ consciencias: [item] });
    expect(resolveEntityReference(index, 'CID-1').status).toBe('resolved');
    expect(resolveEntityReference(index, item.filePath).status).toBe('resolved');
    expect(resolveEntityReference(index, 'Basename').status).toBe('resolved');
  });

  it('restringe candidatos pelo tipo esperado', () => {
    const index = indexWith({
      consciencias: [consciencia({ id: 'MESMO', filePath: '02_Consciencias/MESMO.md' })],
      lugares: [lugar({ id: 'MESMO', filePath: '06_Lugares/MESMO.md' })],
    });
    const result = resolveEntityReference(index, 'MESMO', 'lugar');
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') expect(result.item.tipoEntidade).toBe('lugar');
  });

  it('retorna ambiguidade sem escolher silenciosamente', () => {
    const index = indexWith({
      consciencias: [consciencia({ id: 'X', filePath: '02_Consciencias/X.md' })],
      lugares: [lugar({ id: 'X', filePath: '06_Lugares/X.md' })],
    });
    const result = resolveEntityReference(index, 'X');
    expect(result.status).toBe('ambiguous');
    if (result.status === 'ambiguous') expect(result.candidates).toHaveLength(2);
  });

  it('usa comparação sem caixa somente quando o resultado é único', () => {
    const unique = indexWith({ consciencias: [consciencia({ id: 'C-ABC' })] });
    expect(resolveEntityReference(unique, 'c-abc').status).toBe('resolved');

    const ambiguous = indexWith({
      consciencias: [
        consciencia({ id: 'ABC', filePath: '02_Consciencias/Primeiro.md' }),
        consciencia({ id: 'abc', filePath: '02_Consciencias/Segundo.md' }),
      ],
    });
    expect(resolveEntityReference(ambiguous, 'AbC').status).toBe('ambiguous');
  });

  it('monta Consciência com Retrovidas e Relações reversas', () => {
    const c1 = consciencia();
    const c2 = consciencia({ id: 'C-002', nome: 'Bruno', filePath: '02_Consciencias/C-002.md' });
    const index = indexWith({
      consciencias: [c1, c2],
      retrovidas: [retrovida()],
      relacoes: [relacao()],
    });
    const detail = buildEntityDetail(index, createEntityKey(c1));
    expect(section(detail, 'retrovidas')?.items).toHaveLength(1);
    expect(section(detail, 'relacoes')?.items).toHaveLength(1);
  });

  it('deriva Eventos participantes e Lugares apenas desses Eventos', () => {
    const c1 = consciencia();
    const acre = lugar();
    const index = indexWith({
      consciencias: [c1],
      lugares: [acre],
      eventos: [evento({ participantes: ['C-001'], local: ['L-001'] })],
    });
    const detail = buildEntityDetail(index, createEntityKey(c1));
    expect(section(detail, 'eventos')?.items).toHaveLength(1);
    expect(section(detail, 'lugares-derivados-de-eventos')?.derived).toBe(true);
    expect(section(detail, 'lugares-derivados-de-eventos')?.items[0]?.title).toBe('Acre');
  });

  it('não herda Eventos da Consciência para a Retrovida sem referência explícita', () => {
    const c1 = consciencia();
    const life = retrovida();
    const index = indexWith({
      consciencias: [c1],
      retrovidas: [life],
      eventos: [evento({ participantes: ['C-001'], retrovidas: [] })],
    });
    const detail = buildEntityDetail(index, createEntityKey(life));
    expect(section(detail, 'eventos')).toBeUndefined();
  });

  it('monta Evento com Lugar, participantes, anteriores e posteriores', () => {
    const c1 = consciencia();
    const acre = lugar();
    const previous = evento({ id: 'E-000', titulo: 'Antes', filePath: '05_Eventos/E-000.md' });
    const next = evento({ id: 'E-002', titulo: 'Depois', filePath: '05_Eventos/E-002.md' });
    const current = evento({
      local: ['L-001'],
      participantes: ['C-001'],
      eventosAnteriores: ['E-000'],
      eventosPosteriores: ['E-002'],
    });
    const index = indexWith({
      consciencias: [c1],
      lugares: [acre],
      eventos: [previous, current, next],
    });
    const detail = buildEntityDetail(index, createEntityKey(current));
    expect(section(detail, 'lugares')?.items).toHaveLength(1);
    expect(section(detail, 'participantes')?.items).toHaveLength(1);
    expect(section(detail, 'eventos-anteriores')?.items[0]?.id).toBe('E-000');
    expect(section(detail, 'eventos-posteriores')?.items[0]?.id).toBe('E-002');
  });

  it('monta Lugar com Eventos reversos', () => {
    const acre = lugar();
    const index = indexWith({ lugares: [acre], eventos: [evento({ local: ['L-001'] })] });
    const detail = buildEntityDetail(index, createEntityKey(acre));
    expect(section(detail, 'eventos')?.items).toHaveLength(1);
  });

  it('preserva extremos resolvidos e não resolvidos da Relação', () => {
    const c1 = consciencia();
    const relationship = relacao({ consciencia2: 'C-INEXISTENTE' });
    const index = indexWith({ consciencias: [c1], relacoes: [relationship] });
    const detail = buildEntityDetail(index, createEntityKey(relationship));
    expect(section(detail, 'extremos')?.items).toHaveLength(1);
    expect(detail?.unresolvedReferences).toEqual([
      expect.objectContaining({ reference: 'C-INEXISTENTE', status: 'not-found' }),
    ]);
  });

  it('deduplica e ordena vínculos reversos determinísticamente', () => {
    const c1 = consciencia();
    const b = retrovida({ id: 'B', nomes: ['Beto'], filePath: '03_Retrovidas/B.md' });
    const a = retrovida({ id: 'A', nomes: ['Ana'], filePath: '03_Retrovidas/A.md' });
    const index = indexWith({ consciencias: [c1], retrovidas: [b, a] });
    const detail = buildEntityDetail(index, createEntityKey(c1));
    expect(section(detail, 'retrovidas')?.items.map((item) => item.title)).toEqual(['Ana', 'Beto']);
  });

  it('omite campos vazios, limpa listas e renderiza booleanos', () => {
    const c1 = consciencia({
      identExtraf: '',
      nucleoGeo: ['Occitânia', '', 'Occitânia'],
      reaparece: false,
    });
    const detail = buildEntityDetail(indexWith({ consciencias: [c1] }), createEntityKey(c1));
    expect(field(detail, 'Identidade extrafísica')).toBeUndefined();
    expect(field(detail, 'Núcleo geográfico')).toBe('Occitânia');
    expect(field(detail, 'Reaparece')).toBe('Não');
  });

  it('calcula duração válida e rejeita duração negativa', () => {
    const valid = retrovida();
    const invalid = retrovida({ id: 'INV', filePath: '03_Retrovidas/INV.md', nascimento: 200, morte: 100 });
    const index = indexWith({ retrovidas: [valid, invalid] });
    expect(field(buildEntityDetail(index, createEntityKey(valid)), 'Duração')).toBe('60');
    expect(field(buildEntityDetail(index, createEntityKey(invalid)), 'Duração')).toBeUndefined();
  });

  it('não modifica o índice nem as entidades recebidas', () => {
    const c1 = consciencia({ nucleoGeo: Object.freeze(['A', 'A']) });
    const index = Object.freeze(indexWith({ consciencias: Object.freeze([Object.freeze(c1)]) }));
    const before = JSON.stringify(index);
    buildEntityDetail(index, createEntityKey(c1));
    resolveEntityReference(index, 'C-001');
    expect(JSON.stringify(index)).toBe(before);
  });

  it('ficha detalhada de Retrovida usa título humanizado quando não há nome explícito', () => {
    const r = retrovida({
      nomes: [],
      id: 'C-024_V01_Pajem2_de_Roland1',
      filePath: '03_Retrovidas/C-024_V01_Pajem2_de_Roland1.md',
    });
    const index = indexWith({ retrovidas: [r] });
    const detail = buildEntityDetail(index, createEntityKey(r));
    expect(detail?.title).toBe('Pajem 2 de Roland 1');
    expect(detail?.id).toBe('C-024_V01_Pajem2_de_Roland1');
    expect(detail?.filePath).toBe('03_Retrovidas/C-024_V01_Pajem2_de_Roland1.md');
  });

  it('ficha detalhada de Retrovida preserva título explícito e ID técnico separadamente', () => {
    const r = retrovida({
      nomes: ['Pajem Roland'],
      id: 'C-024_V01_Pajem2_de_Roland1',
      filePath: '03_Retrovidas/C-024_V01_Pajem2_de_Roland1.md',
    });
    const index = indexWith({ retrovidas: [r] });
    const detail = buildEntityDetail(index, createEntityKey(r));
    expect(detail?.title).toBe('Pajem Roland');
    expect(detail?.id).toBe('C-024_V01_Pajem2_de_Roland1');
  });
});
