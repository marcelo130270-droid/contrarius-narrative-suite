import type { ManifestoScrivener } from './scrivener-package-manifest';
import type { PayloadScrivener } from './scrivener-package-payload-model';
import { criarPayloadScrivener } from './scrivener-package-payload-model';
import { criarArquivosMarkdownPayloadScrivener } from './scrivener-payload-markdown-file-model';
import { criarReadmePacoteScrivener } from './scrivener-package-readme-model';
import { criarArquivoRelatorioIntegridadePacoteScrivener } from './scrivener-package-integrity-report-model';

export type TipoArquivoPlanoScrivener = 'manifest' | 'payload' | 'readme' | 'payload-item' | 'integrity-report';

export interface ArquivoPlanoPacoteScrivener {
    caminhoRelativo: string;
    tipo: TipoArquivoPlanoScrivener;
    conteudo: string;
    tamanhoCaracteres: number;
}

export interface PlanoPacoteScrivener {
    manifesto: ManifestoScrivener;
    arquivos: ArquivoPlanoPacoteScrivener[];
    totalArquivos: number;
    tamanhoTotalCaracteres: number;
}

export interface OpcoesPlanoPacoteScrivener {
    payload?: PayloadScrivener;
}

function criarArquivoPlanoScrivener(
    caminhoRelativo: string,
    tipo: TipoArquivoPlanoScrivener,
    conteudo: string,
): ArquivoPlanoPacoteScrivener {
    return {
        caminhoRelativo,
        tipo,
        conteudo,
        tamanhoCaracteres: conteudo.length,
    };
}

function criarManifestJson(manifesto: ManifestoScrivener): string {
    return JSON.stringify({
        id: manifesto.id,
        criadoEm: manifesto.criadoEm,
        tipo: manifesto.tipo,
        origemVault: manifesto.origemVault,
        caminhoPacote: manifesto.caminhoPacote,
        livro: manifesto.livro,
        observacoes: manifesto.observacoes,
        avisos: manifesto.avisos,
        erros: manifesto.erros,
    }, null, 2);
}

function gerarPayloadIndexJson(payload: PayloadScrivener): string {
    return JSON.stringify(payload, null, 2);
}


export function criarPlanoPacoteScrivener(
    manifesto: ManifestoScrivener,
    options: OpcoesPlanoPacoteScrivener = {},
): PlanoPacoteScrivener {
    const payload = options.payload ?? criarPayloadScrivener({
        manifestoId: manifesto.id,
        geradoEm: manifesto.criadoEm,
    });

    const arquivosItem = criarArquivosMarkdownPayloadScrivener(payload).map(
        arquivo => criarArquivoPlanoScrivener(arquivo.caminhoRelativo, 'payload-item', arquivo.conteudo),
    );

    const arquivosBase = [
        criarArquivoPlanoScrivener('manifest.json', 'manifest', criarManifestJson(manifesto)),
        criarArquivoPlanoScrivener('payload/index.json', 'payload', gerarPayloadIndexJson(payload)),
        criarArquivoPlanoScrivener('README.md', 'readme', criarReadmePacoteScrivener(manifesto, payload).conteudo),
        ...arquivosItem,
    ];

    // Plano provisório sem o relatório evita circularidade na validação
    const planoProvisorio: PlanoPacoteScrivener = {
        manifesto,
        arquivos: arquivosBase,
        totalArquivos: arquivosBase.length,
        tamanhoTotalCaracteres: arquivosBase.reduce((total, a) => total + a.tamanhoCaracteres, 0),
    };

    const relatorio = criarArquivoRelatorioIntegridadePacoteScrivener(planoProvisorio, manifesto.criadoEm);
    const arquivoRelatorio = criarArquivoPlanoScrivener(relatorio.caminhoRelativo, 'integrity-report', relatorio.conteudo);

    const arquivos = [...arquivosBase, arquivoRelatorio];

    return {
        manifesto,
        arquivos,
        totalArquivos: arquivos.length,
        tamanhoTotalCaracteres: arquivos.reduce((total, arquivo) => total + arquivo.tamanhoCaracteres, 0),
    };
}
