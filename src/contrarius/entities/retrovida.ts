import type { Retrovida } from '../types';
import { normStr, normList, normNum, primeiroPresente } from '../normalize';
import { deepCopyYaml, extractBasename } from '../utils';
import { inferirNaturezaConsciencial } from '../identify';

const CAMPOS_CONHECIDOS = new Set([
  'tipo','id','consc_id','consciencia','vida','nomes','nome','nascimento','morte',
  'livro','periodo','nucleo_geo','nucleoGeo','mov_historico','movHistorico',
  'pov','historicidade','holopensenes','religiao','classe_social','classeSocial',
]);

export function normalizarRetrovida(
  frontmatter: Readonly<Record<string, unknown>>,
  filePath: string,
): Retrovida {
  const avisos: string[] = [];
  const id = normStr(frontmatter['id']) || extractBasename(filePath);
  if (id === '') avisos.push('Não foi possível obter id: propriedade "id" ausente e basename não disponível.');
  const conscIdRaw = primeiroPresente(frontmatter, ['consc_id', 'consciencia']);
  const conscId = conscIdRaw !== undefined ? normStr(conscIdRaw) : '';
  if (conscId === '') avisos.push('Campo "conscId" ausente ou vazio (esperado via consc_id ou consciencia).');
  const vida = normStr(frontmatter['vida']);
  if (vida === '') avisos.push('Campo "vida" ausente ou vazio.');
  const nomesRaw = primeiroPresente(frontmatter, ['nomes', 'nome']);
  const nomes = nomesRaw !== undefined ? normList(nomesRaw) : [];
  if (nomes.length === 0) avisos.push('Campo "nomes" ausente ou vazio (esperado via nomes ou nome).');
  const nucleoGeoRaw = primeiroPresente(frontmatter, ['nucleo_geo', 'nucleoGeo']);
  const movHistoricoRaw = primeiroPresente(frontmatter, ['mov_historico', 'movHistorico']);
  const povRaw = primeiroPresente(frontmatter, ['pov', 'historicidade']);
  const classeSocialRaw = primeiroPresente(frontmatter, ['classe_social', 'classeSocial']);
  const frontmatterRaw = deepCopyYaml(frontmatter) as Record<string, unknown>;
  const camposDesconhecidos: Record<string, unknown> = {};
  for (const key of Object.keys(frontmatter)) {
    if (!CAMPOS_CONHECIDOS.has(key)) camposDesconhecidos[key] = deepCopyYaml(frontmatter[key]);
  }
  return {
    tipoEntidade: 'retrovida', id, conscId, vida, nomes,
    nascimento: normNum(frontmatter['nascimento']), morte: normNum(frontmatter['morte']),
    livro: normList(frontmatter['livro']), periodo: normList(frontmatter['periodo']),
    nucleoGeo: nucleoGeoRaw !== undefined ? normList(nucleoGeoRaw) : [],
    movHistorico: movHistoricoRaw !== undefined ? normList(movHistoricoRaw) : [],
    pov: povRaw !== undefined ? normStr(povRaw) : '',
    holopensenes: normList(frontmatter['holopensenes']),
    religiao: normList(frontmatter['religiao']),
    classeSocial: classeSocialRaw !== undefined ? normList(classeSocialRaw) : [],
    naturezaConsciencial: inferirNaturezaConsciencial(filePath, frontmatter, 'retrovida'),
    filePath, frontmatterRaw, camposDesconhecidos, avisos,
  };
}
