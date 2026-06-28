import type { Consciencia } from '../types';
import { normStr, normList, normBool, primeiroPresente } from '../normalize';
import { deepCopyYaml, extractBasename } from '../utils';

const CAMPOS_CONHECIDOS = new Set([
  'tipo',
  'id',
  'nome',
  'ident_extraf',
  'identExtraf',
  'nucleo_geo',
  'nucleoGeo',
  'religiao',
  'holopensenes',
  'grupocarma',
  'grupo_karmico',
  'reaparece',
]);

export function normalizarConsciencia(
  frontmatter: Readonly<Record<string, unknown>>,
  filePath: string,
): Consciencia {
  const avisos: string[] = [];

  const idExplicito = normStr(frontmatter['id']);
  let id: string;
  if (idExplicito !== '') {
    id = idExplicito;
  } else {
    const basename = extractBasename(filePath);
    if (basename !== '') {
      id = basename;
    } else {
      id = '';
      avisos.push('Não foi possível obter id: propriedade "id" ausente e basename não disponível.');
    }
  }

  const nome = normStr(frontmatter['nome']);
  if (nome === '') {
    avisos.push('Campo "nome" ausente ou vazio.');
  }

  const identExtrafRaw = primeiroPresente(frontmatter, ['ident_extraf', 'identExtraf']);
  const identExtraf = identExtrafRaw !== undefined ? normStr(identExtrafRaw) : '';

  const nucleoGeoRaw = primeiroPresente(frontmatter, ['nucleo_geo', 'nucleoGeo']);
  const nucleoGeo = nucleoGeoRaw !== undefined ? normList(nucleoGeoRaw) : [];

  const religiao = normList(frontmatter['religiao']);

  const holopensenes = normList(frontmatter['holopensenes']);

  const grupocarmaRaw = primeiroPresente(frontmatter, ['grupocarma', 'grupo_karmico']);
  const grupocarma = grupocarmaRaw !== undefined ? normList(grupocarmaRaw) : [];

  const reaparece = normBool(frontmatter['reaparece']);

  const frontmatterRaw = deepCopyYaml(frontmatter) as Record<string, unknown>;

  const camposDesconhecidos: Record<string, unknown> = {};
  for (const key of Object.keys(frontmatter)) {
    if (!CAMPOS_CONHECIDOS.has(key)) {
      camposDesconhecidos[key] = deepCopyYaml(frontmatter[key]);
    }
  }

  return {
    tipoEntidade: 'consciencia',
    id,
    nome,
    identExtraf,
    nucleoGeo,
    religiao,
    holopensenes,
    grupocarma,
    reaparece,
    filePath,
    frontmatterRaw,
    camposDesconhecidos,
    avisos,
  };
}
