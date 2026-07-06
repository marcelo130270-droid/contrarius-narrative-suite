// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

export interface ArquivoScrivenerAplicacaoControlada {
  readonly caminhoRelativo: string;
  readonly conteudo: string;
}

export interface NotaOriginalAplicacaoControlada {
  readonly filePath: string;
  readonly conteudo: string;
}

export interface DadosAplicacaoControladaScrivener {
  readonly manifestoJson: string;
  readonly arquivosScrivener: readonly ArquivoScrivenerAplicacaoControlada[];
  readonly notasOriginais: readonly NotaOriginalAplicacaoControlada[];
  readonly geradoEm: string;
}

export type TipoAlteracaoAplicacaoControladaScrivener =
  | 'inserir_bloco_sinopse'
  | 'substituir_bloco_sinopse';

export interface AlteracaoAplicacaoControladaScrivener {
  readonly tipo: TipoAlteracaoAplicacaoControladaScrivener;
  readonly idEvento: string;
  readonly titulo: string;
  readonly caminhoScrivener: string;
  readonly filePathOriginal: string;
  readonly sinopseExtraida: string;
  readonly blocoProposto: string;
  readonly conteudoOriginal: string;
  readonly conteudoAtualizado: string;
}

export interface BloqueioAplicacaoControladaScrivener {
  readonly codigo: string;
  readonly mensagem: string;
  readonly idEvento?: string;
  readonly caminhoScrivener?: string;
  readonly filePathOriginal?: string;
}

export interface SemAcaoAplicacaoControladaScrivener {
  readonly codigo: string;
  readonly mensagem: string;
  readonly idEvento?: string;
  readonly caminhoScrivener?: string;
  readonly filePathOriginal?: string;
}

export interface ResultadoAplicacaoControladaScrivener {
  readonly podeAplicar: boolean;
  readonly alteracoes: readonly AlteracaoAplicacaoControladaScrivener[];
  readonly bloqueios: readonly BloqueioAplicacaoControladaScrivener[];
  readonly semAcao: readonly SemAcaoAplicacaoControladaScrivener[];
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

function inserirBlocoNoFim(conteudoOriginal: string, novoBloco: string): string {
  const base = conteudoOriginal.endsWith('\n') ? conteudoOriginal : conteudoOriginal + '\n';
  const resultado = base + novoBloco;
  return resultado.endsWith('\n') ? resultado : resultado + '\n';
}

function substituirBlocoNota(conteudoOriginal: string, id: string, novoBloco: string): string {
  const startTag = `<!-- CONTRARIUS:SCRIVENER-SINOPSE:START id="${id}" -->`;
  const endTag = `<!-- CONTRARIUS:SCRIVENER-SINOPSE:END id="${id}" -->`;
  const linhas = conteudoOriginal.split('\n');

  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i] === startTag && startIdx === -1) startIdx = i;
    if (linhas[i] === endTag && endIdx === -1) endIdx = i;
  }

  const antesLinhas = linhas.slice(0, startIdx);
  const depoisLinhas = linhas.slice(endIdx + 1);
  const antes = antesLinhas.join('\n');
  const depois = depoisLinhas.join('\n');
  const prefixo = antes !== '' ? antes + '\n' : '';
  const resultado = prefixo + novoBloco + depois;
  return resultado.endsWith('\n') ? resultado : resultado + '\n';
}

// ─── Item builders ────────────────────────────────────────────────────────────

type ItemOpts = {
  readonly idEvento?: string;
  readonly caminhoScrivener?: string;
  readonly filePathOriginal?: string;
};

function mkBloqueio(
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): BloqueioAplicacaoControladaScrivener {
  const r: {
    codigo: string;
    mensagem: string;
    idEvento?: string;
    caminhoScrivener?: string;
    filePathOriginal?: string;
  } = { codigo, mensagem };
  if (opts !== undefined) {
    if (opts.idEvento !== undefined) r.idEvento = opts.idEvento;
    if (opts.caminhoScrivener !== undefined) r.caminhoScrivener = opts.caminhoScrivener;
    if (opts.filePathOriginal !== undefined) r.filePathOriginal = opts.filePathOriginal;
  }
  return r;
}

