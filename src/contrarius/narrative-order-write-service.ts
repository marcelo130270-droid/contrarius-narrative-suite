import type { AlteracaoNarrativaEvento } from './narrative-order-model';
import { aplicarPatchNarrativoEvento } from './evento-frontmatter-patcher';

export interface ArmazenamentoNotasNarrativas {
  ler(filePath: string): Promise<string>;
  escrever(filePath: string, conteudo: string): Promise<void>;
}

export interface ArquivoNarrativoPreparado {
  readonly filePath: string;
  readonly conteudoOriginal: string;
  readonly conteudoNovo: string;
  readonly camposAlterados: readonly string[];
}

export interface ResultadoSalvamentoNarrativo {
  readonly arquivosAlterados: readonly string[];
  readonly arquivosSemMudanca: readonly string[];
}

export type EtapaErroSalvamentoNarrativo =
  | 'validacao'
  | 'leitura'
  | 'preparacao'
  | 'escrita'
  | 'reversao';

export class ErroSalvamentoNarrativo extends Error {
  readonly etapa: EtapaErroSalvamentoNarrativo;
  readonly filePath: string;
  readonly causa: unknown;

  constructor(
    etapa: EtapaErroSalvamentoNarrativo,
    filePath: string,
    causa: unknown,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroSalvamentoNarrativo';
    this.etapa = etapa;
    this.filePath = filePath;
    this.causa = causa;
  }
}

function normCaminho(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/{2,}/g, '/').trim();
}

export async function prepararSalvamentoNarrativo(
  alteracoes: readonly AlteracaoNarrativaEvento[],
  armazenamento: ArmazenamentoNotasNarrativas,
): Promise<readonly ArquivoNarrativoPreparado[]> {
  for (const alt of alteracoes) {
    if (alt.filePath.trim() === '') {
      throw new ErroSalvamentoNarrativo(
        'validacao',
        alt.filePath,
        null,
        'Caminho de arquivo não pode ser vazio.',
      );
    }
  }

  const vistos = new Set<string>();
  for (const alt of alteracoes) {
    const norm = normCaminho(alt.filePath);
    if (vistos.has(norm)) {
      throw new ErroSalvamentoNarrativo(
        'validacao',
        alt.filePath,
        null,
        `Caminho de arquivo duplicado: "${alt.filePath}".`,
      );
    }
    vistos.add(norm);
  }

  const ordenadas = [...alteracoes].sort((a, b) => a.filePath.localeCompare(b.filePath));

  const conteudosOriginais: string[] = [];
  for (const alt of ordenadas) {
    let conteudo: string;
    try {
      conteudo = await armazenamento.ler(alt.filePath);
    } catch (causa) {
      throw new ErroSalvamentoNarrativo(
        'leitura',
        alt.filePath,
        causa,
        `Falha ao ler o arquivo "${alt.filePath}".`,
      );
    }
    conteudosOriginais.push(conteudo);
  }

  const preparados: ArquivoNarrativoPreparado[] = [];
  for (let i = 0; i < ordenadas.length; i++) {
    const alt = ordenadas[i];
    const conteudoOriginal = conteudosOriginais[i];
    let resultado;
    try {
      resultado = aplicarPatchNarrativoEvento(conteudoOriginal, {
        ordemNarrativa: alt.depois.ordemNarrativa,
        capitulo: alt.depois.capitulo,
        cena: alt.depois.cena,
      });
    } catch (causa) {
      throw new ErroSalvamentoNarrativo(
        'preparacao',
        alt.filePath,
        causa,
        `Falha ao preparar o patch para "${alt.filePath}".`,
      );
    }
    preparados.push({
      filePath: alt.filePath,
      conteudoOriginal,
      conteudoNovo: resultado.conteudo,
      camposAlterados: resultado.camposAlterados,
    });
  }

  return preparados;
}

export async function executarSalvamentoNarrativo(
  alteracoes: readonly AlteracaoNarrativaEvento[],
  armazenamento: ArmazenamentoNotasNarrativas,
): Promise<ResultadoSalvamentoNarrativo> {
  const preparados = await prepararSalvamentoNarrativo(alteracoes, armazenamento);

  const aEscrever = preparados.filter((p) => p.conteudoNovo !== p.conteudoOriginal);
  const semMudanca = preparados
    .filter((p) => p.conteudoNovo === p.conteudoOriginal)
    .map((p) => p.filePath);

  const escritos: Array<{ filePath: string; conteudoOriginal: string }> = [];

  for (const arq of aEscrever) {
    try {
      await armazenamento.escrever(arq.filePath, arq.conteudoNovo);
      escritos.push({ filePath: arq.filePath, conteudoOriginal: arq.conteudoOriginal });
    } catch (causaEscrita) {
      for (let i = escritos.length - 1; i >= 0; i--) {
        const alvo = escritos[i];
        try {
          await armazenamento.escrever(alvo.filePath, alvo.conteudoOriginal);
        } catch (causaReversao) {
          throw new ErroSalvamentoNarrativo(
            'reversao',
            alvo.filePath,
            causaReversao,
            `Falha ao reverter "${alvo.filePath}" após erro de escrita em "${arq.filePath}". Os dados podem estar inconsistentes.`,
          );
        }
      }
      throw new ErroSalvamentoNarrativo(
        'escrita',
        arq.filePath,
        causaEscrita,
        `Falha ao escrever o arquivo "${arq.filePath}".`,
      );
    }
  }

  return {
    arquivosAlterados: escritos.map((a) => a.filePath),
    arquivosSemMudanca: semMudanca,
  };
}
