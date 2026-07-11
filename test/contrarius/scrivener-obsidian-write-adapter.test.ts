import { describe, expect, it } from 'vitest';
import type { DataAdapterEscritaScrivenerLike } from '../../src/contrarius/scrivener-obsidian-write-adapter';
import { criarGravadorPacoteScrivenerObsidian } from '../../src/contrarius/scrivener-obsidian-write-adapter';
import { criarAdaptadorControladoEscritaPacoteScrivener } from '../../src/contrarius/scrivener-package-controlled-write-adapter';

function criarAdapterMemoria() {
    const arquivos = new Map<string, string>();
    const diretorios = new Set<string>();
    const chamadas: string[] = [];

    const adapter: DataAdapterEscritaScrivenerLike = {
        async exists(caminho) {
            chamadas.push(`exists:${caminho}`);
            return arquivos.has(caminho) || diretorios.has(caminho);
        },
        async mkdir(caminho) {
            chamadas.push(`mkdir:${caminho}`);
            diretorios.add(caminho);
        },
        async write(caminho, conteudo) {
            chamadas.push(`write:${caminho}`);
            arquivos.set(caminho, conteudo);
        },
    };

    return {
        adapter,
        arquivos,
        diretorios,
        chamadas,
    };
}

describe('scrivener-obsidian-write-adapter', () => {
    it('wraps an Obsidian-like data adapter as a Scrivener package writer', async () => {
        const memoria = criarAdapterMemoria();
        const gravador = criarGravadorPacoteScrivenerObsidian(memoria.adapter);

        expect(await gravador.exists('pacotes')).toBe(false);

        await gravador.mkdir('pacotes');
        expect(await gravador.exists('pacotes')).toBe(true);

        await gravador.write('pacotes/manifest.json', 'manifest');
        expect(memoria.arquivos.get('pacotes/manifest.json')).toBe('manifest');
    });

    it('can be used by the controlled write adapter', async () => {
        const memoria = criarAdapterMemoria();
        const gravador = criarGravadorPacoteScrivenerObsidian(memoria.adapter);
        const adaptador = criarAdaptadorControladoEscritaPacoteScrivener(gravador);

        await adaptador.escreverArquivoTexto('pacotes/livro.scrivener-package/manifest.json', 'manifest');

        expect(memoria.diretorios.has('pacotes')).toBe(true);
        expect(memoria.diretorios.has('pacotes/livro.scrivener-package')).toBe(true);
        expect(memoria.arquivos.get('pacotes/livro.scrivener-package/manifest.json')).toBe('manifest');
    });

    it('preserves normalized paths received from the controlled adapter', async () => {
        const memoria = criarAdapterMemoria();
        const gravador = criarGravadorPacoteScrivenerObsidian(memoria.adapter);
        const adaptador = criarAdaptadorControladoEscritaPacoteScrivener(gravador);

        await adaptador.escreverArquivoTexto('pacotes\\livro.scrivener-package\\payload\\index.json', '{}');

        expect(memoria.chamadas).toContain('write:pacotes/livro.scrivener-package/payload/index.json');
    });

    it('does not impose overwrite rules itself', async () => {
        const memoria = criarAdapterMemoria();
        const gravador = criarGravadorPacoteScrivenerObsidian(memoria.adapter);

        await gravador.write('pacotes/manifest.json', 'old');
        await gravador.write('pacotes/manifest.json', 'new');

        expect(memoria.arquivos.get('pacotes/manifest.json')).toBe('new');
    });
});
