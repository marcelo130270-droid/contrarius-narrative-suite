// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

// ─── Types ────────────────────────────────────────────────────────────────────

export type EtapaStatusPainelScrivener =
  | 'sem_manifesto'
  | 'exportado'
  | 'comparado'
  | 'plano_gerado'
  | 'previa_aplicacao'
  | 'aplicado'
  | 'aplicacao_bloqueada'
  | 'aplicacao_erro'
  | 'auditado_aplicacao'
  | 'previa_restauracao'
  | 'restaurado'
  | 'restauracao_bloqueada'
  | 'restauracao_erro'
  | 'auditado_restauracao';

export type NivelStatusPainelScrivener = 'info' | 'ok' | 'aviso' | 'erro';

export interface ArquivoStatusPainelScrivener {
  readonly caminhoRelativo: string;
}

export interface PacoteEntradaStatusScrivener {
  readonly nomePasta: string;
  readonly arquivos: readonly ArquivoStatusPainelScrivener[];
  readonly manifestoJson: string;
}

export interface DadosStatusPainelScrivener {
  readonly totalPacotesNaPasta: number;
  readonly pacoteMaisRecente: PacoteEntradaStatusScrivener | null;
}

export interface ManifestoStatusScrivener {
  readonly valido: boolean;
  readonly titulo: string;
  readonly filtroLivro: string;
  readonly geradoEm: string;
  readonly totalArquivos: number;
  readonly totalProblemas: number;
}

export interface PacoteStatusScrivener {
  readonly nomePasta: string;
  readonly etapaMaisAvancada: EtapaStatusPainelScrivener;
  readonly rotuloEtapa: string;
  readonly nivelEtapa: NivelStatusPainelScrivener;
  readonly manifesto: ManifestoStatusScrivener;
  readonly temBackupAplicacao: boolean;
  readonly totalBackupsAplicacao: number;
  readonly temBackupRestauracao: boolean;
  readonly totalBackupsRestauracao: number;
}

export interface ResultadoStatusPainelScrivener {
  readonly semPacotes: boolean;
  readonly totalPacotes: number;
  readonly pacoteMaisRecente: PacoteStatusScrivener | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDEM_ETAPA: Record<EtapaStatusPainelScrivener, number> = {
  sem_manifesto: 0,
  exportado: 1,
  comparado: 2,
  plano_gerado: 3,
  previa_aplicacao: 4,
  aplicacao_bloqueada: 5,
  aplicacao_erro: 5,
  aplicado: 6,
  auditado_aplicacao: 7,
  previa_restauracao: 8,
  restauracao_bloqueada: 9,
  restauracao_erro: 9,
  restaurado: 10,
  auditado_restauracao: 11,
};

const ROTULO_ETAPA: Record<EtapaStatusPainelScrivener, string> = {
  sem_manifesto: 'Sem manifesto',
  exportado: 'Exportado',
  comparado: 'Comparado',
  plano_gerado: 'Plano gerado',
  previa_aplicacao: 'Prévia de aplicação gerada',
  aplicado: 'Aplicado',
  aplicacao_bloqueada: 'Aplicação bloqueada',
  aplicacao_erro: 'Aplicação com erro',
  auditado_aplicacao: 'Auditado (aplicação)',
  previa_restauracao: 'Prévia de restauração gerada',
  restaurado: 'Restaurado',
  restauracao_bloqueada: 'Restauração bloqueada',
  restauracao_erro: 'Restauração com erro',
  auditado_restauracao: 'Auditado (restauração)',
};

const NIVEL_ETAPA: Record<EtapaStatusPainelScrivener, NivelStatusPainelScrivener> = {
  sem_manifesto: 'aviso',
  exportado: 'info',
  comparado: 'info',
  plano_gerado: 'info',
  previa_aplicacao: 'info',
  aplicado: 'ok',
  aplicacao_bloqueada: 'aviso',
  aplicacao_erro: 'erro',
  auditado_aplicacao: 'ok',
  previa_restauracao: 'info',
  restaurado: 'ok',
  restauracao_bloqueada: 'aviso',
  restauracao_erro: 'erro',
  auditado_restauracao: 'ok',
};

const MANIFESTO_INVALIDO: ManifestoStatusScrivener = {
  valido: false,
  titulo: '',
  filtroLivro: '',
  geradoEm: '',
  totalArquivos: 0,
  totalProblemas: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normPath(s: string): string {
  return s.replace(/\\/g, '/');
}

function eArquivoOperacao(nomeBase: string, prefixo: string): boolean {
  if (nomeBase === `${prefixo}.md`) return true;
  if (nomeBase.startsWith(`${prefixo}-`) && nomeBase.endsWith('.md')) {
    const sufixo = nomeBase.slice(prefixo.length + 1, nomeBase.length - 3);
    return /^\d+$/.test(sufixo);
  }
  return false;
}

function temOperacaoNaRaiz(
  arquivos: readonly ArquivoStatusPainelScrivener[],
  prefixo: string,
): boolean {
  return arquivos.some((a) => {
    const rel = normPath(a.caminhoRelativo);
    return !rel.includes('/') && eArquivoOperacao(rel, prefixo);
  });
}

function contarArquivosEmSubpasta(
  arquivos: readonly ArquivoStatusPainelScrivener[],
  subpasta: string,
): number {
  const prefix = `${subpasta}/`;
  return arquivos.filter((a) => normPath(a.caminhoRelativo).startsWith(prefix)).length;
}

function parsearManifesto(json: string): ManifestoStatusScrivener {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ...MANIFESTO_INVALIDO };
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ...MANIFESTO_INVALIDO };
  }

  const obj = raw as Record<string, unknown>;
  if (obj['tipo'] !== 'contrarius-scrivener-export') {
    return { ...MANIFESTO_INVALIDO };
  }

  return {
    valido: true,
    titulo: typeof obj['titulo'] === 'string' ? obj['titulo'] : '',
    filtroLivro: typeof obj['filtroLivro'] === 'string' ? obj['filtroLivro'] : '',
    geradoEm: typeof obj['geradoEm'] === 'string' ? obj['geradoEm'] : '',
    totalArquivos: Array.isArray(obj['arquivos']) ? (obj['arquivos'] as unknown[]).length : 0,
    totalProblemas: Array.isArray(obj['problemas']) ? (obj['problemas'] as unknown[]).length : 0,
  };
}

