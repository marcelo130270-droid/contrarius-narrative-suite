import { describe, expect, it } from 'vitest';
import {
  agruparRetrovidasPorConsciencia,
  construirDiagnosticos,
  construirResumo,
  filtrarConsciencias,
  filtrarEventos,
  filtrarLugares,
  filtrarRelacoes,
  filtrarRetrovidas,
  nomeConsciencia,
  nomeEvento,
  nomeLugar,
  nomeRelacao,
  nomeRetrovida,
} from '../../src/contrarius/dashboard-model';
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
  avisos: [] as readonly string[],
};

function consciencia(overrides: Partial<Consciencia> = {}): Consciencia {
  return {
    ...base,
    tipoEntidade: 'consciencia',
    filePath: '02_Consciencias/C-001.md',
    id: 'C-001',
    nome: 'Consciência Alfa',
    identExtraf: 'Aris',
    nucleoGeo: ['Provence'],
    religiao: [],
    holopensenes: [],
    grupocarma: ['C-002'],
    reaparece: true,
    naturezaConsciencial: 'humana',
    ...overrides,
  };
}

function retrovida(overrides: Partial<Retrovida> = {}): Retrovida {
  return {
    ...base,
    tipoEntidade: 'retrovida',
    filePath: '03_Retrovidas/C-001_V01.md',
    id: 'C-001_V01',
    conscId: 'C-001',
    vida: 'V01',
    nomes: ['Pessoa Antiga'],
    nascimento: 1200,
    morte: 1250,
    livro: ['Livro 1'],
    periodo: ['Sec XIII'],
    nucleoGeo: ['Occitânia'],
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
    titulo: 'Encontro em Acra',
    anoOrdem: 1229,
    data: '',
    dataInicio: '1229-09-09',
    dataFim: '',
    dataTextual: 'Setembro de 1229',
    dataAproximada: false,
    periodo: ['Sec XIII'],
    natureza: 'Narrativo',
    status: 'Planejado',
    local: ['L-001_Acra'],
    nucleoGeo: ['Levante'],
    participantes: ['C-001'],
    retrovidas: ['C-001_V01'],
    grupocarma: [],
    holopensenes: [],
    religiao: [],
    movHistorico: [],
    eventosAnteriores: [],
    eventosPosteriores: [],
    livro: ['Livro 1'],
    fontes: [],
    tags: [],
    ...overrides,
  };
}

function lugar(overrides: Partial<Lugar> = {}): Lugar {
  return {
    ...base,
    tipoEntidade: 'lugar',
    filePath: '06_Lugares/L-001_Acra.md',
    id: 'L-001',
    aliases: ['Akkō'],
    nomePreferido: 'Acra',
    nomeAtual: 'Acre',
    nomesVariantes: ['São João de Acre'],
    nomesHistoricos: ['Ptolemaida'],
    categoriaLugar: ['Cidade'],
    statusGeografico: 'Existente',
    coordenadas: '',
    coordenadasGoogleEarth: '32.9275, 35.0818',
    sistemaGeodesico: 'WGS84',
    nucleoGeo: ['Levante'],
    localidadeAtual: 'Acre',
    departamentoAtual: '',
    regiaoAtual: 'Distrito Norte',
    paisAtual: 'Israel',
    periodo: ['Sec XIII'],
    livros: ['Livro 1'],
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
    tipoRelacao: ['Amizade'],
    intensidade: 'Alta',
    inicio: '',
    fim: '',
    livro: ['Livro 1'],
    estado: 'Ativa',
    tags: [],
    ...overrides,
  };
}

function index(): ContrariusIndex {
  return {
    consciencias: [consciencia({ avisos: ['nome alternativo'] })],
    retrovidas: [retrovida()],
    eventos: [evento()],
    lugares: [lugar()],
    relacoes: [relacao({ avisos: ['campo ausente', 'alias legado'] })],
    avisosIndexacao: [],
    erros: [{ filePath: 'x.md', mensagem: 'erro' }],
  };
}

describe('construirResumo', () => {
  it('conta todas as entidades', () => {
    expect(construirResumo(index())).toMatchObject({
      consciencias: 1,
      retrovidas: 1,
      eventos: 1,
      lugares: 1,
      relacoes: 1,
      totalEntidades: 5,
    });
  });

  it('soma avisos internos, avisos de indexação e erros', () => {
    const value = index();
    const withWarning = {
      ...value,
      avisosIndexacao: [{ filePath: 'p.md', mensagem: 'aviso' }],
    };
    expect(construirResumo(withWarning)).toMatchObject({
      avisosInternos: 3, avisosIndexacao: 1, avisos: 4, erros: 1,
    });
  });

  it('conta consciências e retrovidas pré-humanas', () => {
    const value = index();
    const withPreHuman = {
      ...value,
      consciencias: [consciencia({ naturezaConsciencial: 'pre-humana' })],
      retrovidas: [retrovida({ naturezaConsciencial: 'pre-humana' })],
    };
    expect(construirResumo(withPreHuman)).toMatchObject({
      conscienciasPreHumanas: 1, retrovidasPreHumanas: 1,
    });
  });
});

describe('agruparRetrovidasPorConsciencia', () => {
  it('agrupa por conscId e ignora conscId vazio', () => {
    const grouped = agruparRetrovidasPorConsciencia([
      retrovida({ id: 'B', conscId: 'C-001' }),
      retrovida({ id: 'A', conscId: '' }),
    ]);
    expect(grouped.get('C-001')?.map((item) => item.id)).toEqual(['B']);
    expect(grouped.has('')).toBe(false);
  });

  it('ordena por nascimento e depois por id', () => {
    const grouped = agruparRetrovidasPorConsciencia([
      retrovida({ id: 'C', nascimento: 1400 }),
      retrovida({ id: 'B', nascimento: 1200 }),
      retrovida({ id: 'A', nascimento: 1200 }),
    ]);
    expect(grouped.get('C-001')?.map((item) => item.id)).toEqual(['A', 'B', 'C']);
  });
});

