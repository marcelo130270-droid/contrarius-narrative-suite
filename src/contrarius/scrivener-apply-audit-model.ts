// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArquivoScrivenerAuditoriaAplicacao {
  readonly caminhoRelativo: string;
  readonly conteudo: string;
}

export interface NotaOriginalAuditoriaAplicacao {
  readonly filePath: string;
  readonly conteudo: string;
}

export interface BackupAuditoriaAplicacao {
  readonly filePathOriginal: string;
  readonly caminhoBackup: string;
  readonly conteudo: string;
}

export interface DadosAuditoriaAplicacaoScrivener {
  readonly manifestoJson: string;
  readonly arquivosScrivener: readonly ArquivoScrivenerAuditoriaAplicacao[];
  readonly notasOriginais: readonly NotaOriginalAuditoriaAplicacao[];
  readonly backups: readonly BackupAuditoriaAplicacao[];
  readonly geradoEm: string;
}

export type NivelAuditoriaAplicacaoScrivener = 'ok' | 'aviso' | 'erro';

export interface ItemAuditoriaAplicacaoScrivener {
  readonly nivel: NivelAuditoriaAplicacaoScrivener;
  readonly codigo: string;
  readonly mensagem: string;
  readonly idEvento?: string;
  readonly caminhoScrivener?: string;
  readonly filePathOriginal?: string;
  readonly caminhoBackup?: string;
}

export interface ResultadoAuditoriaAplicacaoScrivener {
  readonly sucesso: boolean;
  readonly itens: readonly ItemAuditoriaAplicacaoScrivener[];
  readonly oks: readonly ItemAuditoriaAplicacaoScrivener[];
  readonly avisos: readonly ItemAuditoriaAplicacaoScrivener[];
  readonly erros: readonly ItemAuditoriaAplicacaoScrivener[];
  readonly relatorioMarkdown: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_ESPERADO = 'contrarius-scrivener-export';
const PLACEHOLDER = '[preencher no Scrivener]';
const STRINGS_SUSPEITAS: readonly string[] = ['undefined', '[object Object]', 'NaN', 'Infinity'];
const TIPOS_EVENTO = new Set<string>(['evento_posicionado', 'evento_sem_ordem']);

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

function extrairValorLista(texto: string, chave: string): string | null {
  const prefixo = `- ${chave}: `;
  for (const linha of texto.split('\n')) {
    if (linha.startsWith(prefixo)) return linha.slice(prefixo.length).trim();
  }
  return null;
}

interface SinopseResultado {
  readonly sinopse: string | null;
  readonly duplicada: boolean;
}

function extrairSinopse(conteudo: string): SinopseResultado {
  const alvo = '## Sinopse de escrita';
  const linhas = conteudo.split('\n');
  const ocorrencias = linhas.filter((l) => l === alvo).length;
  const idx = linhas.findIndex((l) => l === alvo);
  if (idx === -1) return { sinopse: null, duplicada: false };
  const corpo: string[] = [];
  for (let i = idx + 1; i < linhas.length; i++) {
    if (linhas[i].startsWith('## ')) break;
    corpo.push(linhas[i]);
  }
  return { sinopse: corpo.join('\n').trim(), duplicada: ocorrencias > 1 };
}

function ehSinopsePreenchida(sinopse: string): boolean {
  return sinopse.split('\n').some((l) => {
    const t = l.trim();
    return t !== '' && t !== PLACEHOLDER;
  });
}

interface AnaliseBlocos {
  readonly multiplos: boolean;
  readonly startSemEnd: boolean;
  readonly endSemStart: boolean;
  readonly temBlocoValido: boolean;
}

function analisarBlocos(conteudo: string, id: string): AnaliseBlocos {
  const startTag = `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${id}" -->`;
  const endTag = `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${id}" -->`;
  const linhas = conteudo.split('\n');

  let startCount = 0;
  let startFirst = -1;
  let endCount = 0;
  let endFirst = -1;

  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i] === startTag) { startCount++; if (startFirst < 0) startFirst = i; }
    if (linhas[i] === endTag) { endCount++; if (endFirst < 0) endFirst = i; }
  }

  if (startCount === 0 && endCount === 0) {
    return { multiplos: false, startSemEnd: false, endSemStart: false, temBlocoValido: false };
  }
  if (startCount > 1 || endCount > 1) {
    return { multiplos: true, startSemEnd: false, endSemStart: false, temBlocoValido: false };
  }
  if (startCount === 1 && endCount === 0) {
    return { multiplos: false, startSemEnd: true, endSemStart: false, temBlocoValido: false };
  }
  if (startCount === 0 && endCount === 1) {
    return { multiplos: false, startSemEnd: false, endSemStart: true, temBlocoValido: false };
  }
  if (endFirst <= startFirst) {
    return { multiplos: false, startSemEnd: true, endSemStart: true, temBlocoValido: false };
  }
  return { multiplos: false, startSemEnd: false, endSemStart: false, temBlocoValido: true };
}

