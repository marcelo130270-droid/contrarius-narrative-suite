import type { OperacaoEscritaPacoteScrivener, PlanoEscritaPacoteScrivener } from './scrivener-package-write-plan-model';

export type StatusExecucaoEscritaPacoteScrivener = 'ok' | 'erro';

export interface AdaptadorEscritaPacoteScrivener {
    escreverArquivoTexto(caminhoDestino: string, conteudo: string): Promise<void>;
}

export interface ResultadoOperacaoEscritaPacoteScrivener {
    caminhoDestino: string;
    caminhoRelativo: string;
    status: StatusExecucaoEscritaPacoteScrivener;
    tamanhoCaracteres: number;
    erro?: string;
}

export interface ResultadoExecucaoEscritaPacoteScrivener {
    caminhoPacote: string;
    totalOperacoes: number;
    operacoesOk: number;
    operacoesErro: number;
    tamanhoTotalCaracteres: number;
    resultados: ResultadoOperacaoEscritaPacoteScrivener[];
}

function mensagemErroScrivener(erro: unknown): string {
    if (erro instanceof Error && erro.message.trim().length > 0) {
        return erro.message;
    }

    if (typeof erro === 'string' && erro.trim().length > 0) {
        return erro.trim();
    }

    return 'Erro desconhecido ao escrever arquivo do pacote Scrivener.';
}

async function executarOperacaoEscritaPacoteScrivener(
    operacao: OperacaoEscritaPacoteScrivener,
    adaptador: AdaptadorEscritaPacoteScrivener,
): Promise<ResultadoOperacaoEscritaPacoteScrivener> {
    try {
        await adaptador.escreverArquivoTexto(operacao.caminhoDestino, operacao.conteudo);

        return {
            caminhoDestino: operacao.caminhoDestino,
            caminhoRelativo: operacao.caminhoRelativo,
            status: 'ok',
            tamanhoCaracteres: operacao.tamanhoCaracteres,
        };
    } catch (erro) {
        return {
            caminhoDestino: operacao.caminhoDestino,
            caminhoRelativo: operacao.caminhoRelativo,
            status: 'erro',
            tamanhoCaracteres: operacao.tamanhoCaracteres,
            erro: mensagemErroScrivener(erro),
        };
    }
}

export async function executarPlanoEscritaPacoteScrivener(
    plano: PlanoEscritaPacoteScrivener,
    adaptador: AdaptadorEscritaPacoteScrivener,
): Promise<ResultadoExecucaoEscritaPacoteScrivener> {
    const resultados: ResultadoOperacaoEscritaPacoteScrivener[] = [];

    for (const operacao of plano.operacoes) {
        resultados.push(await executarOperacaoEscritaPacoteScrivener(operacao, adaptador));
    }

    const operacoesOk = resultados.filter(resultado => resultado.status === 'ok').length;
    const operacoesErro = resultados.filter(resultado => resultado.status === 'erro').length;

    return {
        caminhoPacote: plano.caminhoPacote,
        totalOperacoes: resultados.length,
        operacoesOk,
        operacoesErro,
        tamanhoTotalCaracteres: resultados.reduce((total, resultado) => total + resultado.tamanhoCaracteres, 0),
        resultados,
    };
}
