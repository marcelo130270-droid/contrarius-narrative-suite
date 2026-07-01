import { describe, expect, it } from 'vitest';
import {
  agruparDiagnosticos,
  agruparRetrovidasPorConsciencia,
  construirDiagnosticos,
  construirResumo,
  contarDiagnosticosPorCategoria,
  filtrarConsciencias,
  filtrarEventos,
  filtrarGruposDiagnostico,
  filtrarLugares,
  filtrarRelacoes,
  filtrarRetrovidas,
  humanizarTituloTecnico,
  nomeConsciencia,
  nomeEvento,
  nomeLugar,
  nomeRelacao,
  nomeRetrovida,
  type ContrariusDiagnostico,
  type GrupoDiagnostico,
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

function emptyIndex(): ContrariusIndex {
  return {
    consciencias: [],
    retrovidas: [],
    eventos: [],
    lugares: [],
    relacoes: [],
    avisosIndexacao: [],
    erros: [],
  };
}

function makeGroup(overrides: Partial<GrupoDiagnostico> = {}): GrupoDiagnostico {
  return {
    categoria: 'interno',
    nivel: 'aviso',
    mensagem: 'mensagem padrao',
    itens: [{ categoria: 'interno', nivel: 'aviso', filePath: 'nota.md', mensagem: 'mensagem padrao', tipoEntidade: 'evento' }],
    quantidade: 1,
    ...overrides,
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
    const diagnostics = construirDiagnosticos({
      ...emptyIndex(),
      avisosIndexacao: [{ filePath: 'aviso.md', mensagem: 'aviso legado', campo: 'tipo' }],
      erros: [{ filePath: 'x.md', mensagem: 'erro' }],
    });
    expect(diagnostics).toEqual([
      { categoria: 'erro', nivel: 'erro', filePath: 'x.md', mensagem: 'erro' },
      { categoria: 'indexacao', nivel: 'aviso', filePath: 'aviso.md', mensagem: 'aviso legado', campo: 'tipo' },
    ]);
  });
});

describe('nomes de exibição', () => {
  it('usa nome, identidade extrafísica e id para consciência', () => {
    expect(nomeConsciencia(consciencia())).toBe('Consciência Alfa');
    expect(nomeConsciencia(consciencia({ nome: '' }))).toBe('Aris');
    expect(nomeConsciencia(consciencia({ nome: '', identExtraf: '' }))).toBe('C-001');
  });

  it('usa primeiro nome não vazio, e humaniza o ID como fallback para retrovida', () => {
    expect(nomeRetrovida(retrovida({ nomes: ['', 'Nome B'] }))).toBe('Nome B');
    expect(nomeRetrovida(retrovida({ nomes: [] }))).toBe('V 01');
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

// ─── Novos testes: construirDiagnosticos — categorias ────────────────────────

describe('construirDiagnosticos — categorias e entidades', () => {
  it('erros recebem categoria erro e nível erro', () => {
    const d = construirDiagnosticos({
      ...emptyIndex(),
      erros: [{ filePath: 'falha.md', mensagem: 'falha grave' }],
    });
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ categoria: 'erro', nivel: 'erro' });
  });

  it('avisos de indexação recebem categoria indexacao e nível aviso', () => {
    const d = construirDiagnosticos({
      ...emptyIndex(),
      avisosIndexacao: [{ filePath: 'y.md', mensagem: 'campo faltando' }],
    });
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ categoria: 'indexacao', nivel: 'aviso' });
  });

  it('avisos internos de consciência são incluídos', () => {
    const d = construirDiagnosticos({
      ...emptyIndex(),
      consciencias: [consciencia({ avisos: ['aviso alfa'] })],
    });
    expect(d.some((x) => x.categoria === 'interno' && x.tipoEntidade === 'consciencia')).toBe(true);
  });

  it('avisos internos de retrovida são incluídos', () => {
    const d = construirDiagnosticos({
      ...emptyIndex(),
      retrovidas: [retrovida({ avisos: ['aviso beta'] })],
    });
    expect(d.some((x) => x.categoria === 'interno' && x.tipoEntidade === 'retrovida')).toBe(true);
  });

  it('avisos internos de evento são incluídos', () => {
    const d = construirDiagnosticos({
      ...emptyIndex(),
      eventos: [evento({ avisos: ['aviso gama'] })],
    });
    expect(d.some((x) => x.categoria === 'interno' && x.tipoEntidade === 'evento')).toBe(true);
  });

  it('avisos internos de lugar são incluídos', () => {
    const d = construirDiagnosticos({
      ...emptyIndex(),
      lugares: [lugar({ avisos: ['aviso delta'] })],
    });
    expect(d.some((x) => x.categoria === 'interno' && x.tipoEntidade === 'lugar')).toBe(true);
  });

  it('avisos internos de relação são incluídos', () => {
    const d = construirDiagnosticos({
      ...emptyIndex(),
      relacoes: [relacao({ avisos: ['aviso epsilon'] })],
    });
    expect(d.some((x) => x.categoria === 'interno' && x.tipoEntidade === 'relacao')).toBe(true);
  });

  it('aviso interno preserva caminho e tipo da entidade', () => {
    const d = construirDiagnosticos({
      ...emptyIndex(),
      consciencias: [consciencia({ filePath: 'caminho/nota.md', avisos: ['texto do aviso'] })],
    });
    const interno = d.find((x) => x.categoria === 'interno');
    expect(interno).toMatchObject({ filePath: 'caminho/nota.md', tipoEntidade: 'consciencia', mensagem: 'texto do aviso' });
  });

  it('mais de um aviso na mesma entidade gera ocorrências separadas', () => {
    const d = construirDiagnosticos({
      ...emptyIndex(),
      consciencias: [consciencia({ avisos: ['aviso 1', 'aviso 2'] })],
    });
    const internos = d.filter((x) => x.categoria === 'interno');
    expect(internos).toHaveLength(2);
  });
});

