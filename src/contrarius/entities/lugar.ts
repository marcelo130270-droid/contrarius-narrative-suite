import type { AlertaContrarius, Lugar, NotaContrariusBruta, ResultadoNormalizacao } from '../types';
import { extrairMetadata, getStr, getStrArray } from './campos';

const CAMPOS_CONHECIDOS = [
  'id_lugar',
  'nome_atual',
  'nomes_historicos',
  'coordenadas',
  'nucleo_geo',
  'periodo',
  'livros',
] as const;

export function normalizarLugar(nota: NotaContrariusBruta): ResultadoNormalizacao<Lugar> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const id_lugar = getStr(fm, 'id_lugar');
  if (!id_lugar) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'id_lugar', mensagem: 'Lugar sem id_lugar.' });
  }

  if (!getStr(fm, 'nome_atual')) {
    alertas.push({ severidade: 'aviso', path: nota.path, campo: 'nome_atual', mensagem: 'Lugar sem nome_atual.' });
  }

  const entidade: Lugar = {
    path: nota.path,
    id_lugar,
    nome_atual: getStr(fm, 'nome_atual'),
    nomes_historicos: getStrArray(fm, 'nomes_historicos'),
    coordenadas: getStr(fm, 'coordenadas'),
    nucleo_geo: getStr(fm, 'nucleo_geo'),
    periodo: getStr(fm, 'periodo'),
    livros: getStrArray(fm, 'livros'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
