import type { Evento } from './types';
import { rotuloEntidade } from './agrupamento';

export type ModoOrdenacaoTimeline = 'cronologica' | 'narrativa';

export interface EventosOrdenadosTimeline {
  comData: Evento[];
  semData: Evento[];
  campoUsado: 'data_inicio' | 'ano_ordem';
}

// Único lugar que decide "como chamar um evento pra exibição" — Dashboard e exportação estruturada
// tinham cada um sua própria cópia quase igual (uma delas com fallback pior); consolidado aqui.
export function rotuloEvento(evento: Evento): string {
  return evento.titulo || evento.num_reg || rotuloEntidade(evento);
}

// Compartilhado entre o Dashboard (Etapa 10) e a exportação estruturada (Etapa 14) — mesma regra de
// ordenação nos dois lugares, sem duplicar.
export function ordenarEventosParaTimeline(eventos: readonly Evento[], modo: ModoOrdenacaoTimeline): EventosOrdenadosTimeline {
  const campoUsado = modo === 'cronologica' ? 'data_inicio' : 'ano_ordem';
  const comData = eventos.filter((e) => e[campoUsado]);
  // Eventos sem o campo de ordenação não têm posição definida — ficam ao final, mas pelo menos em
  // ordem alfabética de título, não na ordem arbitrária em que o indexador os processou.
  const semData = [...eventos.filter((e) => !e[campoUsado])].sort((a, b) => rotuloEvento(a).localeCompare(rotuloEvento(b)));

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

export interface RenumeracaoOrdemNarrativa {
  path: string;
  anoOrdemAntigo: string | undefined;
  anoOrdemNovo: string;
}

// `ano_ordem` é a posição da cena no manuscrito — um número de sequência puro (1, 2, 3...), sem
// relação com nenhum ano de calendário (nem o ano histórico do evento, nem um eventual ano de uma
// cena de "moldura" no presente). Isso existe pra permitir reordenar cenas mudando só esse campo,
// sem tocar em num_reg/título/nome do arquivo (que ficam fixos, porque outras notas referenciam por
// wikilink). Eventos sem `ano_ordem` preenchido ficam de fora — posição ainda não decidida.
export function calcularRenumeracaoOrdemNarrativa(eventos: readonly Evento[]): RenumeracaoOrdemNarrativa[] {
  const { comData } = ordenarEventosParaTimeline(eventos, 'narrativa');
  return comData.map((evento, indice) => ({
    path: evento.path,
    anoOrdemAntigo: evento.ano_ordem,
    anoOrdemNovo: String(indice + 1),
  }));
}
