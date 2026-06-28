import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizarLugar } from '../../../src/contrarius/entities/lugar';
import { readFixtureFrontmatter } from '../test-helpers';

const fixture = readFixtureFrontmatter(resolve('test/contrarius/__fixtures__/lugar-completo.md'));

function make(overrides: Record<string, unknown> = {}, filePath = '06_Lugares/Regiao/lugar-completo.md') {
  return normalizarLugar({ ...fixture, ...overrides }, filePath);
}

describe('normalizarLugar — identificação e nomes', () => {
  it('define tipoEntidade como lugar', () => {
    expect(make().tipoEntidade).toBe('lugar');
  });

  it('usa basename como id', () => {
    expect(make().id).toBe('lugar-completo');
  });

  it('dá precedência a id_lugar', () => {
    expect(make({ id_lugar: 'L-1', codigo: 'L-2', id: 'L-3' }).id).toBe('L-1');
  });

  it('usa codigo quando id_lugar está vazio', () => {
    expect(make({ id_lugar: '', codigo: 'L-2', id: 'L-3' }).id).toBe('L-2');
  });

  it('usa id quando aliases anteriores estão vazios', () => {
    expect(make({ id_lugar: '', codigo: '', id: 'L-3' }).id).toBe('L-3');
  });

  it('aceita caminho Windows com extensão maiúscula', () => {
    expect(normalizarLugar({ nome_atual: 'X' }, '06_Lugares\\L-9.MD').id).toBe('L-9');
  });

  it('aceita caminho sem extensão', () => {
    expect(normalizarLugar({ nome_atual: 'X' }, '06_Lugares/L-10').id).toBe('L-10');
  });

  it('avisa quando id não pode ser obtido', () => {
    expect(normalizarLugar({ nome_atual: 'X' }, '').avisos.join(' ')).toContain('id');
  });

  it('dá precedência a nome_preferencial_saga', () => {
    expect(make({ nome_preferencial_saga: 'A', 'nome preferido': 'B', nome_preferido: 'C', nome_atual: 'D' }).nomePreferido).toBe('A');
  });

  it('aceita chave com espaço nome preferido', () => {
    expect(make({ nome_preferencial_saga: '', 'nome preferido': 'B', nome_preferido: 'C', nome_atual: 'D' }).nomePreferido).toBe('B');
  });

  it('aceita nome_preferido', () => {
    expect(make({ nome_preferencial_saga: '', 'nome preferido': '', nome_preferido: 'C', nome_atual: 'D' }).nomePreferido).toBe('C');
  });

  it('usa nome_atual como último fallback', () => {
    expect(make({ nome_preferencial_saga: '', 'nome preferido': '', nome_preferido: '', nome_atual: 'D' }).nomePreferido).toBe('D');
  });

  it('avisa quando nomePreferido está vazio', () => {
    expect(normalizarLugar({}, '06_Lugares/L.md').avisos.join(' ')).toContain('nomePreferido');
  });
});

