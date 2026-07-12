import { describe, it, expect } from 'vitest';
import {
  filtrarItensPayloadScrivener,
  normalizarFiltrosPayloadScrivener,
  filtrosPayloadScrivenerEstaoAtivos,
} from '../../src/contrarius/scrivener-payload-filter-model';
import type { ItemPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';

function makeItem(overrides?: Partial<ItemPayloadScrivener>): ItemPayloadScrivener {
  return {
    id: 'id-1',
    tipo: 'consciencia',
    titulo: 'Titulo Padrao',
    ...overrides,
  };
}

describe('filtrarItensPayloadScrivener', () => {
  it('sem filtros retorna todos os itens', () => {
    const itens = [makeItem({ id: 'i1' }), makeItem({ id: 'i2' }), makeItem({ id: 'i3' })];
    const resultado = filtrarItensPayloadScrivener(itens);
    expect(resultado.itens).toHaveLength(3);
    expect(resultado.totalOriginal).toBe(3);
    expect(resultado.totalFiltrado).toBe(3);
    expect(resultado.totalRemovido).toBe(0);
    expect(resultado.filtrosAtivos).toEqual([]);
  });

  it('filtro por tipo retém apenas itens do tipo especificado', () => {
    const itens = [
      makeItem({ id: 'c1', tipo: 'consciencia' }),
      makeItem({ id: 'ev1', tipo: 'evento' }),
      makeItem({ id: 'l1', tipo: 'lugar' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { tipos: ['evento'] });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('ev1');
    expect(resultado.totalOriginal).toBe(3);
    expect(resultado.totalFiltrado).toBe(1);
    expect(resultado.totalRemovido).toBe(2);
    expect(resultado.filtrosAtivos).toContain('tipo:evento');
  });

  it('filtro por livro retém apenas itens do livro especificado', () => {
    const itens = [
      makeItem({ id: 'i1', livro: 'Livro 1' }),
      makeItem({ id: 'i2', livro: 'Livro 2' }),
      makeItem({ id: 'i3', livro: 'Livro 1' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { livros: ['Livro 1'] });
    expect(resultado.itens).toHaveLength(2);
    expect(resultado.itens.map(i => i.id)).toEqual(['i1', 'i3']);
    expect(resultado.filtrosAtivos).toContain('livro:Livro 1');
  });

  it('filtro por periodo retém apenas itens do período especificado', () => {
    const itens = [
      makeItem({ id: 'i1', periodo: 'Sec XIII' }),
      makeItem({ id: 'i2', periodo: 'Sec XIV' }),
      makeItem({ id: 'i3', periodo: 'Sec XIII' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { periodos: ['Sec XIII'] });
    expect(resultado.itens).toHaveLength(2);
    expect(resultado.itens.map(i => i.id)).toContain('i1');
    expect(resultado.itens.map(i => i.id)).toContain('i3');
    expect(resultado.filtrosAtivos).toContain('periodo:Sec XIII');
  });

  it('filtro por textoBusca em título', () => {
    const itens = [
      makeItem({ id: 'i1', titulo: 'Rogier van der Weyden' }),
      makeItem({ id: 'i2', titulo: 'Jan van Eyck' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { textoBusca: 'rogier' });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('i1');
    expect(resultado.filtrosAtivos).toContain('busca:rogier');
  });

  it('filtro por textoBusca em id', () => {
    const itens = [
      makeItem({ id: 'rogier-001', titulo: 'Titulo' }),
      makeItem({ id: 'jan-002', titulo: 'Outro' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { textoBusca: 'rogier' });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('rogier-001');
  });

  it('filtro por textoBusca em caminhoFonte', () => {
    const itens = [
      makeItem({ id: 'i1', titulo: 'A', caminhoFonte: '02_Consciencias/Rogier.md' }),
      makeItem({ id: 'i2', titulo: 'B', caminhoFonte: '02_Consciencias/Jan.md' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { textoBusca: 'Rogier' });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('i1');
  });

  it('filtro por textoBusca em tags', () => {
    const itens = [
      makeItem({ id: 'i1', titulo: 'A', tags: ['rogier', 'pintor'] }),
      makeItem({ id: 'i2', titulo: 'B', tags: ['jan', 'pintor'] }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { textoBusca: 'rogier' });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('i1');
  });

  it('textoBusca é case-insensitive', () => {
    const itens = [
      makeItem({ id: 'i1', titulo: 'ROGIER VAN DER WEYDEN' }),
      makeItem({ id: 'i2', titulo: 'jan van eyck' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { textoBusca: 'ROGIER' });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('i1');
  });

  it('incluirSemLivro true mantém itens sem livro quando livros está filtrando', () => {
    const itens = [
      makeItem({ id: 'i1', livro: 'Livro 1' }),
      makeItem({ id: 'i2', livro: 'Livro 2' }),
      makeItem({ id: 'i3' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { livros: ['Livro 1'], incluirSemLivro: true });
    expect(resultado.itens.map(i => i.id)).toContain('i1');
    expect(resultado.itens.map(i => i.id)).toContain('i3');
    expect(resultado.itens.map(i => i.id)).not.toContain('i2');
    expect(resultado.filtrosAtivos).toContain('incluirSemLivro');
  });

  it('incluirSemLivro false exclui itens sem livro quando livros está filtrando', () => {
    const itens = [
      makeItem({ id: 'i1', livro: 'Livro 1' }),
      makeItem({ id: 'i2' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { livros: ['Livro 1'], incluirSemLivro: false });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('i1');
  });

  it('incluirSemPeriodo true mantém itens sem período quando periodos está filtrando', () => {
    const itens = [
      makeItem({ id: 'i1', periodo: 'Sec XIII' }),
      makeItem({ id: 'i2', periodo: 'Sec XIV' }),
      makeItem({ id: 'i3' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { periodos: ['Sec XIII'], incluirSemPeriodo: true });
    expect(resultado.itens.map(i => i.id)).toContain('i1');
    expect(resultado.itens.map(i => i.id)).toContain('i3');
    expect(resultado.itens.map(i => i.id)).not.toContain('i2');
    expect(resultado.filtrosAtivos).toContain('incluirSemPeriodo');
  });

  it('incluirSemPeriodo false exclui itens sem periodo quando periodos está filtrando', () => {
    const itens = [
      makeItem({ id: 'i1', periodo: 'Sec XIII' }),
      makeItem({ id: 'i2' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { periodos: ['Sec XIII'], incluirSemPeriodo: false });
    expect(resultado.itens).toHaveLength(1);
    expect(resultado.itens[0].id).toBe('i1');
  });

  it('normalização de strings - trim em livros', () => {
    const itens = [makeItem({ id: 'i1', livro: 'Livro 1' })];
    const resultado = filtrarItensPayloadScrivener(itens, { livros: ['  Livro 1  '] });
    expect(resultado.itens).toHaveLength(1);
  });

  it('normalização de strings - trim em periodos', () => {
    const itens = [makeItem({ id: 'i1', periodo: 'Sec XIII' })];
    const resultado = filtrarItensPayloadScrivener(itens, { periodos: ['  Sec XIII  '] });
    expect(resultado.itens).toHaveLength(1);
  });

  it('filtrosAtivos contém chaves humanas corretas', () => {
    const resultado = filtrarItensPayloadScrivener([], {
      tipos: ['evento'],
      livros: ['Livro 1'],
      periodos: ['Sec XIII'],
      textoBusca: 'rogier',
    });
    expect(resultado.filtrosAtivos).toContain('tipo:evento');
    expect(resultado.filtrosAtivos).toContain('livro:Livro 1');
    expect(resultado.filtrosAtivos).toContain('periodo:Sec XIII');
    expect(resultado.filtrosAtivos).toContain('busca:rogier');
  });

  it('preserva ordenação de entrada', () => {
    const itens = [
      makeItem({ id: 'i3', tipo: 'evento' }),
      makeItem({ id: 'i1', tipo: 'evento' }),
      makeItem({ id: 'i2', tipo: 'evento' }),
    ];
    const resultado = filtrarItensPayloadScrivener(itens, { tipos: ['evento'] });
    expect(resultado.itens.map(i => i.id)).toEqual(['i3', 'i1', 'i2']);
  });

  it('lista vazia retorna contagens zeradas', () => {
    const resultado = filtrarItensPayloadScrivener([], { tipos: ['evento'] });
    expect(resultado.totalOriginal).toBe(0);
    expect(resultado.totalFiltrado).toBe(0);
    expect(resultado.totalRemovido).toBe(0);
  });
});

describe('normalizarFiltrosPayloadScrivener', () => {
  it('retorna objeto vazio para undefined', () => {
    expect(normalizarFiltrosPayloadScrivener()).toEqual({});
  });

  it('retorna objeto vazio para objeto vazio', () => {
    expect(normalizarFiltrosPayloadScrivener({})).toEqual({});
  });

  it('remove duplicados de tipos', () => {
    const f = normalizarFiltrosPayloadScrivener({ tipos: ['consciencia', 'consciencia', 'evento'] });
    expect(f.tipos).toHaveLength(2);
    expect(f.tipos).toContain('consciencia');
    expect(f.tipos).toContain('evento');
  });

  it('remove duplicados de livros', () => {
    const f = normalizarFiltrosPayloadScrivener({ livros: ['Livro 1', 'Livro 1', 'Livro 2'] });
    expect(f.livros).toHaveLength(2);
  });

  it('remove duplicados de periodos', () => {
    const f = normalizarFiltrosPayloadScrivener({ periodos: ['Sec XIII', 'Sec XIII', 'Sec XIV'] });
    expect(f.periodos).toHaveLength(2);
  });

  it('aplica trim em textoBusca', () => {
    const f = normalizarFiltrosPayloadScrivener({ textoBusca: '  rogier  ' });
    expect(f.textoBusca).toBe('rogier');
  });

  it('ignora textoBusca vazio após trim', () => {
    const f = normalizarFiltrosPayloadScrivener({ textoBusca: '   ' });
    expect(f.textoBusca).toBeUndefined();
  });

  it('preserva incluirSemLivro false', () => {
    const f = normalizarFiltrosPayloadScrivener({ incluirSemLivro: false });
    expect(f.incluirSemLivro).toBe(false);
  });

  it('preserva incluirSemPeriodo true', () => {
    const f = normalizarFiltrosPayloadScrivener({ incluirSemPeriodo: true });
    expect(f.incluirSemPeriodo).toBe(true);
  });
});

describe('filtrosPayloadScrivenerEstaoAtivos', () => {
  it('retorna false sem filtros', () => {
    expect(filtrosPayloadScrivenerEstaoAtivos()).toBe(false);
  });

  it('retorna false para objeto vazio', () => {
    expect(filtrosPayloadScrivenerEstaoAtivos({})).toBe(false);
  });

  it('retorna true quando tipos está definido', () => {
    expect(filtrosPayloadScrivenerEstaoAtivos({ tipos: ['evento'] })).toBe(true);
  });

  it('retorna true quando livros está definido', () => {
    expect(filtrosPayloadScrivenerEstaoAtivos({ livros: ['Livro 1'] })).toBe(true);
  });

  it('retorna true quando periodos está definido', () => {
    expect(filtrosPayloadScrivenerEstaoAtivos({ periodos: ['Sec XIII'] })).toBe(true);
  });

  it('retorna true quando textoBusca está definido', () => {
    expect(filtrosPayloadScrivenerEstaoAtivos({ textoBusca: 'rogier' })).toBe(true);
  });

  it('retorna true quando incluirSemLivro é true', () => {
    expect(filtrosPayloadScrivenerEstaoAtivos({ incluirSemLivro: true })).toBe(true);
  });

  it('retorna false quando incluirSemLivro é false', () => {
    expect(filtrosPayloadScrivenerEstaoAtivos({ incluirSemLivro: false })).toBe(false);
  });

  it('retorna true quando incluirSemPeriodo é true', () => {
    expect(filtrosPayloadScrivenerEstaoAtivos({ incluirSemPeriodo: true })).toBe(true);
  });
});

describe('scrivener-payload-filter-model não depende de fs/path/obsidian', () => {
  it('módulo importa sem erros em ambiente de teste', async () => {
    const mod = await import('../../src/contrarius/scrivener-payload-filter-model');
    expect(typeof mod.filtrarItensPayloadScrivener).toBe('function');
    expect(typeof mod.normalizarFiltrosPayloadScrivener).toBe('function');
    expect(typeof mod.filtrosPayloadScrivenerEstaoAtivos).toBe('function');
  });
});
