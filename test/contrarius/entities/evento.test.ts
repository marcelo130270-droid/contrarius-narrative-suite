import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizarEvento } from '../../../src/contrarius/entities/evento';
import { readFixtureFrontmatter } from '../test-helpers';

const fixturePath = resolve('test/contrarius/__fixtures__/evento-completo.md');
const fixture = readFixtureFrontmatter(fixturePath);

function make(overrides: Record<string, unknown> = {}, filePath = '05_Eventos/Subpasta/evento-completo.md') {
  return normalizarEvento({ ...fixture, ...overrides }, filePath);
}

describe('normalizarEvento — identificação', () => {
  it('define tipoEntidade como evento', () => {
    expect(make().tipoEntidade).toBe('evento');
  });

  it('usa o basename como id quando nenhum id explícito existe', () => {
    expect(make().id).toBe('evento-completo');
  });

  it('dá precedência a id_evento', () => {
    expect(make({ id_evento: 'E-1', codigo: 'E-2', id: 'E-3' }).id).toBe('E-1');
  });

  it('usa codigo quando id_evento está vazio', () => {
    expect(make({ id_evento: '', codigo: 'E-2', id: 'E-3' }).id).toBe('E-2');
  });

  it('usa id quando os aliases anteriores estão vazios', () => {
    expect(make({ id_evento: '', codigo: '', id: 'E-3' }).id).toBe('E-3');
  });

  it('aceita caminho Windows', () => {
    expect(normalizarEvento({ titulo: 'x' }, '05_Eventos\\Sub\\E-9.md').id).toBe('E-9');
  });

  it('aceita caminho sem extensão', () => {
    expect(normalizarEvento({ titulo: 'x' }, '05_Eventos/E-10').id).toBe('E-10');
  });

  it('emite aviso quando id e basename estão ausentes', () => {
    expect(normalizarEvento({ titulo: 'x' }, '').avisos.join(' ')).toContain('id');
  });
});

describe('normalizarEvento — campos cronológicos e descritivos', () => {
  it('normaliza a fixture completa', () => {
    const result = make();
    expect(result.titulo).toBe('Encontro no porto antigo');
    expect(result.anoOrdem).toBe(-312);
    expect(result.dataInicio).toBe('-0312-03-10');
    expect(result.dataFim).toBe('-0312-03-11');
    expect(result.dataTextual).toBe('início da primavera');
    expect(result.dataAproximada).toBe(true);
    expect(result.periodo).toEqual(['Antiguidade']);
    expect(result.natureza).toBe('político');
    expect(result.status).toBe('planejado');
  });

  it('normaliza e apara titulo', () => {
    expect(normalizarEvento({ titulo: '  Título  ' }, '05_Eventos/E.md').titulo).toBe('Título');
  });

  it('avisa quando titulo está ausente', () => {
    expect(normalizarEvento({}, '05_Eventos/E.md').avisos.join(' ')).toContain('titulo');
  });

  it('mapeia ano_ordem e preserva números negativos', () => {
    expect(normalizarEvento({ titulo: 'x', ano_ordem: -44 }, '05_Eventos/E.md').anoOrdem).toBe(-44);
  });

  it('aceita anoOrdem como alias', () => {
    expect(normalizarEvento({ titulo: 'x', anoOrdem: '-43' }, '05_Eventos/E.md').anoOrdem).toBe(-43);
  });

  it('retorna null para ano inválido', () => {
    expect(normalizarEvento({ titulo: 'x', ano_ordem: 'desconhecido' }, '05_Eventos/E.md').anoOrdem).toBeNull();
  });

  it('preserva data como string sem interpretação calendárica', () => {
    expect(normalizarEvento({ titulo: 'x', data: 'c. 1212' }, '05_Eventos/E.md').data).toBe('c. 1212');
  });

  it('mapeia aliases snake_case das datas', () => {
    const result = normalizarEvento({
      titulo: 'x', data_inicio: 'a', data_fim: 'b', data_textual: 'c', data_aproximada: true,
    }, '05_Eventos/E.md');
    expect([result.dataInicio, result.dataFim, result.dataTextual, result.dataAproximada]).toEqual(['a', 'b', 'c', true]);
  });

  it('mapeia aliases camelCase das datas', () => {
    const result = normalizarEvento({
      titulo: 'x', dataInicio: 'a', dataFim: 'b', dataTextual: 'c', dataAproximada: 'sim',
    }, '05_Eventos/E.md');
    expect([result.dataInicio, result.dataFim, result.dataTextual, result.dataAproximada]).toEqual(['a', 'b', 'c', true]);
  });

  it('transforma periodo singular em lista', () => {
    expect(normalizarEvento({ titulo: 'x', periodo: 'Sec XIII' }, '05_Eventos/E.md').periodo).toEqual(['Sec XIII']);
  });

  it('normaliza natureza e status como strings', () => {
    const result = normalizarEvento({ titulo: 'x', natureza: 'militar', status: 'escrito' }, '05_Eventos/E.md');
    expect(result.natureza).toBe('militar');
    expect(result.status).toBe('escrito');
  });

  it('não exige data nem gera aviso por sua ausência', () => {
    const result = normalizarEvento({ titulo: 'x' }, '05_Eventos/E.md');
    expect(result.data).toBe('');
    expect(result.avisos.join(' ').toLowerCase()).not.toContain('data');
  });
});

