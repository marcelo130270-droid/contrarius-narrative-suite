import type { PlanoPacoteScrivener } from './scrivener-package-plan-model';
import type { TipoItemPayloadScrivener, PayloadScrivener } from './scrivener-package-payload-model';
import { criarArquivosMarkdownPayloadScrivener } from './scrivener-payload-markdown-file-model';

export type NivelIntegridadePacoteScrivener = 'ok' | 'warning' | 'error';

export type CodigoIntegridadePacoteScrivener =
    | 'ARQUIVO_OBRIGATORIO_AUSENTE'
    | 'CAMINHO_DUPLICADO'
    | 'CONTEUDO_JSON_INVALIDO'
    | 'PAYLOAD_SCHEMA_INVALIDO'
    | 'PAYLOAD_ITEM_SEM_ARQUIVO'
    | 'ARQUIVO_ITEM_ORFAO'
    | 'README_LINK_SEM_ARQUIVO'
    | 'TAMANHO_DECLARADO_INCONSISTENTE'
    | 'MANIFESTO_COM_AVISOS'
    | 'MANIFESTO_COM_ERROS';

export interface AchadoIntegridadePacoteScrivener {
    nivel: Exclude<NivelIntegridadePacoteScrivener, 'ok'>;
    codigo: CodigoIntegridadePacoteScrivener;
    mensagem: string;
    caminhoRelativo?: string;
    itemId?: string;
}

export interface ResultadoIntegridadePacoteScrivener {
    nivel: NivelIntegridadePacoteScrivener;
    valido: boolean;
    achados: AchadoIntegridadePacoteScrivener[];
    erros: number;
    avisos: number;
    totalArquivos: number;
    totalItensPayload: number;
    totalArquivosItens: number;
}

