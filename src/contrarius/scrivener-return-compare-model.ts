// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

export interface ArquivoPacoteScrivenerRetornado {
  readonly caminhoRelativo: string;
  readonly conteudo: string;
}

export interface DadosComparacaoPacoteScrivener {
  readonly manifestoJson: string;
  readonly arquivos: readonly ArquivoPacoteScrivenerRetornado[];
  readonly geradoEm: string;
}

export type NivelComparacaoScrivener = 'info' | 'aviso' | 'erro';

export interface ItemComparacaoScrivener {
  readonly nivel: NivelComparacaoScrivener;
  readonly codigo: string;
  readonly mensagem: string;
  readonly caminhoRelativo?: string;
  readonly idEvento?: string;
}

export interface ResultadoComparacaoScrivener {
  readonly validoParaAnalise: boolean;
  readonly itens: readonly ItemComparacaoScrivener[];
  readonly infos: readonly ItemComparacaoScrivener[];
  readonly avisos: readonly ItemComparacaoScrivener[];
  readonly erros: readonly ItemComparacaoScrivener[];
  readonly relatorioMarkdown: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CONTROLE_MD = new Set(['00_ROTEIRO.md', 'README_IMPORTACAO_SCRIVENER.md']);
const MANIFESTO = 'contrarius-manifest.json';
const TIPO_ESPERADO = 'contrarius-scrivener-export';
const PLACEHOLDER = '[preencher no Scrivener]';

// ─── Auxiliares de tipo ───────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isArray(v: unknown): v is readonly unknown[] {
  return Array.isArray(v);
}

// ─── Construtores de item ─────────────────────────────────────────────────────

function mkItem(
  nivel: NivelComparacaoScrivener,
  codigo: string,
  mensagem: string,
): ItemComparacaoScrivener {
  return { nivel, codigo, mensagem };
}

function mkItemC(
  nivel: NivelComparacaoScrivener,
  codigo: string,
  mensagem: string,
  caminhoRelativo: string,
): ItemComparacaoScrivener {
  return { nivel, codigo, mensagem, caminhoRelativo };
}

function mkItemCOpt(
  nivel: NivelComparacaoScrivener,
  codigo: string,
  mensagem: string,
  caminhoRelativo: string,
  idEvento?: string,
): ItemComparacaoScrivener {
  return idEvento !== undefined && idEvento !== ''
    ? { nivel, codigo, mensagem, caminhoRelativo, idEvento }
    : { nivel, codigo, mensagem, caminhoRelativo };
}

// ─── Auxiliares de parsing de conteúdo ───────────────────────────────────────

