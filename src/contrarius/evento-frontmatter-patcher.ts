export interface ValoresNarrativosEvento {
  readonly ordemNarrativa: number | null;
  readonly capitulo: string;
  readonly cena: string;
}

export interface ResultadoPatchFrontmatterEvento {
  readonly conteudo: string;
  readonly alterado: boolean;
  readonly camposAlterados: readonly ('ordem_narrativa' | 'capitulo' | 'cena')[];
}

export type CodigoErroPatchFrontmatterEvento =
  | 'frontmatter_ausente'
  | 'frontmatter_invalido'
  | 'chave_duplicada'
  | 'valor_invalido';

export class ErroPatchFrontmatterEvento extends Error {
  readonly codigo: CodigoErroPatchFrontmatterEvento;
  readonly campo: string;

  constructor(codigo: CodigoErroPatchFrontmatterEvento, campo: string, mensagem: string) {
    super(mensagem);
    this.name = 'ErroPatchFrontmatterEvento';
    this.codigo = codigo;
    this.campo = campo;
  }
}

// ─── Aliases reconhecidos ─────────────────────────────────────────────────────

const ORD_ALIASES: readonly string[] = ['ordem_narrativa', 'ordemNarrativa'];
const CAP_ALIASES: readonly string[] = ['capitulo', 'capítulo'];
const CEN_ALIASES: readonly string[] = ['cena'];

// ─── Helpers internos ─────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesTopLevelAlias(bare: string, alias: string): boolean {
  if (bare.length > 0 && (bare[0] === ' ' || bare[0] === '\t')) return false;
  return new RegExp('^' + escapeRegex(alias) + '\\s*:').test(bare);
}

function findFieldLines(innerLines: string[], aliases: readonly string[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < innerLines.length; i++) {
    const bare = innerLines[i].replace(/\r$/, '');
    for (const alias of aliases) {
      if (matchesTopLevelAlias(bare, alias)) {
        indices.push(i);
        break;
      }
    }
  }
  return indices;
}

function extractKey(bare: string): string {
  const m = /^([^\s:]+)\s*:/.exec(bare);
  return m !== null ? m[1] : '';
}