export function validarIntegridadePlanoPacoteScrivener(
    plano: PlanoPacoteScrivener,
): ResultadoIntegridadePacoteScrivener {
    const achados: AchadoIntegridadePacoteScrivener[] = [];

    const conjuntoCaminhos = new Set(plano.arquivos.map(a => a.caminhoRelativo));

    // Required files
    for (const obrigatorio of ['manifest.json', 'payload/index.json', 'README.md']) {
        if (!conjuntoCaminhos.has(obrigatorio)) {
            achados.push({
                nivel: 'error',
                codigo: 'ARQUIVO_OBRIGATORIO_AUSENTE',
                mensagem: `Required file missing: ${obrigatorio}`,
                caminhoRelativo: obrigatorio,
            });
        }
    }

    // Duplicate paths
    const seen = new Set<string>();
    for (const arquivo of plano.arquivos) {
        if (seen.has(arquivo.caminhoRelativo)) {
            achados.push({
                nivel: 'error',
                codigo: 'CAMINHO_DUPLICADO',
                mensagem: `Duplicate path: ${arquivo.caminhoRelativo}`,
                caminhoRelativo: arquivo.caminhoRelativo,
            });
        }
        seen.add(arquivo.caminhoRelativo);
    }

    // File size consistency
    for (const arquivo of plano.arquivos) {
        if (arquivo.tamanhoCaracteres !== arquivo.conteudo.length) {
            achados.push({
                nivel: 'warning',
                codigo: 'TAMANHO_DECLARADO_INCONSISTENTE',
                mensagem: `Declared size (${arquivo.tamanhoCaracteres}) differs from content length (${arquivo.conteudo.length}): ${arquivo.caminhoRelativo}`,
                caminhoRelativo: arquivo.caminhoRelativo,
            });
        }
    }

    // Parse manifest.json
    const manifestArquivo = plano.arquivos.find(a => a.caminhoRelativo === 'manifest.json');
    if (manifestArquivo) {
        let manifestParsed: unknown;
        try {
            manifestParsed = JSON.parse(manifestArquivo.conteudo);
        } catch {
            achados.push({
                nivel: 'error',
                codigo: 'CONTEUDO_JSON_INVALIDO',
                mensagem: 'manifest.json contains invalid JSON',
                caminhoRelativo: 'manifest.json',
            });
            manifestParsed = undefined;
        }

        if (manifestParsed !== undefined && typeof manifestParsed === 'object' && manifestParsed !== null) {
            const m = manifestParsed as Record<string, unknown>;
            if (Array.isArray(m.avisos) && m.avisos.length > 0) {
                achados.push({
                    nivel: 'warning',
                    codigo: 'MANIFESTO_COM_AVISOS',
                    mensagem: `Manifest has ${m.avisos.length} warning(s)`,
                    caminhoRelativo: 'manifest.json',
                });
            }
            if (Array.isArray(m.erros) && m.erros.length > 0) {
                achados.push({
                    nivel: 'error',
                    codigo: 'MANIFESTO_COM_ERROS',
                    mensagem: `Manifest has ${m.erros.length} error(s)`,
                    caminhoRelativo: 'manifest.json',
                });
            }
        }
    }

    // Parse payload/index.json
    const payloadArquivo = plano.arquivos.find(a => a.caminhoRelativo === 'payload/index.json');
    let payloadParseOk = false;
    let payloadItens: Array<{ id: string; tipo: TipoItemPayloadScrivener; titulo: string }> = [];
    let totalItensPayload = 0;

    if (payloadArquivo) {
        let payloadParsed: unknown;
        try {
            payloadParsed = JSON.parse(payloadArquivo.conteudo);
        } catch {
            achados.push({
                nivel: 'error',
                codigo: 'CONTEUDO_JSON_INVALIDO',
                mensagem: 'payload/index.json contains invalid JSON',
                caminhoRelativo: 'payload/index.json',
            });
            payloadParsed = undefined;
        }

        if (payloadParsed !== undefined && typeof payloadParsed === 'object' && payloadParsed !== null) {
            const p = payloadParsed as Record<string, unknown>;

            if (typeof p.schema !== 'string' || !Array.isArray(p.itens)) {
                achados.push({
                    nivel: 'error',
                    codigo: 'PAYLOAD_SCHEMA_INVALIDO',
                    mensagem: 'payload/index.json is missing required schema string or itens array',
                    caminhoRelativo: 'payload/index.json',
                });
            } else {
                let temItemInvalido = false;
                const itensValidos: typeof payloadItens = [];

                for (const item of p.itens as unknown[]) {
                    if (
                        item &&
                        typeof item === 'object' &&
                        typeof (item as Record<string, unknown>).id === 'string' &&
                        typeof (item as Record<string, unknown>).tipo === 'string' &&
                        typeof (item as Record<string, unknown>).titulo === 'string'
                    ) {
                        const i = item as Record<string, unknown>;
                        itensValidos.push({
                            id: i.id as string,
                            tipo: i.tipo as TipoItemPayloadScrivener,
                            titulo: i.titulo as string,
                        });
                    } else {
                        temItemInvalido = true;
                    }
                }

                if (temItemInvalido) {
                    achados.push({
                        nivel: 'error',
                        codigo: 'PAYLOAD_SCHEMA_INVALIDO',
                        mensagem: 'payload/index.json contains items missing required fields (id, tipo, titulo)',
                        caminhoRelativo: 'payload/index.json',
                    });
                } else {
                    payloadParseOk = true;
                }

                payloadItens = itensValidos;
                totalItensPayload = itensValidos.length;
            }
        }
    }

    // Item-file correspondence
    const arquivosItem = plano.arquivos.filter(a => a.tipo === 'payload-item');
    const totalArquivosItens = arquivosItem.length;

    if (payloadParseOk) {
        const arquivosEsperados = criarArquivosMarkdownPayloadScrivener({
            itens: payloadItens,
        } as PayloadScrivener);

        const caminhosReaisItem = new Set(arquivosItem.map(a => a.caminhoRelativo));
        const caminhosEsperados = new Set(arquivosEsperados.map(a => a.caminhoRelativo));

        for (const esperado of arquivosEsperados) {
            if (!caminhosReaisItem.has(esperado.caminhoRelativo)) {
                achados.push({
                    nivel: 'error',
                    codigo: 'PAYLOAD_ITEM_SEM_ARQUIVO',
                    mensagem: `Payload item missing markdown file: ${esperado.caminhoRelativo}`,
                    caminhoRelativo: esperado.caminhoRelativo,
                    itemId: esperado.itemId,
                });
            }
        }

        for (const arquivoItem of arquivosItem) {
            if (!caminhosEsperados.has(arquivoItem.caminhoRelativo)) {
                achados.push({
                    nivel: 'warning',
                    codigo: 'ARQUIVO_ITEM_ORFAO',
                    mensagem: `Payload item file has no corresponding payload entry: ${arquivoItem.caminhoRelativo}`,
                    caminhoRelativo: arquivoItem.caminhoRelativo,
                });
            }
        }
    }

    // README links
    const readmeArquivo = plano.arquivos.find(a => a.caminhoRelativo === 'README.md');
    if (readmeArquivo) {
        const linkRegex = /\[([^\]]+)\]\((payload\/items\/[^)]+)\)/g;
        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(readmeArquivo.conteudo)) !== null) {
            const linkedPath = match[2];
            if (!conjuntoCaminhos.has(linkedPath)) {
                achados.push({
                    nivel: 'warning',
                    codigo: 'README_LINK_SEM_ARQUIVO',
                    mensagem: `README links to non-existent file: ${linkedPath}`,
                    caminhoRelativo: linkedPath,
                });
            }
        }
    }

    const erros = achados.filter(a => a.nivel === 'error').length;
    const avisos = achados.filter(a => a.nivel === 'warning').length;

    const nivel: NivelIntegridadePacoteScrivener =
        erros > 0 ? 'error' : avisos > 0 ? 'warning' : 'ok';

    return {
        nivel,
        valido: nivel === 'ok',
        achados,
        erros,
        avisos,
        totalArquivos: plano.totalArquivos,
        totalItensPayload,
        totalArquivosItens,
    };
}

export function planoPacoteScrivenerEstaIntegro(plano: PlanoPacoteScrivener): boolean {
    return validarIntegridadePlanoPacoteScrivener(plano).valido;
}
