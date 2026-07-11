import type { EntradaManifestoScrivener, TipoPacoteScrivener } from './scrivener-package-manifest';

export type TipoPacoteScrivenerOperacional = Exclude<TipoPacoteScrivener, 'diagnostico'>;

export interface ContextoManifestoScrivenerOperacional {
  tipo: TipoPacoteScrivenerOperacional;
  origemVault: string;
  diretorioPacotes: string;
  livro?: string;
  observacoes?: string;
  agora?: Date | string;
}

export interface ResultadoNomePacoteScrivener {
  id: string;
  nomeArquivo: string;
  caminhoPacote: string;
  criadoEm: string;
}

export function criarSlugScrivener(valor: string | undefined | null): string {
  const trimmed = (valor ?? '').trim();
  if (!trimmed) return 'sem-identificacao';
  const semAcentos = trimmed.normalize('NFD').replace(/\p{M}/gu, '');
  const slug = semAcentos.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'sem-identificacao';
}

export function criarNomePacoteScrivener(
  contexto: ContextoManifestoScrivenerOperacional,
): ResultadoNomePacoteScrivener {
  const now = contexto.agora !== undefined ? new Date(contexto.agora) : new Date();
  const criadoEm = now.toISOString();

  const livroSlug =
    contexto.livro && contexto.livro.trim() ? criarSlugScrivener(contexto.livro) : 'sem-livro';
  const timestampSlug = criadoEm
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  const id = `${contexto.tipo}-${livroSlug}-${timestampSlug}`;
  const nomeArquivo = `${id}.scrivener-package`;

  const dir = contexto.diretorioPacotes.trim().replace(/[/\\]+$/, '');
  const caminhoPacote = dir ? `${dir}/${nomeArquivo}` : nomeArquivo;

  return { id, nomeArquivo, caminhoPacote, criadoEm };
}

export function criarEntradaManifestoOperacionalScrivener(
  contexto: ContextoManifestoScrivenerOperacional,
): EntradaManifestoScrivener {
  const { id, caminhoPacote, criadoEm } = criarNomePacoteScrivener(contexto);

  const origemVault = contexto.origemVault.trim();
  const livroTrimmed = (contexto.livro ?? '').trim();
  const observacoesTrimmed = (contexto.observacoes ?? '').trim();

  const entrada: EntradaManifestoScrivener = {
    id,
    criadoEm,
    tipo: contexto.tipo,
    origemVault,
    caminhoPacote,
  };

  if (livroTrimmed) entrada.livro = livroTrimmed;
  if (observacoesTrimmed) entrada.observacoes = observacoesTrimmed;

  return entrada;
}