describe('normalizarLugar — metadados geográficos', () => {
  it('normaliza a fixture completa', () => {
    const result = make();
    expect(result.nomePreferido).toBe('Porto de Néria');
    expect(result.nomeAtual).toBe('Baía de Néria');
    expect(result.aliases).toEqual(['Porto Velho']);
    expect(result.nomesVariantes).toEqual(['Neria']);
    expect(result.nomesHistoricos).toEqual(['Empório de Néria']);
    expect(result.categoriaLugar).toEqual(['porto', 'cidade']);
    expect(result.statusGeografico).toBe('existente');
    expect(result.coordenadas).toBe('35.1000, 18.2000');
    expect(result.coordenadasGoogleEarth).toBe('35.1000, 18.2000');
    expect(result.sistemaGeodesico).toBe('WGS84');
  });

  it('normaliza aliases como lista', () => {
    expect(normalizarLugar({ nome_atual: 'X', aliases: 'Antigo X' }, '06_Lugares/L.md').aliases).toEqual(['Antigo X']);
  });

  it('aceita aliases camelCase de nomes', () => {
    const result = normalizarLugar({ nome_atual: 'X', nomesVariantes: 'Y', nomesHistoricos: 'Z' }, '06_Lugares/L.md');
    expect(result.nomesVariantes).toEqual(['Y']);
    expect(result.nomesHistoricos).toEqual(['Z']);
  });

  it('aceita categoriaLugar e statusGeografico', () => {
    const result = normalizarLugar({ nome_atual: 'X', categoriaLugar: 'cidade', statusGeografico: 'extinto' }, '06_Lugares/L.md');
    expect(result.categoriaLugar).toEqual(['cidade']);
    expect(result.statusGeografico).toBe('extinto');
  });

  it('aceita coordenadasGoogleEarth e sistemaGeodesico', () => {
    const result = normalizarLugar({ nome_atual: 'X', coordenadasGoogleEarth: '1, 2', sistemaGeodesico: 'WGS84' }, '06_Lugares/L.md');
    expect(result.coordenadasGoogleEarth).toBe('1, 2');
    expect(result.sistemaGeodesico).toBe('WGS84');
  });

  it('mapeia nucleo_geo e aceita nucleoGeo', () => {
    expect(make().nucleoGeo).toEqual(['Mediterrâneo fictício']);
    expect(normalizarLugar({ nome_atual: 'X', nucleoGeo: 'Norte' }, '06_Lugares/L.md').nucleoGeo).toEqual(['Norte']);
  });

  it('mapeia divisão administrativa em snake_case', () => {
    const result = make();
    expect(result.localidadeAtual).toBe('Néria');
    expect(result.departamentoAtual).toBe('Costa Oriental');
    expect(result.regiaoAtual).toBe('Arquipélago Imaginário');
    expect(result.paisAtual).toBe('República Fictícia');
  });

  it('aceita divisão administrativa em camelCase', () => {
    const result = normalizarLugar({
      nome_atual: 'X', localidadeAtual: 'Local', departamentoAtual: 'Dep', regiaoAtual: 'Reg', paisAtual: 'País',
    }, '06_Lugares/L.md');
    expect([result.localidadeAtual, result.departamentoAtual, result.regiaoAtual, result.paisAtual]).toEqual(['Local', 'Dep', 'Reg', 'País']);
  });

  it('normaliza periodo', () => {
    expect(normalizarLugar({ nome_atual: 'X', periodo: 'Sec XIII' }, '06_Lugares/L.md').periodo).toEqual(['Sec XIII']);
  });

  it('normaliza livros e aceita livro singular', () => {
    expect(make().livros).toEqual(['Livro de Teste']);
    expect(normalizarLugar({ nome_atual: 'X', livro: 'Livro 1' }, '06_Lugares/L.md').livros).toEqual(['Livro 1']);
  });

  it('normaliza lugares relacionados e remove links', () => {
    expect(make().lugaresRelacionados).toEqual(['L-901_Farol_de_Neria']);
  });

  it('aceita lugaresRelacionados em camelCase', () => {
    expect(normalizarLugar({ nome_atual: 'X', lugaresRelacionados: '[[L-2]]' }, '06_Lugares/L.md').lugaresRelacionados).toEqual(['L-2']);
  });

  it('normaliza fontes e tags', () => {
    const result = make();
    expect(result.fontes).toEqual(['Atlas Imaginário']);
    expect(result.tags).toEqual(['lugar-teste']);
  });
});

describe('normalizarLugar — não destrutividade', () => {
  it('preserva campo desconhecido simples', () => {
    expect(make().camposDesconhecidos['campo_extra']).toBe('preservado');
  });

  it('preserva campo desconhecido aninhado', () => {
    expect(make().camposDesconhecidos['dados_aninhados']).toEqual({ rotas: ['norte', 'sul'] });
  });

  it('não inclui campos conhecidos em camposDesconhecidos', () => {
    const result = make();
    expect(result.camposDesconhecidos).not.toHaveProperty('nome_atual');
    expect(result.camposDesconhecidos).not.toHaveProperty('coordenadas_google_earth');
  });

  it('preserva frontmatter original em frontmatterRaw', () => {
    const result = make();
    expect(result.frontmatterRaw).toHaveProperty('nome_preferencial_saga', 'Porto de Néria');
    expect(result.frontmatterRaw).toHaveProperty('campo_extra', 'preservado');
  });

  it('não modifica o objeto de entrada', () => {
    const source = { ...fixture, dados_aninhados: { rotas: ['a'] } };
    const snapshot = JSON.stringify(source);
    normalizarLugar(source, '06_Lugares/L.md');
    expect(JSON.stringify(source)).toBe(snapshot);
  });

  it('frontmatterRaw usa cópia profunda', () => {
    const source = { ...fixture, dados_aninhados: { rotas: ['a'] } };
    const result = normalizarLugar(source, '06_Lugares/L.md');
    const copy = result.frontmatterRaw['dados_aninhados'] as { rotas: string[] };
    copy.rotas.push('b');
    expect((source.dados_aninhados as { rotas: string[] }).rotas).toEqual(['a']);
  });

  it('camposDesconhecidos usa cópia profunda', () => {
    const source = { ...fixture, dados_aninhados: { rotas: ['a'] } };
    const result = normalizarLugar(source, '06_Lugares/L.md');
    const copy = result.camposDesconhecidos['dados_aninhados'] as { rotas: string[] };
    copy.rotas.push('b');
    expect((source.dados_aninhados as { rotas: string[] }).rotas).toEqual(['a']);
  });

  it('produz padrões seguros para campos ausentes', () => {
    const result = normalizarLugar({}, '06_Lugares/L.md');
    expect(result.aliases).toEqual([]);
    expect(result.nomesHistoricos).toEqual([]);
    expect(result.coordenadas).toBe('');
    expect(result.livros).toEqual([]);
  });
});
