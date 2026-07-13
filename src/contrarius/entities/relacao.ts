import type { AlertaContrarius, NotaContrariusBruta, Relacao, ResultadoNormalizacao } from '../types';

export function normalizarRelacao(nota: NotaContrariusBruta): ResultadoNormalizacao<Relacao> {
  const alertas: AlertaContrarius[] = [];

  if (Object.keys(nota.frontmatter).length === 0) {
    alertas.push({ severidade: 'aviso', path: nota.path, mensagem: 'Relação sem frontmatter.' });
  }

  const entidade: Relacao = {
    path: nota.path,
    metadata: { ...nota.frontmatter },
  };

  return { entidade, alertas };
}
