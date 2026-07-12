import { describe, it, expect } from 'vitest';
import {
  normalizarEstadoFiltrosPayloadScrivener,
  estadoFiltrosPayloadScrivenerEstaVazio,
  estadoFiltrosPayloadScrivenerParaFiltros,
  filtrosPayloadScrivenerParaEstado,
  FILTROS_PAYLOAD_SCRIVENER_VAZIOS,
  type EstadoFiltrosPayloadScrivener,
} from '../../src/contrarius/scrivener-payload-filter-settings-model';
import type { FiltrosPayloadScrivener } from '../../src/contrarius/scrivener-payload-filter-model';

describe('FILTROS_PAYLOAD_SCRIVENER_VAZIOS', () => {
  it('deve ter tipo/livro/periodo/textoBusca como strings vazias', () => {
    expect(FILTROS_PAYLOAD_SCRIVENER_VAZIOS).toEqual({ tipo: '', livro: '', periodo: '', textoBusca: '' });
  });
});

describe('normalizarEstadoFiltrosPayloadScrivener', () => {
  it('normaliza estado nulo para vazio', () => {
    expect(normalizarEstadoFiltrosPayloadScrivener(null)).toEqual({ tipo: '', livro: '', periodo: '', textoBusca: '' });
  });

  it('normaliza estado undefined para vazio', () => {
    expect(normalizarEstadoFiltrosPayloadScrivener(undefined)).toEqual({ tipo: '', livro: '', periodo: '', textoBusca: '' });
  });

  it('normaliza estado vazio', () => {
    expect(normalizarEstadoFiltrosPayloadScrivener({})).toEqual({ tipo: '', livro: '', periodo: '', textoBusca: '' });
  });

  it('trima strings', () => {
    const result = normalizarEstadoFiltrosPayloadScrivener({ tipo: 'consciencia', livro: '  Livro A  ', periodo: '  P1  ', textoBusca: '  texto  ' });
    expect(result.livro).toBe('Livro A');
    expect(result.periodo).toBe('P1');
    expect(result.textoBusca).toBe('texto');
  });

  it('descarta tipo inválido', () => {
    const result = normalizarEstadoFiltrosPayloadScrivener({ tipo: 'invalido' as EstadoFiltrosPayloadScrivener['tipo'] });
    expect(result.tipo).toBe('');
  });

  it('mantém tipo válido', () => {
    const tipos = ['consciencia', 'retrovida', 'evento', 'lugar', 'relacao', 'grupo', 'objeto', 'nota'] as const;
    for (const tipo of tipos) {
      expect(normalizarEstadoFiltrosPayloadScrivener({ tipo }).tipo).toBe(tipo);
    }
  });

  it('tipo vazio é válido', () => {
    expect(normalizarEstadoFiltrosPayloadScrivener({ tipo: '' }).tipo).toBe('');
  });
});

describe('estadoFiltrosPayloadScrivenerEstaVazio', () => {
  it('retorna true para null', () => {
    expect(estadoFiltrosPayloadScrivenerEstaVazio(null)).toBe(true);
  });

  it('retorna true para undefined', () => {
    expect(estadoFiltrosPayloadScrivenerEstaVazio(undefined)).toBe(true);
  });

  it('retorna true para estado com todos os campos vazios', () => {
    expect(estadoFiltrosPayloadScrivenerEstaVazio({ tipo: '', livro: '', periodo: '', textoBusca: '' })).toBe(true);
  });

  it('retorna false quando tipo está preenchido', () => {
    expect(estadoFiltrosPayloadScrivenerEstaVazio({ tipo: 'evento' })).toBe(false);
  });

  it('retorna false quando livro está preenchido', () => {
    expect(estadoFiltrosPayloadScrivenerEstaVazio({ livro: 'Livro A' })).toBe(false);
  });

  it('retorna false quando periodo está preenchido', () => {
    expect(estadoFiltrosPayloadScrivenerEstaVazio({ periodo: 'Era I' })).toBe(false);
  });

  it('retorna false quando textoBusca está preenchido', () => {
    expect(estadoFiltrosPayloadScrivenerEstaVazio({ textoBusca: 'busca' })).toBe(false);
  });
});

