import type { EstadoPacoteScrivener } from './scrivener-alerts-panel-model';

export type NivelResumoScrivener = 'empty' | 'ok' | 'warning' | 'error';

export interface ResumoEstadoScrivener {
  totalPacotes: number;
  pacotesValidos: number;
  pacotesInvalidos: number;
  pacotesComProblemas: number;
  pacotesComAplicacaoErro: number;
  pacotesComRestauracaoErro: number;
  pacotesComBloqueio: number;
  nivel: NivelResumoScrivener;
  mensagem: string;
}

export function resumirEstadoScrivener(
  pacotes: ReadonlyArray<EstadoPacoteScrivener> | undefined | null,
): ResumoEstadoScrivener {
  if (!Array.isArray(pacotes) || pacotes.length === 0) {
    return {
      totalPacotes: 0,
      pacotesValidos: 0,
      pacotesInvalidos: 0,
      pacotesComProblemas: 0,
      pacotesComAplicacaoErro: 0,
      pacotesComRestauracaoErro: 0,
      pacotesComBloqueio: 0,
      nivel: 'empty',
      mensagem: 'No persisted Scrivener package state yet.',
    };
  }

  const totalPacotes = pacotes.length;
  const pacotesValidos = pacotes.filter(p => p.manifesto?.valido === true).length;
  const pacotesInvalidos = pacotes.filter(p => p.manifesto?.valido === false).length;
  const pacotesComProblemas = pacotes.filter(p => p.manifesto?.comProblemas === true).length;
  const pacotesComAplicacaoErro = pacotes.filter(p => p.aplicacao?.status === 'erro').length;
  const pacotesComRestauracaoErro = pacotes.filter(p => p.restauracao?.status === 'erro').length;
  const pacotesComBloqueio = pacotes.filter(
    p => p.aplicacao?.status === 'bloqueada' || p.restauracao?.status === 'bloqueada',
  ).length;

  let nivel: NivelResumoScrivener;
  let mensagem: string;

  if (pacotesInvalidos > 0 || pacotesComAplicacaoErro > 0 || pacotesComRestauracaoErro > 0) {
    nivel = 'error';
    mensagem = 'Persisted Scrivener package state has errors or invalid manifests.';
  } else if (pacotesComProblemas > 0 || pacotesComBloqueio > 0) {
    nivel = 'warning';
    mensagem = 'Persisted Scrivener package state has warnings or blocked operations.';
  } else {
    nivel = 'ok';
    mensagem = 'Persisted Scrivener package state is clean.';
  }

  return {
    totalPacotes,
    pacotesValidos,
    pacotesInvalidos,
    pacotesComProblemas,
    pacotesComAplicacaoErro,
    pacotesComRestauracaoErro,
    pacotesComBloqueio,
    nivel,
    mensagem,
  };
}
