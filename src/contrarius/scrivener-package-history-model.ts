import type { EstadoPacoteScrivener } from './scrivener-alerts-panel-model';

export type StatusHistoricoPacoteScrivener = 'valid' | 'invalid' | 'warning' | 'unknown';

export interface ItemHistoricoPacoteScrivener {
    id: string;
    criadoEm: string;
    tipo: string;
    origemVault: string;
    caminhoPacote: string;
    livro?: string;
    status: StatusHistoricoPacoteScrivener;
    descricao: string;
}

function textoSeguro(valor: unknown, fallback: string): string {
    return typeof valor === 'string' && valor.trim().length > 0 ? valor.trim() : fallback;
}

function statusDoPacoteScrivener(pacote: EstadoPacoteScrivener): StatusHistoricoPacoteScrivener {
    if (pacote.manifesto?.valido === false) {
        return 'invalid';
    }

    if (pacote.manifesto?.comProblemas === true) {
        return 'warning';
    }

    if (pacote.manifesto?.valido === true) {
        return 'valid';
    }

    return 'unknown';
}

export function listarHistoricoPacotesScrivener(
    pacotes: ReadonlyArray<EstadoPacoteScrivener> | undefined | null,
    limite = 10,
): ItemHistoricoPacoteScrivener[] {
    if (!Array.isArray(pacotes) || pacotes.length === 0) {
        return [];
    }

    const limiteSeguro = Number.isFinite(limite) && limite > 0 ? Math.floor(limite) : 10;

    return [...pacotes]
        .slice(-limiteSeguro)
        .reverse()
        .map((pacote, index) => {
            const manifesto = pacote.manifesto;
            const id = textoSeguro(manifesto?.id, `pacote-${pacotes.length - index}`);
            const criadoEm = textoSeguro(manifesto?.criadoEm, 'data-nao-informada');
            const tipo = textoSeguro(manifesto?.tipo, 'tipo-nao-informado');
            const origemVault = textoSeguro(manifesto?.origemVault, 'vault-nao-informado');
            const caminhoPacote = textoSeguro(manifesto?.caminhoPacote, 'caminho-nao-informado');
            const livro = typeof manifesto?.livro === 'string' && manifesto.livro.trim().length > 0
                ? manifesto.livro.trim()
                : undefined;
            const status = statusDoPacoteScrivener(pacote);
            const livroTexto = livro ?? 'sem livro';

            const itemBase = {
                id,
                criadoEm,
                tipo,
                origemVault,
                caminhoPacote,
                status,
                descricao: `${status} · ${criadoEm} · ${livroTexto} · ${caminhoPacote}`,
            };

            return livro ? { ...itemBase, livro } : itemBase;
        });
}
