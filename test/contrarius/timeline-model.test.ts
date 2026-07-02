import { describe, expect, it } from 'vitest';
import type { ContrariusIndex, Evento } from '../../src/contrarius/types';
import { construirCronologiaDupla } from '../../src/contrarius/timeline-model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEvento(overrides: Partial<Evento> = {}): Evento {
  return {
    tipoEntidade: 'evento',
    id: 'E-1',
    titulo: 'Evento Um',
    anoOrdem: null,
    data: '',
    dataInicio: '',
    dataFim: '',
    dataTextual: '',
    dataAproximada: false,
    periodo: [],
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
    ordemNarrativa: null,
    capitulo: '',
    cena: '',
    livro: [],
    fontes: [],
    tags: [],
    filePath: '05_Eventos/E-1.md',
    frontmatterRaw: {},
    camposDesconhecidos: {},
    avisos: [],
    ...overrides,
  };
}

function makeIndex(eventos: Evento[]): ContrariusIndex {
  return {
    consciencias: [],
    retrovidas: [],
    eventos,
    lugares: [],
    relacoes: [],
    avisosIndexacao: [],
    erros: [],
  };
}

function codes(index: ContrariusIndex) {
  return construirCronologiaDupla(index).problemas.map((p) => p.codigo);
}

// ─── Cronologia histórica — precisão de datas ─────────────────────────────────

describe('construirCronologiaDupla — datas históricas', () => {
  it('posiciona evento por ano', () => {
    const e = makeEvento({ data: '1212' });
    const r = construirCronologiaDupla(makeIndex([e]));
    expect(r.cronologica.posicionados).toHaveLength(1);
    const pos = r.cronologica.posicionados[0].posicaoTemporal;
    expect(pos.precisao).toBe('ano');
    expect(pos.inicio).toBe(12120000);
    expect(pos.fim).toBe(12120000);
  });

  it('posiciona evento por mês', () => {
    const e = makeEvento({ data: '1212-07' });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.precisao).toBe('mes');
    expect(pos.inicio).toBe(12120700);
  });

  it('posiciona evento por dia', () => {
    const e = makeEvento({ data: '1212-07-16' });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.precisao).toBe('dia');
    expect(pos.inicio).toBe(12120716);
  });

  it('posiciona evento com ano negativo (BCE)', () => {
    const e = makeEvento({ data: '-331' });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.precisao).toBe('ano');
    expect(pos.inicio).toBe(-3310000);
  });

  it('posiciona evento com ano negativo e data completa', () => {
    const e = makeEvento({ data: '-0312-03-10' });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.precisao).toBe('dia');
    expect(pos.inicio).toBe(-312 * 10000 + 3 * 100 + 10);
  });

  it('preserva textoOriginal da data', () => {
    const e = makeEvento({ data: '1212-07-16' });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.textoOriginal).toBe('1212-07-16');
  });

  it('propaga dataAproximada', () => {
    const e = makeEvento({ data: '1212', dataAproximada: true });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.aproximada).toBe(true);
  });
});

// ─── Validação de calendário ──────────────────────────────────────────────────

describe('construirCronologiaDupla — validação de calendário', () => {
  it('emite data_invalida para mês 13', () => {
    const e = makeEvento({ data: '1212-13' });
    expect(codes(makeIndex([e]))).toContain('data_invalida');
  });

  it('emite data_invalida para dia 32', () => {
    const e = makeEvento({ data: '1212-01-32' });
    expect(codes(makeIndex([e]))).toContain('data_invalida');
  });

  it('emite data_invalida para 31 de abril', () => {
    const e = makeEvento({ data: '1212-04-31' });
    expect(codes(makeIndex([e]))).toContain('data_invalida');
  });

  it('aceita 29 de fevereiro em ano bissexto', () => {
    const e = makeEvento({ data: '2000-02-29' });
    expect(codes(makeIndex([e]))).not.toContain('data_invalida');
    expect(construirCronologiaDupla(makeIndex([e])).cronologica.posicionados).toHaveLength(1);
  });

  it('emite data_invalida para 29 de fevereiro em ano não-bissexto', () => {
    const e = makeEvento({ data: '1900-02-29' });
    expect(codes(makeIndex([e]))).toContain('data_invalida');
  });

  it('não reconhece formato textual como data válida', () => {
    const e = makeEvento({ data: 'c. 1212' });
    expect(codes(makeIndex([e]))).toContain('data_invalida');
  });
});