describe('normalizarEvento — vínculos e listas', () => {
  it('normaliza local singular e remove link Obsidian', () => {
    expect(make().local).toEqual(['L-900_Porto_Antigo']);
  });

  it('normaliza lista de participantes e remove aliases de links', () => {
    expect(make().participantes).toEqual(['C-900', 'C-901']);
  });

  it('normaliza retrovidas', () => {
    expect(make().retrovidas).toEqual(['C-900_V01_Pessoa_Ficticia']);
  });

  it('normaliza grupocarma', () => {
    expect(make().grupocarma).toEqual(['C-900']);
  });

  it('aceita grupo_karmico como alias legado', () => {
    const result = normalizarEvento({ titulo: 'x', grupo_karmico: '[[C-1]]' }, '05_Eventos/E.md');
    expect(result.grupocarma).toEqual(['C-1']);
  });

  it('dá precedência a grupocarma sobre grupo_karmico', () => {
    const result = normalizarEvento({ titulo: 'x', grupocarma: 'C-1', grupo_karmico: 'C-2' }, '05_Eventos/E.md');
    expect(result.grupocarma).toEqual(['C-1']);
  });

  it('mapeia nucleo_geo e aceita nucleoGeo', () => {
    expect(make().nucleoGeo).toEqual(['Mediterrâneo fictício']);
    expect(normalizarEvento({ titulo: 'x', nucleoGeo: 'Roma' }, '05_Eventos/E.md').nucleoGeo).toEqual(['Roma']);
  });

  it('mapeia mov_historico e aceita movHistorico', () => {
    expect(make().movHistorico).toEqual(['expansão marítima']);
    expect(normalizarEvento({ titulo: 'x', movHistorico: 'República' }, '05_Eventos/E.md').movHistorico).toEqual(['República']);
  });

  it('mapeia eventos_anteriores e remove links', () => {
    expect(make().eventosAnteriores).toEqual(['E-899_Preparativos']);
  });

  it('mapeia eventos_posteriores e remove links', () => {
    expect(make().eventosPosteriores).toEqual(['E-901_Desfecho']);
  });

  it('aceita aliases camelCase de eventos relacionados', () => {
    const result = normalizarEvento({ titulo: 'x', eventosAnteriores: '[[E-1]]', eventosPosteriores: '[[E-2]]' }, '05_Eventos/E.md');
    expect(result.eventosAnteriores).toEqual(['E-1']);
    expect(result.eventosPosteriores).toEqual(['E-2']);
  });

  it('normaliza livro, fontes e tags', () => {
    const result = make();
    expect(result.livro).toEqual(['Livro de Teste']);
    expect(result.fontes).toEqual(['Fonte Fictícia']);
    expect(result.tags).toEqual(['evento-teste']);
  });

  it('normaliza holopensenes e religiao', () => {
    const result = make();
    expect(result.holopensenes).toEqual(['comercial']);
    expect(result.religiao).toEqual(['culto fictício']);
  });
});

