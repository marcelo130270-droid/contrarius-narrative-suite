import type { ContrariusIndexBruto, NotaContrariusBruta, TipoColecaoContrarius } from './types';

export interface ArquivoMarkdownContrariusLike {
  path: string;
  basename: string;
}

export interface CacheArquivoContrariusLike {
  frontmatter?: Record<string, unknown>;
}

export interface MetadataCacheContrariusLike<TArquivo extends ArquivoMarkdownContrariusLike = ArquivoMarkdownContrariusLike> {
  getFileCache(arquivo: TArquivo): CacheArquivoContrariusLike | null | undefined;
}

export interface VaultContrariusLike<TArquivo extends ArquivoMarkdownContrariusLike = ArquivoMarkdownContrariusLike> {
  getMarkdownFiles(): TArquivo[];
  cachedRead?(arquivo: TArquivo): Promise<string>;
}

export interface OpcoesLeituraVaultContrarius {
  incluirTexto?: boolean;
  incluirNotasSoltas?: boolean;
}

const MAPA_PASTA_COLECAO: Record<string, TipoColecaoContrarius> = {
  '02_Consciencias': 'consciencias',
  '03_Retrovidas': 'retrovidas',
  '04_Relacoes': 'relacoes',
  '05_Eventos': 'eventos',
  '06_Lugares': 'lugares',
  '07_Objetos': 'objetos',
  '08_Grupos': 'grupos',
};

export function classificarColecaoContrariusPorCaminho(caminho: string): TipoColecaoContrarius | null {
  const segmentos = caminho.split('/');
  for (const segmento of segmentos) {
    const colecao = MAPA_PASTA_COLECAO[segmento];
    if (colecao !== undefined) return colecao;
  }
  return null;
}

export function removerFrontmatterMarkdown(texto: string): string {
  if (!texto.startsWith('---')) return texto;
  const fim = texto.indexOf('\n---', 3);
  if (fim === -1) return texto;
  return texto.slice(fim + 4).trimStart();
}

function copiaProfundaFrontmatter(frontmatter: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(frontmatter));
}

export async function lerVaultContrarius<TArquivo extends ArquivoMarkdownContrariusLike>(
  vault: VaultContrariusLike<TArquivo>,
  metadataCache: MetadataCacheContrariusLike<TArquivo>,
  opcoes?: OpcoesLeituraVaultContrarius,
): Promise<ContrariusIndexBruto> {
  const incluirTexto = opcoes?.incluirTexto ?? false;
  const incluirNotasSoltas = opcoes?.incluirNotasSoltas ?? true;

  const arquivos = vault.getMarkdownFiles();
  const notas: NotaContrariusBruta[] = [];

  for (const arquivo of arquivos) {
    const colecao = classificarColecaoContrariusPorCaminho(arquivo.path);
    if (colecao === null && !incluirNotasSoltas) continue;

    const cache = metadataCache.getFileCache(arquivo);
    const frontmatter = cache?.frontmatter ? copiaProfundaFrontmatter(cache.frontmatter) : {};

    const nota: NotaContrariusBruta = {
      path: arquivo.path,
      basename: arquivo.basename,
      colecao,
      frontmatter,
    };

    if (incluirTexto && vault.cachedRead) {
      const texto = await vault.cachedRead(arquivo);
      nota.corpo = removerFrontmatterMarkdown(texto);
    }

    notas.push(nota);
  }

  return { notas };
}
