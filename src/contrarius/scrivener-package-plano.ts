import type { IndiceContrarius } from './indexer';
import { gerarScrivenerImportMarkdown } from './scrivener-export-minimo';

export interface ArquivoPlanoPacote {
  caminhoRelativo: string;
  conteudo: string;
}

export interface ManifestoPacoteScrivener {
  schema: 'contrarius-scrivener-package';
  versao: 1;
  geradoEm: string;
  contagens: {
    consciencias: number;
    retrovidas: number;
    eventos: number;
    lugares: number;
    relacoes: number;
  };
}

export interface EntradaIntegridadePacote {
  caminhoRelativo: string;
  tamanhoCaracteres: number;
  hash: string;
}

export interface RelatorioIntegridadePacote {
  geradoEm: string;
  totalArquivos: number;
  arquivos: EntradaIntegridadePacote[];
}

// Hash não-criptográfico (djb2), só para detectar corrupção/gravação incompleta — não é segurança.
export function hashConteudo(texto: string): string {
  let hash = 5381;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 33) ^ texto.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function nomePastaPacote(geradoEm: Date): string {
  return `scrivener-package/${geradoEm.toISOString().replace(/[:.]/g, '-')}`;
}

function construirManifesto(indice: IndiceContrarius, geradoEm: Date): ManifestoPacoteScrivener {
  return {
    schema: 'contrarius-scrivener-package',
    versao: 1,
    geradoEm: geradoEm.toISOString(),
    contagens: {
      consciencias: indice.consciencias.length,
      retrovidas: indice.retrovidas.length,
      eventos: indice.eventos.length,
      lugares: indice.lugares.length,
      relacoes: indice.relacoes.length,
    },
  };
}

function construirReadme(manifesto: ManifestoPacoteScrivener): string {
  return [
    '# Pacote Contrarius → Scrivener',
    '',
    `Gerado em: ${manifesto.geradoEm}`,
    '',
    'Este pacote é uma exportação somente-leitura do Vault Contrarius, pensada para servir de material de',
    'referência dentro do Scrivener. Nenhum arquivo `.scriv` é modificado por este processo.',
    '',
    '## Conteúdo',
    '',
    '- `manifest.json`: metadados do pacote (schema, versão, contagens).',
    '- `scrivener-import.md`: exportação em Markdown de todas as entidades.',
    '- `integrity/report.json`: hash e tamanho de cada arquivo do pacote, para verificação posterior.',
    '',
    '## Contagens',
    '',
    `- Consciências: ${manifesto.contagens.consciencias}`,
    `- Retrovidas: ${manifesto.contagens.retrovidas}`,
    `- Eventos: ${manifesto.contagens.eventos}`,
    `- Lugares: ${manifesto.contagens.lugares}`,
    `- Relações: ${manifesto.contagens.relacoes}`,
    '',
  ].join('\n');
}

export function construirPlanoPacoteScrivener(indice: IndiceContrarius, geradoEm: Date = new Date()): ArquivoPlanoPacote[] {
  const manifesto = construirManifesto(indice, geradoEm);
  const scrivenerImport = gerarScrivenerImportMarkdown(indice, geradoEm);
  const readme = construirReadme(manifesto);

  const arquivosSemIntegridade: ArquivoPlanoPacote[] = [
    { caminhoRelativo: 'manifest.json', conteudo: JSON.stringify(manifesto, null, 2) },
    { caminhoRelativo: 'scrivener-import.md', conteudo: scrivenerImport },
    { caminhoRelativo: 'README.md', conteudo: readme },
  ];

  const relatorio: RelatorioIntegridadePacote = {
    geradoEm: geradoEm.toISOString(),
    totalArquivos: arquivosSemIntegridade.length,
    arquivos: arquivosSemIntegridade.map((a) => ({
      caminhoRelativo: a.caminhoRelativo,
      tamanhoCaracteres: a.conteudo.length,
      hash: hashConteudo(a.conteudo),
    })),
  };

  return [
    ...arquivosSemIntegridade,
    { caminhoRelativo: 'integrity/report.json', conteudo: JSON.stringify(relatorio, null, 2) },
  ];
}