function mkSemAcao(
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): SemAcaoAplicacaoControladaScrivener {
  const r: {
    codigo: string;
    mensagem: string;
    idEvento?: string;
    caminhoScrivener?: string;
    filePathOriginal?: string;
  } = { codigo, mensagem };
  if (opts !== undefined) {
    if (opts.idEvento !== undefined) r.idEvento = opts.idEvento;
    if (opts.caminhoScrivener !== undefined) r.caminhoScrivener = opts.caminhoScrivener;
    if (opts.filePathOriginal !== undefined) r.filePathOriginal = opts.filePathOriginal;
  }
  return r;
}

function baseOpts(caminho: string, id: string, filePath: string): ItemOpts {
  const r: { caminhoScrivener: string; idEvento?: string; filePathOriginal?: string } = {
    caminhoScrivener: caminho,
  };
  if (id !== '') r.idEvento = id;
  if (filePath !== '') r.filePathOriginal = filePath;
  return r;
}

// ─── Report ───────────────────────────────────────────────────────────────────

function gerarRelatorio(
  geradoEm: string,
  alteracoes: readonly AlteracaoAplicacaoControladaScrivener[],
  bloqueios: readonly BloqueioAplicacaoControladaScrivener[],
  semAcao: readonly SemAcaoAplicacaoControladaScrivener[],
): string {
  const l: string[] = [
    '# Aplicação controlada Scrivener',
    '',
    `Gerado em: ${geradoEm}`,
    '',
    'Nenhum frontmatter deve ser alterado por esta aplicação.',
    '',
    '## Resumo',
    '',
    `- Alterações: ${alteracoes.length}`,
    `- Bloqueios: ${bloqueios.length}`,
    `- Sem ação: ${semAcao.length}`,
    '',
  ];

  if (bloqueios.length > 0) {
    l.push('**Esta aplicação está BLOQUEADA. Nenhuma nota será alterada.**', '');
  }

  if (alteracoes.length > 0) {
    l.push('## Alterações', '');
    for (const alt of alteracoes) {
      const heading =
        alt.titulo !== ''
          ? alt.titulo
          : alt.idEvento !== ''
            ? alt.idEvento
            : alt.caminhoScrivener;
      l.push(`### ${heading}`, '');
      if (alt.idEvento !== '') l.push(`- ID: ${alt.idEvento}`);
      const tipoLabel =
        alt.tipo === 'inserir_bloco_sinopse' ? 'Inserção' : 'Substituição';
      l.push(`- Tipo: ${tipoLabel}`);
      l.push(`- Arquivo Scrivener: \`${alt.caminhoScrivener}\``);
      l.push(`- Nota original: ${alt.filePathOriginal}`);
      l.push('');
    }
  }

  if (bloqueios.length > 0) {
    l.push('## Bloqueios', '');
    for (const b of bloqueios) {
      let s = `- **${b.codigo}**: ${b.mensagem}`;
      if (b.caminhoScrivener !== undefined) s += ` Arquivo: \`${b.caminhoScrivener}\`.`;
      if (b.idEvento !== undefined) s += ` ID: \`${b.idEvento}\`.`;
      l.push(s);
    }
    l.push('');
  }

  if (semAcao.length > 0) {
    l.push('## Sem ação', '');
    for (const sa of semAcao) {
      let s = `- **${sa.codigo}**: ${sa.mensagem}`;
      if (sa.caminhoScrivener !== undefined) s += ` Arquivo: \`${sa.caminhoScrivener}\`.`;
      l.push(s);
    }
    l.push('');
  }

  const joined = l.join('\n');
  return joined.endsWith('\n') ? joined : `${joined}\n`;
}

