import { describe, expect, it } from 'vitest';
import type { DataAdapterEscritaScrivenerLike, DataAdapterLeituraScrivenerLike } from '../../src/contrarius/scrivener-obsidian-write-adapter';
import { criarGravadorPacoteScrivenerObsidian, criarLeitorPacoteScrivenerObsidian } from '../../src/contrarius/scrivener-obsidian-write-adapter';
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

function criarAdapterLeituraMemoria(arquivos: Record<string, string> = {}) {
    const mapa = new Map<string, string>(Object.entries(arquivos));
    const chamadas: string[] = [];

    const adapter: DataAdapterLeituraScrivenerLike = {
        async exists(caminho) {
            chamadas.push(`exists:${caminho}`);
            return mapa.has(caminho);
        },
        async read(caminho) {
            chamadas.push(`read:${caminho}`);
            const conteudo = mapa.get(caminho);
            if (conteudo === undefined) throw new Error(`Arquivo não encontrado: ${caminho}`);
            return conteudo;
        },
    };

    return { adapter, mapa, chamadas };
}

describe('criarLeitorPacoteScrivenerObsidian', () => {
    it('delega existeArquivoTexto para adapter.exists', async () => {
        const { adapter, chamadas } = criarAdapterLeituraMemoria({ 'pkg/a.json': 'x' });
        const leitor = criarLeitorPacoteScrivenerObsidian(adapter);

        const existe = await leitor.existeArquivoTexto('pkg/a.json');
        const ausente = await leitor.existeArquivoTexto('pkg/b.json');

        expect(existe).toBe(true);
        expect(ausente).toBe(false);
        expect(chamadas).toContain('exists:pkg/a.json');
        expect(chamadas).toContain('exists:pkg/b.json');
    });

    it('delega lerArquivoTexto para adapter.read', async () => {
        const { adapter, chamadas } = criarAdapterLeituraMemoria({ 'pkg/manifest.json': '{"id":"x"}' });
        const leitor = criarLeitorPacoteScrivenerObsidian(adapter);

        const conteudo = await leitor.lerArquivoTexto('pkg/manifest.json');

        expect(conteudo).toBe('{"id":"x"}');
        expect(chamadas).toContain('read:pkg/manifest.json');
    });

    it('propaga erro de read para o chamador', async () => {
        const adapter: DataAdapterLeituraScrivenerLike = {
            async exists() { return true; },
            async read() { throw new Error('Falha simulada de leitura'); },
        };
        const leitor = criarLeitorPacoteScrivenerObsidian(adapter);

        await expect(leitor.lerArquivoTexto('qualquer/caminho.json')).rejects.toThrow('Falha simulada de leitura');
    });

    it('não quebra testes de escrita — adaptadores são independentes', async () => {
        const memoria = criarAdapterMemoria();
        const gravador = criarGravadorPacoteScrivenerObsidian(memoria.adapter);

        await gravador.write('pacotes/x.json', 'conteudo');
        expect(memoria.arquivos.get('pacotes/x.json')).toBe('conteudo');

        const adapterLeitura = criarAdapterLeituraMemoria(Object.fromEntries(memoria.arquivos));
        const leitor = criarLeitorPacoteScrivenerObsidian(adapterLeitura.adapter);

        expect(await leitor.existeArquivoTexto('pacotes/x.json')).toBe(true);
        expect(await leitor.lerArquivoTexto('pacotes/x.json')).toBe('conteudo');
    });
});
