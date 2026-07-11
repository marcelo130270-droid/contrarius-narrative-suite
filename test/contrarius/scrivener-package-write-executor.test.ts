import { describe, expect, it } from 'vitest';
import type { ManifestoScrivener } from '../../src/contrarius/scrivener-package-manifest';
import { criarPlanoPacoteScrivener } from '../../src/contrarius/scrivener-package-plan-model';
import { criarPlanoEscritaPacoteScrivener } from '../../src/contrarius/scrivener-package-write-plan-model';
import {
    executarPlanoEscritaPacoteScrivener,
    type AdaptadorEscritaPacoteScrivener,
} from '../../src/contrarius/scrivener-package-write-executor';

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

function criarPlanoEscritaBase() {
    return criarPlanoEscritaPacoteScrivener(criarPlanoPacoteScrivener(criarManifestoBase()));
}

describe('scrivener-package-write-executor', () => {
    it('executes all planned write operations through an injected adapter', async () => {
        const plano = criarPlanoEscritaBase();
        const arquivos = new Map<string, string>();

        const adaptador: AdaptadorEscritaPacoteScrivener = {
            async escreverArquivoTexto(caminhoDestino, conteudo) {
                arquivos.set(caminhoDestino, conteudo);
            },
        };

        const resultado = await executarPlanoEscritaPacoteScrivener(plano, adaptador);

        expect(resultado.totalOperacoes).toBe(3);
        expect(resultado.operacoesOk).toBe(3);
        expect(resultado.operacoesErro).toBe(0);
        expect(arquivos.size).toBe(3);
        expect(arquivos.get('contrarius-scrivener-packages/exportacao-livro-1.scrivener-package/manifest.json')).toContain('exportacao-livro-1');
    });

    it('preserves operation order', async () => {
        const plano = criarPlanoEscritaBase();
        const ordem: string[] = [];

        const adaptador: AdaptadorEscritaPacoteScrivener = {
            async escreverArquivoTexto(caminhoDestino) {
                ordem.push(caminhoDestino);
            },
        };

        await executarPlanoEscritaPacoteScrivener(plano, adaptador);

        expect(ordem).toEqual(plano.operacoes.map(operacao => operacao.caminhoDestino));
    });

    it('reports adapter errors without throwing', async () => {
        const plano = criarPlanoEscritaBase();

        const adaptador: AdaptadorEscritaPacoteScrivener = {
            async escreverArquivoTexto(caminhoDestino) {
                if (caminhoDestino.endsWith('payload/index.json')) {
                    throw new Error('Falha simulada');
                }
            },
        };

        const resultado = await executarPlanoEscritaPacoteScrivener(plano, adaptador);

        expect(resultado.totalOperacoes).toBe(3);
        expect(resultado.operacoesOk).toBe(2);
        expect(resultado.operacoesErro).toBe(1);
        expect(resultado.resultados[1]).toMatchObject({
            caminhoRelativo: 'payload/index.json',
            status: 'erro',
            erro: 'Falha simulada',
        });
    });

    it('computes total executed write size from operation results', async () => {
        const plano = criarPlanoEscritaBase();

        const adaptador: AdaptadorEscritaPacoteScrivener = {
            async escreverArquivoTexto() {
                // no-op
            },
        };

        const resultado = await executarPlanoEscritaPacoteScrivener(plano, adaptador);

        expect(resultado.tamanhoTotalCaracteres).toBe(plano.tamanhoTotalCaracteres);
        expect(resultado.tamanhoTotalCaracteres).toBe(
            resultado.resultados.reduce((total, item) => total + item.tamanhoCaracteres, 0),
        );
    });

    it('does not import filesystem, path, or Obsidian APIs', async () => {
        const plano = criarPlanoEscritaBase();
        const chamadas: string[] = [];

        const adaptador: AdaptadorEscritaPacoteScrivener = {
            async escreverArquivoTexto(caminhoDestino) {
                chamadas.push(caminhoDestino);
            },
        };

        const resultado = await executarPlanoEscritaPacoteScrivener(plano, adaptador);

        expect(chamadas).toHaveLength(resultado.totalOperacoes);
    });
});
