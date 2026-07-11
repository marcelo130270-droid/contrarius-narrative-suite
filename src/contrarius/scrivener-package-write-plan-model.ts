import type { ArquivoPlanoPacoteScrivener, PlanoPacoteScrivener } from './scrivener-package-plan-model';

export interface OperacaoEscritaPacoteScrivener {
    caminhoDestino: string;
    caminhoRelativo: string;
    tipo: ArquivoPlanoPacoteScrivener['tipo'];
    conteudo: string;
    tamanhoCaracteres: number;
}

export interface PlanoEscritaPacoteScrivener {
    caminhoPacote: string;
    operacoes: OperacaoEscritaPacoteScrivener[];
    totalOperacoes: number;
    tamanhoTotalCaracteres: number;
}

function normalizarCaminhoPacoteScrivener(caminhoPacote: string): string {
    return caminhoPacote.trim().replace(/\\/g, '/').replace(/\/+$/g, '');
}

function normalizarCaminhoRelativoScrivener(caminhoRelativo: string): string {
    return caminhoRelativo.trim().replace(/\\/g, '/').replace(/^\/+/, '');
}

function juntarCaminhoScrivener(caminhoPacote: string, caminhoRelativo: string): string {
    const pacote = normalizarCaminhoPacoteScrivener(caminhoPacote);
    const relativo = normalizarCaminhoRelativoScrivener(caminhoRelativo);

    if (pacote.length === 0) {
        return relativo;
    }

    if (relativo.length === 0) {
        return pacote;
    }

    return `${pacote}/${relativo}`;
}

export function criarPlanoEscritaPacoteScrivener(plano: PlanoPacoteScrivener): PlanoEscritaPacoteScrivener {
    const caminhoPacote = normalizarCaminhoPacoteScrivener(plano.manifesto.caminhoPacote);
    const operacoes = plano.arquivos.map((arquivo): OperacaoEscritaPacoteScrivener => {
        const caminhoRelativo = normalizarCaminhoRelativoScrivener(arquivo.caminhoRelativo);

        return {
            caminhoDestino: juntarCaminhoScrivener(caminhoPacote, caminhoRelativo),
            caminhoRelativo,
            tipo: arquivo.tipo,
            conteudo: arquivo.conteudo,
            tamanhoCaracteres: arquivo.tamanhoCaracteres,
        };
    });

    return {
        caminhoPacote,
        operacoes,
        totalOperacoes: operacoes.length,
        tamanhoTotalCaracteres: operacoes.reduce((total, operacao) => total + operacao.tamanhoCaracteres, 0),
    };
}