function processarPacote(entrada: PacoteEntradaStatusScrivener): PacoteStatusScrivener {
  const temManifesto = entrada.arquivos.some(
    (a) => normPath(a.caminhoRelativo) === 'contrarius-manifest.json',
  );

  const manifesto = temManifesto ? parsearManifesto(entrada.manifestoJson) : { ...MANIFESTO_INVALIDO };

  const totalBackupsAplicacao = contarArquivosEmSubpasta(entrada.arquivos, 'BACKUP_ANTES_APLICACAO');
  const totalBackupsRestauracao = contarArquivosEmSubpasta(entrada.arquivos, 'BACKUP_ANTES_RESTAURACAO');

  const operacoes: EtapaStatusPainelScrivener[] = [];

  if (!temManifesto || !manifesto.valido) {
    operacoes.push('sem_manifesto');
  } else {
    operacoes.push('exportado');
    if (temOperacaoNaRaiz(entrada.arquivos, 'RELATORIO_COMPARACAO'))
      operacoes.push('comparado');
    if (temOperacaoNaRaiz(entrada.arquivos, 'PLANO_PRE_IMPORTACAO'))
      operacoes.push('plano_gerado');
    if (temOperacaoNaRaiz(entrada.arquivos, 'PREVIA_APLICACAO_SCRIVENER'))
      operacoes.push('previa_aplicacao');
    if (temOperacaoNaRaiz(entrada.arquivos, 'APLICACAO_SCRIVENER_BLOQUEADA'))
      operacoes.push('aplicacao_bloqueada');
    if (temOperacaoNaRaiz(entrada.arquivos, 'APLICACAO_SCRIVENER_ERRO'))
      operacoes.push('aplicacao_erro');
    if (temOperacaoNaRaiz(entrada.arquivos, 'APLICACAO_SCRIVENER'))
      operacoes.push('aplicado');
    if (temOperacaoNaRaiz(entrada.arquivos, 'AUDITORIA_APLICACAO_SCRIVENER'))
      operacoes.push('auditado_aplicacao');
    if (temOperacaoNaRaiz(entrada.arquivos, 'RELATORIO_PREVIA_RESTAURACAO_SCRIVENER'))
      operacoes.push('previa_restauracao');
    if (temOperacaoNaRaiz(entrada.arquivos, 'RESTAURACAO_SCRIVENER_BLOQUEADA'))
      operacoes.push('restauracao_bloqueada');
    if (temOperacaoNaRaiz(entrada.arquivos, 'RESTAURACAO_SCRIVENER_ERRO'))
      operacoes.push('restauracao_erro');
    if (temOperacaoNaRaiz(entrada.arquivos, 'RESTAURACAO_SCRIVENER'))
      operacoes.push('restaurado');
    if (temOperacaoNaRaiz(entrada.arquivos, 'AUDITORIA_RESTAURACAO_SCRIVENER'))
      operacoes.push('auditado_restauracao');
  }

  let etapaMaisAvancada: EtapaStatusPainelScrivener = operacoes[0] ?? 'sem_manifesto';
  for (const etapa of operacoes) {
    if (ORDEM_ETAPA[etapa] > ORDEM_ETAPA[etapaMaisAvancada]) {
      etapaMaisAvancada = etapa;
    }
  }

  return {
    nomePasta: entrada.nomePasta,
    etapaMaisAvancada,
    rotuloEtapa: ROTULO_ETAPA[etapaMaisAvancada],
    nivelEtapa: NIVEL_ETAPA[etapaMaisAvancada],
    manifesto,
    temBackupAplicacao: totalBackupsAplicacao > 0,
    totalBackupsAplicacao,
    temBackupRestauracao: totalBackupsRestauracao > 0,
    totalBackupsRestauracao,
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function gerarPainelStatusScrivener(
  dados: DadosStatusPainelScrivener,
): ResultadoStatusPainelScrivener {
  return {
    semPacotes: dados.totalPacotesNaPasta === 0,
    totalPacotes: dados.totalPacotesNaPasta,
    pacoteMaisRecente:
      dados.pacoteMaisRecente !== null ? processarPacote(dados.pacoteMaisRecente) : null,
  };
}
export const FRASE_PAINEL_STATUS_SCRIVENER_READ_ONLY = 'Nenhuma nota do Vault foi alterada por este painel.';