// ─── Novos testes: agruparDiagnosticos ───────────────────────────────────────

describe('agruparDiagnosticos', () => {
  it('avisos internos com mesma mensagem e tipo são agrupados', () => {
    const d: readonly ContrariusDiagnostico[] = [
      { categoria: 'interno', nivel: 'aviso', filePath: 'a.md', mensagem: 'campo ausente', tipoEntidade: 'relacao' },
      { categoria: 'interno', nivel: 'aviso', filePath: 'b.md', mensagem: 'campo ausente', tipoEntidade: 'relacao' },
    ];
    const groups = agruparDiagnosticos(d);
    expect(groups).toHaveLength(1);
    expect(groups[0].quantidade).toBe(2);
  });

  it('mensagens iguais em tipos de entidade diferentes não são agrupadas', () => {
    const d: readonly ContrariusDiagnostico[] = [
      { categoria: 'interno', nivel: 'aviso', filePath: 'a.md', mensagem: 'campo ausente', tipoEntidade: 'consciencia' },
      { categoria: 'interno', nivel: 'aviso', filePath: 'b.md', mensagem: 'campo ausente', tipoEntidade: 'relacao' },
    ];
    const groups = agruparDiagnosticos(d);
    expect(groups).toHaveLength(2);
  });

  it('categorias diferentes não são agrupadas mesmo com mensagem igual', () => {
    const d: readonly ContrariusDiagnostico[] = [
      { categoria: 'indexacao', nivel: 'aviso', filePath: 'a.md', mensagem: 'campo ausente' },
      { categoria: 'interno', nivel: 'aviso', filePath: 'b.md', mensagem: 'campo ausente', tipoEntidade: 'lugar' },
    ];
    const groups = agruparDiagnosticos(d);
    expect(groups).toHaveLength(2);
  });

  it('quantidade corresponde a itens.length em todos os grupos', () => {
    const d: readonly ContrariusDiagnostico[] = [
      { categoria: 'interno', nivel: 'aviso', filePath: 'a.md', mensagem: 'msg', tipoEntidade: 'evento' },
      { categoria: 'interno', nivel: 'aviso', filePath: 'b.md', mensagem: 'msg', tipoEntidade: 'evento' },
      { categoria: 'interno', nivel: 'aviso', filePath: 'c.md', mensagem: 'msg', tipoEntidade: 'evento' },
      { categoria: 'erro', nivel: 'erro', filePath: 'd.md', mensagem: 'outro' },
    ];
    const groups = agruparDiagnosticos(d);
    for (const g of groups) {
      expect(g.quantidade).toBe(g.itens.length);
    }
  });

  it('ordena categorias: erro primeiro, indexacao depois, interno por último', () => {
    const d: readonly ContrariusDiagnostico[] = [
      { categoria: 'interno', nivel: 'aviso', filePath: 'a.md', mensagem: 'x', tipoEntidade: 'evento' },
      { categoria: 'indexacao', nivel: 'aviso', filePath: 'b.md', mensagem: 'y' },
      { categoria: 'erro', nivel: 'erro', filePath: 'c.md', mensagem: 'z' },
    ];
    const groups = agruparDiagnosticos(d);
    expect(groups.map((g) => g.categoria)).toEqual(['erro', 'indexacao', 'interno']);
  });

  it('maior quantidade aparece primeiro dentro da mesma categoria', () => {
    const d: readonly ContrariusDiagnostico[] = [
      { categoria: 'interno', nivel: 'aviso', filePath: 'a.md', mensagem: 'msg-um', tipoEntidade: 'evento' },
      { categoria: 'interno', nivel: 'aviso', filePath: 'b.md', mensagem: 'msg-dois', tipoEntidade: 'evento' },
      { categoria: 'interno', nivel: 'aviso', filePath: 'c.md', mensagem: 'msg-dois', tipoEntidade: 'evento' },
    ];
    const groups = agruparDiagnosticos(d);
    const internoGroups = groups.filter((g) => g.categoria === 'interno');
    expect(internoGroups[0].mensagem).toBe('msg-dois');
    expect(internoGroups[1].mensagem).toBe('msg-um');
  });
});

