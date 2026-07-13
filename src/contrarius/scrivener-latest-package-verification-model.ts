export type NivelVerificacaoPacoteScrivenerMaisRecente = 'ok' | 'warning' | 'error';

export const MENSAGEM_PACOTE_NAO_ENCONTRADO =
    'No Scrivener package found. Run Write controlled package first.';

export interface EntradaArquivoPacoteScrivener {
    caminhoRelativo: string;
    conteudo: string | null;
}

export interface InputVerificacaoPacoteScrivenerMaisRecente {
    caminhoPacote: string;
    arquivos: EntradaArquivoPacoteScrivener[];
    arquivosDossier: string[];
}

export interface ResultadoVerificacaoPacoteScrivenerMaisRecente {
    caminhoPacote: string;
    nivel: NivelVerificacaoPacoteScrivenerMaisRecente;
    arquivosObrigatoriosVerificados: number;
    arquivosAusentes: number;
    dossiersEncontrados: number;
    totalPayloadItens: number | null;
    arquivosOpcionaisEncontrados: string[];
    erros: string[];
    avisos: string[];
    diagnostics: string[];
}

const ARQUIVOS_OBRIGATORIOS = [
    'manifest.json',
    'payload/index.json',
    'README.md',
    'integrity/report.json',
    'scrivener-import.md',
    'scrivener/index.md',
];

const ARQUIVOS_OPCIONAIS = [
    'scrivener/timeline/eventos.md',
    'scrivener/timeline/cronologia.md',
];

const ARQUIVOS_JSON = ['manifest.json', 'payload/index.json', 'integrity/report.json'];

export function verificarPacoteScrivenerMaisRecente(
    input: InputVerificacaoPacoteScrivenerMaisRecente,
): ResultadoVerificacaoPacoteScrivenerMaisRecente {
    const erros: string[] = [];
    const avisos: string[] = [];
    let arquivosObrigatoriosVerificados = 0;
    let arquivosAusentes = 0;
    let totalPayloadItens: number | null = null;
    const arquivosOpcionaisEncontrados: string[] = [];

    const mapaArquivos = new Map<string, string | null>(
        input.arquivos.map(a => [a.caminhoRelativo, a.conteudo]),
    );

    for (const arquivo of ARQUIVOS_OBRIGATORIOS) {
        const conteudo = mapaArquivos.get(arquivo);
        if (conteudo === undefined || conteudo === null) {
            arquivosAusentes++;
            erros.push(`Missing required file: ${arquivo}`);
        } else {
            arquivosObrigatoriosVerificados++;
        }
    }

    for (const arquivo of ARQUIVOS_JSON) {
        const conteudo = mapaArquivos.get(arquivo);
        if (conteudo !== undefined && conteudo !== null) {
            try {
                const parsed = JSON.parse(conteudo) as unknown;
                if (
                    arquivo === 'payload/index.json' &&
                    typeof parsed === 'object' &&
                    parsed !== null
                ) {
                    const obj = parsed as Record<string, unknown>;
                    if (Array.isArray(obj['itens'])) {
                        totalPayloadItens = (obj['itens'] as unknown[]).length;
                    } else if (Array.isArray(obj['items'])) {
                        totalPayloadItens = (obj['items'] as unknown[]).length;
                    } else if (typeof obj['total'] === 'number') {
                        totalPayloadItens = obj['total'];
                    }
                }
            } catch {
                erros.push(`Invalid JSON in: ${arquivo}`);
            }
        }
    }

    for (const arquivo of ARQUIVOS_OPCIONAIS) {
        const conteudo = mapaArquivos.get(arquivo);
        if (conteudo !== undefined && conteudo !== null) {
            arquivosOpcionaisEncontrados.push(arquivo);
        }
    }

    const nivel: NivelVerificacaoPacoteScrivenerMaisRecente =
        erros.length > 0 ? 'error' : avisos.length > 0 ? 'warning' : 'ok';

    const diagnostics: string[] = [...erros, ...avisos];

    return {
        caminhoPacote: input.caminhoPacote,
        nivel,
        arquivosObrigatoriosVerificados,
        arquivosAusentes,
        dossiersEncontrados: input.arquivosDossier.length,
        totalPayloadItens,
        arquivosOpcionaisEncontrados,
        erros,
        avisos,
        diagnostics,
    };
}
