import { describe, it, expect } from 'vitest';
import { calcularRenumeracaoOrdemNarrativa, ordenarEventosParaTimeline } from '../../src/contrarius/timeline';
import type { Evento } from '../../src/contrarius/types';

function evento(parcial: Partial<Evento>): Evento {
  return { path: '05_Eventos/x.md', metadata: {}, ...parcial };
}

describe('ordenarEventosParaTimeline', () => {
  it('modo cronologica ordena por data_inicio (string ISO, ordenação lexicográfica correta)', () => {
    const eventos = [
      evento({ titulo: 'B', data_inicio: '1250-01-01' }),
      evento({ titulo: 'A', data_inicio: '1200-01-01' }),
    ];
    const { comData } = ordenarEventosParaTimeline(eventos, 'cronologica');
    expect(comData.map((e) => e.titulo)).toEqual(['A', 'B']);
  });

  it('modo narrativa ordena por ordem_narrativa numérico, não alfabético', () => {
    const eventos = [
      evento({ titulo: 'depois', ordem_narrativa: '10' }),
      evento({ titulo: 'antes', ordem_narrativa: '2' }),
    ];
    const { comData } = ordenarEventosParaTimeline(eventos, 'narrativa');
    // alfabético colocaria "10" antes de "2"; numérico deve inverter
    expect(comData.map((e) => e.titulo)).toEqual(['antes', 'depois']);
  });

  it('separa eventos sem o campo usado em semData, sem quebrar a ordenação dos demais', () => {
    const eventos = [
      evento({ titulo: 'com-data', data_inicio: '1200-01-01' }),
      evento({ titulo: 'sem-data' }),
    ];
    const { comData, semData } = ordenarEventosParaTimeline(eventos, 'cronologica');
    expect(comData.map((e) => e.titulo)).toEqual(['com-data']);
    expect(semData.map((e) => e.titulo)).toEqual(['sem-data']);
  });

  it('não quebra com lista vazia', () => {
    const { comData, semData } = ordenarEventosParaTimeline([], 'cronologica');
    expect(comData).toEqual([]);
    expect(semData).toEqual([]);
  });
});

describe('calcularRenumeracaoOrdemNarrativa', () => {
  it('atribui sequência limpa (1, 2, 3...) respeitando a ordem narrativa atual, mesmo com números "feios"', () => {
    const eventos = [
      evento({ path: '05_Eventos/E-002.md', ordem_narrativa: '2027' }),
      evento({ path: '05_Eventos/E-005.md', ordem_narrativa: '15' }),
      evento({ path: '05_Eventos/E-003.md', ordem_narrativa: '15.5' }),
    ];
    const resultado = calcularRenumeracaoOrdemNarrativa(eventos);
    // ordem por valor numérico atual: 15 (E-005) < 15.5 (E-003) < 2027 (E-002)
    expect(resultado.map((r) => r.path)).toEqual(['05_Eventos/E-005.md', '05_Eventos/E-003.md', '05_Eventos/E-002.md']);
    expect(resultado.map((r) => r.ordemNarrativaNova)).toEqual(['1', '2', '3']);
  });

  it('não inclui eventos sem ordem_narrativa preenchido — posição ainda não decidida', () => {
    const eventos = [
      evento({ path: '05_Eventos/E-001.md', ordem_narrativa: '1' }),
      evento({ path: '05_Eventos/E-002.md' }),
    ];
    const resultado = calcularRenumeracaoOrdemNarrativa(eventos);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].path).toBe('05_Eventos/E-001.md');
  });

  it('preserva o valor antigo no resultado, pra dar visibilidade da mudança', () => {
    const eventos = [evento({ path: '05_Eventos/E-001.md', ordem_narrativa: '2027' })];
    const resultado = calcularRenumeracaoOrdemNarrativa(eventos);
    expect(resultado[0].ordemNarrativaAntiga).toBe('2027');
    expect(resultado[0].ordemNarrativaNova).toBe('1');
  });

  it('não lança exceção com lista vazia', () => {
    expect(() => calcularRenumeracaoOrdemNarrativa([])).not.toThrow();
    expect(calcularRenumeracaoOrdemNarrativa([])).toEqual([]);
  });
});
