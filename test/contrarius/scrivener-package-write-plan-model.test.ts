import { describe, expect, it } from 'vitest';
import type { ManifestoScrivener } from '../../src/contrarius/scrivener-package-manifest';
import { criarPlanoPacoteScrivener } from '../../src/contrarius/scrivener-package-plan-model';
import { criarPlanoEscritaPacoteScrivener } from '../../src/contrarius/scrivener-package-write-plan-model';

function criarManifestoBase(): ManifestoScrivener {
    return {
        id: 'exportacao-livro-1',
        criadoEm: '2000-01-01T00:00:00.000Z',
        tipo: 'exportacao',
        origemVault: 'Contrarius Enantios',
        caminhoPacote: 'contrarius-scrivener-packages/exportacao-livro-1.scrivener-package',
        livro: 'Livro 1',
        avisos: [],
        erros: [],
    };
}

describe('scrivener-package-write-plan-model', () => {
    it('creates write operations for every preview file', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const escrita = criarPlanoEscritaPacoteScrivener(plano);

        expect(escrita.totalOperacoes).toBe(4);
        expect(escrita.operacoes.map(operacao => operacao.caminhoRelativo)).toEqual([
            'manifest.json',
            'payload/index.json',
            'README.md',
            'integrity/report.json',
        ]);
    });

    it('builds destination paths under the package path', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const escrita = criarPlanoEscritaPacoteScrivener(plano);

        expect(escrita.operacoes.map(operacao => operacao.caminhoDestino)).toEqual([
            'contrarius-scrivener-packages/exportacao-livro-1.scrivener-package/manifest.json',
            'contrarius-scrivener-packages/exportacao-livro-1.scrivener-package/payload/index.json',
            'contrarius-scrivener-packages/exportacao-livro-1.scrivener-package/README.md',
            'contrarius-scrivener-packages/exportacao-livro-1.scrivener-package/integrity/report.json',
        ]);
    });

    it('normalizes backslashes and trailing package slashes', () => {
        const manifesto = criarManifestoBase();
        manifesto.caminhoPacote = 'contrarius\\pacotes\\livro.scrivener-package///';

        const plano = criarPlanoPacoteScrivener(manifesto);
        const escrita = criarPlanoEscritaPacoteScrivener(plano);

        expect(escrita.caminhoPacote).toBe('contrarius/pacotes/livro.scrivener-package');
        expect(escrita.operacoes[1].caminhoDestino).toBe('contrarius/pacotes/livro.scrivener-package/payload/index.json');
    });

    it('preserves file content and file types', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const escrita = criarPlanoEscritaPacoteScrivener(plano);

        expect(escrita.operacoes[0].tipo).toBe('manifest');
        expect(escrita.operacoes[0].conteudo).toContain('exportacao-livro-1');
        expect(escrita.operacoes[1].tipo).toBe('payload');
        expect(escrita.operacoes[2].tipo).toBe('readme');
    });

    it('computes total planned write size', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const escrita = criarPlanoEscritaPacoteScrivener(plano);

        expect(escrita.tamanhoTotalCaracteres).toBe(
            escrita.operacoes.reduce((total, operacao) => total + operacao.tamanhoCaracteres, 0),
        );
        expect(escrita.tamanhoTotalCaracteres).toBe(plano.tamanhoTotalCaracteres);
    });

    it('does not write files or require filesystem access', () => {
        const plano = criarPlanoPacoteScrivener(criarManifestoBase());
        const escrita = criarPlanoEscritaPacoteScrivener(plano);

        expect(escrita.operacoes.every(operacao => typeof operacao.conteudo === 'string')).toBe(true);
        expect(escrita.operacoes.every(operacao => operacao.caminhoDestino.length > 0)).toBe(true);
    });
});
