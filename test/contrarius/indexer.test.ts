import { describe, it, expect } from 'vitest';
import { indexarVaultContrarius } from '../../src/contrarius/indexer';
import type {
  ArquivoMarkdownContrariusLike,
  CacheArquivoContrariusLike,
  MetadataCacheContrariusLike,
  VaultContrariusLike,
} from '../../src/contrarius/reader';

function makeArquivo(path: string): ArquivoMarkdownContrariusLike {
  return { path, basename: path.split('/').pop()!.replace('.md', '') };
}

function makeVaultECache(frontmatters: Record<string, Record<string, unknown>>): {
  vault: VaultContrariusLike;
  cache: MetadataCacheContrariusLike;
} {
  const arquivos = Object.keys(frontmatters).map(makeArquivo);
  return {
    vault: { getMarkdownFiles: () => arquivos },
    cache: {
      getFileCache: (arquivo): CacheArquivoContrariusLike | null => {
        const fm = frontmatters[arquivo.path];
        return fm ? { frontmatter: fm } : null;
      },
    },
  };
}

describe('indexarVaultContrarius', () => {
  it('monta listas por coleção e concatena alertas de todos os normalizadores', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-001.md': { id: 'C-001' },
      '02_Consciencias/sem-id.md': { historicidade: 'Real' },
      '03_Retrovidas/R-001.md': { consciencia: 'C-001', livro: 'Livro 1', periodo: ['Sec I'] },
      '05_Eventos/E-001.md': { codigo: 'E-001', livro: 'Livro 1', periodo: ['Sec I'], retrovidas: ['C-001'] },
      '06_Lugares/L-001.md': { codigo: 'L-001', nome_atual: 'Roma' },
      '04_Relacoes/rel-1.md': { a: 'C-001', b: 'C-002', tipo_relacao: 'aliado' },
    });

    const indice = await indexarVaultContrarius(vault, cache);

    expect(indice.consciencias).toHaveLength(2);
    expect(indice.retrovidas).toHaveLength(1);
    expect(indice.eventos).toHaveLength(1);
    expect(indice.lugares).toHaveLength(1);
    expect(indice.relacoes).toHaveLength(1);

    expect(indice.alertas.some((a) => a.campo === 'id' && a.path === '02_Consciencias/sem-id.md')).toBe(true);
  });

  it('constrói porId a partir de id/codigo (evento e lugar)', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-001.md': { id: 'C-001' },
      '05_Eventos/E-001.md': { codigo: 'E-001', retrovidas: ['C-001'] },
      '06_Lugares/L-001.md': { codigo: 'L-001', nome_atual: 'Roma' },
    });

    const indice = await indexarVaultContrarius(vault, cache);

    expect(indice.porId.has('C-001')).toBe(true);
    expect(indice.porId.get('E-001')).toMatchObject({ retrovidas: ['C-001'] });
    expect(indice.porId.get('L-001')).toMatchObject({ nome_atual: 'Roma' });
    expect(indice.porId.has('inexistente')).toBe(false);
  });

  it('agrupa por livro e período (retrovida + evento) e núcleo geográfico (retrovida + evento + lugar)', async () => {
    const { vault, cache } = makeVaultECache({
      '03_Retrovidas/R-001.md': { consciencia: 'C-001', livro: 'Livro 1', periodo: ['Sec I'], nucleo_geo: ['Roma'] },
      '05_Eventos/E-001.md': { codigo: 'E-001', livro: 'Livro 1', periodo: ['Sec II'], retrovidas: ['C-001'] },
      '06_Lugares/L-001.md': { codigo: 'L-001', nome_atual: 'Roma', nucleo_geo: ['Mediterrâneo'] },
    });

    const indice = await indexarVaultContrarius(vault, cache);

    expect(indice.porLivro.get('Livro 1')).toHaveLength(2);
    expect(indice.porPeriodo.get('Sec I')).toHaveLength(1);
    expect(indice.porPeriodo.get('Sec II')).toHaveLength(1);
    expect(indice.porNucleoGeo.get('Roma')).toHaveLength(1);
    expect(indice.porNucleoGeo.get('Mediterrâneo')).toHaveLength(1);
  });

  it('é determinístico: mesma entrada produz a mesma ordem de saída', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-002.md': { id: 'C-002' },
      '02_Consciencias/C-001.md': { id: 'C-001' },
    });

    const indiceA = await indexarVaultContrarius(vault, cache);
    const indiceB = await indexarVaultContrarius(vault, cache);

    expect(indiceA.consciencias.map((c) => c.id)).toEqual(['C-001', 'C-002']);
    expect(indiceA.consciencias.map((c) => c.id)).toEqual(indiceB.consciencias.map((c) => c.id));
  });

  it('não quebra com vault vazio', async () => {
    const { vault, cache } = makeVaultECache({});
    const indice = await indexarVaultContrarius(vault, cache);

    expect(indice.consciencias).toEqual([]);
    expect(indice.alertas).toEqual([]);
    expect(indice.porId.size).toBe(0);
  });
});
