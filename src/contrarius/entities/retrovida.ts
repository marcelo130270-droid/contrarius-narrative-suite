import type { Retrovida } from '../types';
import { normStr, normList, normNum, primeiroPresente } from '../normalize';

const CAMPOS_CONHECIDOS = new Set([
  'tipo',
  'id',
  'consc_id',
  'consciencia',
  'vida',
  'nomes',
  'nome',
  'nascimento',
  'morte',
  'livro',
  'periodo',
  'nucleo_geo',
  'nucleoGeo',
  'mov_historico',
  'movHistorico',
  'pov',
  'historicidade',
  'holopensenes',
  'religiao',
  'classe_social',
  'classeSocial',
]);

function deepCopyYaml(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return (value as unknown[]).map(deepCopyYaml);
  }
  const obj = value as Record<string, unknown>;
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    copy[key] = deepCopyYaml(obj[key]);
  }
  return copy;
}

function extractBasename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const filename = parts[parts.length - 1] ?? '';
  if (filename.endsWith('.md')) {
    return filename.slice(0, -3);
  }
  return filename;
}

export function normalizarRetrovida(
  frontmatter: Readonly<Record<string, unknown>>,
  filePath: string,
): Retrovida {
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

  const conscIdRaw = primeiroPresente(frontmatter, ['consc_id', 'consciencia']);
  const conscId = conscIdRaw !== undefined ? normStr(conscIdRaw) : '';
  if (conscId === '') {
    avisos.push('Campo "conscId" ausente ou vazio (esperado via consc_id ou consciencia).');
  }

  const vida = normStr(frontmatter['vida']);
  if (vida === '') {
    avisos.push('Campo "vida" ausente ou vazio.');
  }

  const nomesRaw = primeiroPresente(frontmatter, ['nomes', 'nome']);
  const nomes = nomesRaw !== undefined ? normList(nomesRaw) : [];
  if (nomes.length === 0) {
    avisos.push('Campo "nomes" ausente ou vazio (esperado via nomes ou nome).');
  }

  const nascimento = normNum(frontmatter['nascimento']);
  const morte = normNum(frontmatter['morte']);

  const livro = normList(frontmatter['livro']);
  const periodo = normList(frontmatter['periodo']);

  const nucleoGeoRaw = primeiroPresente(frontmatter, ['nucleo_geo', 'nucleoGeo']);
  const nucleoGeo = nucleoGeoRaw !== undefined ? normList(nucleoGeoRaw) : [];

  const movHistoricoRaw = primeiroPresente(frontmatter, ['mov_historico', 'movHistorico']);
  const movHistorico = movHistoricoRaw !== undefined ? normList(movHistoricoRaw) : [];

  const povRaw = primeiroPresente(frontmatter, ['pov', 'historicidade']);
  const pov = povRaw !== undefined ? normStr(povRaw) : '';

  const holopensenes = normList(frontmatter['holopensenes']);
  const religiao = normList(frontmatter['religiao']);

  const classeSocialRaw = primeiroPresente(frontmatter, ['classe_social', 'classeSocial']);
  const classeSocial = classeSocialRaw !== undefined ? normList(classeSocialRaw) : [];

  const frontmatterRaw = deepCopyYaml(frontmatter) as Record<string, unknown>;

  const camposDesconhecidos: Record<string, unknown> = {};
  for (const key of Object.keys(frontmatter)) {
    if (!CAMPOS_CONHECIDOS.has(key)) {
      camposDesconhecidos[key] = deepCopyYaml(frontmatter[key]);
    }
  }

  return {
    tipoEntidade: 'retrovida',
    id,
    conscId,
    vida,
    nomes,
    nascimento,
    morte,
    livro,
    periodo,
    nucleoGeo,
    movHistorico,
    pov,
    holopensenes,
    religiao,
    classeSocial,
    filePath,
    frontmatterRaw,
    camposDesconhecidos,
    avisos,
  };
}
