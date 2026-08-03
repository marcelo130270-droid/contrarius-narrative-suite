import { describe, it, expect } from 'vitest';
import { calcularRenumeracaoOrdem, ordenarEventosParaTimeline } from '../../src/contrarius/timeline';
import type { Evento } from '../../src/contrarius/types';

function evento(parcial: Partial<Evento>): Evento {
  return { path: '05_Eventos/x.md', metadata: {}, ...parcial };
}

describe('ordenarEventosParaTimeline', () => {
  it('modo cronologica ordena por ordem_cronologica numérico, não alfabético', () => {
    const eventos = [
      evento({ titulo: 'depois', ordem_cronologica: '10' }),
      evento({ titulo: 'antes', ordem_cronologica: '2' }),
    ];
    const { comData } = ordenarEventosParaTimeline(eventos, 'cronologica');
    // alfabético colocaria "10" antes de "2"; numérico deve inverter
    expect(comData.map((e) => e.titulo)).toEqual(['antes', 'depois']);
  });

  it('modo cronologica aceita decimais (ex. 2.1) pra encaixar um evento entre dois já numerados', () => {
    const eventos = [
      evento({ titulo: 'depois', ordem_cronologica: '3' }),
      evento({ titulo: 'meio', ordem_cronologica: '2.1' }),
      evento({ titulo: 'antes', ordem_cronologica: '2' }),
    ];
    const { comData } = ordenarEventosParaTimeline(eventos, 'cronologica');
    expect(comData.map((e) => e.titulo)).toEqual(['antes', 'meio', 'depois']);
  });

  it('modo narrativa ordena por ordem_narrativa numérico, não alfabético', () => {
    const eventos = [
      evento({ titulo: 'depois', ordem_narrativa: '10' }),
      evento({ titulo: 'antes', ordem_narrativa: '2' }),
    ];
    const { comData } = ordenarEventosParaTimeline(eventos, 'narrativa');
    expect(comData.map((e) => e.titulo)).toEqual(['antes', 'depois']);
  });

  it('separa eventos sem o campo usado em semData, sem quebrar a ordenação dos demais', () => {
    const eventos = [
      evento({ titulo: 'com-ordem', ordem_cronologica: '1' }),
      evento({ titulo: 'sem-ordem' }),
    ];
    const { comData, semData } = ordenarEventosParaTimeline(eventos, 'cronologica');
    expect(comData.map((e) => e.titulo)).toEqual(['com-ordem']);
    expect(semData.map((e) => e.titulo)).toEqual(['sem-ordem']);
  });

  it('não quebra com lista vazia', () => {
    const { comData, semData } = ordenarEventosParaTimeline([], 'cronologica');
    expect(comData).toEqual([]);
    expect(semData).toEqual([]);
  });
});

describe('calcularRenumeracaoOrdem', () => {
  it('modo narrativa: atribui sequência limpa (1, 2, 3...) respeitando a ordem atual, mesmo com números "feios"', () => {
    const eventos = [
      evento({ path: '05_Eventos/E-002.md', ordem_narrativa: '2027' }),
      evento({ path: '05_Eventos/E-005.md', ordem_narrativa: '15' }),
      evento({ path: '05_Eventos/E-003.md', ordem_narrativa: '15.5' }),
    ];
    const resultado = calcularRenumeracaoOrdem(eventos, 'narrativa');
    // ordem por valor numérico atual: 15 (E-005) < 15.5 (E-003) < 2027 (E-002)
    expect(resultado.map((r) => r.path)).toEqual(['05_Eventos/E-005.md', '05_Eventos/E-003.md', '05_Eventos/E-002.md']);
    expect(resultado.map((r) => r.valorNovo)).toEqual(['1', '2', '3']);
  });

  it('modo cronologica: mesma mecânica, usando ordem_cronologica em vez de ordem_narrativa', () => {
    const eventos = [
      evento({ path: '05_Eventos/E-002.md', ordem_cronologica: '2027' }),
      evento({ path: '05_Eventos/E-005.md', ordem_cronologica: '15' }),
    ];
    const resultado = calcularRenumeracaoOrdem(eventos, 'cronologica');
    expect(resultado.map((r) => r.path)).toEqual(['05_Eventos/E-005.md', '05_Eventos/E-002.md']);
    expect(resultado.map((r) => r.valorNovo)).toEqual(['1', '2']);
  });

  it('não inclui eventos sem o campo do modo escolhido — posição ainda não decidida', () => {
    const eventos = [
      evento({ path: '05_Eventos/E-001.md', ordem_narrativa: '1' }),
      evento({ path: '05_Eventos/E-002.md' }),
    ];
    const resultado = calcularRenumeracaoOrdem(eventos, 'narrativa');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].path).toBe('05_Eventos/E-001.md');
  });

  it('preserva o valor antigo no resultado, pra dar visibilidade da mudança', () => {
    const eventos = [evento({ path: '05_Eventos/E-001.md', ordem_narrativa: '2027' })];
    const resultado = calcularRenumeracaoOrdem(eventos, 'narrativa');
    expect(resultado[0].valorAntigo).toBe('2027');
    expect(resultado[0].valorNovo).toBe('1');
  });

  it('não lança exceção com lista vazia', () => {
    expect(() => calcularRenumeracaoOrdem([], 'narrativa')).not.toThrow();
    expect(calcularRenumeracaoOrdem([], 'narrativa')).toEqual([]);
  });
});
