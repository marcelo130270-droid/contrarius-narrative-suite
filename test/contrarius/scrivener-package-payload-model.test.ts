import { describe, expect, it } from 'vitest';
import type { ItemPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';
import {
  criarPayloadScrivener,
  normalizarItemPayloadScrivener,
  ordenarItensPayloadScrivener,
} from '../../src/contrarius/scrivener-package-payload-model';

describe('scrivener-package-payload-model', () => {
  it('cria payload vazio com schema correto', () => {
    const payload = criarPayloadScrivener({
      manifestoId: 'manifesto-1',
      geradoEm: '2000-01-01T00:00:00.000Z',
    });

    expect(payload.schema).toBe('contrarius-scrivener-payload/v1');
    expect(payload.manifestoId).toBe('manifesto-1');
    expect(payload.geradoEm).toBe('2000-01-01T00:00:00.000Z');
    expect(payload.totalItens).toBe(0);
    expect(payload.itens).toEqual([]);
  });

  it('normaliza item válido com todos os campos opcionais', () => {
    const item = normalizarItemPayloadScrivener({
      id: 'item-1',
      tipo: 'evento',
      titulo: 'Evento Teste',
      livro: 'Livro 1',
      periodo: '2000-01',
      ordemNarrativa: 1,
      ordemCronologica: 2,
      texto: 'Texto do evento',
      caminhoFonte: '/caminho/fonte',
      tags: ['tag-a', 'tag-b'],
      metadata: { chave: 'valor' },
    });

    expect(item).not.toBeNull();
    expect(item?.id).toBe('item-1');
    expect(item?.tipo).toBe('evento');
    expect(item?.titulo).toBe('Evento Teste');
    expect(item?.livro).toBe('Livro 1');
    expect(item?.periodo).toBe('2000-01');
    expect(item?.ordemNarrativa).toBe(1);
    expect(item?.ordemCronologica).toBe(2);
    expect(item?.texto).toBe('Texto do evento');
    expect(item?.caminhoFonte).toBe('/caminho/fonte');
    expect(item?.tags).toEqual(['tag-a', 'tag-b']);
    expect(item?.metadata).toEqual({ chave: 'valor' });
  });

  it('descarta item sem id', () => {
    expect(normalizarItemPayloadScrivener({ tipo: 'evento', titulo: 'Titulo' })).toBeNull();
    expect(normalizarItemPayloadScrivener({ id: '', tipo: 'evento', titulo: 'Titulo' })).toBeNull();
    expect(normalizarItemPayloadScrivener({ id: '   ', tipo: 'evento', titulo: 'Titulo' })).toBeNull();
  });

  it('descarta item sem tipo ou com tipo inválido', () => {
    expect(normalizarItemPayloadScrivener({ id: 'x', titulo: 'Titulo' })).toBeNull();
    expect(normalizarItemPayloadScrivener({ id: 'x', tipo: 'invalido' as ItemPayloadScrivener['tipo'], titulo: 'Titulo' })).toBeNull();
  });

  it('descarta item sem titulo', () => {
    expect(normalizarItemPayloadScrivener({ id: 'x', tipo: 'evento' })).toBeNull();
    expect(normalizarItemPayloadScrivener({ id: 'x', tipo: 'evento', titulo: '' })).toBeNull();
    expect(normalizarItemPayloadScrivener({ id: 'x', tipo: 'evento', titulo: '   ' })).toBeNull();
  });

  it('trima strings nos campos do item', () => {
    const item = normalizarItemPayloadScrivener({
      id: '  item-1  ',
      tipo: 'lugar',
      titulo: '  Lugar Teste  ',
      livro: '  Livro 1  ',
      periodo: '  2000-01  ',
      texto: '  Texto  ',
      caminhoFonte: '  /caminho/fonte  ',
    });

    expect(item?.id).toBe('item-1');
    expect(item?.titulo).toBe('Lugar Teste');
    expect(item?.livro).toBe('Livro 1');
    expect(item?.periodo).toBe('2000-01');
    expect(item?.texto).toBe('Texto');
    expect(item?.caminhoFonte).toBe('/caminho/fonte');
  });

  it('trima tags e remove tags vazias', () => {
    const item = normalizarItemPayloadScrivener({
      id: 'item-1',
      tipo: 'nota',
      titulo: 'Nota',
      tags: ['  tag-a  ', '', '  tag-b  ', '   '],
    });

    expect(item?.tags).toEqual(['tag-a', 'tag-b']);
  });

  it('copia metadata superficialmente', () => {
    const metaOriginal = { chave: 'valor', nested: { deep: true } };
    const item = normalizarItemPayloadScrivener({
      id: 'item-1',
      tipo: 'objeto',
      titulo: 'Objeto',
      metadata: metaOriginal,
    });

    expect(item?.metadata).toEqual(metaOriginal);
    expect(item?.metadata).not.toBe(metaOriginal);
    expect(item?.metadata?.nested).toBe(metaOriginal.nested);
  });

  it('ordena por ordem narrativa crescente', () => {
    const itens: ItemPayloadScrivener[] = [
      { id: 'c', tipo: 'evento', titulo: 'C', ordemNarrativa: 3 },
      { id: 'a', tipo: 'evento', titulo: 'A', ordemNarrativa: 1 },
      { id: 'b', tipo: 'evento', titulo: 'B', ordemNarrativa: 2 },
    ];

    const ordenados = ordenarItensPayloadScrivener(itens);
    expect(ordenados.map(i => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('ordena por ordem cronológica como desempate após narrativa', () => {
    const itens: ItemPayloadScrivener[] = [
      { id: 'b', tipo: 'evento', titulo: 'B', ordemNarrativa: 1, ordemCronologica: 2 },
      { id: 'a', tipo: 'evento', titulo: 'A', ordemNarrativa: 1, ordemCronologica: 1 },
    ];

    const ordenados = ordenarItensPayloadScrivener(itens);
    expect(ordenados.map(i => i.id)).toEqual(['a', 'b']);
  });

  it('ordena por título como desempate após ordens', () => {
    const itens: ItemPayloadScrivener[] = [
      { id: 'b', tipo: 'evento', titulo: 'Zebra' },
      { id: 'a', tipo: 'evento', titulo: 'Alfa' },
    ];

    const ordenados = ordenarItensPayloadScrivener(itens);
    expect(ordenados.map(i => i.titulo)).toEqual(['Alfa', 'Zebra']);
  });

  it('ordena por id como último desempate', () => {
    const itens: ItemPayloadScrivener[] = [
      { id: 'z', tipo: 'evento', titulo: 'Mesmo' },
      { id: 'a', tipo: 'evento', titulo: 'Mesmo' },
    ];

    const ordenados = ordenarItensPayloadScrivener(itens);
    expect(ordenados.map(i => i.id)).toEqual(['a', 'z']);
  });

  it('itens sem ordemNarrativa ficam após os que têm', () => {
    const itens: ItemPayloadScrivener[] = [
      { id: 'sem', tipo: 'evento', titulo: 'Sem Ordem' },
      { id: 'com', tipo: 'evento', titulo: 'Com Ordem', ordemNarrativa: 1 },
    ];

    const ordenados = ordenarItensPayloadScrivener(itens);
    expect(ordenados[0].id).toBe('com');
    expect(ordenados[1].id).toBe('sem');
  });

  it('usa geradoEm determinístico quando fornecido como string', () => {
    const payload = criarPayloadScrivener({
      manifestoId: 'manifesto-1',
      geradoEm: '2000-01-01T00:00:00.000Z',
    });

    expect(payload.geradoEm).toBe('2000-01-01T00:00:00.000Z');
  });

  it('usa geradoEm determinístico quando fornecido como Date', () => {
    const payload = criarPayloadScrivener({
      manifestoId: 'manifesto-1',
      geradoEm: new Date('2000-01-01T00:00:00.000Z'),
    });

    expect(payload.geradoEm).toBe('2000-01-01T00:00:00.000Z');
  });

  it('descarta itens inválidos ao criar payload e contabiliza apenas os válidos', () => {
    const payload = criarPayloadScrivener({
      manifestoId: 'manifesto-1',
      geradoEm: '2000-01-01T00:00:00.000Z',
      itens: [
        { id: 'valido', tipo: 'evento', titulo: 'Válido' },
        { id: '', tipo: 'evento', titulo: 'Inválido sem id' },
        { tipo: 'evento', titulo: 'Inválido sem id' },
        { id: 'sem-titulo', tipo: 'evento' },
      ],
    });

    expect(payload.totalItens).toBe(1);
    expect(payload.itens).toHaveLength(1);
    expect(payload.itens[0].id).toBe('valido');
  });

  it('totalItens reflete o número de itens válidos', () => {
    const payload = criarPayloadScrivener({
      manifestoId: 'manifesto-1',
      geradoEm: '2000-01-01T00:00:00.000Z',
      itens: [
        { id: 'a', tipo: 'evento', titulo: 'A' },
        { id: 'b', tipo: 'lugar', titulo: 'B' },
        { id: 'c', tipo: 'consciencia', titulo: 'C' },
      ],
    });

    expect(payload.totalItens).toBe(3);
    expect(payload.itens).toHaveLength(3);
  });

  it('não exige fs, path ou obsidian', () => {
    const payload = criarPayloadScrivener({
      manifestoId: 'teste',
      geradoEm: '2000-01-01T00:00:00.000Z',
      itens: [{ id: 'x', tipo: 'nota', titulo: 'Nota' }],
    });

    expect(payload.schema).toBe('contrarius-scrivener-payload/v1');
    expect(payload.totalItens).toBe(1);
  });
});
