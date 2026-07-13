import type { AlertaContrarius, Lugar, NotaContrariusBruta, ResultadoNormalizacao } from '../types';
import { extrairMetadata, getStr, getStrArray } from './campos';

const CAMPOS_CONHECIDOS = [
  'codigo',
  'nome_atual',
  'nomes_variantes',
  'coordenadas_google_earth',
  'nucleo_geo',
  'livros',
] as const;

export function normalizarLugar(nota: NotaContrariusBruta): ResultadoNormalizacao<Lugar> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const codigo = getStr(fm, 'codigo');
  if (!codigo) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'codigo', mensagem: 'Lugar sem codigo.' });
  }

  if (!getStr(fm, 'nome_atual')) {
    alertas.push({ severidade: 'aviso', path: nota.path, campo: 'nome_atual', mensagem: 'Lugar sem nome_atual.' });
  }

  const entidade: Lugar = {
    path: nota.path,
    codigo,
    nome_atual: getStr(fm, 'nome_atual'),
    nomes_historicos: getStrArray(fm, 'nomes_variantes'),
    coordenadas: getStr(fm, 'coordenadas_google_earth'),
    nucleo_geo: getStrArray(fm, 'nucleo_geo'),
    livros: getStrArray(fm, 'livros'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
