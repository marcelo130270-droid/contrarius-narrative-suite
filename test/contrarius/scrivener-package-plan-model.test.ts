import { describe, expect, it } from 'vitest';
import type { ManifestoScrivener } from '../../src/contrarius/scrivener-package-manifest';
import { criarPlanoPacoteScrivener } from '../../src/contrarius/scrivener-package-plan-model';

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

describe('scrivener-package-plan-model', () => {
    it('creates a package plan with manifest, payload index, and readme files', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());

        expect(plano.totalArquivos).toBe(3);
        expect(plano.arquivos.map(arquivo => arquivo.caminhoRelativo)).toEqual([
            'manifest.json',
            'payload/index.json',
            'README.md',
        ]);
    });

    it('stores manifest metadata in manifest.json preview content', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const manifestJson = plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'manifest.json');

        expect(manifestJson?.tipo).toBe('manifest');
        expect(manifestJson?.conteudo).toContain('"id": "exportacao-livro-1"');
        expect(manifestJson?.conteudo).toContain('"origemVault": "Contrarius Enantios"');
        expect(manifestJson?.conteudo).toContain('"caminhoPacote": "contrarius-scrivener-packages/exportacao-livro-1.scrivener-package"');
    });

    it('creates a payload index with package schema and empty item list', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const payloadIndex = plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'payload/index.json');

        expect(payloadIndex?.tipo).toBe('payload');
        expect(payloadIndex?.conteudo).toContain('contrarius-scrivener-package-preview/v1');
        expect(payloadIndex?.conteudo).toContain('"itens": []');
    });

    it('creates a readable readme preview', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const readme = plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'README.md');

        expect(readme?.tipo).toBe('readme');
        expect(readme?.conteudo).toContain('Contrarius Scrivener Package Preview');
        expect(readme?.conteudo).toContain('Este plano ainda nao grava arquivos reais do Scrivener.');
    });

    it('computes file sizes and total size', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());

        expect(plano.arquivos.every(arquivo => arquivo.tamanhoCaracteres === arquivo.conteudo.length)).toBe(true);
        expect(plano.tamanhoTotalCaracteres).toBe(
            plano.arquivos.reduce((total, arquivo) => total + arquivo.tamanhoCaracteres, 0),
        );
    });

    it('uses sem livro in readme when manifest has no livro', () => {
        const manifesto = criarManifestoBase();
        delete manifesto.livro;

        const plano = criarPlanoPacoteScrivener(manifesto);
        const readme = plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'README.md');

        expect(readme?.conteudo).toContain('Livro: sem livro');
    });
});
