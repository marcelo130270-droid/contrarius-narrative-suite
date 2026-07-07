// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackupAplicacaoAuditoriaRestauracao {
  readonly filePathOriginal: string;
  readonly caminhoBackup: string;
  readonly conteudo: string;
}

export interface BackupPreRestauracaoAuditoria {
  readonly filePathOriginal: string;
  readonly caminhoBackup: string;
  readonly conteudo: string;
}

export interface NotaAtualAuditoriaRestauracao {
  readonly filePath: string;
  readonly conteudoAtual: string;
}

export interface DadosAuditoriaRestauracaoScrivener {
  readonly manifestoJson: string;
  readonly backupsAntesAplicacao: readonly BackupAplicacaoAuditoriaRestauracao[];
  readonly backupsAntesRestauracao: readonly BackupPreRestauracaoAuditoria[];
  readonly notasAtuais: readonly NotaAtualAuditoriaRestauracao[];
  readonly geradoEm: string;
}

export type NivelAuditoriaRestauracaoScrivener = 'ok' | 'aviso' | 'erro';

export interface ItemAuditoriaRestauracaoScrivener {
  readonly nivel: NivelAuditoriaRestauracaoScrivener;
  readonly codigo: string;
  readonly mensagem: string;
  readonly filePathOriginal?: string;
  readonly caminhoBackupAplicacao?: string;
  readonly caminhoBackupRestauracao?: string;
  readonly idEvento?: string;
}

