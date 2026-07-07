// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

// ─── Types ────────────────────────────────────────────────────────────────────

export type EtapaScrivenerHistorico =
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

export interface ArquivoPacoteHistoricoScrivener {
  readonly caminhoRelativo: string;
}

export interface DadosPacoteHistoricoScrivener {
  readonly nomePasta: string;
  readonly arquivos: readonly ArquivoPacoteHistoricoScrivener[];
  readonly manifestoJson: string;
}

export interface DadosIndiceHistoricoScrivener {
  readonly pacotes: readonly DadosPacoteHistoricoScrivener[];
  readonly geradoEm: string;
}

export interface ResumoManifestoHistorico {
  readonly valido: boolean;
  readonly titulo: string;
  readonly filtroLivro: string;
  readonly geradoEm: string;
  readonly totalArquivos: number;
  readonly totalProblemas: number;
}

export interface PacoteHistoricoScrivener {
  readonly nomePasta: string;
  readonly temManifesto: boolean;
  readonly manifesto: ResumoManifestoHistorico;
  readonly operacoesPresentes: readonly EtapaScrivenerHistorico[];
  readonly etapaMaisAvancada: EtapaScrivenerHistorico;
  readonly temBackupAplicacao: boolean;
  readonly totalBackupsAplicacao: number;
  readonly temBackupRestauracao: boolean;
  readonly totalBackupsRestauracao: number;
}

