import { describe, expect, it } from 'vitest';
import { criarPlanoPacoteOperacionalScrivener } from '../../src/contrarius/scrivener-package-plan-factory';

describe('scrivener-package-plan-factory', () => {
    it('creates an operational package plan from operational context', () => {
        const resultado = criarPlanoPacoteOperacionalScrivener({
            tipo: 'exportacao',
            origemVault: 'Contrarius Enantios',
            diretorioPacotes: 'contrarius-scrivener-packages',
            livro: 'Livro 1',
            observacoes: 'Preview operacional',
            agora: '2000-01-01T00:00:00.000Z',
        });

        expect(resultado.manifesto).toMatchObject({
            id: 'exportacao-livro-1-2000-01-01t00-00-00-000z',
            tipo: 'exportacao',
            origemVault: 'Contrarius Enantios',
            livro: 'Livro 1',
            observacoes: 'Preview operacional',
            erros: [],
        });
        expect(resultado.plano.manifesto).toEqual(resultado.manifesto);
        expect(resultado.plano.totalArquivos).toBe(3);
        expect(resultado.plano.arquivos.map(arquivo => arquivo.caminhoRelativo)).toEqual([
            'manifest.json',
            'payload/index.json',
            'README.md',
        ]);
    });

    it('preserves validation errors inside the preview manifest and plan', () => {
        const resultado = criarPlanoPacoteOperacionalScrivener({
            tipo: 'exportacao',
            origemVault: '   ',
            diretorioPacotes: 'contrarius-scrivener-packages',
            livro: 'Livro 1',
            agora: '2000-01-01T00:00:00.000Z',
        });

        expect(resultado.manifesto.erros).toContain('MANIFESTO_ORIGEM_VAULT_AUSENTE');
        expect(resultado.plano.manifesto.erros).toEqual(resultado.manifesto.erros);
        expect(resultado.plano.arquivos.find(arquivo => arquivo.caminhoRelativo === 'manifest.json')?.conteudo)
            .toContain('MANIFESTO_ORIGEM_VAULT_AUSENTE');
    });

    it('does not persist state or require filesystem access', () => {
        const resultado = criarPlanoPacoteOperacionalScrivener({
            tipo: 'aplicacao',
            origemVault: 'Vault',
            diretorioPacotes: 'pacotes',
            livro: 'Livro 2',
            agora: '2000-01-02T00:00:00.000Z',
        });

        expect(resultado.plano.arquivos.every(arquivo => typeof arquivo.conteudo === 'string')).toBe(true);
        expect(resultado.plano.tamanhoTotalCaracteres).toBeGreaterThan(0);
    });

    it('payload/index.json has schema contrarius-scrivener-payload/v1 and manifestoId when no itensPayload', () => {
        const resultado = criarPlanoPacoteOperacionalScrivener({
            tipo: 'exportacao',
            origemVault: 'Vault',
            diretorioPacotes: 'pacotes',
            livro: 'Livro 1',
            agora: '2000-01-01T00:00:00.000Z',
        });

        const payloadIndex = resultado.plano.arquivos.find(a => a.caminhoRelativo === 'payload/index.json');
        const parsed = JSON.parse(payloadIndex?.conteudo ?? '{}');

        expect(parsed.schema).toBe('contrarius-scrivener-payload/v1');
        expect(parsed.manifestoId).toBe(resultado.manifesto.id);
        expect(parsed.totalItens).toBe(0);
        expect(parsed.itens).toEqual([]);
    });

    it('quando itensPayload fornecidos, aparecem no payload/index.json ordenados', () => {
        const resultado = criarPlanoPacoteOperacionalScrivener({
            tipo: 'exportacao',
            origemVault: 'Vault',
            diretorioPacotes: 'pacotes',
            livro: 'Livro 1',
            agora: '2000-01-01T00:00:00.000Z',
            itensPayload: [
                { id: 'c', tipo: 'evento', titulo: 'Cena', ordemNarrativa: 3 },
                { id: 'a', tipo: 'lugar', titulo: 'Alfa', ordemNarrativa: 1 },
                { id: 'b', tipo: 'nota', titulo: 'Beta', ordemNarrativa: 2 },
            ],
        });

        const payloadIndex = resultado.plano.arquivos.find(a => a.caminhoRelativo === 'payload/index.json');
        const parsed = JSON.parse(payloadIndex?.conteudo ?? '{}');

        expect(parsed.schema).toBe('contrarius-scrivener-payload/v1');
        expect(parsed.totalItens).toBe(3);
        expect(parsed.itens.map((i: { id: string }) => i.id)).toEqual(['a', 'b', 'c']);
    });

    it('itens inválidos em itensPayload são descartados', () => {
        const resultado = criarPlanoPacoteOperacionalScrivener({
            tipo: 'exportacao',
            origemVault: 'Vault',
            diretorioPacotes: 'pacotes',
            agora: '2000-01-01T00:00:00.000Z',
            itensPayload: [
                { id: 'valido', tipo: 'evento', titulo: 'Válido' },
                { id: '', tipo: 'evento', titulo: 'Sem id' },
                { id: 'sem-titulo', tipo: 'lugar' },
            ],
        });

        const payloadIndex = resultado.plano.arquivos.find(a => a.caminhoRelativo === 'payload/index.json');
        const parsed = JSON.parse(payloadIndex?.conteudo ?? '{}');

        expect(parsed.totalItens).toBe(1);
        expect(parsed.itens[0].id).toBe('valido');
    });

    it('ordenação do payload é preservada quando itens não têm ordemNarrativa', () => {
        const resultado = criarPlanoPacoteOperacionalScrivener({
            tipo: 'restauracao',
            origemVault: 'Vault',
            diretorioPacotes: 'pacotes',
            agora: '2000-01-01T00:00:00.000Z',
            itensPayload: [
                { id: 'z', tipo: 'objeto', titulo: 'Zebra' },
                { id: 'a', tipo: 'grupo', titulo: 'Alfa' },
                { id: 'm', tipo: 'relacao', titulo: 'Meio' },
            ],
        });

        const payloadIndex = resultado.plano.arquivos.find(a => a.caminhoRelativo === 'payload/index.json');
        const parsed = JSON.parse(payloadIndex?.conteudo ?? '{}');

        expect(parsed.itens.map((i: { titulo: string }) => i.titulo)).toEqual(['Alfa', 'Meio', 'Zebra']);
    });

    it('chamadas antigas sem itensPayload continuam funcionando', () => {
        const resultado = criarPlanoPacoteOperacionalScrivener({
            tipo: 'aplicacao',
            origemVault: 'Vault Antigo',
            diretorioPacotes: 'pacotes',
            agora: '2000-06-15T12:00:00.000Z',
        });

        expect(resultado.manifesto.tipo).toBe('aplicacao');
        expect(resultado.plano.totalArquivos).toBe(3);
    });
});