export interface ResultadoAuditoriaRestauracaoScrivener {
  readonly sucesso: boolean;
  readonly itens: readonly ItemAuditoriaRestauracaoScrivener[];
  readonly oks: readonly ItemAuditoriaRestauracaoScrivener[];
  readonly avisos: readonly ItemAuditoriaRestauracaoScrivener[];
  readonly erros: readonly ItemAuditoriaRestauracaoScrivener[];
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

// ─── Item builders ────────────────────────────────────────────────────────────

type ItemOpts = {
  readonly filePathOriginal?: string;
  readonly caminhoBackupAplicacao?: string;
  readonly caminhoBackupRestauracao?: string;
  readonly idEvento?: string;
};

function mkItem(
  nivel: NivelAuditoriaRestauracaoScrivener,
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): ItemAuditoriaRestauracaoScrivener {
  const r: {
    nivel: NivelAuditoriaRestauracaoScrivener;
    codigo: string;
    mensagem: string;
    filePathOriginal?: string;
    caminhoBackupAplicacao?: string;
    caminhoBackupRestauracao?: string;
    idEvento?: string;
  } = { nivel, codigo, mensagem };
  if (opts !== undefined) {
    if (opts.filePathOriginal !== undefined) r.filePathOriginal = opts.filePathOriginal;
    if (opts.caminhoBackupAplicacao !== undefined) r.caminhoBackupAplicacao = opts.caminhoBackupAplicacao;
    if (opts.caminhoBackupRestauracao !== undefined) r.caminhoBackupRestauracao = opts.caminhoBackupRestauracao;
    if (opts.idEvento !== undefined) r.idEvento = opts.idEvento;
  }
  return r;
}

function mkErro(
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): ItemAuditoriaRestauracaoScrivener {
  return mkItem('erro', codigo, mensagem, opts);
}

function mkAviso(
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): ItemAuditoriaRestauracaoScrivener {
  return mkItem('aviso', codigo, mensagem, opts);
}

function mkOk(
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): ItemAuditoriaRestauracaoScrivener {
  return mkItem('ok', codigo, mensagem, opts);
}

// ─── Report ───────────────────────────────────────────────────────────────────

function formatarItem(item: ItemAuditoriaRestauracaoScrivener): string {
  let s = `- **${item.codigo}**: ${item.mensagem}`;
  if (item.idEvento !== undefined) s += ` ID: \`${item.idEvento}\`.`;
  if (item.filePathOriginal !== undefined) s += ` Nota: ${item.filePathOriginal}.`;
  if (item.caminhoBackupAplicacao !== undefined) s += ` Backup aplicação: \`${item.caminhoBackupAplicacao}\`.`;
  if (item.caminhoBackupRestauracao !== undefined) s += ` Backup restauração: \`${item.caminhoBackupRestauracao}\`.`;
  return s;
}

function gerarRelatorio(
  geradoEm: string,
  erros: readonly ItemAuditoriaRestauracaoScrivener[],
  avisos: readonly ItemAuditoriaRestauracaoScrivener[],
  oks: readonly ItemAuditoriaRestauracaoScrivener[],
): string {
  const l: string[] = [
    '# Auditoria da restauração Scrivener',
    '',
    `Gerado em: ${geradoEm}`,
    '',
    '## Resumo',
    '',
    `- Erros: ${erros.length}`,
    `- Avisos: ${avisos.length}`,
    `- OK: ${oks.length}`,
    '',
    '## Erros',
    '',
  ];

  if (erros.length === 0) {
    l.push('Nenhum.', '');
  } else {
    for (const item of erros) l.push(formatarItem(item));
    l.push('');
  }

  l.push('## Avisos', '');
  if (avisos.length === 0) {
    l.push('Nenhum.', '');
  } else {
    for (const item of avisos) l.push(formatarItem(item));
    l.push('');
  }

  l.push('## OK', '');
  if (oks.length === 0) {
    l.push('Nenhum.', '');
  } else {
    for (const item of oks) l.push(formatarItem(item));
    l.push('');
  }

  l.push('Nenhuma nota do Vault foi alterada por esta auditoria.');

  const joined = l.join('\n');
  return joined.endsWith('\n') ? joined : `${joined}\n`;
}

// ─── Result builder ───────────────────────────────────────────────────────────

function buildResult(
  itens: readonly ItemAuditoriaRestauracaoScrivener[],
  geradoEm: string,
): ResultadoAuditoriaRestauracaoScrivener {
  const erros = itens.filter((i) => i.nivel === 'erro');
  const avisos = itens.filter((i) => i.nivel === 'aviso');
  const oks = itens.filter((i) => i.nivel === 'ok');
  return {
    sucesso: erros.length === 0,
    itens: [...itens],
    erros: [...erros],
    avisos: [...avisos],
    oks: [...oks],
    relatorioMarkdown: gerarRelatorio(geradoEm, erros, avisos, oks),
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function gerarAuditoriaRestauracaoScrivener(
  dados: DadosAuditoriaRestauracaoScrivener,
): ResultadoAuditoriaRestauracaoScrivener {
  const itens: ItemAuditoriaRestauracaoScrivener[] = [];

  // ── Parse manifest ──────────────────────────────────────────────────────────
  let manifestoRaw: unknown;
  try {
    manifestoRaw = JSON.parse(dados.manifestoJson);
  } catch {
    itens.push(mkErro('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um JSON válido.'));
    return buildResult(itens, dados.geradoEm);
  }

  if (!isRecord(manifestoRaw)) {
    itens.push(mkErro('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um objeto JSON.'));
    return buildResult(itens, dados.geradoEm);
  }

  if (manifestoRaw['tipo'] !== TIPO_ESPERADO) {
    itens.push(
      mkErro('MANIFESTO_TIPO_INVALIDO', `Tipo do manifesto inválido: deve ser "${TIPO_ESPERADO}".`),
    );
    return buildResult(itens, dados.geradoEm);
  }

  const arquivosRaw = manifestoRaw['arquivos'];
  if (!isArray(arquivosRaw)) {
    itens.push(mkErro('MANIFESTO_SEM_ARRAY_ARQUIVOS', 'O manifesto não contém um array "arquivos".'));
    return buildResult(itens, dados.geradoEm);
  }

  // ── Build manifesto lookup: filePath → id ────────────────────────────────────
  const manifestoMap = new Map<string, string>();
  for (const entradaRaw of arquivosRaw) {
    if (!isRecord(entradaRaw)) continue;
    const fp = typeof entradaRaw['filePath'] === 'string' ? entradaRaw['filePath'].trim() : '';
    const id = typeof entradaRaw['id'] === 'string' ? entradaRaw['id'] : '';
    if (fp !== '') manifestoMap.set(fp, id);
  }

  // ── Build BACKUP_ANTES_APLICACAO lookup ──────────────────────────────────────
  const backupsAplicacaoMap = new Map<string, BackupAplicacaoAuditoriaRestauracao>();
  for (const b of dados.backupsAntesAplicacao) {
    if (b.filePathOriginal !== '') backupsAplicacaoMap.set(b.filePathOriginal, b);
  }

  // ── Build notas lookup ───────────────────────────────────────────────────────
  const notasMap = new Map<string, string>();
  for (const nota of dados.notasAtuais) {
    notasMap.set(nota.filePath, nota.conteudoAtual);
  }

  const filePathsVistos = new Set<string>();
  let totalAuditados = 0;

  // ── Process BACKUP_ANTES_RESTAURACAO entries ────────────────────────────────
  for (const br of dados.backupsAntesRestauracao) {
    const fp = br.filePathOriginal;

    if (fp.trim() === '') {
      itens.push(
        mkErro('BACKUP_SEM_FILEPATH', 'Backup de restauração sem caminho de nota original.', {
          caminhoBackupRestauracao: br.caminhoBackup,
        }),
      );
      continue;
    }

    if (filePathsVistos.has(fp)) {
      itens.push(
        mkErro('BACKUP_DUPLICADO', `Backup de restauração duplicado para a mesma nota: "${fp}".`, {
          filePathOriginal: fp,
          caminhoBackupRestauracao: br.caminhoBackup,
        }),
      );
      continue;
    }
    filePathsVistos.add(fp);

    const id = manifestoMap.get(fp) ?? '';
    const baseOpts: ItemOpts = id !== ''
      ? { filePathOriginal: fp, caminhoBackupRestauracao: br.caminhoBackup, idEvento: id }
      : { filePathOriginal: fp, caminhoBackupRestauracao: br.caminhoBackup };

    if (br.conteudo.trim() === '') {
      itens.push(mkErro('BACKUP_VAZIO', 'Backup de restauração com conteúdo vazio.', baseOpts));
      continue;
    }

    const suspeito = detectarSuspeito(br.conteudo);
    if (suspeito !== null) {
      itens.push(
        mkErro('BACKUP_SUSPEITO', `Backup de restauração contém valor inválido: "${suspeito}".`, baseOpts),
      );
      continue;
    }

    if (temConflito(br.conteudo)) {
      itens.push(
        mkErro('CONFLITO_GIT_BACKUP', 'Backup de restauração contém marcador de conflito Git.', baseOpts),
      );
      continue;
    }

    const notaConteudo = notasMap.get(fp);
    if (notaConteudo === undefined) {
      itens.push(mkErro('NOTA_AUSENTE', `Nota atual não encontrada: "${fp}".`, baseOpts));
      continue;
    }

    if (temConflito(notaConteudo)) {
      itens.push(mkErro('CONFLITO_GIT_NOTA', 'Nota atual contém marcador de conflito Git.', baseOpts));
      continue;
    }

    if (notaConteudo === br.conteudo) {
      itens.push(
        mkErro(
          'RESTAURACAO_NAO_APLICADA',
          'Nota atual idêntica ao backup pré-restauração: a restauração não foi aplicada.',
          baseOpts,
        ),
      );
      continue;
    }

    if (temBlocoControlado(notaConteudo)) {
      itens.push(
        mkErro(
          'BLOCO_REMANESCENTE',
          'Nota atual ainda contém bloco controlado Scrivener após restauração.',
          baseOpts,
        ),
      );
      continue;
    }

    const ba = backupsAplicacaoMap.get(fp);
    if (ba === undefined) {
      itens.push(
        mkAviso(
          'SEM_BACKUP_APLICACAO',
          'Nota restaurada mas sem backup pré-aplicação correspondente para verificação.',
          baseOpts,
        ),
      );
      totalAuditados++;
      continue;
    }

    const optsComAplicacao: ItemOpts = id !== ''
      ? {
          filePathOriginal: fp,
          caminhoBackupRestauracao: br.caminhoBackup,
          caminhoBackupAplicacao: ba.caminhoBackup,
          idEvento: id,
        }
      : {
          filePathOriginal: fp,
          caminhoBackupRestauracao: br.caminhoBackup,
          caminhoBackupAplicacao: ba.caminhoBackup,
        };

    if (notaConteudo === ba.conteudo) {
      itens.push(
        mkOk(
          'RESTAURACAO_CORRETA',
          'Nota restaurada corretamente: conteúdo idêntico ao backup pré-aplicação.',
          optsComAplicacao,
        ),
      );
    } else {
      itens.push(
        mkAviso(
          'RESTAURACAO_DIVERGENTE',
          'Nota restaurada mas conteúdo difere do backup pré-aplicação.',
          optsComAplicacao,
        ),
      );
    }
    totalAuditados++;
  }

  // ── Process manifesto entries without BACKUP_ANTES_RESTAURACAO ──────────────
  for (const [fp, id] of manifestoMap) {
    if (filePathsVistos.has(fp)) continue;

    const idOpts: ItemOpts = id !== ''
      ? { filePathOriginal: fp, idEvento: id }
      : { filePathOriginal: fp };

    const notaConteudo = notasMap.get(fp);
    if (notaConteudo !== undefined && temBlocoControlado(notaConteudo)) {
      itens.push(
        mkErro(
          'NOTA_COM_BLOCO_SEM_RESTAURACAO',
          `Nota contém bloco controlado mas sem backup pré-restauração: "${fp}".`,
          idOpts,
        ),
      );
    } else {
      itens.push(
        mkOk(
          'SEM_RESTAURACAO_NECESSARIA',
          `Nota sem bloco controlado e sem restauração aplicada: "${fp}".`,
          idOpts,
        ),
      );
    }
  }

  itens.push(mkOk('QUANTIDADE_AUDITADA', `${totalAuditados} nota(s) auditada(s).`));

  return buildResult(itens, dados.geradoEm);
}