function precisaDeAspas(s: string): boolean {
  if (s === '') return false;
  // Caracteres de controle (inclui \n, \r, \t)
  if (/[\x00-\x1f\x7f]/.test(s)) return true;
  // Caracteres especiais YAML: dois-pontos, aspas, barras, colchetes, chaves, vírgula, hash
  if (/[:{}\[\],#"'\/\\]/.test(s)) return true;
  // Indicadores de início em scalars YAML plain
  if (/^[|>&*!@`%?]/.test(s)) return true;
  // Boolean aparente
  if (/^(true|false|yes|no|on|off)$/i.test(s)) return true;
  // Null aparente
  if (/^(null|~)$/i.test(s)) return true;
  // Data aparente
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
  // Número aparente (inclui sinal, ponto decimal)
  if (/^[-+]?(\d+\.?\d*|\d*\.\d+)([eE][+-]?\d+)?$/.test(s)) return true;
  if (/^\d/.test(s)) return true;
  return false;
}

function serializarOrdem(v: number | null): string {
  return v === null ? '' : String(v);
}

function serializarTexto(v: string): string {
  const trimmed = v.trim();
  if (trimmed === '') return '';
  return precisaDeAspas(trimmed) ? JSON.stringify(trimmed) : trimmed;
}

function formatLinha(key: string, valorSer: string): string {
  return valorSer === '' ? key + ':' : key + ': ' + valorSer;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export function aplicarPatchNarrativoEvento(
  conteudo: string,
  valores: ValoresNarrativosEvento,
): ResultadoPatchFrontmatterEvento {
  const { ordemNarrativa, capitulo, cena } = valores;

  if (ordemNarrativa !== null) {
    if (!Number.isFinite(ordemNarrativa) || !Number.isInteger(ordemNarrativa)) {
      throw new ErroPatchFrontmatterEvento(
        'valor_invalido',
        'ordem_narrativa',
        'Valor de ordemNarrativa inválido: deve ser inteiro finito ou null.',
      );
    }
  }

  // Trata BOM UTF-8 (U+FEFF)
  let bom = '';
  let rest = conteudo;
  if (rest.length > 0 && rest.charCodeAt(0) === 0xfeff) {
    bom = rest[0];
    rest = rest.slice(1);
  }

  // Exige frontmatter no início do arquivo
  if (!rest.startsWith('---')) {
    throw new ErroPatchFrontmatterEvento('frontmatter_ausente', '', 'Frontmatter ausente no início do arquivo.');
  }

  // Divide em linhas preservando \r para CRLF
  const allLines = rest.split('\n');
  const openLine = allLines[0];
  if (openLine.replace(/\r$/, '') !== '---') {
    throw new ErroPatchFrontmatterEvento('frontmatter_ausente', '', 'Delimitador de abertura do frontmatter inválido.');
  }

  // Localiza fechamento ---
  let closeIdx = -1;
  for (let i = 1; i < allLines.length; i++) {
    if (allLines[i].replace(/\r$/, '') === '---') {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) {
    throw new ErroPatchFrontmatterEvento('frontmatter_invalido', '', 'Fechamento de frontmatter ausente.');
  }

  const innerLines = allLines.slice(1, closeIdx);
  const closeLine = allLines[closeIdx];
  const bodyLines = allLines.slice(closeIdx + 1);

  // Detecta quebra de linha usada (CR para CRLF, vazio para LF)
  const cr = openLine.endsWith('\r') ? '\r' : '';

  // Localiza linhas de cada campo
  const ordIndices = findFieldLines(innerLines, ORD_ALIASES);
  const capIndices = findFieldLines(innerLines, CAP_ALIASES);
  const cenIndices = findFieldLines(innerLines, CEN_ALIASES);

  // Verifica duplicatas
  if (ordIndices.length > 1) {
    throw new ErroPatchFrontmatterEvento('chave_duplicada', 'ordem_narrativa', 'Chave de ordem narrativa duplicada no frontmatter.');
  }
  if (capIndices.length > 1) {
    throw new ErroPatchFrontmatterEvento('chave_duplicada', 'capitulo', 'Chave de capítulo duplicada no frontmatter.');
  }
  if (cenIndices.length > 1) {
    throw new ErroPatchFrontmatterEvento('chave_duplicada', 'cena', 'Chave de cena duplicada no frontmatter.');
  }

  // Serializa novos valores
  const ordSer = serializarOrdem(ordemNarrativa);
  const capSer = serializarTexto(capitulo);
  const cenSer = serializarTexto(cena);

  const newInnerLines = [...innerLines];
  const camposAlterados: ('ordem_narrativa' | 'capitulo' | 'cena')[] = [];
  // Chaves canônicas ausentes a acrescentar (na ordem: ordem_narrativa, capitulo, cena)
  const toAppend: Array<['ordem_narrativa' | 'capitulo' | 'cena', string]> = [];

  // Processa ordem_narrativa
  if (ordIndices.length === 1) {
    const idx = ordIndices[0];
    const bare = newInnerLines[idx].replace(/\r$/, '');
    const key = extractKey(bare);
    const newBare = formatLinha(key, ordSer);
    if (bare !== newBare) {
      camposAlterados.push('ordem_narrativa');
      newInnerLines[idx] = newBare + cr;
    }
  } else {
    camposAlterados.push('ordem_narrativa');
    toAppend.push(['ordem_narrativa', ordSer]);
  }

  // Processa capitulo
  if (capIndices.length === 1) {
    const idx = capIndices[0];
    const bare = newInnerLines[idx].replace(/\r$/, '');
    const key = extractKey(bare);
    const newBare = formatLinha(key, capSer);
    if (bare !== newBare) {
      camposAlterados.push('capitulo');
      newInnerLines[idx] = newBare + cr;
    }
  } else {
    camposAlterados.push('capitulo');
    toAppend.push(['capitulo', capSer]);
  }

  // Processa cena
  if (cenIndices.length === 1) {
    const idx = cenIndices[0];
    const bare = newInnerLines[idx].replace(/\r$/, '');
    const key = extractKey(bare);
    const newBare = formatLinha(key, cenSer);
    if (bare !== newBare) {
      camposAlterados.push('cena');
      newInnerLines[idx] = newBare + cr;
    }
  } else {
    camposAlterados.push('cena');
    toAppend.push(['cena', cenSer]);
  }

  // Acrescenta campos ausentes antes do fechamento (ordem canônica garantida por toAppend)
  for (const [canonKey, ser] of toAppend) {
    newInnerLines.push(formatLinha(canonKey, ser) + cr);
  }

  const novoConteudo = bom + [openLine, ...newInnerLines, closeLine, ...bodyLines].join('\n');

  return {
    conteudo: novoConteudo,
    alterado: camposAlterados.length > 0,
    camposAlterados,
  };
}
