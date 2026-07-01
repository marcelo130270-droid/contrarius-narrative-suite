import type { ContrariusEntityKey } from './entity-details-model';
import type { ContrariusTipoEntidade } from './types';

export interface ContrariusDetailNavigationState {
  readonly currentKey: ContrariusEntityKey | null;
  readonly history: readonly ContrariusEntityKey[];
}

function cloneKey(key: ContrariusEntityKey): ContrariusEntityKey {
  return { tipoEntidade: key.tipoEntidade, filePath: key.filePath };
}

export function criarEstadoNavegacaoDetalhe(): ContrariusDetailNavigationState {
  return { currentKey: null, history: [] };
}

export function abrirDetalheRaiz(key: ContrariusEntityKey): ContrariusDetailNavigationState {
  return { currentKey: cloneKey(key), history: [] };
}

export function navegarParaDetalhe(
  state: ContrariusDetailNavigationState,
  key: ContrariusEntityKey,
): ContrariusDetailNavigationState {
  const history: ContrariusEntityKey[] = [
    ...state.history.map(cloneKey),
    ...(state.currentKey !== null ? [cloneKey(state.currentKey)] : []),
  ];
  return { currentKey: cloneKey(key), history };
}

export function voltarDetalhe(
  state: ContrariusDetailNavigationState,
): ContrariusDetailNavigationState {
  if (state.history.length === 0) {
    return criarEstadoNavegacaoDetalhe();
  }
  const history = state.history.slice(0, -1).map(cloneKey);
  const currentKey = cloneKey(state.history[state.history.length - 1]);
  return { currentKey, history };
}

export function temFichaDetalhadaNestaFase(tipo: ContrariusTipoEntidade): boolean {
  return (
    tipo === 'consciencia'
    || tipo === 'retrovida'
    || tipo === 'evento'
    || tipo === 'lugar'
    || tipo === 'relacao'
  );
}

export function rotuloTipoEntidade(tipo: ContrariusTipoEntidade): string {
  switch (tipo) {
    case 'consciencia': return 'Consciência';
    case 'retrovida': return 'Retrovida';
    case 'evento': return 'Evento';
    case 'lugar': return 'Lugar';
    case 'relacao': return 'Relação';
  }
}