describe('estadoFiltrosPayloadScrivenerParaFiltros', () => {
  it('converte estado nulo para filtros vazios', () => {
    expect(estadoFiltrosPayloadScrivenerParaFiltros(null)).toEqual({});
  });

  it('converte estado undefined para filtros vazios', () => {
    expect(estadoFiltrosPayloadScrivenerParaFiltros(undefined)).toEqual({});
  });

  it('tipo vazio não gera tipos', () => {
    const filtros = estadoFiltrosPayloadScrivenerParaFiltros({ tipo: '' });
    expect(filtros.tipos).toBeUndefined();
  });

  it('livro vazio não gera livros', () => {
    const filtros = estadoFiltrosPayloadScrivenerParaFiltros({ livro: '' });
    expect(filtros.livros).toBeUndefined();
  });

  it('periodo vazio não gera periodos', () => {
    const filtros = estadoFiltrosPayloadScrivenerParaFiltros({ periodo: '' });
    expect(filtros.periodos).toBeUndefined();
  });

  it('textoBusca vazio não gera textoBusca', () => {
    const filtros = estadoFiltrosPayloadScrivenerParaFiltros({ textoBusca: '' });
    expect(filtros.textoBusca).toBeUndefined();
  });

  it('converte tipo válido', () => {
    const filtros = estadoFiltrosPayloadScrivenerParaFiltros({ tipo: 'lugar' });
    expect(filtros.tipos).toEqual(['lugar']);
  });

  it('converte livro preenchido', () => {
    const filtros = estadoFiltrosPayloadScrivenerParaFiltros({ livro: 'Livro A' });
    expect(filtros.livros).toEqual(['Livro A']);
  });

  it('converte periodo preenchido', () => {
    const filtros = estadoFiltrosPayloadScrivenerParaFiltros({ periodo: 'Era II' });
    expect(filtros.periodos).toEqual(['Era II']);
  });

  it('converte textoBusca preenchido', () => {
    const filtros = estadoFiltrosPayloadScrivenerParaFiltros({ textoBusca: 'personagem' });
    expect(filtros.textoBusca).toBe('personagem');
  });

  it('converte estado completo', () => {
    const filtros = estadoFiltrosPayloadScrivenerParaFiltros({ tipo: 'relacao', livro: 'Livro B', periodo: 'P2', textoBusca: 'xyz' });
    expect(filtros.tipos).toEqual(['relacao']);
    expect(filtros.livros).toEqual(['Livro B']);
    expect(filtros.periodos).toEqual(['P2']);
    expect(filtros.textoBusca).toBe('xyz');
  });
});

describe('filtrosPayloadScrivenerParaEstado', () => {
  it('converte null para estado vazio', () => {
    expect(filtrosPayloadScrivenerParaEstado(null)).toEqual({ tipo: '', livro: '', periodo: '', textoBusca: '' });
  });

  it('converte undefined para estado vazio', () => {
    expect(filtrosPayloadScrivenerParaEstado(undefined)).toEqual({ tipo: '', livro: '', periodo: '', textoBusca: '' });
  });

  it('converte filtros vazios para estado vazio', () => {
    expect(filtrosPayloadScrivenerParaEstado({})).toEqual({ tipo: '', livro: '', periodo: '', textoBusca: '' });
  });

  it('usa primeiro tipo válido', () => {
    const filtros: FiltrosPayloadScrivener = { tipos: ['nota', 'evento'] };
    expect(filtrosPayloadScrivenerParaEstado(filtros).tipo).toBe('nota');
  });

  it('usa primeiro livro válido', () => {
    const filtros: FiltrosPayloadScrivener = { livros: ['Livro A', 'Livro B'] };
    expect(filtrosPayloadScrivenerParaEstado(filtros).livro).toBe('Livro A');
  });

  it('usa primeiro periodo válido', () => {
    const filtros: FiltrosPayloadScrivener = { periodos: ['Era I', 'Era II'] };
    expect(filtrosPayloadScrivenerParaEstado(filtros).periodo).toBe('Era I');
  });

  it('converte textoBusca', () => {
    const filtros: FiltrosPayloadScrivener = { textoBusca: 'busca' };
    expect(filtrosPayloadScrivenerParaEstado(filtros).textoBusca).toBe('busca');
  });

  it('ignora tipo inválido em arrays', () => {
    const filtros: FiltrosPayloadScrivener = { tipos: ['invalido' as never] };
    expect(filtrosPayloadScrivenerParaEstado(filtros).tipo).toBe('');
  });

  it('converte filtros completos para estado', () => {
    const filtros: FiltrosPayloadScrivener = { tipos: ['grupo'], livros: ['Livro C'], periodos: ['P3'], textoBusca: 'abc' };
    expect(filtrosPayloadScrivenerParaEstado(filtros)).toEqual({ tipo: 'grupo', livro: 'Livro C', periodo: 'P3', textoBusca: 'abc' });
  });
});
