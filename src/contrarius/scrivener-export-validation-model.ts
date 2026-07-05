// Pure model — no Obsidian, DOM, Node, filesystem, Date, or side effects

import type { PacoteScrivener } from './scrivener-export-model';

export type NivelProblemaPacoteScrivener = 'aviso' | 'erro';

export interface ProblemaValidacaoPacoteScrivener {
  readonly nivel: NivelProblemaPacoteScrivener;
  readonly codigo: string;
  readonly mensagem: string;
  readonly caminhoRelativo?: string;
}

export interface ResultadoValidacaoPacoteScrivener {
  readonly valido: boolean;
  readonly problemas: readonly ProblemaValidacaoPacoteScrivener[];
  readonly erros: readonly ProblemaValidacaoPacoteScrivener[];
  readonly avisos: readonly ProblemaValidacaoPacoteScrivener[];
}

// ─── Arquivos de controle ─────────────────────────────────────────────────────

const ARQUIVO_ROTEIRO = '00_ROTEIRO.md';
const ARQUIVO_MANIFESTO = 'contrarius-manifest.json';
const ARQUIVO_README = 'README_IMPORTACAO_SCRIVENER.md';

const ARQUIVOS_CONTROLE = new Set([ARQUIVO_ROTEIRO, ARQUIVO_MANIFESTO, ARQUIVO_README]);

// ─── Auxiliares ───────────────────────────────────────────────────────────────

function erro(
  codigo: string,
  mensagem: string,
  caminhoRelativo?: string,
): ProblemaValidacaoPacoteScrivener {
  return caminhoRelativo !== undefined
    ? { nivel: 'erro', codigo, mensagem, caminhoRelativo }
    : { nivel: 'erro', codigo, mensagem };
}

function aviso(
  codigo: string,
  mensagem: string,
  caminhoRelativo?: string,
): ProblemaValidacaoPacoteScrivener {
  return caminhoRelativo !== undefined
    ? { nivel: 'aviso', codigo, mensagem, caminhoRelativo }
    : { nivel: 'aviso', codigo, mensagem };
}

