import type { IndiceContrarius } from './indexer';
import type { Consciencia, Evento, Lugar, Retrovida } from './types';

export type EntidadeAgrupavel = Consciencia | Retrovida | Evento | Lugar;

export function agruparPorCampo<T>(
  itens: readonly T[],
  obterChaves: (item: T) => string | string[] | undefined,
): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const bruto = obterChaves(item);
    const chaves = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
    for (const chave of chaves) {
      const atual = mapa.get(chave);
      if (atual) atual.push(item);
      else mapa.set(chave, [item]);
    }
  }
  return mapa;
}

export interface CampoAgrupavel {
  chave: string;
  rotulo: string;
  extrair: (indice: IndiceContrarius) => Map<string, EntidadeAgrupavel[]>;
}

// Registro configurável de dimensões de agrupamento/cruzamento. Para adicionar uma nova dimensão
// (outro campo de Consciência/Retrovida/Evento/Lugar), basta acrescentar uma entrada aqui — nenhuma
// outra parte do código (indexador, UI) precisa mudar.
export const CAMPOS_AGRUPAVEIS: CampoAgrupavel[] = [
  {
    chave: 'livro',
    rotulo: 'Livro',
    extrair: (indice) => agruparPorCampo([...indice.retrovidas, ...indice.eventos], (item) => item.livro),
  },
  {
    chave: 'periodo',
    rotulo: 'Período',
    extrair: (indice) => agruparPorCampo([...indice.retrovidas, ...indice.eventos], (item) => item.periodo),
  },
  {
    chave: 'nucleoGeo',
    rotulo: 'Núcleo geográfico',
    extrair: (indice) =>
      agruparPorCampo([...indice.retrovidas, ...indice.eventos, ...indice.lugares], (item) => item.nucleo_geo),
  },
  {
    chave: 'grupocarma',
    rotulo: 'Grupo cármico',
    extrair: (indice) => agruparPorCampo([...indice.consciencias, ...indice.retrovidas], (item) => item.grupocarma),
  },
  {
    chave: 'identExtraf',
    rotulo: 'Identidade extrafísica',
    extrair: (indice) => agruparPorCampo(indice.consciencias, (item) => item.ident_extraf),
  },
  {
    chave: 'historicidade',
    rotulo: 'Historicidade',
    extrair: (indice) => agruparPorCampo([...indice.consciencias, ...indice.retrovidas], (item) => item.historicidade),
  },
];
