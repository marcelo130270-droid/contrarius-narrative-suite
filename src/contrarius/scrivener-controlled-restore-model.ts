// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackupRestauracaoControlada {
  readonly filePathOriginal: string;
  readonly caminhoBackup: string;
  readonly conteudoBackup: string;
}

export interface NotaAtualRestauracaoControlada {
  readonly filePath: string;
  readonly conteudoAtual: string;
}

export interface DadosRestauracaoControladaScrivener {
  readonly manifestoJson: string;
  readonly backups: readonly BackupRestauracaoControlada[];
  readonly notasAtuais: readonly NotaAtualRestauracaoControlada[];
  readonly geradoEm: string;
}

export interface EscritaRestauracaoControlada {
  readonly filePathOriginal: string;
  readonly caminhoBackup: string;
  readonly conteudoBackup: string;
  readonly idEvento?: string;
}

export interface BloqueioRestauracaoControlada {
  readonly codigo: string;
  readonly mensagem: string;
  readonly filePathOriginal?: string;
  readonly caminhoBackup?: string;
  readonly idEvento?: string;
}

export interface SemAcaoRestauracaoControlada {
  readonly codigo: string;
  readonly mensagem: string;
  readonly filePathOriginal?: string;
  readonly caminhoBackup?: string;
  readonly idEvento?: string;
}