// ─── Novos testes: contarDiagnosticosPorCategoria ────────────────────────────

describe('contarDiagnosticosPorCategoria', () => {
  it('contagem por categoria usa número de ocorrências', () => {
    const d: readonly ContrariusDiagnostico[] = [
      { categoria: 'erro', nivel: 'erro', filePath: 'a.md', mensagem: 'e1' },
      { categoria: 'erro', nivel: 'erro', filePath: 'b.md', mensagem: 'e2' },
      { categoria: 'indexacao', nivel: 'aviso', filePath: 'c.md', mensagem: 'i1' },
      { categoria: 'interno', nivel: 'aviso', filePath: 'd.md', mensagem: 'n1', tipoEntidade: 'evento' },
    ];
    const counts = contarDiagnosticosPorCategoria(d);
    expect(counts.erro).toBe(2);
    expect(counts.indexacao).toBe(1);
    expect(counts.interno).toBe(1);
  });

  it('total inclui as três categorias', () => {
    const d: readonly ContrariusDiagnostico[] = [
      { categoria: 'erro', nivel: 'erro', filePath: 'a.md', mensagem: 'e1' },
      { categoria: 'indexacao', nivel: 'aviso', filePath: 'c.md', mensagem: 'i1' },
      { categoria: 'interno', nivel: 'aviso', filePath: 'd.md', mensagem: 'n1', tipoEntidade: 'evento' },
    ];
    expect(contarDiagnosticosPorCategoria(d).todos).toBe(3);
  });
});

// ─── Novos testes: filtrarGruposDiagnostico ───────────────────────────────────

