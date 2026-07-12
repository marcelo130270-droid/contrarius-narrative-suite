import type { TipoColecaoContrariusPayloadScrivener, FontePayloadContrariusScrivener } from './scrivener-contrarius-payload-extractor';

export interface ArquivoMarkdownContrariusPayloadLike {
  path: string;
  basename: string;
}

export interface CacheArquivoContrariusPayloadLike {
  frontmatter?: Record<string, unknown>;
}

export interface MetadataCacheContrariusPayloadLike<TArquivo extends ArquivoMarkdownContrariusPayloadLike = ArquivoMarkdownContrariusPayloadLike> {
  getFileCache(arquivo: TArquivo): CacheArquivoContrariusPayloadLike | null | undefined;
}

export interface VaultContrariusPayloadLike<TArquivo extends ArquivoMarkdownContrariusPayloadLike = ArquivoMarkdownContrariusPayloadLike> {
  getMarkdownFiles(): TArquivo[];
  cachedRead?(arquivo: TArquivo): Promise<string>;
}

export interface OpcoesFonteVaultContrariusPayload {
  incluirTexto?: boolean;
  incluirNotasSoltas?: boolean;
}

const MAPA_PASTA_COLECAO: Record<string, TipoColecaoContrariusPayloadScrivener> = {
  '02_Consciencias': 'consciencias',
  '03_Retrovidas': 'retrovidas',
  '04_Relacoes': 'relacoes',
  '05_Eventos': 'eventos',
  '06_Lugares': 'lugares',
  '07_Objetos': 'objetos',
  '08_Grupos': 'grupos',
};

export function classificarColecaoContrariusPorCaminho(caminho: string): TipoColecaoContrariusPayloadScrivener | null {
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

function resolverTitulo(frontmatter: Record<string, unknown>, basename: string): string {
  for (const chave of ['titulo', 'nome', 'nome_atual']) {
    const val = frontmatter[chave];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return basename;
}

export async function criarFontePayloadContrariusScrivenerDoVault<TArquivo extends ArquivoMarkdownContrariusPayloadLike>(
  vault: VaultContrariusPayloadLike<TArquivo>,
  metadataCache: MetadataCacheContrariusPayloadLike<TArquivo>,
  opcoes?: OpcoesFonteVaultContrariusPayload,
): Promise<FontePayloadContrariusScrivener> {
  const incluirTexto = opcoes?.incluirTexto ?? false;
  const incluirNotasSoltas = opcoes?.incluirNotasSoltas ?? false;

  const arquivos = vault.getMarkdownFiles();
  const colecoes: Record<string, unknown[]> = {};

  for (const arquivo of arquivos) {
    const colecao = classificarColecaoContrariusPorCaminho(arquivo.path);

    if (colecao === null) {
      if (!incluirNotasSoltas) continue;
    }

    const cache = metadataCache.getFileCache(arquivo);
    const frontmatter = cache?.frontmatter ? { ...cache.frontmatter } : {};
    const titulo = resolverTitulo(frontmatter, arquivo.basename);

    const registro: Record<string, unknown> = {
      ...frontmatter,
      file: { path: arquivo.path, basename: arquivo.basename },
      path: arquivo.path,
      basename: arquivo.basename,
      caminhoFonte: arquivo.path,
      titulo,
    };

    if (incluirTexto && vault.cachedRead) {
      const conteudo = await vault.cachedRead(arquivo);
      registro['texto'] = removerFrontmatterMarkdown(conteudo);
    }

    const chave = colecao ?? 'notas';
    if (!colecoes[chave]) colecoes[chave] = [];
    colecoes[chave].push(registro);
  }

  return colecoes as FontePayloadContrariusScrivener;
}
