import type { FiltrosPayloadScrivener } from './scrivener-payload-filter-model';
import type { TipoItemPayloadScrivener } from './scrivener-package-payload-model';

export type TipoFiltroPayloadScrivenerPersistido =
  | ''
  | 'consciencia'
  | 'retrovida'
  | 'evento'
  | 'lugar'
  | 'relacao'
  | 'grupo'
  | 'objeto'
  | 'nota';

const TIPOS_VALIDOS: ReadonlySet<TipoFiltroPayloadScrivenerPersistido> = new Set([
  'consciencia', 'retrovida', 'evento', 'lugar', 'relacao', 'grupo', 'objeto', 'nota',
]);

export interface EstadoFiltrosPayloadScrivener {
  tipo?: TipoFiltroPayloadScrivenerPersistido;
  livro?: string;
  periodo?: string;
  textoBusca?: string;
}

export const FILTROS_PAYLOAD_SCRIVENER_VAZIOS: EstadoFiltrosPayloadScrivener = {
  tipo: '',
  livro: '',
  periodo: '',
  textoBusca: '',
};

export function normalizarEstadoFiltrosPayloadScrivener(
  input?: Partial<EstadoFiltrosPayloadScrivener> | null,
): EstadoFiltrosPayloadScrivener {
  if (!input) return { tipo: '', livro: '', periodo: '', textoBusca: '' };

  const tipoRaw = (input.tipo ?? '').trim();
  const tipo: TipoFiltroPayloadScrivenerPersistido = TIPOS_VALIDOS.has(tipoRaw as TipoFiltroPayloadScrivenerPersistido)
    ? (tipoRaw as TipoFiltroPayloadScrivenerPersistido)
    : '';

  return {
    tipo,
    livro: (input.livro ?? '').trim(),
    periodo: (input.periodo ?? '').trim(),
    textoBusca: (input.textoBusca ?? '').trim(),
  };
}

export function estadoFiltrosPayloadScrivenerEstaVazio(
  input?: Partial<EstadoFiltrosPayloadScrivener> | null,
): boolean {
  if (!input) return true;
  const n = normalizarEstadoFiltrosPayloadScrivener(input);
  return !n.tipo && !n.livro && !n.periodo && !n.textoBusca;
}

export function estadoFiltrosPayloadScrivenerParaFiltros(
  input?: Partial<EstadoFiltrosPayloadScrivener> | null,
): FiltrosPayloadScrivener {
  const n = normalizarEstadoFiltrosPayloadScrivener(input);
  const filtros: FiltrosPayloadScrivener = {};
  if (n.tipo) filtros.tipos = [n.tipo as TipoItemPayloadScrivener];
  if (n.livro) filtros.livros = [n.livro];
  if (n.periodo) filtros.periodos = [n.periodo];
  if (n.textoBusca) filtros.textoBusca = n.textoBusca;
  return filtros;
}

export function filtrosPayloadScrivenerParaEstado(
  input?: FiltrosPayloadScrivener | null,
): EstadoFiltrosPayloadScrivener {
  if (!input) return { tipo: '', livro: '', periodo: '', textoBusca: '' };

  const tipoRaw = input.tipos && input.tipos.length > 0 ? (input.tipos[0] as string).trim() : '';
  const tipo: TipoFiltroPayloadScrivenerPersistido = TIPOS_VALIDOS.has(tipoRaw as TipoFiltroPayloadScrivenerPersistido)
    ? (tipoRaw as TipoFiltroPayloadScrivenerPersistido)
    : '';

  const livro = input.livros && input.livros.length > 0 ? (input.livros[0] ?? '').trim() : '';
  const periodo = input.periodos && input.periodos.length > 0 ? (input.periodos[0] ?? '').trim() : '';
  const textoBusca = (input.textoBusca ?? '').trim();

  return { tipo, livro, periodo, textoBusca };
}
