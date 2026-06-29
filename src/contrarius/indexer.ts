import type { TFile } from 'obsidian';
import type {
  ContrariusIndex, ContrariusTipoEntidade, IndexError, IndexWarning,
  Consciencia, Retrovida, Evento, Lugar, Relacao,
} from './types';
import type { ReaderDeps } from './reader';
import type { PastasContrarius } from './identify';
import { lerFrontmatter } from './reader';
import { identificarTipoEntidade, PASTAS_CONTRARIUS_PADRAO, tipoPorPasta } from './identify';
import { normalizarConsciencia } from './entities/consciencia';
import { normalizarRetrovida } from './entities/retrovida';
import { normalizarEvento } from './entities/evento';
import { normalizarLugar } from './entities/lugar';
import { normalizarRelacao } from './entities/relacao';

export interface IndexerDeps extends ReaderDeps {
  getMarkdownFiles: () => readonly TFile[];
}

export interface IndexerOptions {
  pastas?: Partial<PastasContrarius>;
  incluirForaDasPastas?: boolean;
}

function resolvePastas(overrides?: Partial<PastasContrarius>): PastasContrarius {
  return { ...PASTAS_CONTRARIUS_PADRAO, ...overrides };
}

function mensagemErro(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const UTF8_BOM = '\uFEFF';

type FrontmatterNulo = 'incompleto' | 'invalido';

function classificarFrontmatterNulo(content: string): FrontmatterNulo {
  const withoutBom = content.startsWith(UTF8_BOM) ? content.slice(1) : content;
  const normalized = withoutBom.replace(/\r\n/g, '\n');
  const firstNewline = normalized.indexOf('\n');
  const firstLine = firstNewline === -1 ? normalized : normalized.slice(0, firstNewline);

  // A nota não declara frontmatter: pode ser indexada provisoriamente pela pasta e pelo basename.
  if (firstLine !== '---') return 'incompleto';
  if (firstNewline === -1) return 'invalido';

  const lines = normalized.slice(firstNewline + 1).split('\n');
  const closingIndex = lines.findIndex((line) => line === '---');
  if (closingIndex === -1) return 'invalido';

  const yamlBlock = lines.slice(0, closingIndex).join('\n');
  return yamlBlock.trim() === '' ? 'incompleto' : 'invalido';
}

async function podeIndexarComoIncompleta(file: TFile, deps: ReaderDeps): Promise<boolean> {
  try {
    return classificarFrontmatterNulo(await deps.cachedRead(file)) === 'incompleto';
  } catch {
    return false;
  }
}

function rotuloTipo(tipo: ContrariusTipoEntidade): string {
  switch (tipo) {
    case 'consciencia': return 'Consciência';
    case 'retrovida': return 'Retrovida';
    case 'evento': return 'Evento';
    case 'lugar': return 'Lugar';
    case 'relacao': return 'Relação';
  }
}

function registrarDuplicados<T extends { id: string; filePath: string }>(
  items: readonly T[],
  tipo: ContrariusTipoEntidade,
  erros: IndexError[],
): void {
  const porId = new Map<string, string>();
  for (const item of items) {
    if (item.id === '') continue;
    const anterior = porId.get(item.id);
    if (anterior !== undefined) {
      erros.push({
        filePath: item.filePath,
        campo: 'id',
        mensagem: `ID duplicado de ${tipo}: "${item.id}"; primeira ocorrência em "${anterior}".`,
      });
    } else {
      porId.set(item.id, item.filePath);
    }
  }
}

export async function indexarContrarius(
  deps: IndexerDeps,
  options: IndexerOptions = {},
): Promise<ContrariusIndex> {
  const pastas = resolvePastas(options.pastas);
  const consciencias: Consciencia[] = [];
  const retrovidas: Retrovida[] = [];
  const eventos: Evento[] = [];
  const lugares: Lugar[] = [];
  const relacoes: Relacao[] = [];
  const avisosIndexacao: IndexWarning[] = [];
  const erros: IndexError[] = [];

  let files: TFile[];
  try {
    files = Array.from(deps.getMarkdownFiles()).sort((a, b) => a.path.localeCompare(b.path));
  } catch (error) {
    return {
      consciencias, retrovidas, eventos, lugares, relacoes, avisosIndexacao,
      erros: [{ filePath: '', mensagem: `Falha ao listar arquivos Markdown: ${mensagemErro(error)}` }],
    };
  }

  for (const file of files) {
    const tipoPasta = tipoPorPasta(file.path, pastas);
    if (tipoPasta === null && options.incluirForaDasPastas !== true) continue;

    let frontmatter: Record<string, unknown> | null;
    let isProvisional = false;
    try {
      frontmatter = await lerFrontmatter(file, deps);
    } catch (error) {
      erros.push({ filePath: file.path, mensagem: `Falha ao ler frontmatter: ${mensagemErro(error)}` });
      continue;
    }
    if (frontmatter === null) {
      if (tipoPasta === null) continue;

      if (await podeIndexarComoIncompleta(file, deps)) {
        frontmatter = {};
        isProvisional = true;
        avisosIndexacao.push({
          filePath: file.path,
          campo: 'frontmatter',
          mensagem: `Nota sem frontmatter; indexada provisoriamente como entidade incompleta do tipo ${rotuloTipo(tipoPasta)} usando o nome do arquivo.`,
        });
      } else {
        erros.push({
          filePath: file.path,
          campo: 'frontmatter',
          mensagem: 'Frontmatter inválido ou ilegível; a nota não foi indexada.',
        });
        continue;
      }
    } else if (tipoPasta !== null && Object.keys(frontmatter).length === 0) {
      isProvisional = true;
      avisosIndexacao.push({
        filePath: file.path,
        campo: 'frontmatter',
        mensagem: `Frontmatter vazio; indexada provisoriamente como entidade incompleta do tipo ${rotuloTipo(tipoPasta)} usando o nome do arquivo.`,
      });
    }

    const identificacao = identificarTipoEntidade(file.path, frontmatter, pastas);
    if (identificacao.conflito) {
      erros.push({
        filePath: file.path,
        campo: 'tipo',
        mensagem: `Conflito de tipo: pasta indica "${identificacao.tipoPasta}" e frontmatter declara "${identificacao.tipoFrontmatter}". A pasta foi usada.`,
      });
    } else if (identificacao.incompatibilidadeLegada) {
      avisosIndexacao.push({
        filePath: file.path,
        campo: 'tipo',
        mensagem: `Tipo legado incompatível com a pasta; classificada como ${identificacao.tipo === 'retrovida' ? 'Retrovida' : 'Consciência'} pré-humana.`,
      });
    } else if (identificacao.tipoFrontmatter === null && identificacao.tipoDeclarado !== '') {
      erros.push({
        filePath: file.path,
        campo: 'tipo',
        mensagem: `Tipo declarado não reconhecido: "${identificacao.tipoDeclarado}".`,
      });
    }

    if (identificacao.tipo === null) continue;

    try {
      switch (identificacao.tipo) {
        case 'consciencia': consciencias.push(normalizarConsciencia(frontmatter, file.path)); break;
        case 'retrovida': retrovidas.push(normalizarRetrovida(frontmatter, file.path)); break;
        case 'evento': eventos.push(normalizarEvento(frontmatter, file.path, isProvisional)); break;
        case 'lugar': lugares.push(normalizarLugar(frontmatter, file.path, isProvisional)); break;
        case 'relacao': relacoes.push(normalizarRelacao(frontmatter, file.path)); break;
      }
    } catch (error) {
      erros.push({ filePath: file.path, mensagem: `Falha ao normalizar entidade: ${mensagemErro(error)}` });
    }
  }

  registrarDuplicados(consciencias, 'consciencia', erros);
  registrarDuplicados(retrovidas, 'retrovida', erros);
  registrarDuplicados(eventos, 'evento', erros);
  registrarDuplicados(lugares, 'lugar', erros);
  registrarDuplicados(relacoes, 'relacao', erros);

  return { consciencias, retrovidas, eventos, lugares, relacoes, avisosIndexacao, erros };
}