// ─── Result builder ───────────────────────────────────────────────────────────

function buildResult(
  alteracoes: readonly AlteracaoAplicacaoControladaScrivener[],
  bloqueios: readonly BloqueioAplicacaoControladaScrivener[],
  semAcao: readonly SemAcaoAplicacaoControladaScrivener[],
  geradoEm: string,
): ResultadoAplicacaoControladaScrivener {
  return {
    podeAplicar: bloqueios.length === 0,
    alteracoes: [...alteracoes],
    bloqueios: [...bloqueios],
    semAcao: [...semAcao],
    relatorioMarkdown: gerarRelatorio(geradoEm, alteracoes, bloqueios, semAcao),
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function gerarAplicacaoControladaScrivener(
  dados: DadosAplicacaoControladaScrivener,
): ResultadoAplicacaoControladaScrivener {
  const alteracoes: AlteracaoAplicacaoControladaScrivener[] = [];
  const bloqueios: BloqueioAplicacaoControladaScrivener[] = [];
  const semAcao: SemAcaoAplicacaoControladaScrivener[] = [];

  let manifestoRaw: unknown;
  try {
    manifestoRaw = JSON.parse(dados.manifestoJson);
  } catch {
    bloqueios.push(mkBloqueio('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um JSON válido.'));
    return buildResult(alteracoes, bloqueios, semAcao, dados.geradoEm);
  }

  if (!isRecord(manifestoRaw)) {
    bloqueios.push(mkBloqueio('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um objeto JSON.'));
    return buildResult(alteracoes, bloqueios, semAcao, dados.geradoEm);
  }

  if (manifestoRaw['tipo'] !== TIPO_ESPERADO) {
    bloqueios.push(
      mkBloqueio('MANIFESTO_TIPO_INVALIDO', `Tipo do manifesto inválido: deve ser "${TIPO_ESPERADO}".`),
    );
    return buildResult(alteracoes, bloqueios, semAcao, dados.geradoEm);
  }

  const arquivosRaw = manifestoRaw['arquivos'];
  if (!isArray(arquivosRaw)) {
    bloqueios.push(
      mkBloqueio('MANIFESTO_SEM_ARRAY_ARQUIVOS', 'O manifesto não contém um array "arquivos".'),
    );
    return buildResult(alteracoes, bloqueios, semAcao, dados.geradoEm);
  }

  const scrivenerMap = new Map<string, string>();
  for (const arq of dados.arquivosScrivener) {
    scrivenerMap.set(arq.caminhoRelativo, arq.conteudo);
  }

  const notasMap = new Map<string, string>();
  for (const nota of dados.notasOriginais) {
    notasMap.set(nota.filePath, nota.conteudo);
  }

  // Pre-scan for duplicate filePaths
  const filePathContagem = new Map<string, number>();
  for (const entradaRaw of arquivosRaw) {
    if (!isRecord(entradaRaw)) continue;
    const fp = typeof entradaRaw['filePath'] === 'string' ? entradaRaw['filePath'].trim() : '';
    if (fp !== '') filePathContagem.set(fp, (filePathContagem.get(fp) ?? 0) + 1);
  }
  const filePathsDuplicados = new Set<string>();
  filePathContagem.forEach((count, fp) => {
    if (count > 1) filePathsDuplicados.add(fp);
  });

  for (const entradaRaw of arquivosRaw) {
    if (!isRecord(entradaRaw)) continue;

    const caminhoRaw = entradaRaw['caminhoRelativo'];
    if (typeof caminhoRaw !== 'string' || caminhoRaw === '') {
      bloqueios.push(mkBloqueio('ITEM_SEM_CAMINHO', 'Item do manifesto sem caminho relativo.'));
      continue;
    }
    const caminho = caminhoRaw;

    const idManifesto = typeof entradaRaw['id'] === 'string' ? entradaRaw['id'] : '';
    const tituloManifesto = typeof entradaRaw['titulo'] === 'string' ? entradaRaw['titulo'] : '';
    const filePathManifesto = typeof entradaRaw['filePath'] === 'string' ? entradaRaw['filePath'] : '';
    const tipoEntrada = typeof entradaRaw['tipo'] === 'string' ? entradaRaw['tipo'] : '';
    const ordRaw = entradaRaw['ordemNarrativa'];
    const ordemManifesto =
      typeof ordRaw === 'number' && Number.isFinite(ordRaw) ? ordRaw : null;

    const opts = baseOpts(caminho, idManifesto, filePathManifesto);
    const isEventoTipoConhecido = TIPOS_EVENTO.has(tipoEntrada);

    if (!scrivenerMap.has(caminho)) {
      bloqueios.push(
        mkBloqueio(
          'ARQUIVO_AUSENTE',
          `Arquivo Scrivener listado no manifesto está ausente: "${caminho}".`,
          opts,
        ),
      );
      continue;
    }

    const conteudo = scrivenerMap.get(caminho)!;
    let hasBlocker = false;

    const suspeito = detectarSuspeito(conteudo);
    if (suspeito !== null) {
      bloqueios.push(
        mkBloqueio('CONTEUDO_SUSPEITO', `Arquivo contém valor suspeito: "${suspeito}".`, opts),
      );
      hasBlocker = true;
    }

    if (filePathManifesto.trim() !== '' && filePathsDuplicados.has(filePathManifesto.trim())) {
      bloqueios.push(
        mkBloqueio(
          'DOIS_ITENS_MESMA_NOTA',
          'Dois itens do manifesto apontam para a mesma nota original.',
          opts,
        ),
      );
      hasBlocker = true;
    }

    if (filePathManifesto.trim() !== '' && !notasMap.has(filePathManifesto)) {
      bloqueios.push(
        mkBloqueio(
          'NOTA_ORIGINAL_AUSENTE',
          `Nota original não encontrada: "${filePathManifesto}".`,
          opts,
        ),
      );
      hasBlocker = true;
    }

    const idCorpo = extrairValorLista(conteudo, 'ID');
    if (idCorpo !== null && idManifesto !== '' && idCorpo !== idManifesto) {
      bloqueios.push(
        mkBloqueio(
          'ID_DIVERGENTE',
          `ID no arquivo difere do manifesto: esperado "${idManifesto}", encontrado "${idCorpo}".`,
          opts,
        ),
      );
      hasBlocker = true;
    }

    if (filePathManifesto.trim() !== '') {
      const caminhoOrigCorpo = extrairValorLista(conteudo, 'Caminho original');
      if (caminhoOrigCorpo !== null && caminhoOrigCorpo !== filePathManifesto.trim()) {
        bloqueios.push(
          mkBloqueio('CAMINHO_ORIGINAL_DIVERGENTE', 'Caminho original no arquivo difere do manifesto.', opts),
        );
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
          bloqueios.push(
            mkBloqueio(
              'ORDEM_DIVERGENTE',
              `Ordem narrativa no arquivo difere do manifesto: esperado "${String(ordemManifesto)}", encontrado "${ordemTexto}".`,
              opts,
            ),
          );
          hasBlocker = true;
        }
      }
    }

    const { sinopse, duplicada } = extrairSinopse(conteudo);

    if (duplicada) {
      bloqueios.push(
        mkBloqueio(
          'SECAO_SINOPSE_DUPLICADA',
          'Arquivo Scrivener com seção "## Sinopse de escrita" duplicada.',
          opts,
        ),
      );
      hasBlocker = true;
    }

    if (sinopse !== null && sinopse.length > LIMITE_SINOPSE) {
      bloqueios.push(
        mkBloqueio(
          'SINOPSE_MUITO_LONGA',
          `Sinopse extraída excede ${LIMITE_SINOPSE} caracteres.`,
          opts,
        ),
      );
      hasBlocker = true;
    }

    const notaConteudo =
      filePathManifesto.trim() !== '' ? notasMap.get(filePathManifesto) : undefined;
    let analise: AnaliseBlocos | null = null;

    if (notaConteudo !== undefined) {
      for (const marcador of MARCADORES_CONFLITO) {
        if (notaConteudo.includes(marcador)) {
          bloqueios.push(
            mkBloqueio(
              'CONFLITO_NA_NOTA',
              `Nota original contém marcador de conflito: "${marcador}".`,
              opts,
            ),
          );
          hasBlocker = true;
          break;
        }
      }

      if (idManifesto !== '') {
        analise = analisarBlocos(notaConteudo, idManifesto);
        if (analise.multiplos) {
          bloqueios.push(
            mkBloqueio(
              'MULTIPLOS_BLOCOS',
              `Nota original contém múltiplos blocos controlados para o ID "${idManifesto}".`,
              opts,
            ),
          );
          hasBlocker = true;
        } else {
          if (analise.startSemEnd) {
            bloqueios.push(
              mkBloqueio(
                'BLOCO_START_SEM_END',
                `Nota original com bloco controlado START sem END correspondente para o ID "${idManifesto}".`,
                opts,
              ),
            );
            hasBlocker = true;
          }
          if (analise.endSemStart) {
            bloqueios.push(
              mkBloqueio(
                'BLOCO_END_SEM_START',
                `Nota original com bloco controlado END sem START correspondente para o ID "${idManifesto}".`,
                opts,
              ),
            );
            hasBlocker = true;
          }
        }
      }
    }

    if (hasBlocker) continue;

    if (!isEventoTipoConhecido) {
      semAcao.push(mkSemAcao('NAO_IMPORTAVEL', 'Arquivo não é um Evento importável.', opts));
      continue;
    }

    if (filePathManifesto.trim() === '') {
      semAcao.push(
        mkSemAcao('NAO_IMPORTAVEL', 'Arquivo sem caminho de nota original no manifesto.', opts),
      );
      continue;
    }

    if (sinopse === null || !ehSinopsePreenchida(sinopse)) {
      const msg =
        sinopse === null
          ? 'Sinopse ausente.'
          : sinopse.trim() === ''
            ? 'Sinopse vazia.'
            : 'Sinopse contém apenas placeholder.';
      semAcao.push(mkSemAcao('SEM_ACAO_SINOPSE', msg, opts));
      continue;
    }

    const blocoProposto = construirBloco(idManifesto, sinopse);
    const notaConteudoDefinido = notasMap.get(filePathManifesto)!;

    if (notaConteudoDefinido.includes(blocoProposto)) {
      semAcao.push(
        mkSemAcao('SINOPSE_JA_NO_BLOCO', 'Sinopse já presente exatamente no bloco controlado existente.', opts),
      );
      continue;
    }

    let tipo: TipoAlteracaoAplicacaoControladaScrivener;
    let conteudoAtualizado: string;

    if (analise !== null && analise.temBlocoValido) {
      tipo = 'substituir_bloco_sinopse';
      conteudoAtualizado = substituirBlocoNota(notaConteudoDefinido, idManifesto, blocoProposto);
    } else {
      tipo = 'inserir_bloco_sinopse';
      conteudoAtualizado = inserirBlocoNoFim(notaConteudoDefinido, blocoProposto);
    }

    alteracoes.push({
      tipo,
      idEvento: idManifesto,
      titulo: tituloManifesto,
      caminhoScrivener: caminho,
      filePathOriginal: filePathManifesto,
      sinopseExtraida: sinopse,
      blocoProposto,
      conteudoOriginal: notaConteudoDefinido,
      conteudoAtualizado,
    });
  }

  return buildResult(alteracoes, bloqueios, semAcao, dados.geradoEm);
}