describe('filtrarGruposDiagnostico', () => {
  it('filtro por categoria erro retorna apenas grupos de erro', () => {
    const groups = [
      makeGroup({ categoria: 'erro', nivel: 'erro', mensagem: 'falha x' }),
      makeGroup({ categoria: 'indexacao', nivel: 'aviso', mensagem: 'idx y' }),
    ];
    const result = filtrarGruposDiagnostico(groups, 'erro', '');
    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe('erro');
  });

  it('filtro por categoria indexacao retorna apenas grupos de indexacao', () => {
    const groups = [
      makeGroup({ categoria: 'erro', nivel: 'erro', mensagem: 'falha x' }),
      makeGroup({ categoria: 'indexacao', nivel: 'aviso', mensagem: 'idx y' }),
      makeGroup({ categoria: 'interno', nivel: 'aviso', mensagem: 'int z' }),
    ];
    const result = filtrarGruposDiagnostico(groups, 'indexacao', '');
    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe('indexacao');
  });

  it('filtro por categoria interno retorna apenas grupos internos', () => {
    const groups = [
      makeGroup({ categoria: 'erro', nivel: 'erro', mensagem: 'falha x' }),
      makeGroup({ categoria: 'interno', nivel: 'aviso', mensagem: 'int z' }),
    ];
    const result = filtrarGruposDiagnostico(groups, 'interno', '');
    expect(result).toHaveLength(1);
    expect(result[0].categoria).toBe('interno');
  });

  it('filtro todos retorna todos os grupos', () => {
    const groups = [
      makeGroup({ categoria: 'erro', nivel: 'erro', mensagem: 'a' }),
      makeGroup({ categoria: 'indexacao', nivel: 'aviso', mensagem: 'b' }),
      makeGroup({ categoria: 'interno', nivel: 'aviso', mensagem: 'c' }),
    ];
    expect(filtrarGruposDiagnostico(groups, 'todos', '')).toHaveLength(3);
  });

  it('busca por mensagem filtra grupos', () => {
    const groups = [
      makeGroup({
        mensagem: 'campo tipo ausente',
        itens: [{ categoria: 'interno', nivel: 'aviso', filePath: 'arq/nota.md', mensagem: 'campo tipo ausente', tipoEntidade: 'evento' }],
      }),
      makeGroup({
        mensagem: 'valor fora do intervalo',
        itens: [{ categoria: 'interno', nivel: 'aviso', filePath: 'arq/nota2.md', mensagem: 'valor fora do intervalo', tipoEntidade: 'evento' }],
      }),
    ];
    const result = filtrarGruposDiagnostico(groups, 'todos', 'campo tipo');
    expect(result).toHaveLength(1);
    expect(result[0].mensagem).toBe('campo tipo ausente');
  });

  it('busca por caminho filtra grupos', () => {
    const grupos = [
      makeGroup({
        mensagem: 'aviso qualquer',
        itens: [{ categoria: 'interno', nivel: 'aviso', filePath: 'pasta/alvo.md', mensagem: 'aviso qualquer', tipoEntidade: 'evento' }],
      }),
      makeGroup({
        mensagem: 'outro aviso',
        itens: [{ categoria: 'interno', nivel: 'aviso', filePath: 'pasta/diferente.md', mensagem: 'outro aviso', tipoEntidade: 'evento' }],
      }),
    ];
    const result = filtrarGruposDiagnostico(grupos, 'todos', 'alvo');
    expect(result).toHaveLength(1);
    expect(result[0].itens[0].filePath).toBe('pasta/alvo.md');
  });

  it('busca por tipo de entidade filtra grupos', () => {
    // Mensagens e caminhos são neutros: não contêm 'consciencia'
    const grupos: GrupoDiagnostico[] = [
      {
        categoria: 'interno',
        nivel: 'aviso',
        mensagem: 'aviso neutro alfa',
        tipoEntidade: 'consciencia',
        itens: [{ categoria: 'interno', nivel: 'aviso', filePath: 'neutro/alfa.md', mensagem: 'aviso neutro alfa', tipoEntidade: 'consciencia' }],
        quantidade: 1,
      },
      {
        categoria: 'interno',
        nivel: 'aviso',
        mensagem: 'aviso neutro beta',
        tipoEntidade: 'evento',
        itens: [{ categoria: 'interno', nivel: 'aviso', filePath: 'neutro/beta.md', mensagem: 'aviso neutro beta', tipoEntidade: 'evento' }],
        quantidade: 1,
      },
    ];
    const result = filtrarGruposDiagnostico(grupos, 'todos', 'consciencia');
    expect(result).toHaveLength(1);
    expect(result[0].tipoEntidade).toBe('consciencia');
  });

  it('busca ignora acentos e caixa', () => {
    const grupos = [
      makeGroup({
        mensagem: 'índice inválido',
        itens: [{ categoria: 'interno', nivel: 'aviso', filePath: 'arq/nota.md', mensagem: 'índice inválido', tipoEntidade: 'evento' }],
      }),
    ];
    expect(filtrarGruposDiagnostico(grupos, 'todos', 'INDICE INVALIDO')).toHaveLength(1);
  });

  it('não modifica os arrays recebidos', () => {
    const grupos = [
      makeGroup({ mensagem: 'aviso a' }),
      makeGroup({ categoria: 'erro', nivel: 'erro', mensagem: 'aviso b' }),
    ];
    const original = [...grupos];
    filtrarGruposDiagnostico(grupos, 'erro', 'a');
    expect(grupos).toEqual(original);
  });
});

