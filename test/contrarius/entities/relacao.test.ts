import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizarRelacao } from '../../../src/contrarius/entities/relacao';
import { readFixtureFrontmatter } from '../test-helpers';

const fixture = readFixtureFrontmatter(resolve('test/contrarius/__fixtures__/relacao-completa.md'));

function make(overrides: Record<string, unknown> = {}, filePath = '04_Relacoes/Sub/relacao-completa.md') {
  return normalizarRelacao({ ...fixture, ...overrides }, filePath);
}

describe('normalizarRelacao — identificação e participantes', () => {
  it('define tipoEntidade como relacao', () => {
    expect(make().tipoEntidade).toBe('relacao');
  });

  it('usa basename como id', () => {
    expect(make().id).toBe('relacao-completa');
  });

  it('dá precedência ao id explícito', () => {
    expect(make({ id: 'R-1' }).id).toBe('R-1');
  });

  it('aceita caminho Windows', () => {
    expect(normalizarRelacao({ a: 'C-1', b: 'C-2' }, '04_Relacoes\\R-2.md').id).toBe('R-2');
  });

  it('aceita caminho sem extensão', () => {
    expect(normalizarRelacao({ a: 'C-1', b: 'C-2' }, '04_Relacoes/R-3').id).toBe('R-3');
  });

  it('normaliza a e b removendo links', () => {
    const result = make();
    expect(result.consciencia1).toBe('C-900');
    expect(result.consciencia2).toBe('C-901');
  });

  it('dá precedência a a sobre consciencia_1', () => {
    const result = normalizarRelacao({ a: 'C-1', consciencia_1: 'C-2', b: 'C-3' }, '04_Relacoes/R.md');
    expect(result.consciencia1).toBe('C-1');
  });

  it('dá precedência a b sobre consciencia_2', () => {
    const result = normalizarRelacao({ a: 'C-1', b: 'C-3', consciencia_2: 'C-4' }, '04_Relacoes/R.md');
    expect(result.consciencia2).toBe('C-3');
  });

  it('aceita consciencia_1 e consciencia_2', () => {
    const result = normalizarRelacao({ consciencia_1: '[[C-2]]', consciencia_2: '[[C-4]]' }, '04_Relacoes/R.md');
    expect(result.consciencia1).toBe('C-2');
    expect(result.consciencia2).toBe('C-4');
  });

  it('aceita consciencia1 e consciencia2 em camelCase', () => {
    const result = normalizarRelacao({ consciencia1: 'C-5', consciencia2: 'C-6' }, '04_Relacoes/R.md');
    expect(result.consciencia1).toBe('C-5');
    expect(result.consciencia2).toBe('C-6');
  });

  it('emite três avisos quando id e consciências estão ausentes', () => {
    expect(normalizarRelacao({}, '').avisos).toHaveLength(3);
  });
});

describe('normalizarRelacao — campos da relação', () => {
  it('normaliza tipo_relacao como lista', () => {
    expect(make().tipoRelacao).toEqual(['aliança', 'contraponto']);
  });

  it('aceita tipoRelacao em camelCase', () => {
    expect(normalizarRelacao({ a: 'C-1', b: 'C-2', tipoRelacao: 'amizade' }, '04_Relacoes/R.md').tipoRelacao).toEqual(['amizade']);
  });

  it('normaliza intensidade como string', () => {
    expect(normalizarRelacao({ a: 'C-1', b: 'C-2', intensidade: 5 }, '04_Relacoes/R.md').intensidade).toBe('5');
  });

  it('normaliza início e fim como strings', () => {
    const result = normalizarRelacao({ a: 'C-1', b: 'C-2', inicio: -10, fim: -2 }, '04_Relacoes/R.md');
    expect(result.inicio).toBe('-10');
    expect(result.fim).toBe('-2');
  });

  it('normaliza livro como lista', () => {
    expect(make().livro).toEqual(['Livro de Teste']);
  });

  it('aceita livros como alias', () => {
    expect(normalizarRelacao({ a: 'C-1', b: 'C-2', livros: 'Livro 2' }, '04_Relacoes/R.md').livro).toEqual(['Livro 2']);
  });

  it('normaliza estado e tags', () => {
    const result = make();
    expect(result.estado).toBe('ativa');
    expect(result.tags).toEqual(['relacao-teste']);
  });

  it('produz padrões seguros para campos opcionais ausentes', () => {
    const result = normalizarRelacao({ a: 'C-1', b: 'C-2' }, '04_Relacoes/R.md');
    expect(result.tipoRelacao).toEqual([]);
    expect(result.intensidade).toBe('');
    expect(result.livro).toEqual([]);
    expect(result.tags).toEqual([]);
  });
});

describe('normalizarRelacao — não destrutividade', () => {
  it('preserva campo desconhecido simples', () => {
    expect(make().camposDesconhecidos['campo_extra']).toBe('preservado');
  });

  it('preserva campo desconhecido aninhado', () => {
    expect(make().camposDesconhecidos['dados_aninhados']).toEqual({ ciclos: ['primeiro', 'segundo'] });
  });

  it('não inclui campos conhecidos em camposDesconhecidos', () => {
    const result = make();
    expect(result.camposDesconhecidos).not.toHaveProperty('a');
    expect(result.camposDesconhecidos).not.toHaveProperty('tipo_relacao');
  });

  it('preserva propriedades originais em frontmatterRaw', () => {
    const result = make();
    expect(result.frontmatterRaw).toHaveProperty('a', '[[C-900]]');
    expect(result.frontmatterRaw).toHaveProperty('campo_extra', 'preservado');
  });

  it('não modifica o objeto de entrada', () => {
    const source = { ...fixture, dados_aninhados: { ciclos: ['a'] } };
    const snapshot = JSON.stringify(source);
    normalizarRelacao(source, '04_Relacoes/R.md');
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it('frontmatterRaw usa cópia profunda', () => {
    const source = { ...fixture, dados_aninhados: { ciclos: ['a'] } };
    const result = normalizarRelacao(source, '04_Relacoes/R.md');
    const copy = result.frontmatterRaw['dados_aninhados'] as { ciclos: string[] };
    copy.ciclos.push('b');
    expect((source.dados_aninhados as { ciclos: string[] }).ciclos).toEqual(['a']);
  });

  it('camposDesconhecidos usa cópia profunda', () => {
    const source = { ...fixture, dados_aninhados: { ciclos: ['a'] } };
    const result = normalizarRelacao(source, '04_Relacoes/R.md');
    const copy = result.camposDesconhecidos['dados_aninhados'] as { ciclos: string[] };
    copy.ciclos.push('b');
    expect((source.dados_aninhados as { ciclos: string[] }).ciclos).toEqual(['a']);
  });
});