describe('filtros', () => {
  it('retorna a lista original com consulta vazia', () => {
    const items = [consciencia()];
    expect(filtrarConsciencias(items, '')).toBe(items);
  });

  it('filtra consciência por nome sem acento e sem distinguir maiúsculas', () => {
    expect(filtrarConsciencias([consciencia()], 'CONSCIENCIA')).toHaveLength(1);
  });

  it('filtra consciência por identidade extrafísica', () => {
    expect(filtrarConsciencias([consciencia()], 'aris')).toHaveLength(1);
  });

  it('filtra retrovida por consciência', () => {
    expect(filtrarRetrovidas([retrovida()], 'c-001')).toHaveLength(1);
  });

  it('filtra retrovida por período e livro', () => {
    expect(filtrarRetrovidas([retrovida()], 'sec xiii')).toHaveLength(1);
    expect(filtrarRetrovidas([retrovida()], 'livro 1')).toHaveLength(1);
  });

  it('filtra evento por título, data e local', () => {
    const item = evento();
    expect(filtrarEventos([item], 'encontro')).toHaveLength(1);
    expect(filtrarEventos([item], 'setembro')).toHaveLength(1);
    expect(filtrarEventos([item], 'acra')).toHaveLength(1);
  });

  it('filtra lugar por nome atual, histórico e país', () => {
    const item = lugar();
    expect(filtrarLugares([item], 'acre')).toHaveLength(1);
    expect(filtrarLugares([item], 'ptolemaida')).toHaveLength(1);
    expect(filtrarLugares([item], 'israel')).toHaveLength(1);
  });

  it('filtra relação por extremos e tipo', () => {
    const item = relacao();
    expect(filtrarRelacoes([item], 'c-002')).toHaveLength(1);
    expect(filtrarRelacoes([item], 'amizade')).toHaveLength(1);
  });

  it('filtra consciências por natureza consciencial', () => {
    const items = [
      consciencia({ id: 'C-001', naturezaConsciencial: 'humana' }),
      consciencia({ id: 'P-001', naturezaConsciencial: 'pre-humana' }),
    ];
    expect(filtrarConsciencias(items, '', 'humanas').map((item) => item.id)).toEqual(['C-001']);
    expect(filtrarConsciencias(items, '', 'pre-humanas').map((item) => item.id)).toEqual(['P-001']);
    expect(filtrarConsciencias(items, '', 'todas')).toHaveLength(2);
  });

  it('filtra retrovidas por natureza consciencial', () => {
    const items = [
      retrovida({ id: 'C-001_V01', naturezaConsciencial: 'humana' }),
      retrovida({ id: 'P-001_V01', naturezaConsciencial: 'pre-humana' }),
    ];
    expect(filtrarRetrovidas(items, '', 'humanas').map((item) => item.id)).toEqual(['C-001_V01']);
    expect(filtrarRetrovidas(items, '', 'pre-humanas').map((item) => item.id)).toEqual(['P-001_V01']);
  });

  it('elimina itens que não correspondem', () => {
    expect(filtrarEventos([evento()], 'inexistente')).toHaveLength(0);
    expect(filtrarLugares([lugar()], 'inexistente')).toHaveLength(0);
    expect(filtrarRelacoes([relacao()], 'inexistente')).toHaveLength(0);
  });
});

describe('diagnósticos', () => {
  it('combina erros e avisos de indexação com níveis distintos', () => {
    const value = index();
    const diagnostics = construirDiagnosticos({
      ...value,
      avisosIndexacao: [{ filePath: 'aviso.md', mensagem: 'aviso legado', campo: 'tipo' }],
    });
    expect(diagnostics).toEqual([
      { nivel: 'erro', filePath: 'x.md', mensagem: 'erro' },
      { nivel: 'aviso', filePath: 'aviso.md', mensagem: 'aviso legado', campo: 'tipo' },
    ]);
  });
});

describe('nomes de exibição', () => {
  it('usa nome, identidade extrafísica e id para consciência', () => {
    expect(nomeConsciencia(consciencia())).toBe('Consciência Alfa');
    expect(nomeConsciencia(consciencia({ nome: '' }))).toBe('Aris');
    expect(nomeConsciencia(consciencia({ nome: '', identExtraf: '' }))).toBe('C-001');
  });

  it('usa primeiro nome não vazio e id para retrovida', () => {
    expect(nomeRetrovida(retrovida({ nomes: ['', 'Nome B'] }))).toBe('Nome B');
    expect(nomeRetrovida(retrovida({ nomes: [] }))).toBe('C-001_V01');
  });

  it('usa título e id para evento', () => {
    expect(nomeEvento(evento())).toBe('Encontro em Acra');
    expect(nomeEvento(evento({ titulo: '' }))).toBe('E-001');
  });

  it('prioriza nome preferido, nome atual e id para lugar', () => {
    expect(nomeLugar(lugar())).toBe('Acra');
    expect(nomeLugar(lugar({ nomePreferido: '' }))).toBe('Acre');
    expect(nomeLugar(lugar({ nomePreferido: '', nomeAtual: '' }))).toBe('L-001');
  });

  it('forma nome legível para relação', () => {
    expect(nomeRelacao(relacao())).toBe('Amizade: C-001 ↔ C-002');
    expect(nomeRelacao(relacao({ tipoRelacao: [], consciencia1: '', consciencia2: '' }))).toBe('R-001');
  });
});
