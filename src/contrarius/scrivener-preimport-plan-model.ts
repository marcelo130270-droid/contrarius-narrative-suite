// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

export interface ArquivoScrivenerPreImportacao {
  readonly caminhoRelativo: string;
  readonly conteudo: string;
}

export interface NotaOriginalPreImportacao {
  readonly filePath: string;
  readonly conteudo: string;
}

export interface DadosPlanoPreImportacaoScrivener {
  readonly manifestoJson: string;
  readonly arquivosScrivener: readonly ArquivoScrivenerPreImportacao[];
  readonly notasOriginais: readonly NotaOriginalPreImportacao[];
  readonly geradoEm: string;
}

export type TipoAcaoPreImportacaoScrivener =
  | 'sem_acao'
  | 'candidato_importar_sinopse'
  | 'revisar'
  | 'bloqueado';

export interface ItemPlanoPreImportacaoScrivener {
  readonly tipo: TipoAcaoPreImportacaoScrivener;
  readonly codigo: string;
  readonly mensagem: string;
  readonly idEvento?: string;
  readonly titulo?: string;
  readonly caminhoScrivener?: string;
  readonly filePathOriginal?: string;
  readonly sinopseExtraida?: string;
}

export interface ResultadoPlanoPreImportacaoScrivener {
  readonly validoParaPreImportacao: boolean;
  readonly itens: readonly ItemPlanoPreImportacaoScrivener[];
  readonly candidatos: readonly ItemPlanoPreImportacaoScrivener[];
  readonly bloqueados: readonly ItemPlanoPreImportacaoScrivener[];
  readonly revisoes: readonly ItemPlanoPreImportacaoScrivener[];
  readonly semAcao: readonly ItemPlanoPreImportacaoScrivener[];
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

function temSecao(conteudo: string, nome: string): boolean {
  return conteudo.split('\n').some((l) => l === `## ${nome}`);
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

// ─── Item builder ─────────────────────────────────────────────────────────────

type ItemOpts = {
  readonly idEvento?: string;
  readonly titulo?: string;
  readonly caminhoScrivener?: string;
  readonly filePathOriginal?: string;
  readonly sinopseExtraida?: string;
};

function mkItem(
  tipo: TipoAcaoPreImportacaoScrivener,
  codigo: string,
  mensagem: string,
  opts?: ItemOpts,
): ItemPlanoPreImportacaoScrivener {
  const r: {
    tipo: TipoAcaoPreImportacaoScrivener;
    codigo: string;
    mensagem: string;
    idEvento?: string;
    titulo?: string;
    caminhoScrivener?: string;
    filePathOriginal?: string;
    sinopseExtraida?: string;
  } = { tipo, codigo, mensagem };
  if (opts !== undefined) {
    if (opts.idEvento !== undefined) r.idEvento = opts.idEvento;
    if (opts.titulo !== undefined) r.titulo = opts.titulo;
    if (opts.caminhoScrivener !== undefined) r.caminhoScrivener = opts.caminhoScrivener;
    if (opts.filePathOriginal !== undefined) r.filePathOriginal = opts.filePathOriginal;
    if (opts.sinopseExtraida !== undefined) r.sinopseExtraida = opts.sinopseExtraida;
  }
  return r;
}

function baseOpts(
  caminho: string,
  idManifesto: string,
  tituloManifesto: string,
  filePathManifesto: string,
): ItemOpts {
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

function previa(s: string): string {
  return s.length > 200 ? `${s.slice(0, 200)}…` : s;
}

function gerarRelatorio(
  geradoEm: string,
  candidatos: readonly ItemPlanoPreImportacaoScrivener[],
  bloqueados: readonly ItemPlanoPreImportacaoScrivener[],
  revisoes: readonly ItemPlanoPreImportacaoScrivener[],
  semAcao: readonly ItemPlanoPreImportacaoScrivener[],
): string {
  const l: string[] = [
    '# Plano de pré-importação Scrivener',
    '',
    `Gerado em: ${geradoEm}`,
    '',
    '## Resumo',
    '',
    `- Candidatos: ${candidatos.length}`,
    `- Bloqueados: ${bloqueados.length}`,
    `- Revisões: ${revisoes.length}`,
    `- Sem ação: ${semAcao.length}`,
    '',
    'Nenhuma nota do Vault foi alterada por este plano.',
    '',
  ];

  if (candidatos.length > 0) {
    l.push('## Candidatos à importação de sinopse', '');
    for (const item of candidatos) {
      const h = item.titulo !== undefined
        ? item.titulo
        : item.idEvento !== undefined
          ? item.idEvento
          : item.caminhoScrivener !== undefined
            ? item.caminhoScrivener
            : '(sem título)';
      l.push(`### ${h}`, '');
      if (item.idEvento !== undefined) l.push(`- ID: ${item.idEvento}`);
      if (item.caminhoScrivener !== undefined) l.push(`- Arquivo Scrivener: \`${item.caminhoScrivener}\``);
      if (item.filePathOriginal !== undefined) l.push(`- Nota original: ${item.filePathOriginal}`);
      if (item.sinopseExtraida !== undefined && item.sinopseExtraida !== '') {
        l.push(`- Prévia: ${previa(item.sinopseExtraida)}`);
      }
      l.push('');
    }
  }

  if (bloqueados.length > 0) {
    l.push('## Bloqueados', '');
    for (const item of bloqueados) {
      let s = `- **${item.codigo}**: ${item.mensagem}`;
      if (item.caminhoScrivener !== undefined) s += ` Arquivo: \`${item.caminhoScrivener}\`.`;
      if (item.idEvento !== undefined) s += ` ID: \`${item.idEvento}\`.`;
      l.push(s);
    }
    l.push('');
  }

  if (revisoes.length > 0) {
    l.push('## Revisar manualmente', '');
    for (const item of revisoes) {
      let s = `- **${item.codigo}**: ${item.mensagem}`;
      if (item.caminhoScrivener !== undefined) s += ` Arquivo: \`${item.caminhoScrivener}\`.`;
      if (item.idEvento !== undefined) s += ` ID: \`${item.idEvento}\`.`;
      l.push(s);
    }
    l.push('');
  }

  if (semAcao.length > 0) {
    l.push('## Sem ação', '');
    for (const item of semAcao) {
      let s = `- **${item.codigo}**: ${item.mensagem}`;
      if (item.caminhoScrivener !== undefined) s += ` Arquivo: \`${item.caminhoScrivener}\`.`;
      l.push(s);
    }
    l.push('');
  }

  return l.join('\n');
}

// ─── Result builder ───────────────────────────────────────────────────────────

function buildResult(
  validoParaPreImportacao: boolean,
  itens: readonly ItemPlanoPreImportacaoScrivener[],
  geradoEm: string,
): ResultadoPlanoPreImportacaoScrivener {
  const candidatos = itens.filter((i) => i.tipo === 'candidato_importar_sinopse');
  const bloqueados = itens.filter((i) => i.tipo === 'bloqueado');
  const revisoes = itens.filter((i) => i.tipo === 'revisar');
  const semAcao = itens.filter((i) => i.tipo === 'sem_acao');
  return {
    validoParaPreImportacao,
    itens: [...itens],
    candidatos,
    bloqueados,
    revisoes,
    semAcao,
    relatorioMarkdown: gerarRelatorio(geradoEm, candidatos, bloqueados, revisoes, semAcao),
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function gerarPlanoPreImportacaoScrivener(
  dados: DadosPlanoPreImportacaoScrivener,
): ResultadoPlanoPreImportacaoScrivener {
  const itens: ItemPlanoPreImportacaoScrivener[] = [];

  // Parse manifesto
  let manifestoRaw: unknown;
  try {
    manifestoRaw = JSON.parse(dados.manifestoJson);
  } catch {
    itens.push(mkItem('bloqueado', 'MANIFESTO_JSON_INVALIDO', 'O manifesto não é um JSON válido.'));
    return buildResult(false, itens, dados.geradoEm);
  }

  if (!isRecord(manifestoRaw)) {
    itens.push(mkItem('bloqueado', 'MANIFESTO_JSON_INVALIDO', 'O manifesto não é um objeto JSON.'));
    return buildResult(false, itens, dados.geradoEm);
  }

  if (manifestoRaw['tipo'] !== TIPO_ESPERADO) {
    itens.push(mkItem('bloqueado', 'MANIFESTO_TIPO_INVALIDO', `Tipo do manifesto inválido: deve ser "${TIPO_ESPERADO}".`));
    return buildResult(false, itens, dados.geradoEm);
  }

  const arquivosRaw = manifestoRaw['arquivos'];
  if (!isArray(arquivosRaw)) {
    itens.push(mkItem('bloqueado', 'MANIFESTO_SEM_ARRAY_ARQUIVOS', 'O manifesto não contém um array "arquivos".'));
    return buildResult(false, itens, dados.geradoEm);
  }

  // Build lookup maps (input not mutated)
  const scrivenerMap = new Map<string, string>();
  for (const arq of dados.arquivosScrivener) {
    scrivenerMap.set(arq.caminhoRelativo, arq.conteudo);
  }

  const notasMap = new Map<string, string>();
  for (const nota of dados.notasOriginais) {
    notasMap.set(nota.filePath, nota.conteudo);
  }

  // Process each manifest entry
  for (const entradaRaw of arquivosRaw) {
    if (!isRecord(entradaRaw)) continue;

    const caminhoRaw = entradaRaw['caminhoRelativo'];
    if (typeof caminhoRaw !== 'string' || caminhoRaw === '') {
      itens.push(mkItem('bloqueado', 'ITEM_SEM_CAMINHO', 'Item do manifesto sem caminho relativo.'));
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

    // Check arquivo Scrivener presence
    if (!scrivenerMap.has(caminho)) {
      itens.push(mkItem('bloqueado', 'ARQUIVO_AUSENTE', `Arquivo Scrivener listado no manifesto está ausente: "${caminho}".`, opts));
      continue;
    }

    const conteudo = scrivenerMap.get(caminho)!;
    let hasBlocker = false;

    // Check for suspicious strings in arquivo Scrivener
    const suspeito = detectarSuspeito(conteudo);
    if (suspeito !== null) {
      itens.push(mkItem('bloqueado', 'CONTEUDO_SUSPEITO', `Arquivo contém valor suspeito: "${suspeito}".`, opts));
      hasBlocker = true;
    }

    // Check nota original presence (when filePath provided in manifest)
    if (filePathManifesto.trim() !== '' && !notasMap.has(filePathManifesto)) {
      itens.push(mkItem('bloqueado', 'NOTA_ORIGINAL_AUSENTE', `Nota original não encontrada: "${filePathManifesto}".`, opts));
      hasBlocker = true;
    }

    // Check ID in body vs manifest
    const idCorpo = extrairValorLista(conteudo, 'ID');
    if (idCorpo !== null && idManifesto !== '' && idCorpo !== idManifesto) {
      itens.push(mkItem('bloqueado', 'ID_DIVERGENTE', `ID no arquivo difere do manifesto: esperado "${idManifesto}", encontrado "${idCorpo}".`, opts));
      hasBlocker = true;
    }

    // Check caminho original in body vs manifest (when filePath present in manifest)
    if (filePathManifesto.trim() !== '') {
      const caminhoOrigCorpo = extrairValorLista(conteudo, 'Caminho original');
      if (caminhoOrigCorpo !== null && caminhoOrigCorpo !== filePathManifesto.trim()) {
        itens.push(mkItem('bloqueado', 'CAMINHO_ORIGINAL_DIVERGENTE', 'Caminho original no arquivo difere do manifesto.', opts));
        hasBlocker = true;
      }
    }

    // Check ordem narrativa in body vs manifest (when ordemNarrativa present in manifest)
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
          itens.push(mkItem('bloqueado', 'ORDEM_DIVERGENTE', `Ordem narrativa no arquivo difere do manifesto: esperado "${String(ordemManifesto)}", encontrado "${ordemTexto}".`, opts));
          hasBlocker = true;
        }
      }
    }

    // Extract sinopse
    const { sinopse, duplicada } = extrairSinopse(conteudo);

    // Check sinopse size limit
    if (sinopse !== null && sinopse.length > LIMITE_SINOPSE) {
      itens.push(mkItem('bloqueado', 'SINOPSE_MUITO_LONGA', `Sinopse extraída excede ${LIMITE_SINOPSE} caracteres.`, opts));
      hasBlocker = true;
    }

    // Revisões
    if (!isEventoTipoConhecido) {
      itens.push(mkItem('revisar', 'TIPO_DESCONHECIDO', `Tipo de item desconhecido no manifesto: "${tipoEntrada}".`, opts));
    }

    if (isEventoTipoConhecido && ordemManifesto === null) {
      itens.push(mkItem('revisar', 'EVENTO_SEM_ORDEM', 'Evento sem ordem narrativa no manifesto.', opts));
    }

    if (sinopse === null) {
      itens.push(mkItem('revisar', 'SEM_SECAO_SINOPSE', 'Arquivo Scrivener sem seção "## Sinopse de escrita".', opts));
    }

    if (duplicada) {
      itens.push(mkItem('revisar', 'SECAO_SINOPSE_DUPLICADA', 'Arquivo Scrivener com seção "## Sinopse de escrita" duplicada.', opts));
    }

    if (!temSecao(conteudo, 'Observações estruturais')) {
      itens.push(mkItem('revisar', 'SEM_SECAO_OBSERVACOES', 'Arquivo Scrivener sem seção "## Observações estruturais".', opts));
    }

    // Nota original checks (only when available and sinopse is within size limit and preenchida)
    const notaConteudo = filePathManifesto.trim() !== '' ? notasMap.get(filePathManifesto) : undefined;
    let sinopseRepetida = false;

    if (
      sinopse !== null &&
      sinopse.length <= LIMITE_SINOPSE &&
      ehSinopsePreenchida(sinopse) &&
      notaConteudo !== undefined
    ) {
      if (notaConteudo.includes(sinopse)) {
        sinopseRepetida = true;
        itens.push(mkItem('revisar', 'SINOPSE_JA_NA_NOTA', 'Sinopse já existe integralmente na nota original.', opts));
      }

      for (const marcador of MARCADORES_CONFLITO) {
        if (notaConteudo.includes(marcador)) {
          itens.push(mkItem('revisar', 'MARCADOR_CONFLITO', `Nota original contém marcador de conflito: "${marcador}".`, { ...opts, sinopseExtraida: sinopse }));
          break;
        }
      }
    }

    // Primary action
    if (!isEventoTipoConhecido) {
      itens.push(mkItem('sem_acao', 'NAO_EVENTO', 'Arquivo não é um Evento importável.', opts));
    } else if (!hasBlocker) {
      if (sinopse !== null && ehSinopsePreenchida(sinopse) && !sinopseRepetida) {
        itens.push(mkItem('candidato_importar_sinopse', 'CANDIDATO_SINOPSE', 'Sinopse preenchida e pronta para importação.', { ...opts, sinopseExtraida: sinopse }));
      } else if (sinopse !== null && !ehSinopsePreenchida(sinopse)) {
        const msg = sinopse.trim() === '' ? 'Sinopse vazia.' : 'Sinopse contém apenas placeholder.';
        itens.push(mkItem('sem_acao', 'SEM_ACAO_SINOPSE', msg, opts));
      }
      // sinopse === null → SEM_SECAO_SINOPSE revisão já emitida; sem ação primária
      // sinopse preenchida mas repetida → SINOPSE_JA_NA_NOTA revisão já emitida; sem ação primária
    }
  }

  return buildResult(true, itens, dados.geradoEm);
}
