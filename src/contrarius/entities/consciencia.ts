import type { AlertaContrarius, Consciencia, NotaContrariusBruta, ResultadoNormalizacao } from '../types';
import { extrairMetadata, getBool, getStr, getStrArray } from './campos';

const CAMPOS_CONHECIDOS = [
  'id',
  'nome',
  'ident_extraf',
  'nucleo_geo',
  'religiao',
  'holopensenes',
  'grupocarma',
  'reaparece',
] as const;

export function normalizarConsciencia(nota: NotaContrariusBruta): ResultadoNormalizacao<Consciencia> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const id = getStr(fm, 'id');
  if (!id) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'id', mensagem: 'Consciência sem id.' });
  } else if (id.toLowerCase() === 'xxx') {
    alertas.push({ severidade: 'info', path: nota.path, campo: 'id', mensagem: 'Consciência com id provisório (xxx).' });
  }

  if (!getStr(fm, 'nome')) {
    alertas.push({ severidade: 'aviso', path: nota.path, campo: 'nome', mensagem: 'Consciência sem nome.' });
  }

  const entidade: Consciencia = {
    path: nota.path,
    id,
    nome: getStr(fm, 'nome'),
    ident_extraf: getStr(fm, 'ident_extraf'),
    nucleo_geo: getStrArray(fm, 'nucleo_geo'),
    religiao: getStr(fm, 'religiao'),
    holopensenes: getStrArray(fm, 'holopensenes'),
    grupocarma: getStr(fm, 'grupocarma'),
    reaparece: getBool(fm, 'reaparece'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
