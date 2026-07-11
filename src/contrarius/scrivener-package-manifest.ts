import type { EstadoPacoteScrivener } from './scrivener-alerts-panel-model';

export type TipoPacoteScrivener = 'diagnostico' | 'exportacao' | 'aplicacao' | 'restauracao';

export interface EntradaManifestoScrivener {
  id?: string;
  criadoEm?: string;
  tipo?: TipoPacoteScrivener;
  origemVault?: string;
  caminhoPacote?: string;
  livro?: string;
  observacoes?: string;
}

export interface ManifestoScrivener {
  id: string;
  criadoEm: string;
  tipo: TipoPacoteScrivener;
  origemVault: string;
  caminhoPacote: string;
  livro?: string;
  observacoes?: string;
  avisos: string[];
  erros: string[];
}

export const MANIFESTO_ID_AUSENTE = 'MANIFESTO_ID_AUSENTE';
export const MANIFESTO_CRIADO_EM_AUSENTE = 'MANIFESTO_CRIADO_EM_AUSENTE';
export const MANIFESTO_CRIADO_EM_INVALIDO = 'MANIFESTO_CRIADO_EM_INVALIDO';
export const MANIFESTO_TIPO_AUSENTE = 'MANIFESTO_TIPO_AUSENTE';
export const MANIFESTO_TIPO_INVALIDO = 'MANIFESTO_TIPO_INVALIDO';
export const MANIFESTO_ORIGEM_VAULT_AUSENTE = 'MANIFESTO_ORIGEM_VAULT_AUSENTE';
export const MANIFESTO_CAMINHO_PACOTE_AUSENTE = 'MANIFESTO_CAMINHO_PACOTE_AUSENTE';

const TIPOS_VALIDOS: readonly string[] = ['diagnostico', 'exportacao', 'aplicacao', 'restauracao'];

export function validarManifestoScrivener(input: EntradaManifestoScrivener): ManifestoScrivener {
  const erros: string[] = [];
  const avisos: string[] = [];

  const idTrimmed = (input.id ?? '').trim();
  const id = idTrimmed || (erros.push(MANIFESTO_ID_AUSENTE), '');

  const criadoEmRaw = (input.criadoEm ?? '').trim();
  let criadoEm: string;
  if (!criadoEmRaw) {
    criadoEm = '';
    erros.push(MANIFESTO_CRIADO_EM_AUSENTE);
  } else if (isNaN(Date.parse(criadoEmRaw))) {
    criadoEm = criadoEmRaw;
    erros.push(MANIFESTO_CRIADO_EM_INVALIDO);
  } else {
    criadoEm = criadoEmRaw;
  }

  const tipoRaw = ((input.tipo as string | undefined) ?? '').trim();
  let tipo: TipoPacoteScrivener;
  if (!tipoRaw) {
    tipo = 'diagnostico';
    erros.push(MANIFESTO_TIPO_AUSENTE);
  } else if (!TIPOS_VALIDOS.includes(tipoRaw)) {
    tipo = 'diagnostico';
    erros.push(MANIFESTO_TIPO_INVALIDO);
  } else {
    tipo = tipoRaw as TipoPacoteScrivener;
  }

  const origemVaultTrimmed = (input.origemVault ?? '').trim();
  const origemVault = origemVaultTrimmed || (erros.push(MANIFESTO_ORIGEM_VAULT_AUSENTE), '');

  const caminhoPacoteTrimmed = (input.caminhoPacote ?? '').trim();
  const caminhoPacote = caminhoPacoteTrimmed || (erros.push(MANIFESTO_CAMINHO_PACOTE_AUSENTE), '');

  const livroTrimmed = (input.livro ?? '').trim();
  const livro = livroTrimmed || undefined;

  const observacoesTrimmed = (input.observacoes ?? '').trim();
  const observacoes = observacoesTrimmed || undefined;

  const manifesto: ManifestoScrivener = { id, criadoEm, tipo, origemVault, caminhoPacote, avisos, erros };

  if (livro !== undefined) manifesto.livro = livro;
  if (observacoes !== undefined) manifesto.observacoes = observacoes;

  return manifesto;
}

export function manifestoTemProblemas(manifesto: ManifestoScrivener): boolean {
  return manifesto.erros.length > 0 || manifesto.avisos.length > 0;
}

export function manifestoParaEstadoPacoteScrivener(manifesto: ManifestoScrivener): EstadoPacoteScrivener {
  return {
    manifesto: {
      valido: manifesto.erros.length === 0,
      comProblemas: manifestoTemProblemas(manifesto),
    },
  };
}

export function criarEntradaManifestoDiagnosticoScrivener(
  overrides?: Partial<EntradaManifestoScrivener>,
): EntradaManifestoScrivener {
  return {
    id: 'diagnostico-scrivener',
    criadoEm: '2000-01-01T00:00:00.000Z',
    tipo: 'diagnostico',
    origemVault: 'diagnostico',
    caminhoPacote: 'diagnostico.scrivener-package',
    observacoes: 'Pacote diagnostico Contrarius/Scrivener',
    ...overrides,
  };
}