// ─── Fallback — intervalo ─────────────────────────────────────────────────────

describe('construirCronologiaDupla — fallback por intervalo', () => {
  it('usa dataInicio e dataFim como intervalo quando data ausente', () => {
    const e = makeEvento({ dataInicio: '1210', dataFim: '1215' });
    const r = construirCronologiaDupla(makeIndex([e]));
    expect(r.cronologica.posicionados).toHaveLength(1);
    const pos = r.cronologica.posicionados[0].posicaoTemporal;
    expect(pos.precisao).toBe('intervalo');
    expect(pos.inicio).toBe(12100000);
    expect(pos.fim).toBe(12150000);
  });

  it('intervalo apenas com dataInicio: inicio = fim', () => {
    const e = makeEvento({ dataInicio: '1210' });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.inicio).toBe(12100000);
    expect(pos.fim).toBe(12100000);
    expect(pos.precisao).toBe('intervalo');
  });

  it('intervalo apenas com dataFim: inicio = fim', () => {
    const e = makeEvento({ dataFim: '1215' });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.inicio).toBe(12150000);
    expect(pos.fim).toBe(12150000);
  });

  it('intervalo invertido emite problema e mantém ordenável', () => {
    const e = makeEvento({ dataInicio: '1215', dataFim: '1210' });
    const r = construirCronologiaDupla(makeIndex([e]));
    expect(codes(makeIndex([e]))).toContain('intervalo_invertido');
    expect(r.cronologica.posicionados).toHaveLength(1);
  });

  it('fallback para intervalo após data inválida', () => {
    const e = makeEvento({ data: 'c. 1212', dataInicio: '1210', dataFim: '1215' });
    const r = construirCronologiaDupla(makeIndex([e]));
    expect(r.cronologica.posicionados).toHaveLength(1);
    expect(r.cronologica.posicionados[0].posicaoTemporal.precisao).toBe('intervalo');
    expect(codes(makeIndex([e]))).toContain('data_invalida');
  });
});

// ─── Fallback — anoOrdem ─────────────────────────────────────────────────────

describe('construirCronologiaDupla — fallback por anoOrdem', () => {
  it('usa anoOrdem quando data e intervalo ausentes', () => {
    const e = makeEvento({ anoOrdem: -44 });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.precisao).toBe('ano_ordem');
    expect(pos.inicio).toBe(-44 * 10000);
  });

  it('prefere data válida sobre anoOrdem', () => {
    const e = makeEvento({ data: '1212', anoOrdem: -44 });
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0].posicaoTemporal;
    expect(pos.precisao).toBe('ano');
  });
});

// ─── Não posicionados ─────────────────────────────────────────────────────────

describe('construirCronologiaDupla — não posicionados', () => {
  it('evento sem data vai para naoPosicionados', () => {
    const e = makeEvento({ id: 'E-X' });
    const r = construirCronologiaDupla(makeIndex([e]));
    expect(r.cronologica.posicionados).toHaveLength(0);
    expect(r.cronologica.naoPosicionados).toHaveLength(1);
    expect(r.cronologica.naoPosicionados[0].posicaoTemporal.precisao).toBe('nao_posicionado');
  });

  it('início e fim são null para não posicionado', () => {
    const e = makeEvento();
    const pos = construirCronologiaDupla(makeIndex([e])).cronologica.naoPosicionados[0].posicaoTemporal;
    expect(pos.inicio).toBeNull();
    expect(pos.fim).toBeNull();
  });
});

