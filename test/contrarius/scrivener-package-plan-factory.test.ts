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
});
