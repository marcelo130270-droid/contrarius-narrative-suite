import { describe, it, expect } from 'vitest';
import { resumirExtracaoPayloadScrivener } from '../../src/contrarius/scrivener-payload-summary-model';
import type { ResultadoExtracaoPayloadContrariusScrivener } from '../../src/contrarius/scrivener-contrarius-payload-extractor';
import type { ItemPayloadScrivener } from '../../src/contrarius/scrivener-package-payload-model';

function makeExtracao(
  overrides?: Partial<ResultadoExtracaoPayloadContrariusScrivener>,
): ResultadoExtracaoPayloadContrariusScrivener {
  return {
    itens: [],
    totalItens: 0,
    descartados: 0,
    avisos: [],
    ...overrides,
  };
}

function makeItem(overrides?: Partial<ItemPayloadScrivener>): ItemPayloadScrivener {
  return {
    id: 'id-1',
    tipo: 'consciencia',
    titulo: 'Título',
    ...overrides,
  };
}

describe('resumirExtracaoPayloadScrivener', () => {
  describe('nivel empty', () => {
    it('returns empty when no items, no discarded, no warnings', () => {
      const resumo = resumirExtracaoPayloadScrivener(makeExtracao());
      expect(resumo.nivel).toBe('empty');
      expect(resumo.totalItens).toBe(0);
      expect(resumo.totalDescartados).toBe(0);
      expect(resumo.totalAvisos).toBe(0);
    });

    it('returns descricao for empty level', () => {
      const resumo = resumirExtracaoPayloadScrivener(makeExtracao());
      expect(resumo.descricao).toBe('No payload items found.');
    });

    it('returns empty arrays for porTipo, porLivro, porPeriodo', () => {
      const resumo = resumirExtracaoPayloadScrivener(makeExtracao());
      expect(resumo.porTipo).toEqual([]);
      expect(resumo.porLivro).toEqual([]);
      expect(resumo.porPeriodo).toEqual([]);
      expect(resumo.primeirosAvisos).toEqual([]);
    });
  });

  describe('nivel ok', () => {
    it('returns ok when items present and no discarded or warnings', () => {
      const item = makeItem({ id: 'c1', tipo: 'consciencia', titulo: 'T' });
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ itens: [item], totalItens: 1 }),
      );
      expect(resumo.nivel).toBe('ok');
    });

    it('returns descricao for ok level with correct item count', () => {
      const itens = [
        makeItem({ id: 'c1', titulo: 'A' }),
        makeItem({ id: 'c2', titulo: 'B' }),
      ];
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ itens, totalItens: 2 }),
      );
      expect(resumo.descricao).toBe('Payload ready with 2 items.');
    });
  });

  describe('nivel warning', () => {
    it('returns warning when descartados > 0', () => {
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ descartados: 1 }),
      );
      expect(resumo.nivel).toBe('warning');
    });

    it('returns warning when avisos.length > 0', () => {
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ avisos: ['aviso 1'] }),
      );
      expect(resumo.nivel).toBe('warning');
    });

    it('returns warning when both descartados and avisos are present', () => {
      const item = makeItem({ id: 'c1', titulo: 'T' });
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ itens: [item], totalItens: 1, descartados: 2, avisos: ['w1', 'w2'] }),
      );
      expect(resumo.nivel).toBe('warning');
    });

    it('returns descricao for warning level', () => {
      const item = makeItem({ id: 'c1', titulo: 'T' });
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ itens: [item], totalItens: 1, descartados: 2, avisos: ['w1'] }),
      );
      expect(resumo.descricao).toBe('Payload ready with 1 items, 2 discarded and 1 warnings.');
    });
  });

  describe('contagem por tipo', () => {
    it('counts items grouped by tipo', () => {
      const itens: ItemPayloadScrivener[] = [
        makeItem({ id: 'c1', tipo: 'consciencia', titulo: 'C1' }),
        makeItem({ id: 'c2', tipo: 'consciencia', titulo: 'C2' }),
        makeItem({ id: 'ev1', tipo: 'evento', titulo: 'Ev1' }),
      ];
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ itens, totalItens: 3 }),
      );
      expect(resumo.porTipo).toHaveLength(2);
      expect(resumo.porTipo[0]).toEqual({ chave: 'consciencia', total: 2 });
      expect(resumo.porTipo[1]).toEqual({ chave: 'evento', total: 1 });
    });
  });

  describe('contagem por livro', () => {
    it('counts items grouped by livro, ignoring empty', () => {
      const itens: ItemPayloadScrivener[] = [
        makeItem({ id: 'c1', livro: 'Livro 1', titulo: 'C1' }),
        makeItem({ id: 'c2', livro: 'Livro 1', titulo: 'C2' }),
        makeItem({ id: 'c3', livro: 'Livro 2', titulo: 'C3' }),
        makeItem({ id: 'c4', titulo: 'C4' }), // no livro
      ];
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ itens, totalItens: 4 }),
      );
      expect(resumo.porLivro).toHaveLength(2);
      expect(resumo.porLivro[0]).toEqual({ chave: 'Livro 1', total: 2 });
      expect(resumo.porLivro[1]).toEqual({ chave: 'Livro 2', total: 1 });
    });

    it('ignores empty string livro', () => {
      const itens: ItemPayloadScrivener[] = [
        makeItem({ id: 'c1', livro: '', titulo: 'C1' }),
        makeItem({ id: 'c2', titulo: 'C2' }),
      ];
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ itens, totalItens: 2 }),
      );
      expect(resumo.porLivro).toEqual([]);
    });
  });

  describe('contagem por período', () => {
    it('counts items grouped by periodo, ignoring empty', () => {
      const itens: ItemPayloadScrivener[] = [
        makeItem({ id: 'c1', periodo: 'Século I', titulo: 'C1' }),
        makeItem({ id: 'c2', periodo: 'Século I', titulo: 'C2' }),
        makeItem({ id: 'c3', periodo: 'Século II', titulo: 'C3' }),
        makeItem({ id: 'c4', titulo: 'C4' }), // no periodo
      ];
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ itens, totalItens: 4 }),
      );
      expect(resumo.porPeriodo).toHaveLength(2);
      expect(resumo.porPeriodo[0]).toEqual({ chave: 'Século I', total: 2 });
      expect(resumo.porPeriodo[1]).toEqual({ chave: 'Século II', total: 1 });
    });
  });

  describe('ordenação das contagens', () => {
    it('sorts by total desc, then chave asc when totals are equal', () => {
      const itens: ItemPayloadScrivener[] = [
        makeItem({ id: 'e1', tipo: 'evento', titulo: 'E1' }),
        makeItem({ id: 'c1', tipo: 'consciencia', titulo: 'C1' }),
        makeItem({ id: 'c2', tipo: 'consciencia', titulo: 'C2' }),
        makeItem({ id: 'c3', tipo: 'consciencia', titulo: 'C3' }),
        makeItem({ id: 'l1', tipo: 'lugar', titulo: 'L1' }),
        makeItem({ id: 'l2', tipo: 'lugar', titulo: 'L2' }),
        makeItem({ id: 'n1', tipo: 'nota', titulo: 'N1' }),
      ];
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ itens, totalItens: 7 }),
      );
      // consciencia(3) > lugar(2) > evento(1) = nota(1) [alphabetical: evento < nota]
      expect(resumo.porTipo[0].chave).toBe('consciencia');
      expect(resumo.porTipo[0].total).toBe(3);
      expect(resumo.porTipo[1].chave).toBe('lugar');
      expect(resumo.porTipo[1].total).toBe(2);
      expect(resumo.porTipo[2].chave).toBe('evento');
      expect(resumo.porTipo[2].total).toBe(1);
      expect(resumo.porTipo[3].chave).toBe('nota');
      expect(resumo.porTipo[3].total).toBe(1);
    });
  });

  describe('limite de avisos', () => {
    it('limits primeirosAvisos to default of 5', () => {
      const avisos = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'];
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ avisos, totalAvisos: avisos.length } as ResultadoExtracaoPayloadContrariusScrivener),
      );
      expect(resumo.primeirosAvisos).toHaveLength(5);
      expect(resumo.primeirosAvisos).toEqual(['w1', 'w2', 'w3', 'w4', 'w5']);
    });

    it('respects custom limiteAvisos', () => {
      const avisos = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
      const resumo = resumirExtracaoPayloadScrivener(
        makeExtracao({ avisos }),
        3,
      );
      expect(resumo.primeirosAvisos).toHaveLength(3);
      expect(resumo.primeirosAvisos).toEqual(['w1', 'w2', 'w3']);
    });

    it('returns all avisos when count is less than limiteAvisos', () => {
      const avisos = ['w1', 'w2'];
      const resumo = resumirExtracaoPayloadScrivener(makeExtracao({ avisos }));
      expect(resumo.primeirosAvisos).toEqual(['w1', 'w2']);
    });

    it('limits to 0 when limiteAvisos is 0', () => {
      const avisos = ['w1', 'w2'];
      const resumo = resumirExtracaoPayloadScrivener(makeExtracao({ avisos }), 0);
      expect(resumo.primeirosAvisos).toEqual([]);
    });
  });
});