export interface ResultadoRestauracaoControladaScrivener {
  readonly podeRestaurar: boolean;
  readonly escritas: readonly EscritaRestauracaoControlada[];
  readonly bloqueados: readonly BloqueioRestauracaoControlada[];
  readonly semAcao: readonly SemAcaoRestauracaoControlada[];
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

type BloqueioOpts = {
  readonly filePathOriginal?: string;
  readonly caminhoBackup?: string;
  readonly idEvento?: string;
};

type SemAcaoOpts = BloqueioOpts;

function mkBloqueio(
  codigo: string,
  mensagem: string,
  opts?: BloqueioOpts,
): BloqueioRestauracaoControlada {
  const r: {
    codigo: string;
    mensagem: string;
    filePathOriginal?: string;
    caminhoBackup?: string;
    idEvento?: string;
  } = { codigo, mensagem };
  if (opts !== undefined) {
    if (opts.filePathOriginal !== undefined) r.filePathOriginal = opts.filePathOriginal;
    if (opts.caminhoBackup !== undefined) r.caminhoBackup = opts.caminhoBackup;
    if (opts.idEvento !== undefined) r.idEvento = opts.idEvento;
  }
  return r;
}

function mkSemAcao(
  codigo: string,
  mensagem: string,
  opts?: SemAcaoOpts,
): SemAcaoRestauracaoControlada {
  const r: {
    codigo: string;
    mensagem: string;
    filePathOriginal?: string;
    caminhoBackup?: string;
    idEvento?: string;
  } = { codigo, mensagem };
  if (opts !== undefined) {
    if (opts.filePathOriginal !== undefined) r.filePathOriginal = opts.filePathOriginal;
    if (opts.caminhoBackup !== undefined) r.caminhoBackup = opts.caminhoBackup;
    if (opts.idEvento !== undefined) r.idEvento = opts.idEvento;
  }
  return r;
}

// ─── Report ───────────────────────────────────────────────────────────────────

function formatarBloqueio(item: BloqueioRestauracaoControlada): string {
  let s = `- **${item.codigo}**: ${item.mensagem}`;
  if (item.filePathOriginal !== undefined) s += ` Nota: ${item.filePathOriginal}.`;
  if (item.caminhoBackup !== undefined) s += ` Backup: \`${item.caminhoBackup}\`.`;
  return s;
}

function formatarSemAcao(item: SemAcaoRestauracaoControlada): string {
  let s = `- **${item.codigo}**: ${item.mensagem}`;
  if (item.filePathOriginal !== undefined) s += ` Nota: ${item.filePathOriginal}.`;
  if (item.caminhoBackup !== undefined) s += ` Backup: \`${item.caminhoBackup}\`.`;
  return s;
}

function gerarRelatorio(
  geradoEm: string,
  escritas: readonly EscritaRestauracaoControlada[],
  bloqueados: readonly BloqueioRestauracaoControlada[],
  semAcao: readonly SemAcaoRestauracaoControlada[],
): string {
  const l: string[] = [
    '# Restauração controlada Scrivener',
    '',
    `Gerado em: ${geradoEm}`,
    '',
    'Nenhum frontmatter foi alterado por esta restauração.',
    '',
    '## Resumo',
    '',
    `- Restaurações: ${escritas.length}`,
    `- Bloqueados: ${bloqueados.length}`,
    `- Sem ação: ${semAcao.length}`,
    '',
  ];

  if (bloqueados.length > 0) {
    l.push('**Esta restauração está BLOQUEADA. Nenhuma nota foi alterada.**', '');
  }

  l.push('## Restaurações', '');
  if (escritas.length === 0) {
    l.push('Nenhuma.', '');
  } else {
    for (const escrita of escritas) {
      const heading = escrita.filePathOriginal !== '' ? escrita.filePathOriginal : escrita.caminhoBackup;
      l.push(`### ${heading}`, '');
      if (escrita.idEvento !== undefined) l.push(`- ID: ${escrita.idEvento}`);
      l.push(`- Nota: ${escrita.filePathOriginal}`);
      l.push(`- Backup: \`${escrita.caminhoBackup}\``);
      l.push('');
    }
  }

  l.push('## Bloqueados', '');
  if (bloqueados.length === 0) {
    l.push('Nenhum.', '');
  } else {
    for (const item of bloqueados) l.push(formatarBloqueio(item));
    l.push('');
  }

  l.push('## Sem ação', '');
  if (semAcao.length === 0) {
    l.push('Nenhum.', '');
  } else {
    for (const item of semAcao) l.push(formatarSemAcao(item));
    l.push('');
  }

  const joined = l.join('\n');
  return joined.endsWith('\n') ? joined : `${joined}\n`;
}

// ─── Result builder ───────────────────────────────────────────────────────────

function buildResult(
  escritas: readonly EscritaRestauracaoControlada[],
  bloqueados: readonly BloqueioRestauracaoControlada[],
  semAcao: readonly SemAcaoRestauracaoControlada[],
  geradoEm: string,
): ResultadoRestauracaoControladaScrivener {
  return {
    podeRestaurar: bloqueados.length === 0,
    escritas: [...escritas],
    bloqueados: [...bloqueados],
    semAcao: [...semAcao],
    relatorioMarkdown: gerarRelatorio(geradoEm, escritas, bloqueados, semAcao),
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function gerarRestauracaoControladaScrivener(
  dados: DadosRestauracaoControladaScrivener,
): ResultadoRestauracaoControladaScrivener {
  const escritas: EscritaRestauracaoControlada[] = [];
  const bloqueados: BloqueioRestauracaoControlada[] = [];
  const semAcao: SemAcaoRestauracaoControlada[] = [];

  // ── Parse manifest ──────────────────────────────────────────────────────────
  let manifestoRaw: unknown;
  try {
    manifestoRaw = JSON.parse(dados.manifestoJson);
  } catch {
    bloqueados.push(mkBloqueio('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um JSON válido.'));
    return buildResult(escritas, bloqueados, semAcao, dados.geradoEm);
  }

  if (!isRecord(manifestoRaw)) {
    bloqueados.push(mkBloqueio('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um objeto JSON.'));
    return buildResult(escritas, bloqueados, semAcao, dados.geradoEm);
  }

  if (manifestoRaw['tipo'] !== TIPO_ESPERADO) {
    bloqueados.push(
      mkBloqueio('MANIFESTO_TIPO_INVALIDO', `Tipo do manifesto inválido: deve ser "${TIPO_ESPERADO}".`),
    );
    return buildResult(escritas, bloqueados, semAcao, dados.geradoEm);
  }

  const arquivosRaw = manifestoRaw['arquivos'];
  if (!isArray(arquivosRaw)) {
    bloqueados.push(mkBloqueio('MANIFESTO_SEM_ARRAY_ARQUIVOS', 'O manifesto não contém um array "arquivos".'));
    return buildResult(escritas, bloqueados, semAcao, dados.geradoEm);
  }

  // ── Check suspicious strings in manifest ────────────────────────────────────
  const suspeitoManifesto = detectarSuspeito(dados.manifestoJson);
  if (suspeitoManifesto !== null) {
    bloqueados.push(
      mkBloqueio('MANIFESTO_STRINGS_INVALIDAS', `O manifesto contém valor inválido: "${suspeitoManifesto}".`),
    );
    return buildResult(escritas, bloqueados, semAcao, dados.geradoEm);
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

  const filePathsVistos = new Set<string>();

  // ── Process backups ──────────────────────────────────────────────────────────
  for (const backup of dados.backups) {
    const fp = backup.filePathOriginal;

    if (fp.trim() === '') {
      bloqueados.push(
        mkBloqueio('BACKUP_SEM_FILEPATH', 'Backup sem caminho de nota original.', {
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    if (filePathsVistos.has(fp)) {
      bloqueados.push(
        mkBloqueio('BACKUP_DUPLICADO', `Backup duplicado para a mesma nota: "${fp}".`, {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }
    filePathsVistos.add(fp);

    if (backup.conteudoBackup.trim() === '') {
      bloqueados.push(
        mkBloqueio('BACKUP_VAZIO', 'Backup com conteúdo vazio.', {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    const suspeitoBackup = detectarSuspeito(backup.conteudoBackup);
    if (suspeitoBackup !== null) {
      bloqueados.push(
        mkBloqueio('BACKUP_STRINGS_INVALIDAS', `Backup contém valor inválido: "${suspeitoBackup}".`, {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    if (temConflito(backup.conteudoBackup)) {
      bloqueados.push(
        mkBloqueio('CONFLITO_GIT_BACKUP', 'Backup contém marcador de conflito Git.', {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    if (!manifestoMap.has(fp)) {
      bloqueados.push(
        mkBloqueio('BACKUP_SEM_MANIFESTO', `Backup não corresponde a nenhum item do manifesto: "${fp}".`, {
          filePathOriginal: fp,
          caminhoBackup: backup.caminhoBackup,
        }),
      );
      continue;
    }

    const idEvento = manifestoMap.get(fp) ?? '';
    const baseOpts: BloqueioOpts =
      idEvento !== ''
        ? { filePathOriginal: fp, caminhoBackup: backup.caminhoBackup, idEvento }
        : { filePathOriginal: fp, caminhoBackup: backup.caminhoBackup };

    const notaConteudo = notasMap.get(fp);
    if (notaConteudo === undefined) {
      bloqueados.push(mkBloqueio('NOTA_AUSENTE', `Nota atual não encontrada: "${fp}".`, baseOpts));
      continue;
    }

    if (temConflito(notaConteudo)) {
      bloqueados.push(mkBloqueio('CONFLITO_GIT_NOTA', 'Nota atual contém marcador de conflito Git.', baseOpts));
      continue;
    }

    if (backup.conteudoBackup === notaConteudo) {
      semAcao.push(mkSemAcao('BACKUP_IDENTICO', 'Backup idêntico à nota atual.', baseOpts));
      continue;
    }

    if (!temBlocoControlado(notaConteudo)) {
      semAcao.push(mkSemAcao('SEM_BLOCO_CONTROLADO', 'Nota atual não contém bloco controlado Scrivener.', baseOpts));
      continue;
    }

    const escrita: EscritaRestauracaoControlada =
      idEvento !== ''
        ? { filePathOriginal: fp, caminhoBackup: backup.caminhoBackup, conteudoBackup: backup.conteudoBackup, idEvento }
        : { filePathOriginal: fp, caminhoBackup: backup.caminhoBackup, conteudoBackup: backup.conteudoBackup };
    escritas.push(escrita);
  }

  // ── Process manifesto entries without any backup ─────────────────────────────
  for (const [fp, id] of manifestoMap) {
    if (filePathsVistos.has(fp)) continue;

    const idOpt = id !== '' ? id : undefined;
    const notaConteudo = notasMap.get(fp);

    if (notaConteudo !== undefined && temBlocoControlado(notaConteudo)) {
      bloqueados.push(
        mkBloqueio(
          'MANIFESTO_SEM_BACKUP_COM_BLOCO',
          `Nota contém bloco controlado mas sem backup correspondente: "${fp}".`,
          { filePathOriginal: fp, idEvento: idOpt },
        ),
      );
    } else {
      semAcao.push(
        mkSemAcao(
          'MANIFESTO_SEM_BACKUP_SEM_BLOCO',
          `Item do manifesto sem backup e sem bloco controlado: "${fp}".`,
          { filePathOriginal: fp, idEvento: idOpt },
        ),
      );
    }
  }

  return buildResult(escritas, bloqueados, semAcao, dados.geradoEm);
}