export interface ResultadoIndiceHistoricoScrivener {
  readonly totalPacotes: number;
  readonly pacotes: readonly PacoteHistoricoScrivener[];
  readonly relatorioMarkdown: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDEM_ETAPA: Record<EtapaScrivenerHistorico, number> = {
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

const ROTULO_ETAPA: Record<EtapaScrivenerHistorico, string> = {
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

const MANIFESTO_INVALIDO: ResumoManifestoHistorico = {
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
  arquivos: readonly ArquivoPacoteHistoricoScrivener[],
  prefixo: string,
): boolean {
  return arquivos.some((a) => {
    const rel = normPath(a.caminhoRelativo);
    return !rel.includes('/') && eArquivoOperacao(rel, prefixo);
  });
}

function contarArquivosEmSubpasta(
  arquivos: readonly ArquivoPacoteHistoricoScrivener[],
  subpasta: string,
): number {
  const prefix = `${subpasta}/`;
  return arquivos.filter((a) => normPath(a.caminhoRelativo).startsWith(prefix)).length;
}

function parsearManifesto(json: string): ResumoManifestoHistorico {
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

function processarPacote(dados: DadosPacoteHistoricoScrivener): PacoteHistoricoScrivener {
  const temManifesto = dados.arquivos.some(
    (a) => normPath(a.caminhoRelativo) === 'contrarius-manifest.json',
  );

  const manifesto = temManifesto
    ? parsearManifesto(dados.manifestoJson)
    : { ...MANIFESTO_INVALIDO };

  const totalBackupsAplicacao = contarArquivosEmSubpasta(
    dados.arquivos,
    'BACKUP_ANTES_APLICACAO',
  );
  const totalBackupsRestauracao = contarArquivosEmSubpasta(
    dados.arquivos,
    'BACKUP_ANTES_RESTAURACAO',
  );

  const operacoesPresentes: EtapaScrivenerHistorico[] = [];

  if (!temManifesto || !manifesto.valido) {
    operacoesPresentes.push('sem_manifesto');
  } else {
    operacoesPresentes.push('exportado');
    if (temOperacaoNaRaiz(dados.arquivos, 'RELATORIO_COMPARACAO'))
      operacoesPresentes.push('comparado');
    if (temOperacaoNaRaiz(dados.arquivos, 'PLANO_PRE_IMPORTACAO'))
      operacoesPresentes.push('plano_gerado');
    if (temOperacaoNaRaiz(dados.arquivos, 'PREVIA_APLICACAO_SCRIVENER'))
      operacoesPresentes.push('previa_aplicacao');
    if (temOperacaoNaRaiz(dados.arquivos, 'APLICACAO_SCRIVENER_BLOQUEADA'))
      operacoesPresentes.push('aplicacao_bloqueada');
    if (temOperacaoNaRaiz(dados.arquivos, 'APLICACAO_SCRIVENER_ERRO'))
      operacoesPresentes.push('aplicacao_erro');
    if (temOperacaoNaRaiz(dados.arquivos, 'APLICACAO_SCRIVENER'))
      operacoesPresentes.push('aplicado');
    if (temOperacaoNaRaiz(dados.arquivos, 'AUDITORIA_APLICACAO_SCRIVENER'))
      operacoesPresentes.push('auditado_aplicacao');
    if (temOperacaoNaRaiz(dados.arquivos, 'RELATORIO_PREVIA_RESTAURACAO_SCRIVENER'))
      operacoesPresentes.push('previa_restauracao');
    if (temOperacaoNaRaiz(dados.arquivos, 'RESTAURACAO_SCRIVENER_BLOQUEADA'))
      operacoesPresentes.push('restauracao_bloqueada');
    if (temOperacaoNaRaiz(dados.arquivos, 'RESTAURACAO_SCRIVENER_ERRO'))
      operacoesPresentes.push('restauracao_erro');
    if (temOperacaoNaRaiz(dados.arquivos, 'RESTAURACAO_SCRIVENER'))
      operacoesPresentes.push('restaurado');
    if (temOperacaoNaRaiz(dados.arquivos, 'AUDITORIA_RESTAURACAO_SCRIVENER'))
      operacoesPresentes.push('auditado_restauracao');
  }

  let etapaMaisAvancada: EtapaScrivenerHistorico = operacoesPresentes[0] ?? 'sem_manifesto';
  for (const etapa of operacoesPresentes) {
    if (ORDEM_ETAPA[etapa] > ORDEM_ETAPA[etapaMaisAvancada]) {
      etapaMaisAvancada = etapa;
    }
  }

  return {
    nomePasta: dados.nomePasta,
    temManifesto,
    manifesto,
    operacoesPresentes: [...operacoesPresentes],
    etapaMaisAvancada,
    temBackupAplicacao: totalBackupsAplicacao > 0,
    totalBackupsAplicacao,
    temBackupRestauracao: totalBackupsRestauracao > 0,
    totalBackupsRestauracao,
  };
}

function pluralArquivo(n: number): string {
  return n === 1 ? '1 arquivo' : `${n} arquivos`;
}

function gerarRelatorio(
  pacotes: readonly PacoteHistoricoScrivener[],
  geradoEm: string,
): string {
  const linhas: string[] = [];

  linhas.push('# Índice histórico de pacotes Scrivener');
  linhas.push('');
  linhas.push(`Gerado em: ${geradoEm}  `);
  linhas.push('Nenhum arquivo foi alterado.');
  linhas.push('');
  linhas.push('---');
  linhas.push('');

  if (pacotes.length === 0) {
    linhas.push('Nenhum pacote Scrivener encontrado em `12_Export/Scrivener/`.');
    return linhas.join('\n');
  }

  linhas.push(`## Pacotes (${pacotes.length})`);
  linhas.push('');

  for (const pacote of pacotes) {
    linhas.push(`### ${pacote.nomePasta}`);
    linhas.push('');

    if (!pacote.temManifesto || !pacote.manifesto.valido) {
      linhas.push('- **Manifesto**: Ausente ou inválido');
    } else {
      const m = pacote.manifesto;
      linhas.push(
        `- **Manifesto**: Válido — "${m.titulo}" — gerado em ${m.geradoEm} — ${pluralArquivo(m.totalArquivos)} — ${m.totalProblemas} problema(s)`,
      );
      if (m.filtroLivro !== '') {
        linhas.push(`- **Livro filtrado**: ${m.filtroLivro}`);
      }
    }

    linhas.push(
      `- **Backup antes da aplicação**: ${
        pacote.temBackupAplicacao
          ? `Sim (${pluralArquivo(pacote.totalBackupsAplicacao)})`
          : 'Não'
      }`,
    );
    linhas.push(
      `- **Backup antes da restauração**: ${
        pacote.temBackupRestauracao
          ? `Sim (${pluralArquivo(pacote.totalBackupsRestauracao)})`
          : 'Não'
      }`,
    );
    linhas.push(`- **Etapa mais avançada**: ${ROTULO_ETAPA[pacote.etapaMaisAvancada]}`);

    const rotulosOperacoes = pacote.operacoesPresentes.map((e) => ROTULO_ETAPA[e]).join(' · ');
    linhas.push(`- **Operações registradas**: ${rotulosOperacoes}`);

    linhas.push('');
    linhas.push('---');
    linhas.push('');
  }

  return linhas.join('\n');
}

// ─── Main function ────────────────────────────────────────────────────────────

export function gerarIndiceHistoricoScrivener(
  dados: DadosIndiceHistoricoScrivener,
): ResultadoIndiceHistoricoScrivener {
  const pacotes = [...dados.pacotes]
    .sort((a, b) => b.nomePasta.localeCompare(a.nomePasta, 'pt-BR'))
    .map(processarPacote);

  return {
    totalPacotes: pacotes.length,
    pacotes,
    relatorioMarkdown: gerarRelatorio(pacotes, dados.geradoEm),
  };
}
export const FRASE_INDICE_HISTORICO_SCRIVENER_READ_ONLY = 'Nenhuma nota do Vault foi alterada por este índice.';