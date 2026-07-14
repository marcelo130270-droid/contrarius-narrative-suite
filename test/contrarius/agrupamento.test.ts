import { describe, it, expect } from 'vitest';
import { indexarVaultContrarius } from '../../src/contrarius/indexer';
import { agruparPorCampo, CAMPOS_AGRUPAVEIS } from '../../src/contrarius/agrupamento';
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

describe('agruparPorCampo', () => {
  it('agrupa por chave única e por array de chaves', () => {
    const itens = [{ nome: 'a', tags: ['x', 'y'] }, { nome: 'b', tags: ['y'] }];
    const mapa = agruparPorCampo(itens, (item) => item.tags);
    expect(mapa.get('x')).toEqual([itens[0]]);
    expect(mapa.get('y')).toEqual([itens[0], itens[1]]);
  });

  it('ignora itens sem valor', () => {
    const itens = [{ tags: undefined }];
    const mapa = agruparPorCampo(itens, (item) => item.tags);
    expect(mapa.size).toBe(0);
  });
});

describe('CAMPOS_AGRUPAVEIS', () => {
  it('agrupa por livro, período e núcleo geográfico (retrovida + evento + lugar)', async () => {
    const { vault, cache } = makeVaultECache({
      '03_Retrovidas/R-001.md': { consciencia: 'C-001', livro: 'Livro 1', periodo: ['Sec I'], nucleo_geo: ['Roma'] },
      '05_Eventos/E-001.md': { codigo: 'E-001', livro: 'Livro 1', periodo: ['Sec II'], retrovidas: ['C-001'] },
      '06_Lugares/L-001.md': { codigo: 'L-001', nome_atual: 'Roma', nucleo_geo: ['Mediterrâneo'] },
    });
    const indice = await indexarVaultContrarius(vault, cache);

    const porLivro = CAMPOS_AGRUPAVEIS.find((c) => c.chave === 'livro')!.extrair(indice);
    const porPeriodo = CAMPOS_AGRUPAVEIS.find((c) => c.chave === 'periodo')!.extrair(indice);
    const porNucleoGeo = CAMPOS_AGRUPAVEIS.find((c) => c.chave === 'nucleoGeo')!.extrair(indice);

    expect(porLivro.get('Livro 1')).toHaveLength(2);
    expect(porPeriodo.get('Sec I')).toHaveLength(1);
    expect(porPeriodo.get('Sec II')).toHaveLength(1);
    expect(porNucleoGeo.get('Roma')).toHaveLength(1);
    expect(porNucleoGeo.get('Mediterrâneo')).toHaveLength(1);
  });

  it('agrupa por grupo cármico compartilhado entre consciência e retrovida', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-001.md': { id: 'C-001', grupocarma: ['Cruzados de Montpaon'] },
      '03_Retrovidas/R-001.md': { consciencia: 'C-002', grupocarma: ['Cruzados de Montpaon', 'Família Del Vignal'] },
    });
    const indice = await indexarVaultContrarius(vault, cache);

    const porGrupocarma = CAMPOS_AGRUPAVEIS.find((c) => c.chave === 'grupocarma')!.extrair(indice);

    expect(porGrupocarma.get('Cruzados de Montpaon')).toHaveLength(2);
    expect(porGrupocarma.get('Família Del Vignal')).toHaveLength(1);
  });

  it('agrupa por identidade extrafísica (só consciência)', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-001.md': { id: 'C-001', ident_extraf: 'X' },
      '02_Consciencias/C-002.md': { id: 'C-002', ident_extraf: 'X' },
    });
    const indice = await indexarVaultContrarius(vault, cache);

    const porIdentExtraf = CAMPOS_AGRUPAVEIS.find((c) => c.chave === 'identExtraf')!.extrair(indice);
    expect(porIdentExtraf.get('X')).toHaveLength(2);
  });
});
