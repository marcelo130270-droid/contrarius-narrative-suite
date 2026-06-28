import type { Relacao } from '../types';
import { normList, normStr, primeiroPresente } from '../normalize';
import { deepCopyYaml, extractBasename } from '../utils';

const CAMPOS_CONHECIDOS = new Set([
  'tipo', 'id', 'a', 'consciencia_1', 'consciencia1', 'b', 'consciencia_2',
  'consciencia2', 'tipo_relacao', 'tipoRelacao', 'intensidade', 'inicio', 'fim',
  'livro', 'livros', 'estado', 'tags',
]);

export function normalizarRelacao(
  frontmatter: Readonly<Record<string, unknown>>,
  filePath: string,
): Relacao {
  const avisos: string[] = [];
  const id = normStr(frontmatter['id']) || extractBasename(filePath);
  if (id === '') avisos.push('Não foi possível obter id: propriedade "id" ausente e basename não disponível.');

  const consciencia1Raw = primeiroPresente(frontmatter, ['a', 'consciencia_1', 'consciencia1']);
  const consciencia2Raw = primeiroPresente(frontmatter, ['b', 'consciencia_2', 'consciencia2']);
  const consciencia1 = consciencia1Raw !== undefined ? normStr(consciencia1Raw) : '';
  const consciencia2 = consciencia2Raw !== undefined ? normStr(consciencia2Raw) : '';
  if (consciencia1 === '') avisos.push('Primeira consciência ausente (a ou consciencia_1).');
  if (consciencia2 === '') avisos.push('Segunda consciência ausente (b ou consciencia_2).');

  const tipoRelacaoRaw = primeiroPresente(frontmatter, ['tipo_relacao', 'tipoRelacao']);
  const livroRaw = primeiroPresente(frontmatter, ['livro', 'livros']);

  const frontmatterRaw = deepCopyYaml(frontmatter) as Record<string, unknown>;
  const camposDesconhecidos: Record<string, unknown> = {};
  for (const key of Object.keys(frontmatter)) {
    if (!CAMPOS_CONHECIDOS.has(key)) camposDesconhecidos[key] = deepCopyYaml(frontmatter[key]);
  }

  return {
    tipoEntidade: 'relacao',
    id,
    consciencia1,
    consciencia2,
    tipoRelacao: tipoRelacaoRaw !== undefined ? normList(tipoRelacaoRaw) : [],
    intensidade: normStr(frontmatter['intensidade']),
    inicio: normStr(frontmatter['inicio']),
    fim: normStr(frontmatter['fim']),
    livro: livroRaw !== undefined ? normList(livroRaw) : [],
    estado: normStr(frontmatter['estado']),
    tags: normList(frontmatter['tags']),
    filePath,
    frontmatterRaw,
    camposDesconhecidos,
    avisos,
  };
}
