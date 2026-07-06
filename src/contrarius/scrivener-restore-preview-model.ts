// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackupPreviaRestauracaoScrivener {
  readonly filePathOriginal: string;
  readonly caminhoBackup: string;
  readonly conteudoBackup: string;
}

export interface NotaAtualPreviaRestauracaoScrivener {
  readonly filePath: string;
  readonly conteudoAtual: string;
}

export interface DadosPreviaRestauracaoScrivener {
  readonly manifestoJson: string;
  readonly backups: readonly BackupPreviaRestauracaoScrivener[];
  readonly notasAtuais: readonly NotaAtualPreviaRestauracaoScrivener[];
  readonly geradoEm: string;
}

export type TipoAcaoPreviaRestauracaoScrivener = 'restaurar_backup' | 'sem_acao' | 'bloqueado';

export interface ItemPreviaRestauracaoScrivener {
  readonly tipo: TipoAcaoPreviaRestauracaoScrivener;
  readonly codigo: string;
  readonly mensagem: string;
  readonly idEvento?: string;
  readonly filePathOriginal?: string;
  readonly caminhoBackup?: string;
  readonly conteudoAtual?: string;
  readonly conteudoBackup?: string;
}

export interface ResultadoPreviaRestauracaoScrivener {
  readonly podeRestaurarFuturamente: boolean;
  readonly itens: readonly ItemPreviaRestauracaoScrivener[];
  readonly restauracoes: readonly ItemPreviaRestauracaoScrivener[];
  readonly bloqueados: readonly ItemPreviaRestauracaoScrivener[];
  readonly semAcao: readonly ItemPreviaRestauracaoScrivener[];
  readonly relatorioMarkdown: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_ESPERADO = 'contrarius-scrivener-export';
const STRINGS_SUSPEITAS: readonly string[] = ['undefined', '[object Object]', 'NaN', 'Infinity'];
const MARCADORES_CONFLITO: readonly string[] = ['<<<<<<<', '=======', '>>>>>>>'];
const TAG_BLOCO = 'CONTRARIUS:SCRIVENER-SINOPSE';

// ─── Type guards ──────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isArray(v: unknown): v is readonly unknown[] {
  return Array.isArray(v);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectarSuspeito(s: string): string | null {
  for (const str of STRINGS_SUSPEITAS) {
    if (s.includes(str)) return str;
  }
  return null;
}

function temConflito(s: string): boolean {
  return MARCADORES_CONFLITO.some((m) => s.includes(m));
}

function temBlocoControlado(s: string): boolean {
  return s.includes(TAG_BLOCO);
}

// ─── Item builder ─────────────────────────────────────────────────────────────

type ItemOpts = {
  readonly idEvento?: string;
  readonly filePathOriginal?: string;
  readonly caminhoBackup?: string;
  readonly conteudoAtual?: string;
  readonly conteudoBackup?: string;
};

function mkItem(
  tipo: TipoAcaoPreviaRestauracaoScrivener,
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): ItemPreviaRestauracaoScrivener {
  const r: {
    tipo: TipoAcaoPreviaRestauracaoScrivener;
    codigo: string;
    mensagem: string;
    idEvento?: string;
    filePathOriginal?: string;
    caminhoBackup?: string;
    conteudoAtual?: string;
    conteudoBackup?: string;
  } = { tipo, codigo, mensagem };
  if (opts !== undefined) {
    if (opts.idEvento !== undefined) r.idEvento = opts.idEvento;
    if (opts.filePathOriginal !== undefined) r.filePathOriginal = opts.filePathOriginal;
    if (opts.caminhoBackup !== undefined) r.caminhoBackup = opts.caminhoBackup;
    if (opts.conteudoAtual !== undefined) r.conteudoAtual = opts.conteudoAtual;
    if (opts.conteudoBackup !== undefined) r.conteudoBackup = opts.conteudoBackup;
  }
  return r;
}

function mkBloqueado(
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): ItemPreviaRestauracaoScrivener {
  return mkItem('bloqueado', codigo, mensagem, opts);
}

function mkSemAcao(
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): ItemPreviaRestauracaoScrivener {
  return mkItem('sem_acao', codigo, mensagem, opts);
}

function mkRestaurar(
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): ItemPreviaRestauracaoScrivener {
  return mkItem('restaurar_backup', codigo, mensagem, opts);
}

// ─── Report ───────────────────────────────────────────────────────────────────

function formatarItemSimples(item: ItemPreviaRestauracaoScrivener): string {
  let s = `- **${item.codigo}**: ${item.mensagem}`;
  if (item.filePathOriginal !== undefined) s += ` Nota: ${item.filePathOriginal}.`;
  if (item.caminhoBackup !== undefined) s += ` Backup: \`${item.caminhoBackup}\`.`;
  return s;
}

function gerarRelatorio(
  geradoEm: string,
  restauracoes: readonly ItemPreviaRestauracaoScrivener[],
  bloqueados: readonly ItemPreviaRestauracaoScrivener[],
  semAcao: readonly ItemPreviaRestauracaoScrivener[],
): string {
  const l: string[] = [
    '# Prévia de restauração Scrivener',
    '',
    `Gerado em: ${geradoEm}`,
    '',
    'Nenhuma nota do Vault foi alterada por esta prévia.',
    '',
    'Esta prévia não restaura backups.',
    '',
    '## Resumo',
    '',
    `- Restaurações candidatas: ${restauracoes.length}`,
    `- Bloqueados: ${bloqueados.length}`,
    `- Sem ação: ${semAcao.length}`,
    '',
    '## Restaurações candidatas',
    '',
  ];

  if (restauracoes.length === 0) {
    l.push('Nenhuma.', '');
  } else {
    for (const item of restauracoes) {
      const heading = item.filePathOriginal ?? item.codigo;
      l.push(`### ${heading}`, '');
      if (item.idEvento !== undefined) l.push(`- ID: ${item.idEvento}`);
      if (item.filePathOriginal !== undefined) l.push(`- Nota: ${item.filePathOriginal}`);
      if (item.caminhoBackup !== undefined) l.push(`- Backup: \`${item.caminhoBackup}\``);
      l.push('');
    }
  }

  l.push('## Bloqueados', '');
  if (bloqueados.length === 0) {
    l.push('Nenhum.', '');
  } else {
    for (const item of bloqueados) l.push(formatarItemSimples(item));
    l.push('');
  }

  l.push('## Sem ação', '');
  if (semAcao.length === 0) {
    l.push('Nenhum.', '');
  } else {
    for (const item of semAcao) l.push(formatarItemSimples(item));
    l.push('');
  }

  const joined = l.join('\n');
  return joined.endsWith('\n') ? joined : `${joined}\n`;
}

// ─── Result builder ───────────────────────────────────────────────────────────

function buildResult(
  podeRestaurarFuturamente: boolean,
  itens: readonly ItemPreviaRestauracaoScrivener[],
  geradoEm: string,
): ResultadoPreviaRestauracaoScrivener {
  const restauracoes = itens.filter((i) => i.tipo === 'restaurar_backup');
  const bloqueados = itens.filter((i) => i.tipo === 'bloqueado');
  const semAcao = itens.filter((i) => i.tipo === 'sem_acao');
  return {
    podeRestaurarFuturamente,
    itens: [...itens],
    restauracoes,
    bloqueados,
    semAcao,
    relatorioMarkdown: gerarRelatorio(geradoEm, restauracoes, bloqueados, semAcao),
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function gerarPreviaRestauracaoScrivener(
  dados: DadosPreviaRestauracaoScrivener,
): ResultadoPreviaRestauracaoScrivener {
  const itens: ItemPreviaRestauracaoScrivener[] = [];

  // ── Parse manifest ──────────────────────────────────────────────────────────
  let manifestoRaw: unknown;
  try {
    manifestoRaw = JSON.parse(dados.manifestoJson);
  } catch {
    itens.push(mkBloqueado('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um JSON válido.'));
    return buildResult(false, itens, dados.geradoEm);
  }

  if (!isRecord(manifestoRaw)) {
    itens.push(mkBloqueado('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um objeto JSON.'));
    return buildResult(false, itens, dados.geradoEm);
  }

  if (manifestoRaw['tipo'] !== TIPO_ESPERADO) {
    itens.push(
      mkBloqueado('MANIFESTO_TIPO_INVALIDO', `Tipo do manifesto inválido: deve ser "${TIPO_ESPERADO}".`),
    );
    return buildResult(false, itens, dados.geradoEm);
  }

  const arquivosRaw = manifestoRaw['arquivos'];
  if (!isArray(arquivosRaw)) {
    itens.push(mkBloqueado('MANIFESTO_SEM_ARRAY_ARQUIVOS', 'O manifesto não contém um array "arquivos".'));
    return buildResult(false, itens, dados.geradoEm);
  }

  // ── Check suspicious strings in manifest ────────────────────────────────────
  const suspeitoManifesto = detectarSuspeito(dados.manifestoJson);
  if (suspeitoManifesto !== null) {
    itens.push(
      mkBloqueado('MANIFESTO_STRINGS_INVALIDAS', `O manifesto contém valor inválido: "${suspeitoManifesto}".`),
    );
    return buildResult(false, itens, dados.geradoEm);
  }

  // ── Build manifesto lookup: filePath → id ────────────────────────────────────
  const manifestoMap = new Map<string, string>();
  for (const entradaRaw of arquivosRaw) {
    if (!isRecord(entradaRaw)) continue;
    const fp = typeof entradaRaw['filePath'] === 'string' ? entradaRaw['filePath'].trim() : '';
    const id = typeof entradaRaw['id'] === 'string' ? entradaRaw['id'] : '';
    if (fp !== '') manifestoMap.set(fp, id);
  }

  // ── Build notas lookup ───────────────────────────────────────────────────────
  const notasMap = new Map<string, string>();
  for (const nota of dados.notasAtuais) {
    notasMap.set(nota.filePath, nota.conteudoAtual);
  }

  // Tracks all non-empty filePathOriginal seen in backups (even if blocked)
  const filePathsVistos = new Set<string>();

  // ── Process backups ──────────────────────────────────────────────────────────
  for (const backup of dados.backups) {
    const fp = backup.filePathOriginal;

    if (fp.trim() === '') {
      itens.push(
        mkBloqueado('BACKUP_SEM_FILEPATH', 'Backup sem caminho de nota original.', {
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    if (filePathsVistos.has(fp)) {
      itens.push(
        mkBloqueado('BACKUP_DUPLICADO', `Backup duplicado para a mesma nota: "${fp}".`, {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }
    filePathsVistos.add(fp);

    if (backup.conteudoBackup.trim() === '') {
      itens.push(
        mkBloqueado('BACKUP_VAZIO', 'Backup com conteúdo vazio.', {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    const suspeitoBackup = detectarSuspeito(backup.conteudoBackup);
    if (suspeitoBackup !== null) {
      itens.push(
        mkBloqueado('BACKUP_STRINGS_INVALIDAS', `Backup contém valor inválido: "${suspeitoBackup}".`, {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    if (temConflito(backup.conteudoBackup)) {
      itens.push(
        mkBloqueado('CONFLITO_GIT_BACKUP', 'Backup contém marcador de conflito Git.', {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    if (!manifestoMap.has(fp)) {
      itens.push(
        mkBloqueado('BACKUP_SEM_MANIFESTO', `Backup não corresponde a nenhum item do manifesto: "${fp}".`, {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    const idEvento = manifestoMap.get(fp) ?? '';
    const baseOpts: ItemOpts =
      idEvento !== ''
        ? { filePathOriginal: fp, caminhoBackup: backup.caminhoBackup, idEvento }
        : { filePathOriginal: fp, caminhoBackup: backup.caminhoBackup };

    const notaConteudo = notasMap.get(fp);
    if (notaConteudo === undefined) {
      itens.push(mkBloqueado('NOTA_AUSENTE', `Nota atual não encontrada: "${fp}".`, baseOpts));
      continue;
    }

    if (temConflito(notaConteudo)) {
      itens.push(mkBloqueado('CONFLITO_GIT_NOTA', 'Nota atual contém marcador de conflito Git.', baseOpts));
      continue;
    }

    if (backup.conteudoBackup === notaConteudo) {
      itens.push(mkSemAcao('BACKUP_IDENTICO', 'Backup idêntico à nota atual.', baseOpts));
      continue;
    }

    if (!temBlocoControlado(notaConteudo)) {
      itens.push(mkSemAcao('SEM_BLOCO_CONTROLADO', 'Nota atual não contém bloco controlado Scrivener.', baseOpts));
      continue;
    }

    itens.push(
      mkRestaurar(
        'RESTAURAR_BACKUP',
        'Backup válido e nota atual contém bloco controlado. Candidato à restauração.',
        {
          ...baseOpts,
          conteudoAtual: notaConteudo,
          conteudoBackup: backup.conteudoBackup,
        },
      ),
    );
  }

  // ── Process manifesto entries without any backup ─────────────────────────────
  for (const [fp, id] of manifestoMap) {
    if (filePathsVistos.has(fp)) continue;

    const idOpt = id !== '' ? id : undefined;
    const notaConteudo = notasMap.get(fp);

    if (notaConteudo !== undefined && temBlocoControlado(notaConteudo)) {
      itens.push(
        mkBloqueado(
          'MANIFESTO_SEM_BACKUP_COM_BLOCO',
          `Nota contém bloco controlado mas sem backup correspondente: "${fp}".`,
          { filePathOriginal: fp, idEvento: idOpt },
        ),
      );
    } else {
      itens.push(
        mkSemAcao(
          'MANIFESTO_SEM_BACKUP_SEM_BLOCO',
          `Item do manifesto sem backup e sem bloco controlado: "${fp}".`,
          { filePathOriginal: fp, idEvento: idOpt },
        ),
      );
    }
  }

  const temBloqueado = itens.some((i) => i.tipo === 'bloqueado');
  return buildResult(!temBloqueado, itens, dados.geradoEm);
}
