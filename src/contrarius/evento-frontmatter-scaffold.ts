export interface DadosFrontmatterMinimoEvento {
  readonly idEvento: string;
  readonly titulo: string;
}

export interface ResultadoFrontmatterMinimoEvento {
  readonly conteudo: string;
  readonly alterado: boolean;
}

export type CodigoErroFrontmatterMinimoEvento =
  | 'frontmatter_existente'
  | 'frontmatter_invalido'
  | 'id_evento_vazio'
  | 'titulo_vazio';

export class ErroFrontmatterMinimoEvento extends Error {
  readonly codigo: CodigoErroFrontmatterMinimoEvento;

  constructor(codigo: CodigoErroFrontmatterMinimoEvento, mensagem: string) {
    super(mensagem);
    this.name = 'ErroFrontmatterMinimoEvento';
    this.codigo = codigo;
  }
}

function precisaDeAspas(s: string): boolean {
  if (s === '') return false;
  if (/[\x00-\x1f\x7f]/.test(s)) return true;
  if (/[:{}\[\],#"'\/\\]/.test(s)) return true;
  if (/^[|>&*!@`%?]/.test(s)) return true;
  if (/^(true|false|yes|no|on|off)$/i.test(s)) return true;
  if (/^(null|~)$/i.test(s)) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
  if (/^[-+]?(\d+\.?\d*|\d*\.\d+)([eE][+-]?\d+)?$/.test(s)) return true;
  if (/^\d/.test(s)) return true;
  return false;
}

function serializarTitulo(titulo: string): string {
  return precisaDeAspas(titulo) ? JSON.stringify(titulo) : titulo;
}

export function adicionarFrontmatterMinimoEvento(
  conteudo: string,
  dados: DadosFrontmatterMinimoEvento,
): ResultadoFrontmatterMinimoEvento {
  let bom = '';
  let rest = conteudo;
  if (rest.length > 0 && rest.charCodeAt(0) === 0xfeff) {
    bom = rest[0];
    rest = rest.slice(1);
  }

  const idAparado = dados.idEvento.trim();
  const tituloAparado = dados.titulo.trim();

  if (idAparado === '') {
    throw new ErroFrontmatterMinimoEvento('id_evento_vazio', 'O ID do evento não pode ser vazio.');
  }
  if (tituloAparado === '') {
    throw new ErroFrontmatterMinimoEvento('titulo_vazio', 'O título não pode ser vazio.');
  }

  if (rest.startsWith('---')) {
    const nlIdx = rest.indexOf('\n');
    const firstLine = nlIdx === -1 ? rest : rest.slice(0, nlIdx).replace(/\r$/, '');
    if (firstLine === '---') {
      const afterFirst = nlIdx === -1 ? '' : rest.slice(nlIdx + 1);
      const lines = afterFirst.split('\n');
      const hasClose = lines.some((l) => l.replace(/\r$/, '') === '---');
      if (hasClose) {
        throw new ErroFrontmatterMinimoEvento('frontmatter_existente', 'A nota já possui frontmatter válido.');
      } else {
        throw new ErroFrontmatterMinimoEvento('frontmatter_invalido', 'O frontmatter não possui fechamento válido.');
      }
    }
  }

  const nl = rest.includes('\r\n') ? '\r\n' : '\n';
  const tituloYaml = serializarTitulo(tituloAparado);

  const linhasFrontmatter = [
    '---',
    `id_evento: ${idAparado}`,
    `titulo: ${tituloYaml}`,
    'livro:',
    'periodo:',
    'data:',
    'ano_ordem:',
    'ordem_narrativa:',
    'capitulo:',
    'cena:',
    'participantes:',
    'holopensenes:',
    'religiao:',
    'mov_historico:',
    'eventos_anteriores:',
    'eventos_posteriores:',
    '---',
  ];

  const frontmatter = linhasFrontmatter.join(nl) + nl;
  return { conteudo: bom + frontmatter + rest, alterado: true };
}
