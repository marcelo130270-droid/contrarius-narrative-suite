import type { AlertaContrarius, Lugar, NotaContrariusBruta, ResultadoNormalizacao } from '../types';
import { extrairMetadata, getStr, getStrArray } from './campos';

const CAMPOS_CONHECIDOS = [
  'num_reg',
  'nome_atual',
  'coordenadas_google_earth',
  'nucleo_geo',
  'livros',
] as const;

export function normalizarLugar(nota: NotaContrariusBruta): ResultadoNormalizacao<Lugar> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const num_reg = getStr(fm, 'num_reg');
  if (!num_reg) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'num_reg', mensagem: 'Lugar sem num_reg.' });
  }

  if (!getStr(fm, 'nome_atual')) {
    alertas.push({ severidade: 'aviso', path: nota.path, campo: 'nome_atual', mensagem: 'Lugar sem nome_atual.' });
  }

  const entidade: Lugar = {
    path: nota.path,
    num_reg,
    nome_atual: getStr(fm, 'nome_atual'),
    coordenadas: getStr(fm, 'coordenadas_google_earth'),
    nucleo_geo: getStrArray(fm, 'nucleo_geo'),
    livros: getStrArray(fm, 'livros'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
