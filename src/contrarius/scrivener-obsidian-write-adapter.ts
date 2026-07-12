import type { GravadorPacoteScrivener } from './scrivener-package-controlled-write-adapter';
import type { LeitorPacoteScrivener } from './scrivener-package-write-verification-model';

export interface DataAdapterEscritaScrivenerLike {
    exists(caminho: string): Promise<boolean>;
    mkdir(caminho: string): Promise<void>;
    write(caminho: string, conteudo: string): Promise<void>;
}

export interface DataAdapterLeituraScrivenerLike {
    exists(caminho: string): Promise<boolean>;
    read(caminho: string): Promise<string>;
}

export function criarLeitorPacoteScrivenerObsidian(
    adapter: DataAdapterLeituraScrivenerLike,
): LeitorPacoteScrivener {
    return {
        async existeArquivoTexto(caminhoDestino: string): Promise<boolean> {
            return adapter.exists(caminhoDestino);
        },
        async lerArquivoTexto(caminhoDestino: string): Promise<string> {
            return adapter.read(caminhoDestino);
        },
    };
}

export function criarGravadorPacoteScrivenerObsidian(
    adapter: DataAdapterEscritaScrivenerLike,
): GravadorPacoteScrivener {
    return {
        async exists(caminho: string): Promise<boolean> {
            return adapter.exists(caminho);
        },

        async mkdir(caminho: string): Promise<void> {
            await adapter.mkdir(caminho);
        },

        async write(caminho: string, conteudo: string): Promise<void> {
            await adapter.write(caminho, conteudo);
        },
    };
}
