import type { Lugar } from '../types';
import { normList, normStr, primeiroPresente } from '../normalize';
import { deepCopyYaml, extractBasename } from '../utils';

const CAMPOS_CONHECIDOS = new Set([
  'tipo', 'id_lugar', 'codigo', 'id', 'aliases', 'nome_preferencial_saga',
  'nome preferido', 'nome_preferido', 'nome_atual', 'nomes_variantes',
  'nomesVariantes', 'nomes_historicos', 'nomesHistoricos', 'categoria_lugar',
  'categoriaLugar', 'status_geografico', 'statusGeografico', 'coordenadas',
  'coordenadas_google_earth', 'coordenadasGoogleEarth', 'sistema_geodesico',
  'sistemaGeodesico', 'nucleo_geo', 'nucleoGeo', 'localidade_atual',
  'localidadeAtual', 'departamento_atual', 'departamentoAtual', 'regiao_atual',
  'regiaoAtual', 'pais_atual', 'paisAtual', 'periodo', 'livros', 'livro',
  'lugares_relacionados', 'lugaresRelacionados', 'fontes', 'tags',
]);

export function normalizarLugar(
  frontmatter: Readonly<Record<string, unknown>>,
  filePath: string,
): Lugar {
  const avisos: string[] = [];
  const idRaw = primeiroPresente(frontmatter, ['id_lugar', 'codigo', 'id']);
  const id = (idRaw !== undefined ? normStr(idRaw) : '') || extractBasename(filePath);
  if (id === '') {
    avisos.push('Não foi possível obter id: id_lugar, codigo e id ausentes e basename não disponível.');
  }

  const nomePreferidoRaw = primeiroPresente(frontmatter, [
    'nome_preferencial_saga', 'nome preferido', 'nome_preferido', 'nome_atual',
  ]);
  const nomePreferido = nomePreferidoRaw !== undefined ? normStr(nomePreferidoRaw) : '';
  if (nomePreferido === '') avisos.push('Não foi possível obter nomePreferido.');

  const nomesVariantesRaw = primeiroPresente(frontmatter, ['nomes_variantes', 'nomesVariantes']);
  const nomesHistoricosRaw = primeiroPresente(frontmatter, ['nomes_historicos', 'nomesHistoricos']);
  const categoriaLugarRaw = primeiroPresente(frontmatter, ['categoria_lugar', 'categoriaLugar']);
  const statusGeograficoRaw = primeiroPresente(frontmatter, ['status_geografico', 'statusGeografico']);
  const coordenadasGoogleRaw = primeiroPresente(frontmatter, ['coordenadas_google_earth', 'coordenadasGoogleEarth']);
  const sistemaGeodesicoRaw = primeiroPresente(frontmatter, ['sistema_geodesico', 'sistemaGeodesico']);
  const nucleoGeoRaw = primeiroPresente(frontmatter, ['nucleo_geo', 'nucleoGeo']);
  const localidadeAtualRaw = primeiroPresente(frontmatter, ['localidade_atual', 'localidadeAtual']);
  const departamentoAtualRaw = primeiroPresente(frontmatter, ['departamento_atual', 'departamentoAtual']);
  const regiaoAtualRaw = primeiroPresente(frontmatter, ['regiao_atual', 'regiaoAtual']);
  const paisAtualRaw = primeiroPresente(frontmatter, ['pais_atual', 'paisAtual']);
  const livrosRaw = primeiroPresente(frontmatter, ['livros', 'livro']);
  const relacionadosRaw = primeiroPresente(frontmatter, ['lugares_relacionados', 'lugaresRelacionados']);

  const frontmatterRaw = deepCopyYaml(frontmatter) as Record<string, unknown>;
  const camposDesconhecidos: Record<string, unknown> = {};
  for (const key of Object.keys(frontmatter)) {
    if (!CAMPOS_CONHECIDOS.has(key)) camposDesconhecidos[key] = deepCopyYaml(frontmatter[key]);
  }

  return {
    tipoEntidade: 'lugar',
    id,
    aliases: normList(frontmatter['aliases']),
    nomePreferido,
    nomeAtual: normStr(frontmatter['nome_atual']),
    nomesVariantes: nomesVariantesRaw !== undefined ? normList(nomesVariantesRaw) : [],
    nomesHistoricos: nomesHistoricosRaw !== undefined ? normList(nomesHistoricosRaw) : [],
    categoriaLugar: categoriaLugarRaw !== undefined ? normList(categoriaLugarRaw) : [],
    statusGeografico: statusGeograficoRaw !== undefined ? normStr(statusGeograficoRaw) : '',
    coordenadas: normStr(frontmatter['coordenadas']),
    coordenadasGoogleEarth: coordenadasGoogleRaw !== undefined ? normStr(coordenadasGoogleRaw) : '',
    sistemaGeodesico: sistemaGeodesicoRaw !== undefined ? normStr(sistemaGeodesicoRaw) : '',
    nucleoGeo: nucleoGeoRaw !== undefined ? normList(nucleoGeoRaw) : [],
    localidadeAtual: localidadeAtualRaw !== undefined ? normStr(localidadeAtualRaw) : '',
    departamentoAtual: departamentoAtualRaw !== undefined ? normStr(departamentoAtualRaw) : '',
    regiaoAtual: regiaoAtualRaw !== undefined ? normStr(regiaoAtualRaw) : '',
    paisAtual: paisAtualRaw !== undefined ? normStr(paisAtualRaw) : '',
    periodo: normList(frontmatter['periodo']),
    livros: livrosRaw !== undefined ? normList(livrosRaw) : [],
    lugaresRelacionados: relacionadosRaw !== undefined ? normList(relacionadosRaw) : [],
    fontes: normList(frontmatter['fontes']),
    tags: normList(frontmatter['tags']),
    filePath,
    frontmatterRaw,
    camposDesconhecidos,
    avisos,
  };
}