describe('normalizarEvento — não destrutividade', () => {
  it('preserva campo desconhecido simples', () => {
    expect(make().camposDesconhecidos['campo_extra']).toBe('valor-extra');
  });

  it('preserva campo desconhecido aninhado', () => {
    expect(make().camposDesconhecidos['dados_aninhados']).toEqual({
      fonte: 'arquivo imaginário', referencias: ['Rolo A', 'Rolo B'],
    });
  });

  it('não inclui campos conhecidos em camposDesconhecidos', () => {
    const result = make();
    expect(result.camposDesconhecidos).not.toHaveProperty('titulo');
    expect(result.camposDesconhecidos).not.toHaveProperty('data_inicio');
  });

  it('preserva propriedades originais em frontmatterRaw', () => {
    expect(make().frontmatterRaw).toHaveProperty('ano_ordem', -312);
    expect(make().frontmatterRaw).toHaveProperty('campo_extra', 'valor-extra');
  });

  it('não modifica o objeto de entrada', () => {
    const source = { ...fixture, dados_aninhados: { valores: ['a', 'b'] } };
    const snapshot = JSON.stringify(source);
    normalizarEvento(source, '05_Eventos/E.md');
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it('frontmatterRaw usa cópia profunda', () => {
    const source = { ...fixture, dados_aninhados: { valores: ['a'] } };
    const result = normalizarEvento(source, '05_Eventos/E.md');
    const copied = result.frontmatterRaw['dados_aninhados'] as { valores: string[] };
    copied.valores.push('b');
    expect((source.dados_aninhados as { valores: string[] }).valores).toEqual(['a']);
  });

  it('camposDesconhecidos usa cópia profunda', () => {
    const source = { ...fixture, dados_aninhados: { valores: ['a'] } };
    const result = normalizarEvento(source, '05_Eventos/E.md');
    const copied = result.camposDesconhecidos['dados_aninhados'] as { valores: string[] };
    copied.valores.push('b');
    expect((source.dados_aninhados as { valores: string[] }).valores).toEqual(['a']);
  });

  it('produz padrões seguros para campos ausentes', () => {
    const result = normalizarEvento({}, '05_Eventos/E.md');
    expect(result.anoOrdem).toBeNull();
    expect(result.dataAproximada).toBe(false);
    expect(result.periodo).toEqual([]);
    expect(result.local).toEqual([]);
    expect(result.fontes).toEqual([]);
    expect(result.ordemNarrativa).toBeNull();
    expect(result.capitulo).toBe('');
    expect(result.cena).toBe('');
  });
});

describe('normalizarEvento — campos narrativos', () => {
  it('lê ordemNarrativa via alias ordem_narrativa', () => {
    expect(normalizarEvento({ titulo: 'x', ordem_narrativa: 3 }, '05_Eventos/E.md').ordemNarrativa).toBe(3);
  });

  it('lê ordemNarrativa via alias ordemNarrativa', () => {
    expect(normalizarEvento({ titulo: 'x', ordemNarrativa: '7' }, '05_Eventos/E.md').ordemNarrativa).toBe(7);
  });

  it('retorna null para ordemNarrativa inválida', () => {
    expect(normalizarEvento({ titulo: 'x', ordemNarrativa: 'abc' }, '05_Eventos/E.md').ordemNarrativa).toBeNull();
  });

  it('retorna null para ordemNarrativa ausente', () => {
    expect(normalizarEvento({ titulo: 'x' }, '05_Eventos/E.md').ordemNarrativa).toBeNull();
  });

  it('dá precedência a ordem_narrativa sobre ordemNarrativa', () => {
    expect(normalizarEvento({ titulo: 'x', ordem_narrativa: 1, ordemNarrativa: 2 }, '05_Eventos/E.md').ordemNarrativa).toBe(1);
  });

  it('lê capitulo via alias capitulo', () => {
    expect(normalizarEvento({ titulo: 'x', capitulo: 'Cap I' }, '05_Eventos/E.md').capitulo).toBe('Cap I');
  });

  it('lê capitulo via alias capítulo (com acento)', () => {
    expect(normalizarEvento({ titulo: 'x', 'capítulo': 'Prólogo' }, '05_Eventos/E.md').capitulo).toBe('Prólogo');
  });

  it('dá precedência a capitulo sobre capítulo', () => {
    expect(normalizarEvento({ titulo: 'x', capitulo: 'A', 'capítulo': 'B' }, '05_Eventos/E.md').capitulo).toBe('A');
  });

  it('retorna string vazia para capitulo ausente', () => {
    expect(normalizarEvento({ titulo: 'x' }, '05_Eventos/E.md').capitulo).toBe('');
  });

  it('lê cena', () => {
    expect(normalizarEvento({ titulo: 'x', cena: 'Cena 3' }, '05_Eventos/E.md').cena).toBe('Cena 3');
  });

  it('retorna string vazia para cena ausente', () => {
    expect(normalizarEvento({ titulo: 'x' }, '05_Eventos/E.md').cena).toBe('');
  });

  it('não emite aviso pela ausência de ordemNarrativa, capitulo ou cena', () => {
    const avisos = normalizarEvento({ titulo: 'x' }, '05_Eventos/E.md').avisos.join(' ').toLowerCase();
    expect(avisos).not.toContain('ordem');
    expect(avisos).not.toContain('capitulo');
    expect(avisos).not.toContain('cena');
  });

  it('não inclui ordem_narrativa, ordemNarrativa, capitulo, capítulo e cena em camposDesconhecidos', () => {
    const result = normalizarEvento({
      titulo: 'x',
      ordem_narrativa: 1,
      ordemNarrativa: 2,
      capitulo: 'A',
      'capítulo': 'B',
      cena: 'C',
    }, '05_Eventos/E.md');
    expect(result.camposDesconhecidos).not.toHaveProperty('ordem_narrativa');
    expect(result.camposDesconhecidos).not.toHaveProperty('ordemNarrativa');
    expect(result.camposDesconhecidos).not.toHaveProperty('capitulo');
    expect(result.camposDesconhecidos).not.toHaveProperty('capítulo');
    expect(result.camposDesconhecidos).not.toHaveProperty('cena');
  });

  it('preserva ordemNarrativa e capitulo em frontmatterRaw', () => {
    const result = normalizarEvento({ titulo: 'x', ordem_narrativa: 5, capitulo: 'C1', cena: 'S1' }, '05_Eventos/E.md');
    expect(result.frontmatterRaw).toHaveProperty('ordem_narrativa', 5);
    expect(result.frontmatterRaw).toHaveProperty('capitulo', 'C1');
    expect(result.frontmatterRaw).toHaveProperty('cena', 'S1');
  });

  it('não modifica o objeto de entrada ao adicionar campos narrativos', () => {
    const source = { titulo: 'x', ordemNarrativa: 1, capitulo: 'C', cena: 'S' };
    const snapshot = JSON.stringify(source);
    normalizarEvento(source, '05_Eventos/E.md');
    expect(JSON.stringify(source)).toBe(snapshot);
  });
});
