import { hashConteudo } from './scrivener-package-plano';

export interface ArquivoLidoPacote {
  caminhoRelativo: string;
  // null = arquivo não encontrado no disco. Nunca lançar exceção pra representar "ausente".
  conteudo: string | null;
}

export type StatusItemVerificacao = 'ok' | 'faltando' | 'hash_diferente' | 'json_invalido';

export interface ItemVerificacaoPacote {
  caminhoRelativo: string;
  status: StatusItemVerificacao;
  detalhe?: string;
}

export interface RelatorioVerificacaoPacote {
  pacoteEncontrado: boolean;
  manifestoValido: boolean;
  itens: ItemVerificacaoPacote[];
  resumo: string;
}

const ARQUIVOS_ESPERADOS = ['manifest.json', 'scrivener-import.md', 'README.md', 'integrity/report.json'] as const;

function buscarConteudo(arquivos: ArquivoLidoPacote[], caminho: string): string | null {
  return arquivos.find((a) => a.caminhoRelativo === caminho)?.conteudo ?? null;
}

function tentarParseJson(texto: string): { valor: unknown } | { erro: string } {
  try {
    return { valor: JSON.parse(texto) };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : String(erro) };
  }
}

// Verificação pura: recebe o que foi lido do disco (não estado de memória de nenhum modal) e
// devolve um relatório. Nunca lança exceção — todo caso de erro vira um item do relatório.
export function verificarPacoteScrivener(arquivos: ArquivoLidoPacote[]): RelatorioVerificacaoPacote {
  const itens: ItemVerificacaoPacote[] = [];

  const algumArquivoPresente = arquivos.some((a) => a.conteudo !== null);
  if (!algumArquivoPresente) {
    return {
      pacoteEncontrado: false,
      manifestoValido: false,
      itens: ARQUIVOS_ESPERADOS.map((caminho) => ({ caminhoRelativo: caminho, status: 'faltando' as const })),
      resumo: 'Nenhum pacote encontrado (nenhum dos arquivos esperados existe nessa pasta).',
    };
  }

  for (const caminho of ARQUIVOS_ESPERADOS) {
    const conteudo = buscarConteudo(arquivos, caminho);
    if (conteudo === null) {
      itens.push({ caminhoRelativo: caminho, status: 'faltando' });
    }
  }

  const manifestoConteudo = buscarConteudo(arquivos, 'manifest.json');
  let manifestoValido = false;
  if (manifestoConteudo !== null) {
    const resultado = tentarParseJson(manifestoConteudo);
    if ('erro' in resultado) {
      itens.push({ caminhoRelativo: 'manifest.json', status: 'json_invalido', detalhe: resultado.erro });
    } else {
      manifestoValido = true;
    }
  }

  const relatorioConteudo = buscarConteudo(arquivos, 'integrity/report.json');
  if (relatorioConteudo !== null) {
    const resultado = tentarParseJson(relatorioConteudo);
    if ('erro' in resultado) {
      itens.push({ caminhoRelativo: 'integrity/report.json', status: 'json_invalido', detalhe: resultado.erro });
    } else {
      const relatorio = resultado.valor as { arquivos?: Array<{ caminhoRelativo?: string; hash?: string }> };
      for (const entrada of relatorio.arquivos ?? []) {
        if (!entrada.caminhoRelativo || !entrada.hash) continue;
        const conteudoReal = buscarConteudo(arquivos, entrada.caminhoRelativo);
        if (conteudoReal === null) {
          // já reportado acima como 'faltando' se estiver na lista de esperados; senão, reportar aqui.
          if (!ARQUIVOS_ESPERADOS.includes(entrada.caminhoRelativo as (typeof ARQUIVOS_ESPERADOS)[number])) {
            itens.push({ caminhoRelativo: entrada.caminhoRelativo, status: 'faltando' });
          }
          continue;
        }
        const hashReal = hashConteudo(conteudoReal);
        if (hashReal !== entrada.hash) {
          itens.push({
            caminhoRelativo: entrada.caminhoRelativo,
            status: 'hash_diferente',
            detalhe: `esperado ${entrada.hash}, encontrado ${hashReal} — arquivo mudou ou gravação incompleta`,
          });
        } else {
          itens.push({ caminhoRelativo: entrada.caminhoRelativo, status: 'ok' });
        }
      }
    }
  }

  const problemas = itens.filter((i) => i.status !== 'ok');
  const resumo =
    problemas.length === 0
      ? `Pacote íntegro: ${itens.length} arquivo(s) conferido(s), todos ok.`
      : `Pacote com ${problemas.length} problema(s) de ${itens.length} item(ns) verificado(s).`;

  return { pacoteEncontrado: true, manifestoValido, itens, resumo };
}
