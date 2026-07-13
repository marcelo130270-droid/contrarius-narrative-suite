import { describe, expect, it } from 'vitest';
import type { ManifestoScrivener } from '../../src/contrarius/scrivener-package-manifest';
import { criarReadmePacoteScrivener } from '../../src/contrarius/scrivener-package-readme-model';
import { criarPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';

function criarManifestoBase(): ManifestoScrivener {
    return {
        id: 'exportacao-livro-1',
        criadoEm: '2000-01-01T00:00:00.000Z',
        tipo: 'exportacao',
        origemVault: 'Contrarius Enantios',
        caminhoPacote: 'contrarius-scrivener-packages/exportacao-livro-1.scrivener-package',
        livro: 'Livro 1',
        observacoes: 'Preview operacional',
        avisos: [],
        erros: [],
    };
}

describe('criarReadmePacoteScrivener', () => {
    it('README vazio informa ausencia de itens', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({ manifestoId: manifesto.id, itens: [] });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.conteudo).toContain('No payload items were exported.');
        expect(readme.totalItens).toBe(0);
        expect(readme.totalArquivosItens).toBe(0);
    });

    it('inclui dados do manifesto no conteudo', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({ manifestoId: manifesto.id, itens: [] });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.conteudo).toContain('# Contrarius Scrivener package');
        expect(readme.conteudo).toContain('exportacao-livro-1');
        expect(readme.conteudo).toContain('exportacao');
        expect(readme.conteudo).toContain('Contrarius Enantios');
        expect(readme.conteudo).toContain('2000-01-01T00:00:00.000Z');
        expect(readme.conteudo).toContain('contrarius-scrivener-packages/exportacao-livro-1.scrivener-package');
        expect(readme.conteudo).toContain('Livro 1');
    });

    it('nao inclui Book no conteudo quando manifesto nao tem livro', () => {
        const manifesto = criarManifestoBase();
        delete manifesto.livro;
        const payload = criarPayloadScrivener({ manifestoId: manifesto.id, itens: [] });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.conteudo).not.toContain('**Book:**');
    });

    it('inclui total de itens e total de arquivos Markdown', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Alpha' },
                { id: 'b', tipo: 'lugar', titulo: 'Beta' },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.totalItens).toBe(2);
        expect(readme.totalArquivosItens).toBe(2);
        expect(readme.conteudo).toContain('**Total items:** 2');
        expect(readme.conteudo).toContain('**Item markdown files:** 2');
    });

    it('inclui contagem por tipo', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Alpha' },
                { id: 'b', tipo: 'evento', titulo: 'Beta' },
                { id: 'c', tipo: 'lugar', titulo: 'Gama' },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.porTipo).toEqual([
            { chave: 'evento', total: 2 },
            { chave: 'lugar', total: 1 },
        ]);
        expect(readme.conteudo).toContain('## By type');
        expect(readme.conteudo).toContain('evento: 2');
        expect(readme.conteudo).toContain('lugar: 1');
    });

    it('inclui contagem por livro', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Alpha', livro: 'Livro 1' },
                { id: 'b', tipo: 'evento', titulo: 'Beta', livro: 'Livro 1' },
                { id: 'c', tipo: 'lugar', titulo: 'Gama', livro: 'Livro 2' },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.porLivro).toEqual([
            { chave: 'Livro 1', total: 2 },
            { chave: 'Livro 2', total: 1 },
        ]);
        expect(readme.conteudo).toContain('## By book');
        expect(readme.conteudo).toContain('Livro 1: 2');
        expect(readme.conteudo).toContain('Livro 2: 1');
    });

    it('nao inclui secao By book quando nenhum item tem livro', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [{ id: 'a', tipo: 'evento', titulo: 'Alpha' }],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.porLivro).toHaveLength(0);
        expect(readme.conteudo).not.toContain('## By book');
    });

    it('inclui contagem por periodo', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Alpha', periodo: 'Seculo XV' },
                { id: 'b', tipo: 'evento', titulo: 'Beta', periodo: 'Seculo XV' },
                { id: 'c', tipo: 'lugar', titulo: 'Gama', periodo: 'Seculo XVI' },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.porPeriodo).toEqual([
            { chave: 'Seculo XV', total: 2 },
            { chave: 'Seculo XVI', total: 1 },
        ]);
        expect(readme.conteudo).toContain('## By period');
        expect(readme.conteudo).toContain('Seculo XV: 2');
        expect(readme.conteudo).toContain('Seculo XVI: 1');
    });

    it('nao inclui secao By period quando nenhum item tem periodo', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [{ id: 'a', tipo: 'evento', titulo: 'Alpha' }],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.porPeriodo).toHaveLength(0);
        expect(readme.conteudo).not.toContain('## By period');
    });

    it('inclui links para payload/items/<tipo>/<slug>.md', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Alpha' },
                { id: 'b', tipo: 'lugar', titulo: 'Roma Antiga' },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.conteudo).toContain('[Alpha](payload/items/evento/alpha.md)');
        expect(readme.conteudo).toContain('[Roma Antiga](payload/items/lugar/roma-antiga.md)');
    });

    it('links usam barra normal', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [{ id: 'a', tipo: 'consciencia', titulo: 'Rogier' }],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.conteudo).toContain('payload/items/consciencia/rogier.md');
        expect(readme.conteudo).not.toContain('payload\\items');
    });

    it('ordena indice por tipo, livro, periodo, titulo, id', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'z', tipo: 'lugar', titulo: 'Zeta', livro: 'Livro 1' },
                { id: 'a', tipo: 'evento', titulo: 'Alpha', livro: 'Livro 2' },
                { id: 'm', tipo: 'evento', titulo: 'Meio', livro: 'Livro 1' },
                { id: 'b', tipo: 'evento', titulo: 'Alpha', livro: 'Livro 1' },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        const ids = readme.itens.map(i => i.id);
        // evento antes de lugar; dentro de evento: Livro 1 antes de Livro 2; dentro de Livro 1: titulo Alpha(b) antes de Meio
        expect(ids).toEqual(['b', 'm', 'a', 'z']);
    });

    it('desempata por titulo quando tipo e livro sao iguais', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'x', tipo: 'nota', titulo: 'Zeta' },
                { id: 'y', tipo: 'nota', titulo: 'Alpha' },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.itens[0].titulo).toBe('Alpha');
        expect(readme.itens[1].titulo).toBe('Zeta');
    });

    it('desempata por id quando tipo, livro, periodo e titulo sao iguais', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'z-id', tipo: 'nota', titulo: 'Igual', ordemNarrativa: 2 },
                { id: 'a-id', tipo: 'nota', titulo: 'Igual', ordemNarrativa: 1 },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.itens[0].id).toBe('a-id');
        expect(readme.itens[1].id).toBe('z-id');
    });

    it('ordena contagens por total desc depois chave asc', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'a', tipo: 'nota', titulo: 'A' },
                { id: 'b', tipo: 'evento', titulo: 'B' },
                { id: 'c', tipo: 'evento', titulo: 'C' },
                { id: 'd', tipo: 'lugar', titulo: 'D' },
                { id: 'e', tipo: 'lugar', titulo: 'E' },
                { id: 'f', tipo: 'lugar', titulo: 'F' },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.porTipo[0]).toEqual({ chave: 'lugar', total: 3 });
        expect(readme.porTipo[1]).toEqual({ chave: 'evento', total: 2 });
        expect(readme.porTipo[2]).toEqual({ chave: 'nota', total: 1 });
    });

    it('desempata contagens por chave asc quando totais iguais', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'a', tipo: 'nota', titulo: 'A', livro: 'Livro Z' },
                { id: 'b', tipo: 'evento', titulo: 'B', livro: 'Livro A' },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.porLivro[0].chave).toBe('Livro A');
        expect(readme.porLivro[1].chave).toBe('Livro Z');
    });

    it('README contem link para scrivener-import.md', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({ manifestoId: manifesto.id, itens: [] });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.conteudo).toContain('[Scrivener import](scrivener-import.md)');
    });

    it('README contem link para scrivener/index.md', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({ manifestoId: manifesto.id, itens: [] });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.conteudo).toContain('[Scrivener workspace](scrivener/index.md)');
    });

    it('nao depende de fs, path ou obsidian', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [{ id: 'a', tipo: 'evento', titulo: 'Alpha' }],
        });
        expect(() => criarReadmePacoteScrivener(manifesto, payload)).not.toThrow();
    });

    it('nao quebra caracteres acentuados', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [{ id: 'a', tipo: 'evento', titulo: 'São João' }],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        expect(readme.conteudo).toContain('São João');
    });

    it('itens no modelo refletem caminho correto com dedup de slug', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Rogier', ordemNarrativa: 1 },
                { id: 'b', tipo: 'evento', titulo: 'Rogier', ordemNarrativa: 2 },
            ],
        });
        const readme = criarReadmePacoteScrivener(manifesto, payload);

        const caminhos = readme.itens.map(i => i.caminhoRelativo);
        expect(caminhos).toContain('payload/items/evento/rogier.md');
        expect(caminhos).toContain('payload/items/evento/rogier-2.md');
    });
});
