import type { ManifestoScrivener } from './scrivener-package-manifest';
import type { PayloadScrivener } from './scrivener-package-payload-model';
import { criarPayloadScrivener } from './scrivener-package-payload-model';

export type TipoArquivoPlanoScrivener = 'manifest' | 'payload' | 'readme';

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

function criarReadme(manifesto: ManifestoScrivener): string {
    return [
        '# Contrarius Scrivener Package Preview',
        '',
        `Manifesto: ${manifesto.id}`,
        `Tipo: ${manifesto.tipo}`,
        `Criado em: ${manifesto.criadoEm}`,
        `Vault de origem: ${manifesto.origemVault}`,
        `Livro: ${manifesto.livro ?? 'sem livro'}`,
        '',
        'Este plano ainda nao grava arquivos reais do Scrivener.',
        'Ele descreve a estrutura prevista para um pacote operacional Contrarius/Scrivener.',
        '',
    ].join('\n');
}

export function criarPlanoPacoteScrivener(
    manifesto: ManifestoScrivener,
    options: OpcoesPlanoPacoteScrivener = {},
): PlanoPacoteScrivener {
    const payload = options.payload ?? criarPayloadScrivener({
        manifestoId: manifesto.id,
        geradoEm: manifesto.criadoEm,
    });

    const arquivos = [
        criarArquivoPlanoScrivener('manifest.json', 'manifest', criarManifestJson(manifesto)),
        criarArquivoPlanoScrivener('payload/index.json', 'payload', gerarPayloadIndexJson(payload)),
        criarArquivoPlanoScrivener('README.md', 'readme', criarReadme(manifesto)),
    ];

    return {
        manifesto,
        arquivos,
        totalArquivos: arquivos.length,
        tamanhoTotalCaracteres: arquivos.reduce((total, arquivo) => total + arquivo.tamanhoCaracteres, 0),
    };
}