function isRecordStringUnknown(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isArrayOfUnknown(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

// ─── Validação de caminho ─────────────────────────────────────────────────────

function validarCaminho(
  caminho: string,
  problemas: ProblemaValidacaoPacoteScrivener[],
): boolean {
  if (caminho.trim() === '') {
    problemas.push(erro('CAMINHO_VAZIO', 'Caminho relativo de arquivo está vazio.'));
    return false;
  }
  if (caminho.startsWith('/') || /^[A-Za-z]:/.test(caminho)) {
    problemas.push(erro('CAMINHO_ABSOLUTO', 'Caminho relativo não pode ser absoluto.', caminho));
  }
  if (caminho.includes('..')) {
    problemas.push(erro('CAMINHO_TRAVERSAL', 'Caminho relativo contém "..".', caminho));
  }
  if (caminho.includes('\\')) {
    problemas.push(erro('CAMINHO_BARRA_INVERTIDA', 'Caminho relativo contém barra invertida.', caminho));
  }
  return true;
}

// ─── Validação de conteúdo ────────────────────────────────────────────────────

function validarConteudo(
  caminho: string,
  conteudo: string,
  problemas: ProblemaValidacaoPacoteScrivener[],
): void {
  if (conteudo === '') {
    problemas.push(erro('CONTEUDO_VAZIO', 'Conteúdo do arquivo está vazio.', caminho));
    return;
  }
  if (!conteudo.endsWith('\n')) {
    problemas.push(erro('SEM_QUEBRA_FINAL', 'Arquivo não termina com quebra de linha.', caminho));
  }
  if (conteudo.includes('undefined')) {
    problemas.push(erro('CONTEUDO_UNDEFINED', 'Arquivo contém a string "undefined".', caminho));
  }
  if (conteudo.includes('[object Object]')) {
    problemas.push(erro('CONTEUDO_OBJECT', 'Arquivo contém "[object Object]".', caminho));
  }
  if (conteudo.includes('NaN')) {
    problemas.push(erro('CONTEUDO_NAN', 'Arquivo contém "NaN".', caminho));
  }
  if (conteudo.includes('Infinity')) {
    problemas.push(erro('CONTEUDO_INFINITY', 'Arquivo contém "Infinity".', caminho));
  }
}

// ─── Validação do manifesto ───────────────────────────────────────────────────

function validarManifestoConteudo(
  conteudo: string,
  caminhosPacote: ReadonlySet<string>,
  problemas: ProblemaValidacaoPacoteScrivener[],
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(conteudo);
  } catch {
    problemas.push(erro('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um JSON válido.', ARQUIVO_MANIFESTO));
    return;
  }

  if (!isRecordStringUnknown(parsed)) {
    problemas.push(erro('MANIFESTO_JSON_INVALIDO', 'O manifesto não é um objeto JSON.', ARQUIVO_MANIFESTO));
    return;
  }

  if (parsed['tipo'] !== 'contrarius-scrivener-export') {
    problemas.push(erro('MANIFESTO_TIPO_INVALIDO', 'O manifesto tem tipo inválido.', ARQUIVO_MANIFESTO));
  }

  if (parsed['versao'] !== 1) {
    problemas.push(erro('MANIFESTO_VERSAO_INVALIDA', 'O manifesto tem versão inválida.', ARQUIVO_MANIFESTO));
  }

  const arquivosManifesto = parsed['arquivos'];
  if (!isArrayOfUnknown(arquivosManifesto)) return;

  const caminhosManifesto = new Set<string>();
  for (const item of arquivosManifesto) {
    if (!isRecordStringUnknown(item)) continue;

    const caminho = item['caminhoRelativo'];
    if (typeof caminho !== 'string') continue;

    if (!caminhosPacote.has(caminho)) {
      problemas.push(
        erro('MANIFESTO_ARQUIVO_AUSENTE', `Item do manifesto aponta para arquivo ausente: "${caminho}".`, ARQUIVO_MANIFESTO),
      );
    }

    if (caminhosManifesto.has(caminho)) {
      problemas.push(
        erro('MANIFESTO_ARQUIVO_DUPLICADO', `Item do manifesto contém caminho duplicado: "${caminho}".`, ARQUIVO_MANIFESTO),
      );
    } else {
      caminhosManifesto.add(caminho);
    }

    const ordem = item['ordemNarrativa'];
    if (ordem !== null && typeof ordem !== 'number') {
      problemas.push(
        erro('MANIFESTO_ORDEM_INVALIDA', `ordemNarrativa inválida no item "${caminho}": deve ser número ou null.`, ARQUIVO_MANIFESTO),
      );
    }
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

export function validarPacoteScrivenerMarkdown(
  pacote: PacoteScrivener,
): ResultadoValidacaoPacoteScrivener {
  const problemas: ProblemaValidacaoPacoteScrivener[] = [];

  // Verifica caminhos e conteúdo de cada arquivo
  const caminhosSeen = new Set<string>();
  const caminhosDuplicados = new Set<string>();
  const caminhosPacote = new Set<string>();

  for (const arquivo of pacote.arquivos) {
    const caminhoValido = validarCaminho(arquivo.caminhoRelativo, problemas);
    if (!caminhoValido) continue;

    const caminho = arquivo.caminhoRelativo;

    if (caminhosSeen.has(caminho)) {
      if (!caminhosDuplicados.has(caminho)) {
        caminhosDuplicados.add(caminho);
        problemas.push(erro('CAMINHO_DUPLICADO', `Caminho duplicado: "${caminho}".`, caminho));
      }
    } else {
      caminhosSeen.add(caminho);
      caminhosPacote.add(caminho);
    }

    validarConteudo(caminho, arquivo.conteudo, problemas);
  }

  // Verifica arquivos obrigatórios
  if (!caminhosSeen.has(ARQUIVO_ROTEIRO)) {
    problemas.push(erro('FALTA_ROTEIRO', 'Pacote não contém "00_ROTEIRO.md".'));
  }
  if (!caminhosSeen.has(ARQUIVO_MANIFESTO)) {
    problemas.push(erro('FALTA_MANIFESTO', 'Pacote não contém "contrarius-manifest.json".'));
  }
  if (!caminhosSeen.has(ARQUIVO_README)) {
    problemas.push(erro('FALTA_README', 'Pacote não contém "README_IMPORTACAO_SCRIVENER.md".'));
  }

  // Valida manifesto se presente e com conteúdo
  const manifestoArquivo = pacote.arquivos.find((a) => a.caminhoRelativo === ARQUIVO_MANIFESTO);
  if (manifestoArquivo !== undefined && manifestoArquivo.conteudo !== '') {
    validarManifestoConteudo(manifestoArquivo.conteudo, caminhosPacote, problemas);
  }

  // Avisos sobre eventos
  const arquivosEvento = [...caminhosSeen].filter((c) => !ARQUIVOS_CONTROLE.has(c));
  const posicionados = arquivosEvento.filter((c) => !c.startsWith('_sem_ordem/'));
  const semOrdem = arquivosEvento.filter((c) => c.startsWith('_sem_ordem/'));

  if (arquivosEvento.length === 0) {
    problemas.push(aviso('SEM_EVENTOS', 'Pacote não contém nenhum evento.'));
  } else {
    if (posicionados.length === 0) {
      problemas.push(aviso('SEM_POSICIONADOS', 'Pacote não contém eventos posicionados.'));
    }
    if (semOrdem.length > 0) {
      problemas.push(aviso('COM_SEM_ORDEM', `Pacote contém ${semOrdem.length} evento(s) sem ordem narrativa.`));
    }
  }

  const erros = problemas.filter((p) => p.nivel === 'erro');
  const avisos = problemas.filter((p) => p.nivel === 'aviso');

  return {
    valido: erros.length === 0,
    problemas: [...problemas],
    erros,
    avisos,
  };
}

export function resumirValidacaoPacoteScrivener(
  resultado: ResultadoValidacaoPacoteScrivener,
): string {
  const ne = resultado.erros.length;
  const na = resultado.avisos.length;

  if (ne === 0 && na === 0) return 'Pacote válido.';

  if (ne > 0 && na > 0) {
    return `${ne} erro${ne === 1 ? '' : 's'} e ${na} aviso${na === 1 ? '' : 's'} encontrados.`;
  }
  if (ne > 0) {
    return `${ne} erro${ne === 1 ? '' : 's'} encontrado${ne === 1 ? '' : 's'}.`;
  }
  return `${na} aviso${na === 1 ? '' : 's'}.`;
}
