import { describe, expect, it } from 'vitest';
import type { ManifestoScrivener } from '../../src/contrarius/scrivener-package-manifest';
import { criarPlanoPacoteScrivener } from '../../src/contrarius/scrivener-package-plan-model';
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

describe('scrivener-package-plan-model', () => {
    it('creates a package plan with manifest, payload index, readme, scrivener-import, structured workspace and integrity report files', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());

        expect(plano.totalArquivos).toBe(8);
        expect(plano.arquivos.map(arquivo => arquivo.caminhoRelativo)).toEqual([
            'manifest.json',
            'payload/index.json',
            'README.md',
            'scrivener-import.md',
            'scrivener/index.md',
            'scrivener/timeline/eventos.md',
            'scrivener/timeline/cronologia.md',
            'integrity/report.json',
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

    it('creates a payload index with correct schema and empty item list when no payload supplied', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const payloadIndex = plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'payload/index.json');

        expect(payloadIndex?.tipo).toBe('payload');
        expect(payloadIndex?.conteudo).toContain('contrarius-scrivener-payload/v1');
        expect(payloadIndex?.conteudo).toContain('"itens": []');
        expect(payloadIndex?.conteudo).toContain('"manifestoId": "exportacao-livro-1"');
        expect(payloadIndex?.conteudo).toContain('"totalItens": 0');
    });

    it('payload/index.json uses the provided payload when supplied', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            geradoEm: manifesto.criadoEm,
            itens: [
                { id: 'b', tipo: 'evento', titulo: 'Beta', ordemNarrativa: 2 },
                { id: 'a', tipo: 'lugar', titulo: 'Alfa', ordemNarrativa: 1 },
            ],
        });
        const plano = criarPlanoPacoteScrivener(manifesto, { payload });
        const payloadIndex = plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'payload/index.json');

        expect(payloadIndex?.conteudo).toContain('contrarius-scrivener-payload/v1');
        expect(payloadIndex?.conteudo).toContain('"totalItens": 2');

        const parsed = JSON.parse(payloadIndex?.conteudo ?? '{}');
        expect(parsed.itens[0].id).toBe('a');
        expect(parsed.itens[1].id).toBe('b');
    });

    it('manifest.json is not affected by payload content', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            geradoEm: manifesto.criadoEm,
            itens: [{ id: 'x', tipo: 'nota', titulo: 'Nota X' }],
        });
        const plano = criarPlanoPacoteScrivener(manifesto, { payload });
        const manifestJson = plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'manifest.json');

        expect(manifestJson?.conteudo).toContain('"id": "exportacao-livro-1"');
        expect(manifestJson?.conteudo).not.toContain('contrarius-scrivener-payload');
    });

    it('payload vazio tem 8 arquivos', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        expect(plano.totalArquivos).toBe(8);
    });

    it('payload com 2 itens de tipos distintos gera 12 arquivos', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            geradoEm: manifesto.criadoEm,
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'A' },
                { id: 'b', tipo: 'lugar', titulo: 'B' },
            ],
        });
        const plano = criarPlanoPacoteScrivener(manifesto, { payload });
        expect(plano.totalArquivos).toBe(12);
    });

    it('arquivos payload-item tem caminhos esperados', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            geradoEm: manifesto.criadoEm,
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'Alpha' },
                { id: 'b', tipo: 'lugar', titulo: 'Beta' },
            ],
        });
        const plano = criarPlanoPacoteScrivener(manifesto, { payload });
        const itemArquivos = plano.arquivos.filter(a => a.tipo === 'payload-item');

        expect(itemArquivos).toHaveLength(2);
        expect(itemArquivos.map(a => a.caminhoRelativo)).toContain('payload/items/evento/alpha.md');
        expect(itemArquivos.map(a => a.caminhoRelativo)).toContain('payload/items/lugar/beta.md');
    });

    it('totalArquivos e tamanhoTotalCaracteres incluem arquivos payload-item e estruturados', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            geradoEm: manifesto.criadoEm,
            itens: [{ id: 'x', tipo: 'nota', titulo: 'Nota X' }],
        });
        const plano = criarPlanoPacoteScrivener(manifesto, { payload });

        expect(plano.totalArquivos).toBe(10);
        expect(plano.tamanhoTotalCaracteres).toBe(
            plano.arquivos.reduce((total, arquivo) => total + arquivo.tamanhoCaracteres, 0),
        );
    });

    it('payload/index.json continua existindo com itens', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            geradoEm: manifesto.criadoEm,
            itens: [{ id: 'a', tipo: 'consciencia', titulo: 'Rogier' }],
        });
        const plano = criarPlanoPacoteScrivener(manifesto, { payload });
        const payloadIndex = plano.arquivos.find(a => a.caminhoRelativo === 'payload/index.json');

        expect(payloadIndex).toBeDefined();
        expect(payloadIndex?.tipo).toBe('payload');
        expect(payloadIndex?.conteudo).toContain('"totalItens": 1');
    });

    it('creates a readable readme preview', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const readme = plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'README.md');

        expect(readme?.tipo).toBe('readme');
        expect(readme?.conteudo).toContain('# Contrarius Scrivener package');
        expect(readme?.conteudo).toContain('No payload items were exported.');
    });

    it('readme contem links para payload/items quando payload tem itens', () => {
        const manifesto = criarManifestoBase();
        const payload = criarPayloadScrivener({
            manifestoId: manifesto.id,
            geradoEm: manifesto.criadoEm,
            itens: [
                { id: 'a', tipo: 'evento', titulo: 'A' },
                { id: 'b', tipo: 'lugar', titulo: 'B' },
            ],
        });
        const plano = criarPlanoPacoteScrivener(manifesto, { payload });
        const readme = plano.arquivos.find(a => a.caminhoRelativo === 'README.md');

        expect(readme?.conteudo).toContain('[A](payload/items/evento/a.md)');
        expect(readme?.conteudo).toContain('[B](payload/items/lugar/b.md)');
    });

    it('plano inclui integrity/report.json com tipo integrity-report e JSON parseável', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const relatorio = plano.arquivos.find(a => a.caminhoRelativo === 'integrity/report.json');

        expect(relatorio).toBeDefined();
        expect(relatorio?.tipo).toBe('integrity-report');
        expect(() => JSON.parse(relatorio?.conteudo ?? '')).not.toThrow();
        expect(relatorio?.tamanhoCaracteres).toBe(relatorio?.conteudo.length);
    });

    it('computes file sizes and total size', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());

        expect(plano.arquivos.every(arquivo => arquivo.tamanhoCaracteres === arquivo.conteudo.length)).toBe(true);
        expect(plano.tamanhoTotalCaracteres).toBe(
            plano.arquivos.reduce((total, arquivo) => total + arquivo.tamanhoCaracteres, 0),
        );
    });

    it('readme nao inclui Book quando manifesto nao tem livro', () => {
        const manifesto = criarManifestoBase();
        delete manifesto.livro;

        const plano = criarPlanoPacoteScrivener(manifesto);
        const readme = plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'README.md');

        expect(readme?.conteudo).not.toContain('**Book:**');
    });

    it('plano inclui scrivener-import.md com tipo scrivener-import', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const importacao = plano.arquivos.find(a => a.caminhoRelativo === 'scrivener-import.md');

        expect(importacao).toBeDefined();
        expect(importacao?.tipo).toBe('scrivener-import');
        expect(importacao?.conteudo).toContain('# Contrarius Scrivener Import');
    });

    it('totalArquivos aumenta em 2 ao adicionar um item: payload-item mais dossie do tipo', () => {
        const manifesto = criarManifestoBase();
        const payloadVazio = criarPayloadScrivener({ manifestoId: manifesto.id, geradoEm: manifesto.criadoEm });
        const payloadUmItem = criarPayloadScrivener({
            manifestoId: manifesto.id,
            geradoEm: manifesto.criadoEm,
            itens: [{ id: 'a', tipo: 'nota', titulo: 'A' }],
        });
        const planoVazio = criarPlanoPacoteScrivener(manifesto, { payload: payloadVazio });
        const planoUmItem = criarPlanoPacoteScrivener(manifesto, { payload: payloadUmItem });

        expect(planoUmItem.totalArquivos - planoVazio.totalArquivos).toBe(2);
    });

    it('backward compatible: old calls without options still work', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());

        expect(plano.totalArquivos).toBe(8);
        expect(plano.arquivos.find(a => a.caminhoRelativo === 'payload/index.json')?.conteudo)
            .toContain('contrarius-scrivener-payload/v1');
    });
});
