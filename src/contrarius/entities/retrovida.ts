import type { AlertaContrarius, NotaContrariusBruta, ResultadoNormalizacao, Retrovida } from '../types';
import { extrairMetadata, getStr, getStrArray } from './campos';

const CAMPOS_CONHECIDOS = [
  'consc_id',
  'vida',
  'nascimento',
  'morte',
  'livro',
  'periodo',
  'nucleo_geo',
  'mov_historico',
  'pov',
  'holopensenes',
  'religiao',
] as const;

const VALORES_POV_CONHECIDOS = ['real', 'lendário', 'fictício'];

export function normalizarRetrovida(nota: NotaContrariusBruta): ResultadoNormalizacao<Retrovida> {
  const fm = nota.frontmatter;
  const alertas: AlertaContrarius[] = [];

  const consc_id = getStr(fm, 'consc_id');
  if (!consc_id) {
    alertas.push({ severidade: 'erro', path: nota.path, campo: 'consc_id', mensagem: 'Retrovida sem consc_id.' });
  }

  const pov = getStr(fm, 'pov');
  if (pov && !VALORES_POV_CONHECIDOS.includes(pov)) {
    alertas.push({
      severidade: 'aviso',
      path: nota.path,
      campo: 'pov',
      mensagem: `Retrovida com pov fora do esperado (${VALORES_POV_CONHECIDOS.join(', ')}): "${pov}".`,
    });
  }

  const entidade: Retrovida = {
    path: nota.path,
    consc_id,
    vida: getStr(fm, 'vida'),
    nascimento: getStr(fm, 'nascimento'),
    morte: getStr(fm, 'morte'),
    livro: getStr(fm, 'livro'),
    periodo: getStr(fm, 'periodo'),
    nucleo_geo: getStrArray(fm, 'nucleo_geo'),
    mov_historico: getStr(fm, 'mov_historico'),
    pov,
    holopensenes: getStrArray(fm, 'holopensenes'),
    religiao: getStr(fm, 'religiao'),
    metadata: extrairMetadata(fm, CAMPOS_CONHECIDOS),
  };

  return { entidade, alertas };
}