// ─── Desempates determinísticos ───────────────────────────────────────────────

describe('construirCronologiaDupla — desempates cronológicos', () => {
  it('ordena eventos com a mesma data por título pt-BR', () => {
    const e1 = makeEvento({ id: 'E-1', titulo: 'Beta', data: '1212', filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', titulo: 'Alpha', data: '1212', filePath: '05_Eventos/E-2.md' });
    const r = construirCronologiaDupla(makeIndex([e1, e2]));
    const ids = r.cronologica.posicionados.map((i) => i.id);
    expect(ids).toEqual(['E-2', 'E-1']);
  });

  it('ordena eventos com mesmo título por filePath', () => {
    const e1 = makeEvento({ id: 'E-1', titulo: 'X', data: '1212', filePath: '05_Eventos/Z.md' });
    const e2 = makeEvento({ id: 'E-2', titulo: 'X', data: '1212', filePath: '05_Eventos/A.md' });
    const r = construirCronologiaDupla(makeIndex([e1, e2]));
    expect(r.cronologica.posicionados[0].filePath).toBe('05_Eventos/A.md');
  });

  it('não posicionados também são ordenados por título', () => {
    const e1 = makeEvento({ id: 'E-1', titulo: 'Zulu', filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', titulo: 'Alfa', filePath: '05_Eventos/E-2.md' });
    const r = construirCronologiaDupla(makeIndex([e1, e2]));
    expect(r.cronologica.naoPosicionados.map((i) => i.id)).toEqual(['E-2', 'E-1']);
  });
});

// ─── Cronologia — título via nomeEvento ───────────────────────────────────────

describe('construirCronologiaDupla — título', () => {
  it('usa o titulo do evento via nomeEvento', () => {
    const e = makeEvento({ titulo: 'Batalha de Moirans', data: '1212' });
    const item = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0];
    expect(item.titulo).toBe('Batalha de Moirans');
  });

  it('usa o id quando título está vazio (nomeEvento fallback)', () => {
    const e = makeEvento({ id: 'E-42', titulo: '', data: '1212' });
    const item = construirCronologiaDupla(makeIndex([e])).cronologica.posicionados[0];
    expect(item.titulo).toBe('E-42');
  });
});

// ─── Ordem narrativa ──────────────────────────────────────────────────────────

describe('construirCronologiaDupla — narrativa por livro', () => {
  it('posiciona evento com ordemNarrativa em narrativa.posicionados', () => {
    const e = makeEvento({ ordemNarrativa: 1, livro: ['Livro A'] });
    const r = construirCronologiaDupla(makeIndex([e]));
    expect(r.narrativa.posicionados).toHaveLength(1);
    expect(r.narrativa.naoPosicionados).toHaveLength(0);
  });

  it('evento sem ordemNarrativa vai para narrativa.naoPosicionados e emite aviso', () => {
    const e = makeEvento({ ordemNarrativa: null });
    const r = construirCronologiaDupla(makeIndex([e]));
    expect(r.narrativa.naoPosicionados).toHaveLength(1);
    expect(codes(makeIndex([e]))).toContain('ordem_narrativa_ausente');
  });

  it('ordena por livro primeiro', () => {
    const e1 = makeEvento({ id: 'E-1', livro: ['Livro B'], ordemNarrativa: 1, filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', livro: ['Livro A'], ordemNarrativa: 2, filePath: '05_Eventos/E-2.md' });
    const r = construirCronologiaDupla(makeIndex([e1, e2]));
    expect(r.narrativa.posicionados.map((i) => i.id)).toEqual(['E-2', 'E-1']);
  });

  it('ordena por ordemNarrativa dentro do mesmo livro', () => {
    const e1 = makeEvento({ id: 'E-1', livro: ['Livro A'], ordemNarrativa: 5, filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', livro: ['Livro A'], ordemNarrativa: 2, filePath: '05_Eventos/E-2.md' });
    const r = construirCronologiaDupla(makeIndex([e1, e2]));
    expect(r.narrativa.posicionados.map((i) => i.id)).toEqual(['E-2', 'E-1']);
  });

  it('ordena por capítulo dentro da mesma ordemNarrativa e livro', () => {
    const e1 = makeEvento({ id: 'E-1', livro: ['L'], ordemNarrativa: 1, capitulo: 'Cap Z', filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', livro: ['L'], ordemNarrativa: 1, capitulo: 'Cap A', filePath: '05_Eventos/E-2.md' });
    const r = construirCronologiaDupla(makeIndex([e1, e2]));
    expect(r.narrativa.posicionados.map((i) => i.id)).toEqual(['E-2', 'E-1']);
  });

  it('ordena por cena depois de capítulo', () => {
    const base = { livro: ['L'], ordemNarrativa: 1, capitulo: 'Cap 1' };
    const e1 = makeEvento({ id: 'E-1', ...base, cena: 'Z', filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', ...base, cena: 'A', filePath: '05_Eventos/E-2.md' });
    const r = construirCronologiaDupla(makeIndex([e1, e2]));
    expect(r.narrativa.posicionados.map((i) => i.id)).toEqual(['E-2', 'E-1']);
  });

  it('compara livros sem considerar acento para ordenação', () => {
    const e1 = makeEvento({ id: 'E-1', livro: ['Ópera'], ordemNarrativa: 1, filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', livro: ['Opera'], ordemNarrativa: 2, filePath: '05_Eventos/E-2.md' });
    const r = construirCronologiaDupla(makeIndex([e1, e2]));
    // 'opera' normalizado == 'opera' normalizado, same book bucket, then by ordemNarrativa
    expect(r.narrativa.posicionados.map((i) => i.id)).toEqual(['E-1', 'E-2']);
  });
});

describe('construirCronologiaDupla — ordem duplicada e ausente', () => {
  it('emite ordem_narrativa_duplicada para dois eventos com mesma ordemNarrativa no mesmo livro', () => {
    const e1 = makeEvento({ id: 'E-1', livro: ['L'], ordemNarrativa: 3, filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', livro: ['L'], ordemNarrativa: 3, filePath: '05_Eventos/E-2.md' });
    const problemCodes = codes(makeIndex([e1, e2]));
    expect(problemCodes.filter((c) => c === 'ordem_narrativa_duplicada')).toHaveLength(2);
  });

  it('lista o outro evento em relacionados ao reportar duplicata', () => {
    const e1 = makeEvento({ id: 'E-1', livro: ['L'], ordemNarrativa: 3, filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', livro: ['L'], ordemNarrativa: 3, filePath: '05_Eventos/E-2.md' });
    const problemas = construirCronologiaDupla(makeIndex([e1, e2])).problemas
      .filter((p) => p.codigo === 'ordem_narrativa_duplicada');
    const p1 = problemas.find((p) => p.eventoId === 'E-1');
    const p2 = problemas.find((p) => p.eventoId === 'E-2');
    expect(p1?.relacionados).toContain('E-2');
    expect(p2?.relacionados).toContain('E-1');
  });

  it('mesma ordemNarrativa em livros diferentes NÃO é conflito', () => {
    const e1 = makeEvento({ id: 'E-1', livro: ['Livro A'], ordemNarrativa: 3, filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', livro: ['Livro B'], ordemNarrativa: 3, filePath: '05_Eventos/E-2.md' });
    expect(codes(makeIndex([e1, e2]))).not.toContain('ordem_narrativa_duplicada');
  });
});

// ─── Referências entre eventos ────────────────────────────────────────────────

describe('construirCronologiaDupla — referências por ID e wikilink', () => {
  it('resolve referência por ID exato em eventosAnteriores', () => {
    const eA = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', data: '1300', eventosAnteriores: ['E-1'] });
    const eB = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', data: '1200' });
    expect(codes(makeIndex([eA, eB]))).not.toContain('referencia_evento_nao_encontrada');
  });

  it('resolve referência por wikilink em eventosAnteriores', () => {
    const eA = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', data: '1300', eventosAnteriores: ['[[E-1]]'] });
    const eB = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', data: '1200' });
    expect(codes(makeIndex([eA, eB]))).not.toContain('referencia_evento_nao_encontrada');
  });

  it('resolve referência com alias wikilink', () => {
    const eA = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', data: '1300', eventosAnteriores: ['[[E-1|Nome Alias]]'] });
    const eB = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', data: '1200' });
    expect(codes(makeIndex([eA, eB]))).not.toContain('referencia_evento_nao_encontrada');
  });

  it('emite referencia_evento_nao_encontrada para referência inexistente', () => {
    const e = makeEvento({ eventosAnteriores: ['E-INEXISTENTE'] });
    expect(codes(makeIndex([e]))).toContain('referencia_evento_nao_encontrada');
  });

  it('emite referencia_evento_ambigua para referência ambígua', () => {
    const e1 = makeEvento({ id: 'X', filePath: '05_Eventos/A/X.md', ordemNarrativa: 1 });
    const e2 = makeEvento({ id: 'X', filePath: '05_Eventos/B/X.md', ordemNarrativa: 2 });
    const eA = makeEvento({ id: 'E-Main', filePath: '05_Eventos/Main.md', eventosAnteriores: ['X'] });
    expect(codes(makeIndex([e1, e2, eA]))).toContain('referencia_evento_ambigua');
  });
});

// ─── Restrições cronológicas ──────────────────────────────────────────────────

describe('construirCronologiaDupla — restrições entre eventos', () => {
  it('não emite violação quando anterior está corretamente antes', () => {
    const eA = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', data: '1300', eventosAnteriores: ['E-1'] });
    const eB = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', data: '1200' });
    expect(codes(makeIndex([eA, eB]))).not.toContain('restricao_cronologica_violada');
  });

  it('emite restricao_cronologica_violada quando anterior está depois', () => {
    const eA = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', data: '1200', eventosAnteriores: ['E-1'] });
    const eB = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', data: '1300' });
    expect(codes(makeIndex([eA, eB]))).toContain('restricao_cronologica_violada');
  });

  it('emite restricao_cronologica_violada quando posterior está antes', () => {
    const eA = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', data: '1300', eventosPosteriores: ['E-2'] });
    const eB = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', data: '1200' });
    expect(codes(makeIndex([eA, eB]))).toContain('restricao_cronologica_violada');
  });

  it('não emite violação quando ambos são não posicionados', () => {
    const eA = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', eventosAnteriores: ['E-1'] });
    const eB = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md' });
    expect(codes(makeIndex([eA, eB]))).not.toContain('restricao_cronologica_violada');
  });

  it('deduplica aresta repetida', () => {
    const eA = makeEvento({
      id: 'E-2', filePath: '05_Eventos/E-2.md', data: '1300',
      eventosAnteriores: ['E-1', '[[E-1]]'],
    });
    const eB = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', data: '1200' });
    // Only one edge added, no doubled problem
    expect(codes(makeIndex([eA, eB])).filter((c) => c === 'restricao_cronologica_violada')).toHaveLength(0);
  });
});

// ─── Ciclos ───────────────────────────────────────────────────────────────────

describe('construirCronologiaDupla — ciclos de dependência', () => {
  it('detecta ciclo de 2 eventos', () => {
    const e1 = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', eventosPosteriores: ['E-2'] });
    const e2 = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', eventosPosteriores: ['E-1'] });
    expect(codes(makeIndex([e1, e2]))).toContain('ciclo_de_dependencia');
  });

  it('ciclo de 2 — nível é erro', () => {
    const e1 = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', eventosPosteriores: ['E-2'] });
    const e2 = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', eventosPosteriores: ['E-1'] });
    const problemas = construirCronologiaDupla(makeIndex([e1, e2])).problemas
      .filter((p) => p.codigo === 'ciclo_de_dependencia');
    expect(problemas.every((p) => p.nivel === 'erro')).toBe(true);
  });

  it('detecta ciclo de 3 eventos', () => {
    const e1 = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', eventosPosteriores: ['E-2'] });
    const e2 = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', eventosPosteriores: ['E-3'] });
    const e3 = makeEvento({ id: 'E-3', filePath: '05_Eventos/E-3.md', eventosPosteriores: ['E-1'] });
    expect(codes(makeIndex([e1, e2, e3]))).toContain('ciclo_de_dependencia');
  });

  it('ciclo de 3 inclui os eventos relacionados', () => {
    const e1 = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', eventosPosteriores: ['E-2'] });
    const e2 = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', eventosPosteriores: ['E-3'] });
    const e3 = makeEvento({ id: 'E-3', filePath: '05_Eventos/E-3.md', eventosPosteriores: ['E-1'] });
    const cicloProblem = construirCronologiaDupla(makeIndex([e1, e2, e3])).problemas
      .find((p) => p.codigo === 'ciclo_de_dependencia');
    expect(cicloProblem).toBeDefined();
    const allIds = [cicloProblem!.eventoId, ...cicloProblem!.relacionados];
    expect(allIds).toContain('E-1');
    expect(allIds).toContain('E-2');
    expect(allIds).toContain('E-3');
  });

  it('grafo acíclico não emite ciclo_de_dependencia', () => {
    const e1 = makeEvento({ id: 'E-1', filePath: '05_Eventos/E-1.md', eventosPosteriores: ['E-2', 'E-3'] });
    const e2 = makeEvento({ id: 'E-2', filePath: '05_Eventos/E-2.md', eventosPosteriores: ['E-3'] });
    const e3 = makeEvento({ id: 'E-3', filePath: '05_Eventos/E-3.md' });
    expect(codes(makeIndex([e1, e2, e3]))).not.toContain('ciclo_de_dependencia');
  });
});

// ─── Imutabilidade ────────────────────────────────────────────────────────────

describe('construirCronologiaDupla — imutabilidade', () => {
  it('não modifica o array de eventos do índice', () => {
    const eventos = [
      makeEvento({ id: 'E-1', data: '1300', filePath: '05_Eventos/E-1.md' }),
      makeEvento({ id: 'E-2', data: '1200', filePath: '05_Eventos/E-2.md' }),
    ];
    const index = makeIndex(eventos);
    const snapshot = JSON.stringify(eventos);
    construirCronologiaDupla(index);
    expect(JSON.stringify(eventos)).toBe(snapshot);
  });

  it('livro no ItemCronologiaContrarius é cópia independente', () => {
    const e = makeEvento({ livro: ['Livro A'], data: '1212' });
    const r = construirCronologiaDupla(makeIndex([e]));
    const itemLivro = r.cronologica.posicionados[0].livro as string[];
    itemLivro.push('Livro X');
    expect(e.livro).toEqual(['Livro A']);
  });

  it('chamadas repetidas produzem resultados equivalentes', () => {
    const e1 = makeEvento({ id: 'E-1', data: '1300', livro: ['L'], ordemNarrativa: 2, filePath: '05_Eventos/E-1.md' });
    const e2 = makeEvento({ id: 'E-2', data: '1200', livro: ['L'], ordemNarrativa: 1, filePath: '05_Eventos/E-2.md' });
    const index = makeIndex([e1, e2]);
    const r1 = construirCronologiaDupla(index);
    const r2 = construirCronologiaDupla(index);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});
