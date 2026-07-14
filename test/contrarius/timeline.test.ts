import { describe, it, expect } from 'vitest';
import { ordenarEventosParaTimeline } from '../../src/contrarius/timeline';
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

  it('modo narrativa ordena por ano_ordem numérico, não alfabético', () => {
    const eventos = [
      evento({ titulo: 'depois', ano_ordem: '10' }),
      evento({ titulo: 'antes', ano_ordem: '2' }),
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
