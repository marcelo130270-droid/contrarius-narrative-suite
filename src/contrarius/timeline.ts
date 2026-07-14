import type { Evento } from './types';

export type ModoOrdenacaoTimeline = 'cronologica' | 'narrativa';

export interface EventosOrdenadosTimeline {
  comData: Evento[];
  semData: Evento[];
  campoUsado: 'data_inicio' | 'ano_ordem';
}

// Compartilhado entre o Dashboard (Etapa 10) e a exportação estruturada (Etapa 14) — mesma regra de
// ordenação nos dois lugares, sem duplicar.
export function ordenarEventosParaTimeline(eventos: readonly Evento[], modo: ModoOrdenacaoTimeline): EventosOrdenadosTimeline {
  const campoUsado = modo === 'cronologica' ? 'data_inicio' : 'ano_ordem';
  const comData = eventos.filter((e) => e[campoUsado]);
  const semData = eventos.filter((e) => !e[campoUsado]);

  const ordenados = [...comData].sort((a, b) => {
    const va = a[campoUsado] as string;
    const vb = b[campoUsado] as string;
    const na = Number(va);
    const nb = Number(vb);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return va.localeCompare(vb);
  });

  return { comData: ordenados, semData, campoUsado };
}