function construirBloco(id: string, sinopse: string): string {
  return [
    `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${id}" -->`,
    '## Sinopse importada do Scrivener',
    '',
    sinopse,
    '',
    `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${id}" -->`,
    '',
  ].join('\n');
}

function temSecaoExata(conteudo: string, secao: string): boolean {
  return conteudo.split('\n').some((l) => l === secao);
}

// ─── Item builders ────────────────────────────────────────────────────────────

type ItemOptsMutable = {
  idEvento?: string;
  caminhoScrivener?: string;
  filePathOriginal?: string;
  caminhoBackup?: string;
};

function buildOpts(
  caminho: string,
  id: string,
  filePath: string,
  caminhoBackup?: string,
): ItemOptsMutable {
  const r: ItemOptsMutable = { caminhoScrivener: caminho };
  if (id !== '') r.idEvento = id;
  if (filePath !== '') r.filePathOriginal = filePath;
  if (caminhoBackup !== undefined) r.caminhoBackup = caminhoBackup;
  return r;
}

function mkItem(
  nivel: NivelAuditoriaAplicacaoScrivener,
  codigo: string,
  mensagem: string,
  opts?: ItemOptsMutable,
): ItemAuditoriaAplicacaoScrivener {
  const r: {
    nivel: NivelAuditoriaAplicacaoScrivener;
    codigo: string;
    mensagem: string;
    idEvento?: string;
    caminhoScrivener?: string;
    filePathOriginal?: string;
    caminhoBackup?: string;
  } = { nivel, codigo, mensagem };
  if (opts !== undefined) {
    if (opts.idEvento !== undefined) r.idEvento = opts.idEvento;
    if (opts.caminhoScrivener !== undefined) r.caminhoScrivener = opts.caminhoScrivener;
    if (opts.filePathOriginal !== undefined) r.filePathOriginal = opts.filePathOriginal;
    if (opts.caminhoBackup !== undefined) r.caminhoBackup = opts.caminhoBackup;
  }
  return r;
}

function mkErro(
  codigo: string,
  mensagem: string,
  opts?: ItemOptsMutable,
): ItemAuditoriaAplicacaoScrivener {
  return mkItem('erro', codigo, mensagem, opts);
}

function mkAviso(
  codigo: string,
  mensagem: string,
  opts?: ItemOptsMutable,
): ItemAuditoriaAplicacaoScrivener {
  return mkItem('aviso', codigo, mensagem, opts);
}

function mkOk(
  codigo: string,
  mensagem: string,
  opts?: ItemOptsMutable,
): ItemAuditoriaAplicacaoScrivener {
  return mkItem('ok', codigo, mensagem, opts);
}

// ─── Report ───────────────────────────────────────────────────────────────────

function formatarItem(item: ItemAuditoriaAplicacaoScrivener): string {
  let s = `- **${item.codigo}**: ${item.mensagem}`;
  if (item.caminhoScrivener !== undefined) s += ` Arquivo: \`${item.caminhoScrivener}\`.`;
  if (item.idEvento !== undefined) s += ` ID: \`${item.idEvento}\`.`;
  if (item.filePathOriginal !== undefined) s += ` Nota: ${item.filePathOriginal}.`;
  if (item.caminhoBackup !== undefined) s += ` Backup: \`${item.caminhoBackup}\`.`;
  return s;
}