function extrairH1(conteudo: string): string | null {
  for (const linha of conteudo.split('\n')) {
    const m = /^# (.+)$/.exec(linha);
    if (m !== null) return m[1].trim();
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

function extrairSecao(conteudo: string, nomeSecao: string): string | null {
  const linhas = conteudo.split('\n');
  const idx = linhas.findIndex((l) => l === `## ${nomeSecao}`);
  if (idx === -1) return null;
  const corpo: string[] = [];
  for (let i = idx + 1; i < linhas.length; i++) {
    if (linhas[i].startsWith('## ')) break;
    corpo.push(linhas[i]);
  }
  return corpo.join('\n');
}

function sinopsePreenchida(secao: string): boolean {
  return secao.split('\n').some((l) => {
    const t = l.trim();
    return t !== '' && t !== PLACEHOLDER;
  });
}

// ─── Geração do relatório Markdown ────────────────────────────────────────────

function formatarItemRelatorio(it: ItemComparacaoScrivener): string {
  let s = `- **${it.codigo}**: ${it.mensagem}`;
  if (it.caminhoRelativo !== undefined) s += ` Caminho: \`${it.caminhoRelativo}\`.`;
  if (it.idEvento !== undefined) s += ` ID: \`${it.idEvento}\`.`;
  return s;
}

function gerarRelatorio(
  geradoEm: string,
  infos: readonly ItemComparacaoScrivener[],
  avisos: readonly ItemComparacaoScrivener[],
  erros: readonly ItemComparacaoScrivener[],
): string {
  const l: string[] = [
    '# Relatório de comparação Scrivener',
    '',
    `Gerado em: ${geradoEm}`,
    '',
    '## Resumo',
    '',
    `- Erros: ${erros.length}`,
    `- Avisos: ${avisos.length}`,
    `- Informações: ${infos.length}`,
    '',
  ];

  if (erros.length > 0) {
    l.push('## Erros', '');
    for (const it of erros) l.push(formatarItemRelatorio(it));
    l.push('');
  }

  if (avisos.length > 0) {
    l.push('## Avisos', '');
    for (const it of avisos) l.push(formatarItemRelatorio(it));
    l.push('');
  }

  l.push('## Informações', '');
  if (infos.length === 0) {
    l.push('_Nenhuma informação._');
  } else {
    for (const it of infos) l.push(formatarItemRelatorio(it));
  }
  l.push('');

  return l.join('\n');
}

// ─── Construtor de resultado ──────────────────────────────────────────────────

function buildResult(
  validoParaAnalise: boolean,
  itens: readonly ItemComparacaoScrivener[],
  geradoEm: string,
): ResultadoComparacaoScrivener {
  const infos = itens.filter((i) => i.nivel === 'info');
  const avisos = itens.filter((i) => i.nivel === 'aviso');
  const erros = itens.filter((i) => i.nivel === 'erro');
  return {
    validoParaAnalise,
    itens,
    infos,
    avisos,
    erros,
    relatorioMarkdown: gerarRelatorio(geradoEm, infos, avisos, erros),
  };
}

// ─── Função pública ───────────────────────────────────────────────────────────

export function compararPacoteScrivenerRetornado(
  dados: DadosComparacaoPacoteScrivener,
): ResultadoComparacaoScrivener {
  const itens: ItemComparacaoScrivener[] = [];

  // 1. Parse manifesto
  let manifestoRaw: unknown;
  try {
    manifestoRaw = JSON.parse(dados.manifestoJson);
  } catch {
    itens.push(mkItem('erro', 'MANIFESTO_JSON_INVALIDO', 'O manifesto não é um JSON válido.'));
    return buildResult(false, itens, dados.geradoEm);
  }

  if (!isRecord(manifestoRaw)) {
    itens.push(mkItem('erro', 'MANIFESTO_JSON_INVALIDO', 'O manifesto não é um objeto JSON.'));
    return buildResult(false, itens, dados.geradoEm);
  }

  if (manifestoRaw['tipo'] !== TIPO_ESPERADO) {
    itens.push(mkItem('erro', 'MANIFESTO_TIPO_INVALIDO', `Tipo do manifesto inválido: deve ser "${TIPO_ESPERADO}".`));
    return buildResult(false, itens, dados.geradoEm);
  }

  const arquivosRaw = manifestoRaw['arquivos'];
  if (!isArray(arquivosRaw)) {
    itens.push(mkItem('erro', 'MANIFESTO_SEM_ARRAY_ARQUIVOS', 'O manifesto não contém um array "arquivos".'));
    return buildResult(true, itens, dados.geradoEm);
  }

  // 2. Mapa de arquivos recebidos
  const arquivosMap = new Map<string, string>();
  const dupArquivos = new Set<string>();

  for (const arq of dados.arquivos) {
    const c = arq.caminhoRelativo;
    if (arquivosMap.has(c)) {
      if (!dupArquivos.has(c)) {
        dupArquivos.add(c);
        itens.push(mkItemC('erro', 'CAMINHO_DUPLICADO_ARQUIVOS', `Caminho duplicado nos arquivos lidos: "${c}".`, c));
      }
    } else {
      arquivosMap.set(c, arq.conteudo);
    }
  }

  // 3. Processar entradas do manifesto
  const caminhosManifesto = new Set<string>();
  const dupManifesto = new Set<string>();
  let eventosManifesto = 0;
  let eventosAnalisados = 0;

  for (const entradaRaw of arquivosRaw) {
    if (!isRecord(entradaRaw)) continue;

    const caminhoRaw = entradaRaw['caminhoRelativo'];
    if (typeof caminhoRaw !== 'string' || caminhoRaw === '') continue;
    const caminho = caminhoRaw;

    // Duplicado no manifesto
    if (caminhosManifesto.has(caminho)) {
      if (!dupManifesto.has(caminho)) {
        dupManifesto.add(caminho);
        itens.push(mkItemC('erro', 'CAMINHO_DUPLICADO_MANIFESTO', `Caminho duplicado no manifesto: "${caminho}".`, caminho));
      }
      continue;
    }
    caminhosManifesto.add(caminho);

    const ehEvento = !CONTROLE_MD.has(caminho) && caminho !== MANIFESTO;
    if (ehEvento) eventosManifesto++;

    // Arquivo ausente
    if (!arquivosMap.has(caminho)) {
      itens.push(mkItemC('erro', 'ARQUIVO_AUSENTE', `Arquivo listado no manifesto está ausente: "${caminho}".`, caminho));
      continue;
    }

    const conteudo = arquivosMap.get(caminho) ?? '';

    if (conteudo === '') {
      itens.push(mkItemC('erro', 'CONTEUDO_VAZIO', 'Conteúdo do arquivo está vazio.', caminho));
    }

    if (conteudo !== '' && !conteudo.endsWith('\n')) {
      itens.push(mkItemC('erro', 'SEM_QUEBRA_FINAL', 'Arquivo não termina com quebra de linha.', caminho));
    }

    if (!ehEvento) continue;

    // ── Análise de arquivo de Evento ─────────────────────────────────────────
    eventosAnalisados++;

    const idManifesto =
      typeof entradaRaw['id'] === 'string' ? entradaRaw['id'] : '';
    const tituloManifesto =
      typeof entradaRaw['titulo'] === 'string' ? entradaRaw['titulo'] : '';
    const filePathManifesto =
      typeof entradaRaw['filePath'] === 'string' ? entradaRaw['filePath'] : '';
    const ordRaw = entradaRaw['ordemNarrativa'];
    const ordemManifesto =
      typeof ordRaw === 'number' && Number.isFinite(ordRaw) ? ordRaw : null;

    const idOpt = idManifesto !== '' ? idManifesto : undefined;

    if (ordemManifesto === null) {
      itens.push(mkItemCOpt('aviso', 'EVENTO_SEM_ORDEM', 'Evento sem ordem narrativa no manifesto.', caminho, idOpt));
    }

    if (conteudo === '') continue;

    const h1 = extrairH1(conteudo);
    const idArquivo = extrairValorLista(conteudo, 'ID');
    const ordemTexto = extrairValorLista(conteudo, 'Ordem narrativa');
    const secaoSinopse = extrairSecao(conteudo, 'Sinopse de escrita');
    const secaoObservacoes = extrairSecao(conteudo, 'Observações estruturais');

    // H1 divergente
    if (h1 !== null && tituloManifesto !== '' && h1 !== tituloManifesto) {
      itens.push(mkItemCOpt(
        'aviso', 'TITULO_H1_DIVERGENTE',
        `Título H1 difere do manifesto: esperado "${tituloManifesto}", encontrado "${h1}".`,
        caminho, idOpt,
      ));
    }

    // ID divergente
    if (idArquivo !== null && idManifesto !== '' && idArquivo !== idManifesto) {
      itens.push(mkItemCOpt(
        'erro', 'ID_DIVERGENTE',
        `ID no arquivo difere do manifesto: esperado "${idManifesto}", encontrado "${idArquivo}".`,
        caminho, idOpt,
      ));
    }

    // Caminho original divergente (quando filePath presente no manifesto)
    if (filePathManifesto.trim() !== '') {
      const fonteObs = secaoObservacoes !== null ? secaoObservacoes : conteudo;
      const caminhoOrigArq = extrairValorLista(fonteObs, 'Caminho original');
      if (caminhoOrigArq !== null && caminhoOrigArq !== filePathManifesto.trim()) {
        itens.push(mkItemCOpt('erro', 'CAMINHO_ORIGINAL_DIVERGENTE', 'Caminho original no arquivo difere do manifesto.', caminho, idOpt));
      }
    }

    // Ordem narrativa divergente (quando ordemNarrativa presente no manifesto)
    if (ordemManifesto !== null && ordemTexto !== null) {
      const ordemNum = ordemTexto === 'sem ordem' ? null : Number(ordemTexto);
      const divergente =
        ordemTexto === 'sem ordem' ||
        ordemNum === null ||
        !Number.isFinite(ordemNum) ||
        ordemNum !== ordemManifesto;
      if (divergente) {
        itens.push(mkItemCOpt(
          'erro', 'ORDEM_DIVERGENTE',
          `Ordem narrativa no arquivo difere do manifesto: esperado "${String(ordemManifesto)}", encontrado "${ordemTexto}".`,
          caminho, idOpt,
        ));
      }
    }

    // Placeholder presente
    if (conteudo.includes(PLACEHOLDER)) {
      itens.push(mkItemCOpt('aviso', 'PLACEHOLDER_PRESENTE', `Arquivo ainda contém o placeholder "${PLACEHOLDER}".`, caminho, idOpt));
    }

    if (secaoSinopse === null) {
      itens.push(mkItemCOpt('aviso', 'SEM_SECAO_SINOPSE', 'Arquivo sem seção "## Sinopse de escrita".', caminho, idOpt));
    }

    if (secaoObservacoes === null) {
      itens.push(mkItemCOpt('aviso', 'SEM_SECAO_OBSERVACOES', 'Arquivo sem seção "## Observações estruturais".', caminho, idOpt));
    }

    if (secaoSinopse !== null) {
      if (sinopsePreenchida(secaoSinopse)) {
        itens.push(mkItemCOpt('info', 'SINOPSE_PREENCHIDA', 'Sinopse de escrita preenchida.', caminho, idOpt));
      } else {
        itens.push(mkItemCOpt('info', 'SEM_ALTERACAO_APARENTE', 'Arquivo sem alteração textual aparente.', caminho, idOpt));
      }
    }
  }

  // 4. Arquivos Markdown extras
  const extrasVistos = new Set<string>();
  for (const arq of dados.arquivos) {
    const c = arq.caminhoRelativo;
    if (
      c.endsWith('.md') &&
      !CONTROLE_MD.has(c) &&
      !caminhosManifesto.has(c) &&
      !extrasVistos.has(c)
    ) {
      extrasVistos.add(c);
      itens.push(mkItemC('aviso', 'ARQUIVO_EXTRA', `Arquivo Markdown extra não listado no manifesto: "${c}".`, c));
    }
  }

  // 5. Pacote vazio
  if (eventosManifesto === 0) {
    itens.push(mkItem('aviso', 'PACOTE_VAZIO', 'Manifesto válido mas sem eventos para comparar.'));
  }

  // 6. Infos de quantidade
  if (eventosAnalisados > 0) {
    itens.push(mkItem('info', 'QUANTIDADE_EVENTOS', `Eventos analisados: ${eventosAnalisados}.`));
  }
  if (extrasVistos.size > 0) {
    itens.push(mkItem('info', 'QUANTIDADE_EXTRAS', `Arquivos Markdown extras: ${extrasVistos.size}.`));
  }

  return buildResult(true, itens, dados.geradoEm);
}
