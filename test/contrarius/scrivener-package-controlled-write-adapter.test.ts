import { describe, expect, it } from 'vitest';
import {
    criarAdaptadorControladoEscritaPacoteScrivener,
    ErroCaminhoPacoteScrivener,
    type GravadorPacoteScrivener,
} from '../../src/contrarius/scrivener-package-controlled-write-adapter';

function criarGravadorMemoria(arquivosExistentes: Record<string, string> = {}) {
    const arquivos = new Map<string, string>(Object.entries(arquivosExistentes));
    const diretorios = new Set<string>();
    const mkdirs: string[] = [];
    const writes: string[] = [];

    const gravador: GravadorPacoteScrivener = {
        async exists(caminho) {
            return arquivos.has(caminho) || diretorios.has(caminho);
        },
        async mkdir(caminho) {
            diretorios.add(caminho);
            mkdirs.push(caminho);
        },
        async write(caminho, conteudo) {
            arquivos.set(caminho, conteudo);
            writes.push(caminho);
        },
    };

    return {
        gravador,
        arquivos,
        diretorios,
        mkdirs,
        writes,
    };
}

describe('scrivener-package-controlled-write-adapter', () => {
    it('creates missing parent directories before writing', async () => {
        const memoria = criarGravadorMemoria();
        const adaptador = criarAdaptadorControladoEscritaPacoteScrivener(memoria.gravador);

        await adaptador.escreverArquivoTexto('pacotes/livro.scrivener-package/payload/index.json', '{ }');

        expect(memoria.mkdirs).toEqual([
            'pacotes',
            'pacotes/livro.scrivener-package',
            'pacotes/livro.scrivener-package/payload',
        ]);
        expect(memoria.arquivos.get('pacotes/livro.scrivener-package/payload/index.json')).toBe('{ }');
    });

    it('normalizes backslashes before writing', async () => {
        const memoria = criarGravadorMemoria();
        const adaptador = criarAdaptadorControladoEscritaPacoteScrivener(memoria.gravador);

        await adaptador.escreverArquivoTexto('pacotes\\livro.scrivener-package\\manifest.json', 'manifest');

        expect(memoria.writes).toEqual(['pacotes/livro.scrivener-package/manifest.json']);
    });

    it('blocks overwrite by default', async () => {
        const memoria = criarGravadorMemoria({
            'pacotes/livro.scrivener-package/manifest.json': 'old',
        });
        const adaptador = criarAdaptadorControladoEscritaPacoteScrivener(memoria.gravador);

        await expect(adaptador.escreverArquivoTexto('pacotes/livro.scrivener-package/manifest.json', 'new'))
            .rejects
            .toThrow(ErroCaminhoPacoteScrivener);

        expect(memoria.arquivos.get('pacotes/livro.scrivener-package/manifest.json')).toBe('old');
    });

    it('allows overwrite when explicitly enabled', async () => {
        const memoria = criarGravadorMemoria({
            'pacotes/livro.scrivener-package/manifest.json': 'old',
        });
        const adaptador = criarAdaptadorControladoEscritaPacoteScrivener(memoria.gravador, {
            sobrescrever: true,
        });

        await adaptador.escreverArquivoTexto('pacotes/livro.scrivener-package/manifest.json', 'new');

        expect(memoria.arquivos.get('pacotes/livro.scrivener-package/manifest.json')).toBe('new');
    });

    it('blocks absolute paths', async () => {
        const memoria = criarGravadorMemoria();
        const adaptador = criarAdaptadorControladoEscritaPacoteScrivener(memoria.gravador);

        await expect(adaptador.escreverArquivoTexto('/tmp/pacote/manifest.json', 'x'))
            .rejects
            .toThrow('Caminho absoluto bloqueado');

        await expect(adaptador.escreverArquivoTexto('C:/tmp/pacote/manifest.json', 'x'))
            .rejects
            .toThrow('Caminho absoluto bloqueado');
    });

    it('blocks parent directory traversal', async () => {
        const memoria = criarGravadorMemoria();
        const adaptador = criarAdaptadorControladoEscritaPacoteScrivener(memoria.gravador);

        await expect(adaptador.escreverArquivoTexto('pacotes/../manifest.json', 'x'))
            .rejects
            .toThrow('subida de diretorio bloqueado');
    });

    it('blocks empty or current-directory path segments', async () => {
        const memoria = criarGravadorMemoria();
        const adaptador = criarAdaptadorControladoEscritaPacoteScrivener(memoria.gravador);

        await expect(adaptador.escreverArquivoTexto('', 'x'))
            .rejects
            .toThrow('vazio');

        await expect(adaptador.escreverArquivoTexto('pacotes/./manifest.json', 'x'))
            .rejects
            .toThrow('Caminho invalido');
    });
});
