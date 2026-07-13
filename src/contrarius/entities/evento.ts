import type { AlertaContrarius, Evento, NotaContrariusBruta, ResultadoNormalizacao } from '../types';
import { extrairMetadata, getStr, getStrArray } from './campos';

const CAMPOS_CONHECIDOS = [
  'id_evento',
  'local',
  'data',
  'periodo',
  'nucleo_geo',
  'livro',
  'participantes',
  'holopensenes',
  'religiao',
  'mov_historico',
  'eventos_anteriores',
  'eventos_posteriores',
] as const;

export function normalizarEvento(nota: NotaContrariusBruta): ResultadoNormalizacao<Evento> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const id_evento = getStr(fm, 'id_evento');
  if (!id_evento) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'id_evento', mensagem: 'Evento sem id_evento.' });
  }

  const participantes = getStrArray(fm, 'participantes');
  if (!participantes || participantes.length === 0) {
    alertas.push({ severidade: 'aviso', path: nota.path, campo: 'participantes', mensagem: 'Evento sem participantes.' });
  }

  const entidade: Evento = {
    path: nota.path,
    id_evento,
    local: getStr(fm, 'local'),
    data: getStr(fm, 'data'),
    periodo: getStr(fm, 'periodo'),
    nucleo_geo: getStrArray(fm, 'nucleo_geo'),
    livro: getStr(fm, 'livro'),
    participantes,
    holopensenes: getStrArray(fm, 'holopensenes'),
    religiao: getStr(fm, 'religiao'),
    mov_historico: getStr(fm, 'mov_historico'),
    eventos_anteriores: getStrArray(fm, 'eventos_anteriores'),
    eventos_posteriores: getStrArray(fm, 'eventos_posteriores'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