function gerarRelatorio(
  geradoEm: string,
  erros: readonly ItemAuditoriaAplicacaoScrivener[],
  avisos: readonly ItemAuditoriaAplicacaoScrivener[],
  oks: readonly ItemAuditoriaAplicacaoScrivener[],
): string {
  const l: string[] = [
    '# Auditoria da aplicação Scrivener',
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
  itens: readonly ItemAuditoriaAplicacaoScrivener[],
  geradoEm: string,
): ResultadoAuditoriaAplicacaoScrivener {
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

export function auditarAplicacaoScrivener(
  dados: DadosAuditoriaAplicacaoScrivener,
): ResultadoAuditoriaAplicacaoScrivener {
  const itens: ItemAuditoriaAplicacaoScrivener[] = [];

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

  // ── Build lookup maps ───────────────────────────────────────────────────────
  const scrivenerMap = new Map<string, string>();
  for (const arq of dados.arquivosScrivener) {
    scrivenerMap.set(arq.caminhoRelativo, arq.conteudo);
  }

  const notasMap = new Map<string, string>();
  for (const nota of dados.notasOriginais) {
    notasMap.set(nota.filePath, nota.conteudo);
  }

  const backupsMap = new Map<string, BackupAuditoriaAplicacao>();
  for (const backup of dados.backups) {
    if (backup.filePathOriginal !== '') {
      backupsMap.set(backup.filePathOriginal, backup);
    }
  }

  const manifestoFilePaths = new Set<string>();
  const filePathsComBloco = new Set<string>();
  let totalAuditados = 0;

  // ── Process each manifest item ──────────────────────────────────────────────
  for (const entradaRaw of arquivosRaw) {
    if (!isRecord(entradaRaw)) continue;

    const caminhoRaw = entradaRaw['caminhoRelativo'];
    if (typeof caminhoRaw !== 'string' || caminhoRaw === '') {
      itens.push(mkErro('ITEM_SEM_CAMINHO', 'Item do manifesto sem caminho relativo.'));
      continue;
    }
    const caminho = caminhoRaw;

    const idManifesto = typeof entradaRaw['id'] === 'string' ? entradaRaw['id'] : '';
    const filePathManifesto =
      typeof entradaRaw['filePath'] === 'string' ? entradaRaw['filePath'].trim() : '';
    const tipoEntrada = typeof entradaRaw['tipo'] === 'string' ? entradaRaw['tipo'] : '';
    const ordRaw = entradaRaw['ordemNarrativa'];
    const ordemManifesto =
      typeof ordRaw === 'number' && Number.isFinite(ordRaw) ? ordRaw : null;

    const opts = buildOpts(caminho, idManifesto, filePathManifesto);

    if (filePathManifesto !== '') manifestoFilePaths.add(filePathManifesto);

    if (!scrivenerMap.has(caminho)) {
      itens.push(
        mkErro('ARQUIVO_AUSENTE', `Arquivo Scrivener listado no manifesto está ausente: "${caminho}".`, opts),
      );
      continue;
    }

    const conteudo = scrivenerMap.get(caminho)!;

    // Check for invalid strings in Scrivener file
    const suspeito = detectarSuspeito(conteudo);
    if (suspeito !== null) {
      itens.push(
        mkErro('CONTEUDO_SUSPEITO', `Arquivo contém valor suspeito: "${suspeito}".`, opts),
      );
    }

    // Check nota original
    const notaConteudo =
      filePathManifesto !== '' ? notasMap.get(filePathManifesto) : undefined;
    if (filePathManifesto !== '' && notaConteudo === undefined) {
      itens.push(
        mkErro('NOTA_ORIGINAL_AUSENTE', `Nota original não encontrada: "${filePathManifesto}".`, opts),
      );
    }

    // Check ID divergente
    const idCorpo = extrairValorLista(conteudo, 'ID');
    if (idCorpo !== null && idManifesto !== '' && idCorpo !== idManifesto) {
      itens.push(
        mkErro(
          'ID_DIVERGENTE',
          `ID no arquivo difere do manifesto: esperado "${idManifesto}", encontrado "${idCorpo}".`,
          opts,
        ),
      );
    }

    // Check caminho original divergente
    if (filePathManifesto !== '') {
      const caminhoOrigCorpo = extrairValorLista(conteudo, 'Caminho original');
      if (caminhoOrigCorpo !== null && caminhoOrigCorpo !== filePathManifesto) {
        itens.push(
          mkErro('CAMINHO_ORIGINAL_DIVERGENTE', 'Caminho original no arquivo difere do manifesto.', opts),
        );
      }
    }

    // Check ordem divergente
    if (ordemManifesto !== null) {
      const ordemTexto = extrairValorLista(conteudo, 'Ordem narrativa');
      if (ordemTexto !== null) {
        const ordemNum = Number(ordemTexto);
        if (!Number.isFinite(ordemNum) || ordemNum !== ordemManifesto) {
          itens.push(
            mkErro(
              'ORDEM_DIVERGENTE',
              `Ordem narrativa no arquivo difere do manifesto: esperado "${String(ordemManifesto)}", encontrado "${ordemTexto}".`,
              opts,
            ),
          );
        }
      }
    }

    // Check sinopse section
    const { sinopse, duplicada } = extrairSinopse(conteudo);

    if (duplicada) {
      itens.push(
        mkErro('SECAO_SINOPSE_DUPLICADA', 'Arquivo Scrivener com seção "## Sinopse de escrita" duplicada.', opts),
      );
    }

    if (sinopse === null) {
      itens.push(mkAviso('SEM_SECAO_SINOPSE', 'Arquivo Scrivener sem seção "## Sinopse de escrita".', opts));
    }

    // Check Observações estruturais section
    if (!temSecaoExata(conteudo, '## Observações estruturais')) {
      itens.push(mkAviso('SEM_OBSERVACOES', 'Arquivo Scrivener sem seção "## Observações estruturais".', opts));
    }

    // Check tipo
    if (!TIPOS_EVENTO.has(tipoEntrada)) {
      itens.push(mkAviso('TIPO_DESCONHECIDO', `Tipo desconhecido no manifesto: "${tipoEntrada}".`, opts));
    } else {
      if (tipoEntrada === 'evento_posicionado' && ordemManifesto === null) {
        itens.push(mkAviso('EVENTO_SEM_ORDEM', 'Evento posicionado sem ordemNarrativa no manifesto.', opts));
      }
      totalAuditados++;
    }

    // Block analysis in original note
    if (notaConteudo !== undefined && idManifesto !== '') {
      const analise = analisarBlocos(notaConteudo, idManifesto);

      if (analise.multiplos) {
        itens.push(
          mkErro('MULTIPLOS_BLOCOS', `Nota original contém múltiplos blocos controlados para o ID "${idManifesto}".`, opts),
        );
      } else {
        if (analise.startSemEnd) {
          itens.push(
            mkErro('BLOCO_START_SEM_END', `Bloco com START sem END correspondente para o ID "${idManifesto}".`, opts),
          );
        }
        if (analise.endSemStart) {
          itens.push(
            mkErro('BLOCO_END_SEM_START', `Bloco com END sem START correspondente para o ID "${idManifesto}".`, opts),
          );
        }
      }

      if (!analise.multiplos && !analise.startSemEnd && !analise.endSemStart) {
        if (analise.temBlocoValido) {
          filePathsComBloco.add(filePathManifesto);

          // Check what's in the block vs sinopse
          if (sinopse === null || sinopse.trim() === '') {
            itens.push(mkErro('BLOCO_PARA_SINOPSE_VAZIA', 'Bloco controlado presente na nota mas sinopse do Scrivener está vazia.', opts));
          } else if (!ehSinopsePreenchida(sinopse)) {
            itens.push(mkErro('BLOCO_PARA_PLACEHOLDER', 'Bloco controlado presente na nota mas sinopse do Scrivener é apenas placeholder.', opts));
          } else {
            const blocoProposto = construirBloco(idManifesto, sinopse);
            if (notaConteudo.includes(blocoProposto)) {
              const backup = backupsMap.get(filePathManifesto);
              const backupOpts = buildOpts(
                caminho,
                idManifesto,
                filePathManifesto,
                backup !== undefined ? backup.caminhoBackup : undefined,
              );
              itens.push(mkOk('BLOCO_IDENTICO', 'Sinopse preenchida e bloco controlado idêntico na nota.', backupOpts));
              if (backup !== undefined) {
                itens.push(
                  mkOk('BACKUP_PRESENTE', 'Backup presente para nota com bloco controlado.', backupOpts),
                );
              } else {
                itens.push(mkAviso('BLOCO_SEM_BACKUP', 'Bloco controlado presente na nota mas sem backup correspondente.', opts));
              }
            } else {
              itens.push(mkErro('BLOCO_DIVERGENTE', 'Bloco controlado presente na nota mas conteúdo difere da sinopse do Scrivener.', opts));
            }
          }
        } else {
          // No valid block in note
          if (sinopse !== null && ehSinopsePreenchida(sinopse)) {
            itens.push(mkAviso('SINOPSE_SEM_BLOCO', 'Sinopse preenchida no Scrivener mas sem bloco controlado na nota.', opts));
          } else {
            itens.push(mkOk('PLACEHOLDER_SEM_BLOCO', 'Sinopse vazia ou placeholder sem bloco controlado na nota.', opts));
          }
        }
      }
    }
  }

  // ── Post-loop: backup checks ────────────────────────────────────────────────
  for (const backup of dados.backups) {
    const fp = backup.filePathOriginal;
    const backupOpts: ItemOptsMutable = { caminhoBackup: backup.caminhoBackup };
    if (fp !== '') backupOpts.filePathOriginal = fp;

    if (fp === '' || !manifestoFilePaths.has(fp)) {
      itens.push(mkAviso('BACKUP_SEM_MANIFESTO', 'Backup sem entrada correspondente no manifesto.', backupOpts));
    } else if (!filePathsComBloco.has(fp)) {
      itens.push(
        mkAviso('BACKUP_SEM_BLOCO', 'Backup presente mas nota original não possui bloco controlado.', {
          ...backupOpts,
          filePathOriginal: fp,
        }),
      );
    }
  }

  // ── Final OK: quantity ──────────────────────────────────────────────────────
  itens.push(mkOk('QUANTIDADE_AUDITADA', `${totalAuditados} evento(s) auditado(s).`));

  return buildResult(itens, dados.geradoEm);
}
