import type { GravadorPacoteScrivener } from './scrivener-package-controlled-write-adapter';

export interface DataAdapterEscritaScrivenerLike {
    exists(caminho: string): Promise<boolean>;
    mkdir(caminho: string): Promise<void>;
    write(caminho: string, conteudo: string): Promise<void>;
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
