// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

export interface ArquivoScrivenerPreviaAplicacao {
  readonly caminhoRelativo: string;
  readonly conteudo: string;
}

export interface NotaOriginalPreviaAplicacao {
  readonly filePath: string;
  readonly conteudo: string;
}

export interface DadosPreviaAplicacaoScrivener {
  readonly manifestoJson: string;
  readonly arquivosScrivener: readonly ArquivoScrivenerPreviaAplicacao[];
  readonly notasOriginais: readonly NotaOriginalPreviaAplicacao[];
  readonly geradoEm: string;
}

export type TipoOperacaoPreviaAplicacaoScrivener =
  | 'inserir_bloco_sinopse'
  | 'substituir_bloco_sinopse'
  | 'bloqueado'
  | 'sem_acao';

export interface OperacaoPreviaAplicacaoScrivener {
  readonly tipo: TipoOperacaoPreviaAplicacaoScrivener;
  readonly codigo: string;
  readonly mensagem: string;
  readonly idEvento?: string;
  readonly titulo?: string;
  readonly caminhoScrivener?: string;
  readonly filePathOriginal?: string;
  readonly sinopseExtraida?: string;
  readonly blocoProposto?: string;
}

export interface ResultadoPreviaAplicacaoScrivener {
  readonly validoParaAplicacaoFutura: boolean;
  readonly operacoes: readonly OperacaoPreviaAplicacaoScrivener[];
  readonly insercoes: readonly OperacaoPreviaAplicacaoScrivener[];
  readonly substituicoes: readonly OperacaoPreviaAplicacaoScrivener[];
  readonly bloqueados: readonly OperacaoPreviaAplicacaoScrivener[];
  readonly semAcao: readonly OperacaoPreviaAplicacaoScrivener[];
  readonly relatorioMarkdown: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_ESPERADO = 'contrarius-scrivener-export';
const PLACEHOLDER = '[preencher no Scrivener]';
const LIMITE_SINOPSE = 20000;
const STRINGS_SUSPEITAS: readonly string[] = ['undefined', '[object Object]', 'NaN', 'Infinity'];
const MARCADORES_CONFLITO: readonly string[] = ['<<<<<<<', '=======', '>>>>>>>'];
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
    if (linhas[i] === startTag) {
      startCount++;
      if (startFirst < 0) startFirst = i;
    }
    if (linhas[i] === endTag) {
      endCount++;
      if (endFirst < 0) endFirst = i;
    }
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

