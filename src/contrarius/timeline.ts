import type { Evento } from './types';
import { rotuloEntidade } from './agrupamento';

export type ModoOrdenacaoTimeline = 'cronologica' | 'narrativa';

export interface EventosOrdenadosTimeline {
  comData: Evento[];
  semData: Evento[];
  campoUsado: 'ordem_cronologica' | 'ordem_narrativa';
}

// Único lugar que decide "como chamar um evento pra exibição" — Dashboard e exportação estruturada
// tinham cada um sua própria cópia quase igual (uma delas com fallback pior); consolidado aqui.
export function rotuloEvento(evento: Evento): string {
  return evento.titulo || evento.num_reg || rotuloEntidade(evento);
}

// Compartilhado entre o Dashboard (Etapa 10) e a exportação estruturada (Etapa 14) — mesma regra de
// ordenação nos dois lugares, sem duplicar. Os dois modos usam campos de sequência pura, decididos por
// curadoria manual (`ordem_cronologica`/`ordem_narrativa`) — nenhum dos dois deriva de `data_inicio`,
// que ficou só informativo (ver CLAUDE.md, decisão de 2026-08-03: `data_inicio` sozinho não desempatava
// eventos do mesmo dia nem posicionava eventos com data só de ano).
export function ordenarEventosParaTimeline(eventos: readonly Evento[], modo: ModoOrdenacaoTimeline): EventosOrdenadosTimeline {
  const campoUsado = modo === 'cronologica' ? 'ordem_cronologica' : 'ordem_narrativa';
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

export interface RenumeracaoOrdem {
  path: string;
  valorAntigo: string | undefined;
  valorNovo: string;
}

// Compartilhado entre os botões "Renumerar ordem narrativa" e "Renumerar ordem cronológica" — mesma
// mecânica pros dois eixos de ordenação (ver ordenarEventosParaTimeline). Cada campo (`ordem_narrativa`/
// `ordem_cronologica`) é um número de sequência puro (1, 2, 3...), sem relação com nenhum ano de
// calendário. Isso existe pra permitir reordenar eventos mudando só esse campo, sem tocar em
// num_reg/título/nome do arquivo (que ficam fixos, porque outras notas referenciam por wikilink).
// Eventos sem o campo do modo escolhido ficam de fora — posição ainda não decidida.
export function calcularRenumeracaoOrdem(eventos: readonly Evento[], modo: ModoOrdenacaoTimeline): RenumeracaoOrdem[] {
  const { comData, campoUsado } = ordenarEventosParaTimeline(eventos, modo);
  return comData.map((evento, indice) => ({
    path: evento.path,
    valorAntigo: evento[campoUsado],
    valorNovo: String(indice + 1),
  }));
}
