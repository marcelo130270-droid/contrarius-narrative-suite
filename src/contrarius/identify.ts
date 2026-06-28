import type { ContrariusTipoEntidade } from './types';
import { normStr } from './normalize';

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
  tipoDeclarado: string;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
}

function isInsideFolder(filePath: string, folderPath: string): boolean {
  const file = normalizePath(filePath).toLocaleLowerCase();
  const folder = normalizePath(folderPath).toLocaleLowerCase();
  return folder !== '' && file.startsWith(`${folder}/`);
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
  const token = normStr(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();

  switch (token) {
    case 'consciencia': return 'consciencia';
    case 'retrovida': return 'retrovida';
    case 'relacao': return 'relacao';
    case 'evento': return 'evento';
    case 'lugar': return 'lugar';
    default: return null;
  }
}

export function identificarTipoEntidade(
  filePath: string,
  frontmatter: Readonly<Record<string, unknown>>,
  pastas: Readonly<PastasContrarius> = PASTAS_CONTRARIUS_PADRAO,
): ResultadoIdentificacao {
  const tipoPasta = tipoPorPasta(filePath, pastas);
  const tipoDeclarado = normStr(frontmatter['tipo']);
  const tipoFrontmatter = normalizarTipoDeclarado(frontmatter['tipo']);
  const conflito = tipoPasta !== null && tipoFrontmatter !== null && tipoPasta !== tipoFrontmatter;
  return {
    tipo: tipoPasta ?? tipoFrontmatter,
    tipoPasta,
    tipoFrontmatter,
    conflito,
    tipoDeclarado,
  };
}
