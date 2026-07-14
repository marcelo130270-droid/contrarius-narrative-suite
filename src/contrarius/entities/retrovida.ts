import type { AlertaContrarius, NotaContrariusBruta, ResultadoNormalizacao, Retrovida } from '../types';
import { extrairMetadata, getStr, getStrArray, getStrOuNumero } from './campos';

const CAMPOS_CONHECIDOS = [
  'consciencia',
  'vida',
  'nomes',
  'nascimento',
  'morte',
  'livro',
  'periodo',
  'nucleo_geo',
  'mov_historico',
  'historicidade',
  'holopensenes',
  'religiao',
  'grupocarma',
] as const;

// Valores observados no Vault real: "Ficticio", "Real", "Lendario" (com/sem acento, capitalização variável).
const VALORES_HISTORICIDADE_CONHECIDOS = ['ficticio', 'real', 'lendario'];

function semAcentoMinusculo(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function normalizarRetrovida(nota: NotaContrariusBruta): ResultadoNormalizacao<Retrovida> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const consciencia = getStr(fm, 'consciencia');
  if (!consciencia) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'consciencia', mensagem: 'Retrovida sem consciência associada.' });
  }

  const historicidade = getStr(fm, 'historicidade');
  if (historicidade && !VALORES_HISTORICIDADE_CONHECIDOS.includes(semAcentoMinusculo(historicidade))) {
    alertas.push({
      severidade: 'aviso',
      path: nota.path,
      campo: 'historicidade',
      mensagem: `Retrovida com historicidade fora do esperado (${VALORES_HISTORICIDADE_CONHECIDOS.join(', ')}): "${historicidade}".`,
    });
  }

  const entidade: Retrovida = {
    path: nota.path,
    consciencia,
    vida: getStrOuNumero(fm, 'vida'),
    nomes: getStrArray(fm, 'nomes'),
    nascimento: getStr(fm, 'nascimento'),
    morte: getStr(fm, 'morte'),
    livro: getStr(fm, 'livro'),
    periodo: getStrArray(fm, 'periodo'),
    nucleo_geo: getStrArray(fm, 'nucleo_geo'),
    mov_historico: getStrArray(fm, 'mov_historico'),
    historicidade,
    holopensenes: getStrArray(fm, 'holopensenes'),
    religiao: getStrArray(fm, 'religiao'),
    grupocarma: getStrArray(fm, 'grupocarma'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
