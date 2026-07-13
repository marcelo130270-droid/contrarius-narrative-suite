import type { AlertaContrarius, Consciencia, NotaContrariusBruta, ResultadoNormalizacao } from '../types';
import { extrairMetadata, getStr } from './campos';

const CAMPOS_CONHECIDOS = ['id', 'ident_extraf', 'historicidade', 'grupocarma'] as const;

export function normalizarConsciencia(nota: NotaContrariusBruta): ResultadoNormalizacao<Consciencia> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const id = getStr(fm, 'id');
  if (!id) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'id', mensagem: 'Consciência sem id.' });
  } else if (id.toLowerCase() === 'xxx') {
    alertas.push({ severidade: 'info', path: nota.path, campo: 'id', mensagem: 'Consciência com id provisório (xxx).' });
  }

  const entidade: Consciencia = {
    path: nota.path,
    id,
    ident_extraf: getStr(fm, 'ident_extraf'),
    historicidade: getStr(fm, 'historicidade'),
    grupocarma: getStr(fm, 'grupocarma'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
