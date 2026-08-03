import type { AlertaContrarius, Evento, NotaContrariusBruta, ResultadoNormalizacao } from '../types';
import { extrairMetadata, getStr, getStrArray, getStrData, getStrOuNumero, getWikiLinkArray } from './campos';

const CAMPOS_CONHECIDOS = [
  'num_reg',
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
  'ordem_narrativa',
  'ordem_cronologica',
  'data_inicio',
  'data_fim',
  'data_textual',
] as const;

export function normalizarEvento(nota: NotaContrariusBruta): ResultadoNormalizacao<Evento> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const num_reg = getStr(fm, 'num_reg');
  if (!num_reg) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'num_reg', mensagem: 'Evento sem num_reg.' });
  }

  const retrovidas = getWikiLinkArray(fm, 'retrovidas');
  if (!retrovidas || retrovidas.length === 0) {
    alertas.push({ severidade: 'aviso', path: nota.path, campo: 'retrovidas', mensagem: 'Evento sem retrovidas associadas.' });
  }

  const entidade: Evento = {
    path: nota.path,
    num_reg,
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
    ordem_narrativa: getStrOuNumero(fm, 'ordem_narrativa'),
    ordem_cronologica: getStrOuNumero(fm, 'ordem_cronologica'),
    data_inicio: getStrData(fm, 'data_inicio'),
    data_fim: getStrData(fm, 'data_fim'),
    data_textual: getStr(fm, 'data_textual'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
