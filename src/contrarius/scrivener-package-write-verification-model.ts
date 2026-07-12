import type { PlanoEscritaPacoteScrivener } from './scrivener-package-write-plan-model';

export type NivelVerificacaoEscritaPacoteScrivener = 'ok' | 'warning' | 'error';

export type CodigoVerificacaoEscritaPacoteScrivener =
    | 'ARQUIVO_NAO_ENCONTRADO'
    | 'CONTEUDO_DIVERGENTE'
    | 'LEITURA_ERRO'
    | 'PLANO_SEM_OPERACOES';

export interface AchadoVerificacaoEscritaPacoteScrivener {
    nivel: Exclude<NivelVerificacaoEscritaPacoteScrivener, 'ok'>;
    codigo: CodigoVerificacaoEscritaPacoteScrivener;
    mensagem: string;
    caminhoDestino?: string;
    caminhoRelativo?: string;
}

export interface ResultadoVerificacaoEscritaPacoteScrivener {
    nivel: NivelVerificacaoEscritaPacoteScrivener;
    valido: boolean;
    achados: AchadoVerificacaoEscritaPacoteScrivener[];
    erros: number;
    avisos: number;
    totalOperacoes: number;
    arquivosVerificados: number;
    arquivosAusentes: number;
    arquivosDivergentes: number;
}

export interface LeitorPacoteScrivener {
    existeArquivoTexto(caminhoDestino: string): Promise<boolean>;
    lerArquivoTexto(caminhoDestino: string): Promise<string>;
}

export async function verificarEscritaPacoteScrivener(
    plano: PlanoEscritaPacoteScrivener,
    leitor: LeitorPacoteScrivener,
): Promise<ResultadoVerificacaoEscritaPacoteScrivener> {
    const achados: AchadoVerificacaoEscritaPacoteScrivener[] = [];
    let arquivosVerificados = 0;
    let arquivosAusentes = 0;
    let arquivosDivergentes = 0;

    if (plano.totalOperacoes === 0) {
        achados.push({
            nivel: 'warning',
            codigo: 'PLANO_SEM_OPERACOES',
            mensagem: 'O plano de escrita não possui operações.',
        });
        return {
            nivel: 'warning',
            valido: false,
            achados,
            erros: 0,
            avisos: 1,
            totalOperacoes: 0,
            arquivosVerificados: 0,
            arquivosAusentes: 0,
            arquivosDivergentes: 0,
        };
    }

    for (const operacao of plano.operacoes) {
        try {
            const existe = await leitor.existeArquivoTexto(operacao.caminhoDestino);

            if (!existe) {
                arquivosAusentes++;
                achados.push({
                    nivel: 'error',
                    codigo: 'ARQUIVO_NAO_ENCONTRADO',
                    mensagem: `Arquivo não encontrado após escrita: ${operacao.caminhoDestino}`,
                    caminhoDestino: operacao.caminhoDestino,
                    caminhoRelativo: operacao.caminhoRelativo,
                });
                continue;
            }

            let conteudo: string;
            try {
                conteudo = await leitor.lerArquivoTexto(operacao.caminhoDestino);
                arquivosVerificados++;
            } catch (erroLeitura) {
                achados.push({
                    nivel: 'error',
                    codigo: 'LEITURA_ERRO',
                    mensagem: `Erro ao ler arquivo: ${erroLeitura instanceof Error ? erroLeitura.message : String(erroLeitura)}`,
                    caminhoDestino: operacao.caminhoDestino,
                    caminhoRelativo: operacao.caminhoRelativo,
                });
                continue;
            }

            if (conteudo !== operacao.conteudo) {
                arquivosDivergentes++;
                achados.push({
                    nivel: 'error',
                    codigo: 'CONTEUDO_DIVERGENTE',
                    mensagem: `Conteúdo divergente em: ${operacao.caminhoDestino}`,
                    caminhoDestino: operacao.caminhoDestino,
                    caminhoRelativo: operacao.caminhoRelativo,
                });
            }
        } catch (erro) {
            achados.push({
                nivel: 'error',
                codigo: 'LEITURA_ERRO',
                mensagem: `Erro ao verificar arquivo: ${erro instanceof Error ? erro.message : String(erro)}`,
                caminhoDestino: operacao.caminhoDestino,
                caminhoRelativo: operacao.caminhoRelativo,
            });
        }
    }

    const errosCount = achados.filter(a => a.nivel === 'error').length;
    const avisosCount = achados.filter(a => a.nivel === 'warning').length;

    let nivel: NivelVerificacaoEscritaPacoteScrivener;
    if (errosCount > 0) {
        nivel = 'error';
    } else if (avisosCount > 0) {
        nivel = 'warning';
    } else {
        nivel = 'ok';
    }

    return {
        nivel,
        valido: nivel === 'ok',
        achados,
        erros: errosCount,
        avisos: avisosCount,
        totalOperacoes: plano.totalOperacoes,
        arquivosVerificados,
        arquivosAusentes,
        arquivosDivergentes,
    };
}
