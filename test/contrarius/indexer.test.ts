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
      '02_Consciencias/C-001.md': { id: 'C-001', nome: 'Fulano', nucleo_geo: ['Roma'] },
      '02_Consciencias/sem-id.md': { nome: 'Sem ID' },
      '03_Retrovidas/R-001.md': { consc_id: 'C-001', livro: 'Livro 1', periodo: 'Sec I' },
      '05_Eventos/E-001.md': { id_evento: 'E-001', livro: 'Livro 1', periodo: 'Sec I', participantes: ['C-001'] },
      '06_Lugares/L-001.md': { id_lugar: 'L-001', nome_atual: 'Roma', periodo: 'Sec I' },
      '04_Relacoes/rel-1.md': { tipo: 'aliado' },
    });

    const indice = await indexarVaultContrarius(vault, cache);

    expect(indice.consciencias).toHaveLength(2);
    expect(indice.retrovidas).toHaveLength(1);
    expect(indice.eventos).toHaveLength(1);
    expect(indice.lugares).toHaveLength(1);
    expect(indice.relacoes).toHaveLength(1);

    expect(indice.alertas.some((a) => a.campo === 'id' && a.path === '02_Consciencias/sem-id.md')).toBe(true);
  });

  it('constrói porId a partir de id/id_evento/id_lugar', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-001.md': { id: 'C-001', nome: 'Fulano' },
      '05_Eventos/E-001.md': { id_evento: 'E-001', participantes: ['C-001'] },
      '06_Lugares/L-001.md': { id_lugar: 'L-001', nome_atual: 'Roma' },
    });

    const indice = await indexarVaultContrarius(vault, cache);

    expect(indice.porId.get('C-001')).toMatchObject({ nome: 'Fulano' });
    expect(indice.porId.get('E-001')).toMatchObject({ participantes: ['C-001'] });
    expect(indice.porId.get('L-001')).toMatchObject({ nome_atual: 'Roma' });
    expect(indice.porId.has('inexistente')).toBe(false);
  });

  it('agrupa por livro, período e núcleo geográfico', async () => {
    const { vault, cache } = makeVaultECache({
      '03_Retrovidas/R-001.md': { consc_id: 'C-001', livro: 'Livro 1', periodo: 'Sec I' },
      '05_Eventos/E-001.md': { id_evento: 'E-001', livro: 'Livro 1', periodo: 'Sec II', participantes: ['C-001'] },
      '02_Consciencias/C-001.md': { id: 'C-001', nucleo_geo: ['Roma', 'Alexandria'] },
    });

    const indice = await indexarVaultContrarius(vault, cache);

    expect(indice.porLivro.get('Livro 1')).toHaveLength(2);
    expect(indice.porPeriodo.get('Sec I')).toHaveLength(1);
    expect(indice.porPeriodo.get('Sec II')).toHaveLength(1);
    expect(indice.porNucleoGeo.get('Roma')).toHaveLength(1);
    expect(indice.porNucleoGeo.get('Alexandria')).toHaveLength(1);
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
