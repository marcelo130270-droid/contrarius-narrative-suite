import type { AlertaContrarius, Evento, NotaContrariusBruta, ResultadoNormalizacao } from '../types';
import { extrairMetadata, getStr, getStrArray, getStrData, getStrOuNumero, getWikiLinkArray } from './campos';

const CAMPOS_CONHECIDOS = [
  'codigo',
  'titulo',
  'local',
  'periodo',
  'nucleo_geo',
  'livro',
  'retrovidas',
  'holopensenes',
  'religiao',
  'mov_historico',
  'eventos_anteriores',
  'eventos_posteriores',
  'ano_ordem',
  'data_inicio',
  'data_fim',
  'data_textual',
] as const;

export function normalizarEvento(nota: NotaContrariusBruta): ResultadoNormalizacao<Evento> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const codigo = getStr(fm, 'codigo');
  if (!codigo) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'codigo', mensagem: 'Evento sem codigo.' });
  }

  const retrovidas = getWikiLinkArray(fm, 'retrovidas');
  if (!retrovidas || retrovidas.length === 0) {
    alertas.push({ severidade: 'aviso', path: nota.path, campo: 'retrovidas', mensagem: 'Evento sem retrovidas associadas.' });
  }

  const entidade: Evento = {
    path: nota.path,
    codigo,
    titulo: getStr(fm, 'titulo'),
    local: getWikiLinkArray(fm, 'local'),
    periodo: getStrArray(fm, 'periodo'),
    nucleo_geo: getStrArray(fm, 'nucleo_geo'),
    livro: getStr(fm, 'livro'),
    retrovidas,
    holopensenes: getStrArray(fm, 'holopensenes'),
    religiao: getStr(fm, 'religiao'),
    mov_historico: getStrArray(fm, 'mov_historico'),
    eventos_anteriores: getWikiLinkArray(fm, 'eventos_anteriores'),
    eventos_posteriores: getWikiLinkArray(fm, 'eventos_posteriores'),
    ano_ordem: getStrOuNumero(fm, 'ano_ordem'),
    data_inicio: getStrData(fm, 'data_inicio'),
    data_fim: getStrData(fm, 'data_fim'),
    data_textual: getStr(fm, 'data_textual'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
