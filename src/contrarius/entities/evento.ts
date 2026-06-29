import type { Evento } from '../types';
import { normBool, normList, normNum, normStr, primeiroPresente } from '../normalize';
import { deepCopyYaml, extractBasename } from '../utils';

const CAMPOS_CONHECIDOS = new Set([
  'tipo', 'id_evento', 'codigo', 'id', 'titulo', 'ano_ordem', 'anoOrdem',
  'data', 'data_inicio', 'dataInicio', 'data_fim', 'dataFim', 'data_textual',
  'dataTextual', 'data_aproximada', 'dataAproximada', 'periodo', 'natureza',
  'status', 'local', 'nucleo_geo', 'nucleoGeo', 'participantes', 'retrovidas',
  'grupocarma', 'grupo_karmico', 'holopensenes', 'religiao', 'mov_historico',
  'movHistorico', 'eventos_anteriores', 'eventosAnteriores', 'eventos_posteriores',
  'eventosPosteriores', 'livro', 'fontes', 'tags',
]);

export function normalizarEvento(
  frontmatter: Readonly<Record<string, unknown>>,
  filePath: string,
  provisional = false,
): Evento {
  const avisos: string[] = [];

  const idRaw = primeiroPresente(frontmatter, ['id_evento', 'codigo', 'id']);
  const id = (idRaw !== undefined ? normStr(idRaw) : '') || extractBasename(filePath);
  if (id === '') {
    avisos.push('Não foi possível obter id: id_evento, codigo e id ausentes e basename não disponível.');
  }

  const titulo = normStr(frontmatter['titulo']);
  if (!provisional && titulo === '') avisos.push('Campo "titulo" ausente ou vazio.');

  const anoOrdemRaw = primeiroPresente(frontmatter, ['ano_ordem', 'anoOrdem']);
  const dataInicioRaw = primeiroPresente(frontmatter, ['data_inicio', 'dataInicio']);
  const dataFimRaw = primeiroPresente(frontmatter, ['data_fim', 'dataFim']);
  const dataTextualRaw = primeiroPresente(frontmatter, ['data_textual', 'dataTextual']);
  const dataAproximadaRaw = primeiroPresente(frontmatter, ['data_aproximada', 'dataAproximada']);
  const nucleoGeoRaw = primeiroPresente(frontmatter, ['nucleo_geo', 'nucleoGeo']);
  const grupocarmaRaw = primeiroPresente(frontmatter, ['grupocarma', 'grupo_karmico']);
  const movHistoricoRaw = primeiroPresente(frontmatter, ['mov_historico', 'movHistorico']);
  const anterioresRaw = primeiroPresente(frontmatter, ['eventos_anteriores', 'eventosAnteriores']);
  const posterioresRaw = primeiroPresente(frontmatter, ['eventos_posteriores', 'eventosPosteriores']);

  const frontmatterRaw = deepCopyYaml(frontmatter) as Record<string, unknown>;
  const camposDesconhecidos: Record<string, unknown> = {};
  for (const key of Object.keys(frontmatter)) {
    if (!CAMPOS_CONHECIDOS.has(key)) camposDesconhecidos[key] = deepCopyYaml(frontmatter[key]);
  }

  return {
    tipoEntidade: 'evento',
    id,
    titulo,
    anoOrdem: anoOrdemRaw !== undefined ? normNum(anoOrdemRaw) : null,
    data: normStr(frontmatter['data']),
    dataInicio: dataInicioRaw !== undefined ? normStr(dataInicioRaw) : '',
    dataFim: dataFimRaw !== undefined ? normStr(dataFimRaw) : '',
    dataTextual: dataTextualRaw !== undefined ? normStr(dataTextualRaw) : '',
    dataAproximada: dataAproximadaRaw !== undefined ? normBool(dataAproximadaRaw) : false,
    periodo: normList(frontmatter['periodo']),
    natureza: normStr(frontmatter['natureza']),
    status: normStr(frontmatter['status']),
    local: normList(frontmatter['local']),
    nucleoGeo: nucleoGeoRaw !== undefined ? normList(nucleoGeoRaw) : [],
    participantes: normList(frontmatter['participantes']),
    retrovidas: normList(frontmatter['retrovidas']),
    grupocarma: grupocarmaRaw !== undefined ? normList(grupocarmaRaw) : [],
    holopensenes: normList(frontmatter['holopensenes']),
    religiao: normList(frontmatter['religiao']),
    movHistorico: movHistoricoRaw !== undefined ? normList(movHistoricoRaw) : [],
    eventosAnteriores: anterioresRaw !== undefined ? normList(anterioresRaw) : [],
    eventosPosteriores: posterioresRaw !== undefined ? normList(posterioresRaw) : [],
    livro: normList(frontmatter['livro']),
    fontes: normList(frontmatter['fontes']),
    tags: normList(frontmatter['tags']),
    filePath,
    frontmatterRaw,
    camposDesconhecidos,
    avisos,
  };
}