  // Both exactly 1 — check ordering
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

// ─── Operation builder ────────────────────────────────────────────────────────

type OpOpts = {
  readonly idEvento?: string;
  readonly titulo?: string;
  readonly caminhoScrivener?: string;
  readonly filePathOriginal?: string;
  readonly sinopseExtraida?: string;
  readonly blocoProposto?: string;
};

function mkOp(
  tipo: TipoOperacaoPreviaAplicacaoScrivener,
  codigo: string,
  mensagem: string,
  opts?: OpOpts,
): OperacaoPreviaAplicacaoScrivener {
  const r: {
    tipo: TipoOperacaoPreviaAplicacaoScrivener;
    codigo: string;
    mensagem: string;
    idEvento?: string;
    titulo?: string;
    caminhoScrivener?: string;
    filePathOriginal?: string;
    sinopseExtraida?: string;
    blocoProposto?: string;
  } = { tipo, codigo, mensagem };
  if (opts !== undefined) {
    if (opts.idEvento !== undefined) r.idEvento = opts.idEvento;
    if (opts.titulo !== undefined) r.titulo = opts.titulo;
    if (opts.caminhoScrivener !== undefined) r.caminhoScrivener = opts.caminhoScrivener;
    if (opts.filePathOriginal !== undefined) r.filePathOriginal = opts.filePathOriginal;
    if (opts.sinopseExtraida !== undefined) r.sinopseExtraida = opts.sinopseExtraida;
    if (opts.blocoProposto !== undefined) r.blocoProposto = opts.blocoProposto;
  }
  return r;
}

function baseOpts(
  caminho: string,
  idManifesto: string,
  tituloManifesto: string,
  filePathManifesto: string,
): OpOpts {
  const r: {
    caminhoScrivener: string;
    idEvento?: string;
    titulo?: string;
    filePathOriginal?: string;
  } = { caminhoScrivener: caminho };
  if (idManifesto !== '') r.idEvento = idManifesto;
  if (tituloManifesto !== '') r.titulo = tituloManifesto;
  if (filePathManifesto !== '') r.filePathOriginal = filePathManifesto;
  return r;
}

// ─── Report ───────────────────────────────────────────────────────────────────

function renderOpProposta(l: string[], op: OperacaoPreviaAplicacaoScrivener): void {
  const heading =
    op.titulo !== undefined
      ? op.titulo
      : op.idEvento !== undefined
        ? op.idEvento
        : op.caminhoScrivener !== undefined
          ? op.caminhoScrivener
          : '(sem título)';
  l.push(`### ${heading}`, '');
  if (op.idEvento !== undefined) l.push(`- ID: ${op.idEvento}`);
  if (op.titulo !== undefined) l.push(`- Título: ${op.titulo}`);
  if (op.caminhoScrivener !== undefined) l.push(`- Arquivo Scrivener: \`${op.caminhoScrivener}\``);
  if (op.filePathOriginal !== undefined) l.push(`- Nota original: ${op.filePathOriginal}`);
  if (op.blocoProposto !== undefined) {
    l.push('', '**Bloco proposto:**', '', '```markdown', op.blocoProposto.trimEnd(), '```');
  }
  l.push('');
}

function gerarRelatorio(
  geradoEm: string,
  insercoes: readonly OperacaoPreviaAplicacaoScrivener[],
  substituicoes: readonly OperacaoPreviaAplicacaoScrivener[],
  bloqueados: readonly OperacaoPreviaAplicacaoScrivener[],
  semAcao: readonly OperacaoPreviaAplicacaoScrivener[],
): string {
  const l: string[] = [
    '# Prévia de aplicação Scrivener',
    '',
    `Gerado em: ${geradoEm}`,
    '',
    'Nenhuma nota do Vault foi alterada por esta prévia.',
    '',
    'Esta prévia não é uma importação.',
    '',
    '## Resumo',
    '',
    `- Inserções: ${insercoes.length}`,
    `- Substituições: ${substituicoes.length}`,
    `- Bloqueados: ${bloqueados.length}`,
    `- Sem ação: ${semAcao.length}`,
    '',
  ];

  if (insercoes.length > 0) {
    l.push('## Inserções propostas', '');
    for (const op of insercoes) renderOpProposta(l, op);
  }

  if (substituicoes.length > 0) {
    l.push('## Substituições propostas', '');
    for (const op of substituicoes) renderOpProposta(l, op);
  }

  if (bloqueados.length > 0) {
    l.push('## Bloqueados', '');
    for (const op of bloqueados) {
      let s = `- **${op.codigo}**: ${op.mensagem}`;
      if (op.caminhoScrivener !== undefined) s += ` Arquivo: \`${op.caminhoScrivener}\`.`;
      if (op.idEvento !== undefined) s += ` ID: \`${op.idEvento}\`.`;
      l.push(s);
    }
    l.push('');
  }

  if (semAcao.length > 0) {
    l.push('## Sem ação', '');
    for (const op of semAcao) {
      let s = `- **${op.codigo}**: ${op.mensagem}`;
      if (op.caminhoScrivener !== undefined) s += ` Arquivo: \`${op.caminhoScrivener}\`.`;
      l.push(s);
    }
    l.push('');
  }

  const joined = l.join('\n');
  return joined.endsWith('\n') ? joined : `${joined}\n`;
}

// ─── Result builder ───────────────────────────────────────────────────────────

function buildResult(
  validoParaAplicacaoFutura: boolean,
  operacoes: readonly OperacaoPreviaAplicacaoScrivener[],
  geradoEm: string,
): ResultadoPreviaAplicacaoScrivener {
  const insercoes = operacoes.filter((o) => o.tipo === 'inserir_bloco_sinopse');
  const substituicoes = operacoes.filter((o) => o.tipo === 'substituir_bloco_sinopse');
  const bloqueados = operacoes.filter((o) => o.tipo === 'bloqueado');
  const semAcao = operacoes.filter((o) => o.tipo === 'sem_acao');
  return {
    validoParaAplicacaoFutura,
    operacoes: [...operacoes],
    insercoes,
    substituicoes,
    bloqueados,
    semAcao,
    relatorioMarkdown: gerarRelatorio(geradoEm, insercoes, substituicoes, bloqueados, semAcao),
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function gerarPreviaAplicacaoScrivener(
  dados: DadosPreviaAplicacaoScrivener,
): ResultadoPreviaAplicacaoScrivener {
  const operacoes: OperacaoPreviaAplicacaoScrivener[] = [];

  let manifestoRaw: unknown;
  try {
    manifestoRaw = JSON.parse(dados.manifestoJson);
  } catch {
    operacoes.push(mkOp('bloqueado', 'MANIFESTO_JSON_INVALIDO', 'O manifesto não é um JSON válido.'));
    return buildResult(false, operacoes, dados.geradoEm);
  }

  if (!isRecord(manifestoRaw)) {
    operacoes.push(mkOp('bloqueado', 'MANIFESTO_JSON_INVALIDO', 'O manifesto não é um objeto JSON.'));
    return buildResult(false, operacoes, dados.geradoEm);
  }

  if (manifestoRaw['tipo'] !== TIPO_ESPERADO) {
    operacoes.push(
      mkOp('bloqueado', 'MANIFESTO_TIPO_INVALIDO', `Tipo do manifesto inválido: deve ser "${TIPO_ESPERADO}".`),
    );
    return buildResult(false, operacoes, dados.geradoEm);
  }

  const arquivosRaw = manifestoRaw['arquivos'];
  if (!isArray(arquivosRaw)) {
    operacoes.push(mkOp('bloqueado', 'MANIFESTO_SEM_ARRAY_ARQUIVOS', 'O manifesto não contém um array "arquivos".'));
    return buildResult(false, operacoes, dados.geradoEm);
  }

  const scrivenerMap = new Map<string, string>();
  for (const arq of dados.arquivosScrivener) {
    scrivenerMap.set(arq.caminhoRelativo, arq.conteudo);
  }

  const notasMap = new Map<string, string>();
  for (const nota of dados.notasOriginais) {
    notasMap.set(nota.filePath, nota.conteudo);
  }

  for (const entradaRaw of arquivosRaw) {
    if (!isRecord(entradaRaw)) continue;

    const caminhoRaw = entradaRaw['caminhoRelativo'];
    if (typeof caminhoRaw !== 'string' || caminhoRaw === '') {
      operacoes.push(mkOp('bloqueado', 'ITEM_SEM_CAMINHO', 'Item do manifesto sem caminho relativo.'));
      continue;
    }
    const caminho = caminhoRaw;

    const idManifesto = typeof entradaRaw['id'] === 'string' ? entradaRaw['id'] : '';
    const tituloManifesto = typeof entradaRaw['titulo'] === 'string' ? entradaRaw['titulo'] : '';
    const filePathManifesto = typeof entradaRaw['filePath'] === 'string' ? entradaRaw['filePath'] : '';
    const tipoEntrada = typeof entradaRaw['tipo'] === 'string' ? entradaRaw['tipo'] : '';
    const ordRaw = entradaRaw['ordemNarrativa'];
    const ordemManifesto = typeof ordRaw === 'number' && Number.isFinite(ordRaw) ? ordRaw : null;

    const opts = baseOpts(caminho, idManifesto, tituloManifesto, filePathManifesto);
    const isEventoTipoConhecido = TIPOS_EVENTO.has(tipoEntrada);

    if (!scrivenerMap.has(caminho)) {
      operacoes.push(
        mkOp('bloqueado', 'ARQUIVO_AUSENTE', `Arquivo Scrivener listado no manifesto está ausente: "${caminho}".`, opts),
      );
      continue;
    }

    const conteudo = scrivenerMap.get(caminho)!;
    let hasBlocker = false;

    const suspeito = detectarSuspeito(conteudo);
    if (suspeito !== null) {
      operacoes.push(mkOp('bloqueado', 'CONTEUDO_SUSPEITO', `Arquivo contém valor suspeito: "${suspeito}".`, opts));
      hasBlocker = true;
    }

    if (filePathManifesto.trim() !== '' && !notasMap.has(filePathManifesto)) {
      operacoes.push(
        mkOp('bloqueado', 'NOTA_ORIGINAL_AUSENTE', `Nota original não encontrada: "${filePathManifesto}".`, opts),
      );
      hasBlocker = true;
    }

    const idCorpo = extrairValorLista(conteudo, 'ID');
    if (idCorpo !== null && idManifesto !== '' && idCorpo !== idManifesto) {
      operacoes.push(
        mkOp('bloqueado', 'ID_DIVERGENTE', `ID no arquivo difere do manifesto: esperado "${idManifesto}", encontrado "${idCorpo}".`, opts),
      );
      hasBlocker = true;
    }

    if (filePathManifesto.trim() !== '') {
      const caminhoOrigCorpo = extrairValorLista(conteudo, 'Caminho original');
      if (caminhoOrigCorpo !== null && caminhoOrigCorpo !== filePathManifesto.trim()) {
        operacoes.push(mkOp('bloqueado', 'CAMINHO_ORIGINAL_DIVERGENTE', 'Caminho original no arquivo difere do manifesto.', opts));
        hasBlocker = true;
      }
    }

    if (ordemManifesto !== null) {
      const ordemTexto = extrairValorLista(conteudo, 'Ordem narrativa');
      if (ordemTexto !== null) {
        const ordemNum = ordemTexto === 'sem ordem' ? null : Number(ordemTexto);
        const divergente =
          ordemTexto === 'sem ordem' ||
          ordemNum === null ||
          !Number.isFinite(ordemNum) ||
          ordemNum !== ordemManifesto;
        if (divergente) {
          operacoes.push(
            mkOp('bloqueado', 'ORDEM_DIVERGENTE', `Ordem narrativa no arquivo difere do manifesto: esperado "${String(ordemManifesto)}", encontrado "${ordemTexto}".`, opts),
          );
          hasBlocker = true;
        }
      }
    }

    const { sinopse, duplicada } = extrairSinopse(conteudo);

    if (duplicada) {
      operacoes.push(mkOp('bloqueado', 'SECAO_SINOPSE_DUPLICADA', 'Arquivo Scrivener com seção "## Sinopse de escrita" duplicada.', opts));
      hasBlocker = true;
    }

    if (sinopse !== null && sinopse.length > LIMITE_SINOPSE) {
      operacoes.push(
        mkOp('bloqueado', 'SINOPSE_MUITO_LONGA', `Sinopse extraída excede ${LIMITE_SINOPSE} caracteres.`, opts),
      );
      hasBlocker = true;
    }

    const notaConteudo =
      filePathManifesto.trim() !== '' ? notasMap.get(filePathManifesto) : undefined;
    let analise: AnaliseBlocos | null = null;

    if (notaConteudo !== undefined) {
      for (const marcador of MARCADORES_CONFLITO) {
        if (notaConteudo.includes(marcador)) {
          operacoes.push(
            mkOp('bloqueado', 'CONFLITO_NA_NOTA', `Nota original contém marcador de conflito: "${marcador}".`, opts),
          );
          hasBlocker = true;
          break;
        }
      }

      if (idManifesto !== '') {
        analise = analisarBlocos(notaConteudo, idManifesto);
        if (analise.multiplos) {
          operacoes.push(
            mkOp('bloqueado', 'MULTIPLOS_BLOCOS', `Nota original contém múltiplos blocos controlados para o ID "${idManifesto}".`, opts),
          );
          hasBlocker = true;
        } else {
          if (analise.startSemEnd) {
            operacoes.push(
              mkOp('bloqueado', 'BLOCO_START_SEM_END', `Nota original com bloco controlado START sem END correspondente para o ID "${idManifesto}".`, opts),
            );
            hasBlocker = true;
          }
          if (analise.endSemStart) {
            operacoes.push(
              mkOp('bloqueado', 'BLOCO_END_SEM_START', `Nota original com bloco controlado END sem START correspondente para o ID "${idManifesto}".`, opts),
            );
            hasBlocker = true;
          }
        }
      }
    }

    if (hasBlocker) continue;

    if (!isEventoTipoConhecido) {
      operacoes.push(mkOp('sem_acao', 'NAO_IMPORTAVEL', 'Arquivo não é um Evento importável.', opts));
      continue;
    }

    if (filePathManifesto.trim() === '') {
      operacoes.push(mkOp('sem_acao', 'NAO_IMPORTAVEL', 'Arquivo sem caminho de nota original no manifesto.', opts));
      continue;
    }

    if (sinopse === null || !ehSinopsePreenchida(sinopse)) {
      const msg =
        sinopse === null
          ? 'Sinopse ausente.'
          : sinopse.trim() === ''
            ? 'Sinopse vazia.'
            : 'Sinopse contém apenas placeholder.';
      operacoes.push(mkOp('sem_acao', 'SEM_ACAO_SINOPSE', msg, opts));
      continue;
    }

    const blocoProposto = construirBloco(idManifesto, sinopse);
    const notaConteudoDefinido = notasMap.get(filePathManifesto)!;

    if (notaConteudoDefinido.includes(blocoProposto)) {
      operacoes.push(
        mkOp('sem_acao', 'SINOPSE_JA_NO_BLOCO', 'Sinopse já presente exatamente no bloco controlado existente.', {
          ...opts,
          sinopseExtraida: sinopse,
        }),
      );
      continue;
    }

    if (analise !== null && analise.temBlocoValido) {
      operacoes.push(
        mkOp('substituir_bloco_sinopse', 'SUBSTITUIR_BLOCO', 'Bloco controlado existente com sinopse diferente da extraída.', {
          ...opts,
          sinopseExtraida: sinopse,
          blocoProposto,
        }),
      );
    } else {
      operacoes.push(
        mkOp('inserir_bloco_sinopse', 'INSERIR_BLOCO', 'Sinopse preenchida e bloco controlado ausente na nota original.', {
          ...opts,
          sinopseExtraida: sinopse,
          blocoProposto,
        }),
      );
    }
  }

  return buildResult(true, operacoes, dados.geradoEm);
}
