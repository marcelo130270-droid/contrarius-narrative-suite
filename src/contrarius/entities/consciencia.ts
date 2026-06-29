import type { Consciencia } from '../types';
import { normStr, normList, normBool, primeiroPresente } from '../normalize';
import { deepCopyYaml, extractBasename } from '../utils';
import { inferirNaturezaConsciencial } from '../identify';

const CAMPOS_CONHECIDOS = new Set([
  'tipo','id','nome','ident_extraf','identExtraf','nucleo_geo','nucleoGeo',
  'religiao','holopensenes','grupocarma','grupo_karmico','reaparece',
]);

export function normalizarConsciencia(
  frontmatter: Readonly<Record<string, unknown>>,
  filePath: string,
): Consciencia {
  const avisos: string[] = [];
  const idExplicito = normStr(frontmatter['id']);
  const id = idExplicito || extractBasename(filePath);
  if (id === '') avisos.push('Não foi possível obter id: propriedade "id" ausente e basename não disponível.');
  const nome = normStr(frontmatter['nome']);
  if (nome === '') avisos.push('Campo "nome" ausente ou vazio.');
  const identExtrafRaw = primeiroPresente(frontmatter, ['ident_extraf', 'identExtraf']);
  const nucleoGeoRaw = primeiroPresente(frontmatter, ['nucleo_geo', 'nucleoGeo']);
  const grupocarmaRaw = primeiroPresente(frontmatter, ['grupocarma', 'grupo_karmico']);
  const frontmatterRaw = deepCopyYaml(frontmatter) as Record<string, unknown>;
  const camposDesconhecidos: Record<string, unknown> = {};
  for (const key of Object.keys(frontmatter)) {
    if (!CAMPOS_CONHECIDOS.has(key)) camposDesconhecidos[key] = deepCopyYaml(frontmatter[key]);
  }
  return {
    tipoEntidade: 'consciencia', id, nome,
    identExtraf: identExtrafRaw !== undefined ? normStr(identExtrafRaw) : '',
    nucleoGeo: nucleoGeoRaw !== undefined ? normList(nucleoGeoRaw) : [],
    religiao: normList(frontmatter['religiao']),
    holopensenes: normList(frontmatter['holopensenes']),
    grupocarma: grupocarmaRaw !== undefined ? normList(grupocarmaRaw) : [],
    reaparece: normBool(frontmatter['reaparece']),
    naturezaConsciencial: inferirNaturezaConsciencial(filePath, frontmatter, 'consciencia'),
    filePath, frontmatterRaw, camposDesconhecidos, avisos,
  };
}
