import type { EstadoPacoteScrivener } from './scrivener-alerts-panel-model';

export const LIMITE_PACOTES_SCRIVENER = 10;

export function normalizarPacotesScrivener(
  pacotes: ReadonlyArray<EstadoPacoteScrivener> | undefined | null,
  limite = LIMITE_PACOTES_SCRIVENER,
): EstadoPacoteScrivener[] {
  if (!Array.isArray(pacotes)) {
    return [];
  }

  const limiteSeguro = Number.isFinite(limite) && limite > 0 ? Math.floor(limite) : LIMITE_PACOTES_SCRIVENER;
  return pacotes.slice(-limiteSeguro).map(pacote => ({
    manifesto: pacote.manifesto
      ? {
          ...pacote.manifesto,
          ...(pacote.manifesto.avisos !== undefined ? { avisos: [...pacote.manifesto.avisos] } : {}),
          ...(pacote.manifesto.erros !== undefined ? { erros: [...pacote.manifesto.erros] } : {}),
        }
      : undefined,
    aplicacao: pacote.aplicacao ? { ...pacote.aplicacao } : undefined,
    restauracao: pacote.restauracao ? { ...pacote.restauracao } : undefined,
  }));
}

export function adicionarPacoteScrivener(
  pacotes: ReadonlyArray<EstadoPacoteScrivener> | undefined | null,
  pacote: EstadoPacoteScrivener,
  limite = LIMITE_PACOTES_SCRIVENER,
): EstadoPacoteScrivener[] {
  return normalizarPacotesScrivener([...(pacotes ?? []), pacote], limite);
}

export function limparPacotesScrivener(): EstadoPacoteScrivener[] {
  return [];
}

export function criarPacoteDiagnosticoScrivener(): EstadoPacoteScrivener {
  return {
    manifesto: { valido: true, comProblemas: true },
    aplicacao: { status: 'ok', auditada: false, precisaBackup: true, temBackup: false },
    restauracao: { status: 'bloqueada', auditada: true, precisaBackup: true, temBackup: true },
  };
}
