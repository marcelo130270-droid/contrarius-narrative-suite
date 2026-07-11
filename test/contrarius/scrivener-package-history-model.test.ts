import { describe, expect, it } from 'vitest';
import type { EstadoPacoteScrivener } from '../../src/contrarius/scrivener-alerts-panel-model';
import { listarHistoricoPacotesScrivener } from '../../src/contrarius/scrivener-package-history-model';

describe('scrivener-package-history-model', () => {
    it('returns empty history for missing state', () => {
        expect(listarHistoricoPacotesScrivener(undefined)).toEqual([]);
        expect(listarHistoricoPacotesScrivener(null)).toEqual([]);
        expect(listarHistoricoPacotesScrivener([])).toEqual([]);
    });

    it('lists manifest metadata from the most recent package first', () => {
        const pacotes: EstadoPacoteScrivener[] = [
            {
                manifesto: {
                    id: 'old',
                    criadoEm: '2000-01-01T00:00:00.000Z',
                    tipo: 'diagnostico',
                    origemVault: 'vault',
                    caminhoPacote: 'old.scrivener-package',
                    valido: true,
                    comProblemas: false,
                },
            },
            {
                manifesto: {
                    id: 'new',
                    criadoEm: '2000-01-02T00:00:00.000Z',
                    tipo: 'exportacao',
                    origemVault: 'vault',
                    caminhoPacote: 'new.scrivener-package',
                    livro: 'Livro 1',
                    valido: true,
                    comProblemas: false,
                },
            },
        ];

        const historico = listarHistoricoPacotesScrivener(pacotes);

        expect(historico).toHaveLength(2);
        expect(historico[0]).toMatchObject({
            id: 'new',
            tipo: 'exportacao',
            livro: 'Livro 1',
            status: 'valid',
        });
        expect(historico[1].id).toBe('old');
    });

    it('classifies invalid manifests as invalid', () => {
        const historico = listarHistoricoPacotesScrivener([
            {
                manifesto: {
                    id: 'invalid',
                    valido: false,
                    comProblemas: true,
                },
            },
        ]);

        expect(historico[0].status).toBe('invalid');
    });

    it('classifies valid manifests with problems as warning', () => {
        const historico = listarHistoricoPacotesScrivener([
            {
                manifesto: {
                    id: 'warning',
                    valido: true,
                    comProblemas: true,
                },
            },
        ]);

        expect(historico[0].status).toBe('warning');
    });

    it('classifies packages without manifest validity as unknown', () => {
        const historico = listarHistoricoPacotesScrivener([
            {
                aplicacao: {
                    status: 'ok',
                },
            },
        ]);

        expect(historico[0].status).toBe('unknown');
        expect(historico[0].id).toBe('pacote-1');
    });

    it('respects the history limit', () => {
        const pacotes: EstadoPacoteScrivener[] = Array.from({ length: 12 }, (_, index) => ({
            manifesto: {
                id: `pacote-${index + 1}`,
                valido: true,
                comProblemas: false,
            },
        }));

        const historico = listarHistoricoPacotesScrivener(pacotes, 3);

        expect(historico.map(item => item.id)).toEqual(['pacote-12', 'pacote-11', 'pacote-10']);
    });

    it('trims metadata fields', () => {
        const historico = listarHistoricoPacotesScrivener([
            {
                manifesto: {
                    id: '  pacote  ',
                    criadoEm: '  2000-01-01T00:00:00.000Z  ',
                    tipo: '  exportacao  ',
                    origemVault: '  vault  ',
                    caminhoPacote: '  pacote.scrivener-package  ',
                    livro: '  Livro 2  ',
                    valido: true,
                    comProblemas: false,
                },
            },
        ]);

        expect(historico[0]).toMatchObject({
            id: 'pacote',
            criadoEm: '2000-01-01T00:00:00.000Z',
            tipo: 'exportacao',
            origemVault: 'vault',
            caminhoPacote: 'pacote.scrivener-package',
            livro: 'Livro 2',
            status: 'valid',
        });
    });

    it('omits empty livro', () => {
        const historico = listarHistoricoPacotesScrivener([
            {
                manifesto: {
                    id: 'pacote',
                    livro: '   ',
                    valido: true,
                    comProblemas: false,
                },
            },
        ]);

        expect(historico[0].livro).toBeUndefined();
        expect(historico[0].descricao).toContain('sem livro');
    });
});