// ─── humanizarTituloTecnico ───────────────────────────────────────────────────

describe('humanizarTituloTecnico', () => {
  it('C-024_V01_Pajem2_de_Roland1 → Pajem 2 de Roland 1', () => {
    expect(humanizarTituloTecnico('C-024_V01_Pajem2_de_Roland1')).toBe('Pajem 2 de Roland 1');
  });

  it('C-025_V01_Escudeiro_de_Roland → Escudeiro de Roland', () => {
    expect(humanizarTituloTecnico('C-025_V01_Escudeiro_de_Roland')).toBe('Escudeiro de Roland');
  });

  it('P-001_V01_Destrier_Babieca → Destrier Babieca', () => {
    expect(humanizarTituloTecnico('P-001_V01_Destrier_Babieca')).toBe('Destrier Babieca');
  });

  it('remove prefixo de consciência C-###_', () => {
    expect(humanizarTituloTecnico('C-034_Bispo_Emerald')).toBe('Bispo Emerald');
  });

  it('remove prefixo pré-humano P-###_', () => {
    expect(humanizarTituloTecnico('P-005_Nome_Antigo')).toBe('Nome Antigo');
  });

  it('insere espaço entre letra e dígito (Pajem2 → Pajem 2)', () => {
    expect(humanizarTituloTecnico('C-001_V01_Pajem2')).toBe('Pajem 2');
  });

  it('insere espaço entre dígito e letra (2Pajem → 2 Pajem)', () => {
    expect(humanizarTituloTecnico('C-001_V01_2Pajem')).toBe('2 Pajem');
  });

  it('preserva acentos e caixa original', () => {
    expect(humanizarTituloTecnico('C-001_V01_Cônsul_Ação')).toBe('Cônsul Ação');
    expect(humanizarTituloTecnico('C-001_V01_del_Castillo')).toBe('del Castillo');
  });

  it('valor formado apenas pelo código técnico não retorna vazio', () => {
    expect(humanizarTituloTecnico('C-001')).toBe('C-001');
    expect(humanizarTituloTecnico('C-001_V01_')).not.toBe('');
  });

  it('remove caminho e extensão .md antes de processar', () => {
    expect(humanizarTituloTecnico('03_Retrovidas/C-024_V01_Pajem2_de_Roland1.md')).toBe('Pajem 2 de Roland 1');
    expect(humanizarTituloTecnico('03_Retrovidas/C-025_V01_Escudeiro_de_Roland.md')).toBe('Escudeiro de Roland');
  });

  it('é determinístico e não modifica a entrada', () => {
    const input = 'C-024_V01_Pajem2_de_Roland1';
    const original = input;
    const r1 = humanizarTituloTecnico(input);
    const r2 = humanizarTituloTecnico(input);
    expect(input).toBe(original);
    expect(r1).toBe(r2);
    expect(r1).toBe('Pajem 2 de Roland 1');
  });
});

// ─── nomes de exibição — detecção de fallback técnico ────────────────────────

