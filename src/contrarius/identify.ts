import type { ContrariusTipoEntidade, NaturezaConsciencial } from './types';
import { normStr } from './normalize';
import { extractBasename } from './utils';

export interface PastasContrarius {
  consciencia: string;
  retrovida: string;
  relacao: string;
  evento: string;
  lugar: string;
}

export const PASTAS_CONTRARIUS_PADRAO: Readonly<PastasContrarius> = {
  consciencia: '02_Consciencias',
  retrovida: '03_Retrovidas',
  relacao: '04_Relacoes',
  evento: '05_Eventos',
  lugar: '06_Lugares',
};

export interface ResultadoIdentificacao {
  tipo: ContrariusTipoEntidade | null;
  tipoPasta: ContrariusTipoEntidade | null;
  tipoFrontmatter: ContrariusTipoEntidade | null;
  conflito: boolean;
  incompatibilidadeLegada: boolean;
  tipoDeclarado: string;
  naturezaConsciencial: NaturezaConsciencial | null;
}

interface TipoDeclaradoDetalhado {
  tipo: ContrariusTipoEntidade | null;
  naturezaConsciencial: NaturezaConsciencial | null;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
}

function normalizeToken(value: unknown): string {
  return normStr(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function isInsideFolder(filePath: string, folderPath: string): boolean {
  const file = normalizePath(filePath).toLocaleLowerCase('pt-BR');
  const folder = normalizePath(folderPath).toLocaleLowerCase('pt-BR');
  return folder !== '' && file.startsWith(`${folder}/`);
}

function tipoDeclaradoDetalhado(value: unknown): TipoDeclaradoDetalhado {
  const token = normalizeToken(value);
  switch (token) {
    case 'consciencia':
      return { tipo: 'consciencia', naturezaConsciencial: 'humana' };
    case 'consc pre humana':
    case 'consc pre humano':
    case 'consciencia pre humana':
    case 'consciencia pre humano':
      return { tipo: 'consciencia', naturezaConsciencial: 'pre-humana' };
    case 'retrovida':
      return { tipo: 'retrovida', naturezaConsciencial: 'humana' };
    case 'retrovida pre humana':
    case 'retrovida pre humano':
      return { tipo: 'retrovida', naturezaConsciencial: 'pre-humana' };
    case 'relacao':
      return { tipo: 'relacao', naturezaConsciencial: null };
    case 'relacao grupocarmica':
      return { tipo: 'relacao', naturezaConsciencial: null };
    case 'evento':
      return { tipo: 'evento', naturezaConsciencial: null };
    case 'lugar':
      return { tipo: 'lugar', naturezaConsciencial: null };
    default:
      return { tipo: null, naturezaConsciencial: null };
  }
}

function hasPreHumanPath(filePath: string): boolean {
  const token = normalizeToken(normalizePath(filePath));
  return token.includes('pre humana') || token.includes('pre humano');
}

function startsWithPreHumanId(value: unknown): boolean {
  return /^p-\d+/i.test(normStr(value));
}

export function tipoPorPasta(
  filePath: string,
  pastas: Readonly<PastasContrarius> = PASTAS_CONTRARIUS_PADRAO,
): ContrariusTipoEntidade | null {
  const tipos: readonly ContrariusTipoEntidade[] = ['consciencia', 'retrovida', 'relacao', 'evento', 'lugar'];
  for (const tipo of tipos) {
    if (isInsideFolder(filePath, pastas[tipo])) return tipo;
  }
  return null;
}

export function normalizarTipoDeclarado(value: unknown): ContrariusTipoEntidade | null {
  return tipoDeclaradoDetalhado(value).tipo;
}

export function inferirNaturezaConsciencial(
  filePath: string,
  frontmatter: Readonly<Record<string, unknown>>,
  tipo: ContrariusTipoEntidade,
): NaturezaConsciencial {
  if (tipo !== 'consciencia' && tipo !== 'retrovida') return 'humana';

  const declarado = tipoDeclaradoDetalhado(frontmatter['tipo']);
  if (declarado.naturezaConsciencial === 'pre-humana') return 'pre-humana';
  if (hasPreHumanPath(filePath)) return 'pre-humana';

  const identifiers: readonly unknown[] = [
    frontmatter['id'],
    frontmatter['consc_id'],
    frontmatter['consciencia'],
    extractBasename(filePath),
  ];
  return identifiers.some(startsWithPreHumanId) ? 'pre-humana' : 'humana';
}

export function identificarTipoEntidade(
  filePath: string,
  frontmatter: Readonly<Record<string, unknown>>,
  pastas: Readonly<PastasContrarius> = PASTAS_CONTRARIUS_PADRAO,
): ResultadoIdentificacao {
  const tipoPasta = tipoPorPasta(filePath, pastas);
  const tipoDeclarado = normStr(frontmatter['tipo']);
  const detalhe = tipoDeclaradoDetalhado(frontmatter['tipo']);
  const tipoFrontmatter = detalhe.tipo;
  const mismatch = tipoPasta !== null && tipoFrontmatter !== null && tipoPasta !== tipoFrontmatter;
  const consciencialMismatch =
    mismatch &&
    detalhe.naturezaConsciencial === 'pre-humana' &&
    (tipoPasta === 'consciencia' || tipoPasta === 'retrovida') &&
    (tipoFrontmatter === 'consciencia' || tipoFrontmatter === 'retrovida');
  const tipo = tipoPasta ?? tipoFrontmatter;

  return {
    tipo,
    tipoPasta,
    tipoFrontmatter,
    conflito: mismatch && !consciencialMismatch,
    incompatibilidadeLegada: consciencialMismatch,
    tipoDeclarado,
    naturezaConsciencial:
      tipo === 'consciencia' || tipo === 'retrovida'
        ? inferirNaturezaConsciencial(filePath, frontmatter, tipo)
        : null,
  };
}
