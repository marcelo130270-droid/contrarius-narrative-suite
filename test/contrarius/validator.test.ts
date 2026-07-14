import { describe, it, expect } from 'vitest';
import { indexarVaultContrarius } from '../../src/contrarius/indexer';
import { validarIndiceContrarius } from '../../src/contrarius/validator';
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

describe('validarIndiceContrarius', () => {
  it('não gera alerta quando tudo é consistente (usando wikilinks reais)', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-001.md': { id: 'C-001' },
      '03_Retrovidas/C-001_V01_Rogier.md': { consciencia: 'C-001', livro: 'Livro 1', periodo: ['Sec I'] },
      '05_Eventos/E-001.md': {
        num_reg: 'E-001',
        local: ['[[L-001_Acra]]'],
        retrovidas: ['[[C-001_V01_Rogier]]'],
      },
      '06_Lugares/L-001_Acra.md': { num_reg: 'L-001', nome_atual: 'Acre' },
    });

    const indice = await indexarVaultContrarius(vault, cache);
    expect(validarIndiceContrarius(indice)).toEqual([]);
  });

  it('detecta consciencia apontando para consciência inexistente', async () => {
    const { vault, cache } = makeVaultECache({
      '03_Retrovidas/R-001.md': { consciencia: 'C-999', livro: 'Livro 1', periodo: ['Sec I'] },
    });

    const indice = await indexarVaultContrarius(vault, cache);
    const alertas = validarIndiceContrarius(indice);

    expect(alertas).toContainEqual(
      expect.objectContaining({ severidade: 'erro', campo: 'consciencia', path: '03_Retrovidas/R-001.md' }),
    );
  });

  it('detecta retrovida referenciada por evento mas inexistente', async () => {
    const { vault, cache } = makeVaultECache({
      '05_Eventos/E-001.md': { num_reg: 'E-001', retrovidas: ['[[C-999_V01_Inexistente]]'] },
    });

    const indice = await indexarVaultContrarius(vault, cache);
    const alertas = validarIndiceContrarius(indice);

    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'retrovidas' }));
  });

  it('detecta lugar referenciado (padrão L-###) mas ausente', async () => {
    const { vault, cache } = makeVaultECache({
      '05_Eventos/E-001.md': { num_reg: 'E-001', local: ['[[L-999_Inexistente]]'] },
    });

    const indice = await indexarVaultContrarius(vault, cache);
    const alertas = validarIndiceContrarius(indice);

    expect(alertas).toContainEqual(expect.objectContaining({ severidade: 'erro', campo: 'local' }));
  });

  it('não alerta local em texto livre que não segue o padrão L-###', async () => {
    const { vault, cache } = makeVaultECache({
      '05_Eventos/E-001.md': { num_reg: 'E-001', local: ['Alguma cidade antiga'] },
    });

    const indice = await indexarVaultContrarius(vault, cache);
    const alertas = validarIndiceContrarius(indice);

    expect(alertas.filter((a) => a.campo === 'local')).toHaveLength(0);
  });

  it('detecta ID duplicado entre duas notas', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-001a.md': { id: 'C-001' },
      '02_Consciencias/C-001b.md': { id: 'C-001' },
    });

    const indice = await indexarVaultContrarius(vault, cache);
    const alertas = validarIndiceContrarius(indice);
    const duplicados = alertas.filter((a) => a.campo === 'id');

    expect(duplicados).toHaveLength(2);
    expect(duplicados.every((a) => a.severidade === 'erro')).toBe(true);
  });

  it('alerta aviso para retrovida sem livro ou período', async () => {
    const { vault, cache } = makeVaultECache({
      '03_Retrovidas/R-001.md': { consciencia: 'C-001' },
      '02_Consciencias/C-001.md': { id: 'C-001' },
    });

    const indice = await indexarVaultContrarius(vault, cache);
    const alertas = validarIndiceContrarius(indice);

    expect(alertas).toContainEqual(expect.objectContaining({ campo: 'livro', severidade: 'aviso' }));
    expect(alertas).toContainEqual(expect.objectContaining({ campo: 'periodo', severidade: 'aviso' }));
  });

  it('não quebra com índice vazio', async () => {
    const { vault, cache } = makeVaultECache({});
    const indice = await indexarVaultContrarius(vault, cache);
    expect(validarIndiceContrarius(indice)).toEqual([]);
  });

  it('detecta grupocarma parecido mas não idêntico (provável erro de digitação)', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-001.md': { id: 'C-001', grupocarma: ['Cruzados de Montpaon'] },
      '02_Consciencias/C-002.md': { id: 'C-002', grupocarma: ['Cruzados Montpaon'] },
    });

    const indice = await indexarVaultContrarius(vault, cache);
    const alertas = validarIndiceContrarius(indice);
    const avisosGrupocarma = alertas.filter((a) => a.campo === 'grupocarma');

    expect(avisosGrupocarma).toHaveLength(2);
    expect(avisosGrupocarma.every((a) => a.severidade === 'aviso')).toBe(true);
  });

  it('não alerta grupocarma idêntico, nem valores completamente diferentes', async () => {
    const { vault, cache } = makeVaultECache({
      '02_Consciencias/C-001.md': { id: 'C-001', grupocarma: ['Cruzados de Montpaon'] },
      '02_Consciencias/C-002.md': { id: 'C-002', grupocarma: ['Cruzados de Montpaon', 'Família Del Vignal'] },
    });

    const indice = await indexarVaultContrarius(vault, cache);
    const alertas = validarIndiceContrarius(indice);

    expect(alertas.filter((a) => a.campo === 'grupocarma')).toHaveLength(0);
  });
});