describe('nomes de exibição — detecção de fallback técnico', () => {
  it('nome explícito Bispo Emerald é preservado sem reformatação', () => {
    const c = consciencia({
      nome: 'Bispo Emerald',
      id: 'C-034_V01_Bispo_Emerald',
      filePath: '02_Consciencias/C-034_V01_Bispo_Emerald.md',
    });
    expect(nomeConsciencia(c)).toBe('Bispo Emerald');
  });

  it('primeiro item humano de nomes é preservado sem reformatação', () => {
    const r = retrovida({ nomes: ['Ana de Almeida', 'Outro Nome'] });
    expect(nomeRetrovida(r)).toBe('Ana de Almeida');
  });

  it('nome igual ao ID é tratado como fallback técnico', () => {
    const c = consciencia({
      nome: 'C-001',
      id: 'C-001',
      filePath: '02_Consciencias/C-001.md',
      identExtraf: 'Aris',
    });
    expect(nomeConsciencia(c)).toBe('Aris');
  });

  it('nomes[0] igual ao ID é tratado como fallback técnico e humanizado', () => {
    const r = retrovida({
      nomes: ['C-001_V01'],
      id: 'C-001_V01',
      filePath: '03_Retrovidas/C-001_V01.md',
    });
    expect(nomeRetrovida(r)).toBe('V 01');
  });

  it('nomes[0] igual ao caminho completo é tratado como fallback técnico', () => {
    const r = retrovida({
      nomes: ['03_Retrovidas/C-001_V01.md'],
      id: 'C-001_V01',
      filePath: '03_Retrovidas/C-001_V01.md',
    });
    expect(nomeRetrovida(r)).toBe('V 01');
  });

  it('nomes[0] igual ao basename com extensão .md é tratado como fallback técnico', () => {
    const r = retrovida({
      nomes: ['C-001_V01.md'],
      id: 'C-001_V01',
      filePath: '03_Retrovidas/C-001_V01.md',
    });
    expect(nomeRetrovida(r)).toBe('V 01');
  });

  it('comparação de fallback ignora diferenças de caixa', () => {
    const r = retrovida({
      nomes: ['c-001_v01'],
      id: 'C-001_V01',
      filePath: '03_Retrovidas/C-001_V01.md',
    });
    expect(nomeRetrovida(r)).toBe('V 01');
  });

  it('ID e filePath das entidades não são modificados após chamada dos nomes', () => {
    const r = retrovida({ nomes: [], id: 'C-001_V01', filePath: '03_Retrovidas/C-001_V01.md' });
    nomeRetrovida(r);
    expect(r.id).toBe('C-001_V01');
    expect(r.filePath).toBe('03_Retrovidas/C-001_V01.md');

    const c = consciencia({ nome: '', identExtraf: '', id: 'C-001', filePath: '02_Consciencias/C-001.md' });
    nomeConsciencia(c);
    expect(c.id).toBe('C-001');
    expect(c.filePath).toBe('02_Consciencias/C-001.md');
  });

  it('não muta a entidade recebida', () => {
    const r = retrovida({ nomes: Object.freeze(['C-001_V01']) as readonly string[] });
    const before = JSON.stringify(r);
    nomeRetrovida(r);
    expect(JSON.stringify(r)).toBe(before);
  });
});

// ─── Novos testes: resumo — cartão de diagnósticos ───────────────────────────

describe('resumo — cartão de diagnósticos', () => {
  it('inclui avisos internos no total e preserva os demais totais', () => {
    // index() tem: 1 erro, 0 avisosIndexacao, 3 avisos internos (consciencia:1, relacao:2)
    const resumo = construirResumo(index());
    expect(resumo.erros).toBe(1);
    expect(resumo.avisosIndexacao).toBe(0);
    expect(resumo.avisosInternos).toBe(3);
    expect(resumo.consciencias).toBe(1);
    expect(resumo.retrovidas).toBe(1);
    expect(resumo.eventos).toBe(1);
    expect(resumo.lugares).toBe(1);
    expect(resumo.relacoes).toBe(1);
    expect(resumo.totalEntidades).toBe(5);
  });
});
