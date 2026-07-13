import { describe, it, expect } from 'vitest';
import {
  classificarColecaoContrariusPorCaminho,
  removerFrontmatterMarkdown,
  lerVaultContrarius,
} from '../../src/contrarius/reader';
import type {
  ArquivoMarkdownContrariusLike,
  VaultContrariusLike,
  MetadataCacheContrariusLike,
  CacheArquivoContrariusLike,
} from '../../src/contrarius/reader';

function makeArquivo(path: string, basename?: string): ArquivoMarkdownContrariusLike {
  return { path, basename: basename ?? path.split('/').pop()!.replace('.md', '') };
}

function makeVault(
  arquivos: ArquivoMarkdownContrariusLike[],
  conteudos?: Record<string, string>,
): VaultContrariusLike {
  return {
    getMarkdownFiles: () => arquivos,
    cachedRead: conteudos ? async (arquivo) => conteudos[arquivo.path] ?? '' : undefined,
  };
}

function makeCache(
  frontmatters: Record<string, Record<string, unknown> | undefined>,
): MetadataCacheContrariusLike {
  return {
    getFileCache: (arquivo): CacheArquivoContrariusLike | null => {
      const fm = frontmatters[arquivo.path];
      return fm ? { frontmatter: fm } : null;
    },
  };
}

describe('classificarColecaoContrariusPorCaminho', () => {
  it('classifica pastas conhecidas', () => {
    expect(classificarColecaoContrariusPorCaminho('02_Consciencias/C-001.md')).toBe('consciencias');
    expect(classificarColecaoContrariusPorCaminho('Narrativa/03_Retrovidas/C-001_V01.md')).toBe('retrovidas');
  });

  it('retorna null para pasta desconhecida', () => {
    expect(classificarColecaoContrariusPorCaminho('01_Notas/nota.md')).toBeNull();
  });
});

describe('removerFrontmatterMarkdown', () => {
  it('remove o bloco de frontmatter', () => {
    expect(removerFrontmatterMarkdown('---\nid: C-001\n---\nConteúdo')).toBe('Conteúdo');
  });

  it('retorna o texto original quando não há frontmatter', () => {
    expect(removerFrontmatterMarkdown('Conteúdo sem frontmatter')).toBe('Conteúdo sem frontmatter');
  });
});

describe('lerVaultContrarius', () => {
  it('lê frontmatter simples e preserva o caminho', async () => {
    const vault = makeVault([makeArquivo('02_Consciencias/C-001.md')]);
    const cache = makeCache({ '02_Consciencias/C-001.md': { id: 'C-001', nome: 'Fulano' } });

    const indice = await lerVaultContrarius(vault, cache);

    expect(indice.notas).toHaveLength(1);
    expect(indice.notas[0]).toMatchObject({
      path: '02_Consciencias/C-001.md',
      colecao: 'consciencias',
      frontmatter: { id: 'C-001', nome: 'Fulano' },
    });
  });

  it('preserva arrays em frontmatter', async () => {
    const vault = makeVault([makeArquivo('06_Lugares/L-001.md')]);
    const cache = makeCache({ '06_Lugares/L-001.md': { nomes_historicos: ['Roma', 'Urbs'] } });

    const indice = await lerVaultContrarius(vault, cache);

    expect(indice.notas[0].frontmatter.nomes_historicos).toEqual(['Roma', 'Urbs']);
  });

  it('tolera string onde normalmente haveria array, sem quebrar', async () => {
    const vault = makeVault([makeArquivo('06_Lugares/L-002.md')]);
    const cache = makeCache({ '06_Lugares/L-002.md': { nomes_historicos: 'Roma' } });

    const indice = await lerVaultContrarius(vault, cache);

    expect(indice.notas[0].frontmatter.nomes_historicos).toBe('Roma');
  });

  it('lida com arquivo sem frontmatter (cache vazio)', async () => {
    const vault = makeVault([makeArquivo('02_Consciencias/C-002.md')]);
    const cache = makeCache({});

    const indice = await lerVaultContrarius(vault, cache);

    expect(indice.notas[0].frontmatter).toEqual({});
    expect(indice.notas[0].colecao).toBe('consciencias');
  });

  it('lida com entidade incompleta sem lançar exceção', async () => {
    const vault = makeVault([makeArquivo('05_Eventos/E-001.md')]);
    const cache = makeCache({ '05_Eventos/E-001.md': { id_evento: 'E-001' } });

    const indice = await lerVaultContrarius(vault, cache);

    expect(indice.notas[0].frontmatter).toEqual({ id_evento: 'E-001' });
  });

  it('lida com entidade provisória marcada com xxx', async () => {
    const vault = makeVault([makeArquivo('02_Consciencias/C-xxx.md')]);
    const cache = makeCache({ '02_Consciencias/C-xxx.md': { id: 'xxx', nome: 'xxx' } });

    const indice = await lerVaultContrarius(vault, cache);

    expect(indice.notas[0].frontmatter).toEqual({ id: 'xxx', nome: 'xxx' });
  });

  it('classifica null para notas fora das pastas conhecidas e as inclui por padrão', async () => {
    const vault = makeVault([makeArquivo('17_Notas_e_Ideias/ideia.md')]);
    const cache = makeCache({ '17_Notas_e_Ideias/ideia.md': { titulo: 'Ideia solta' } });

    const indice = await lerVaultContrarius(vault, cache);

    expect(indice.notas[0].colecao).toBeNull();
  });

  it('exclui notas soltas quando incluirNotasSoltas é false', async () => {
    const vault = makeVault([
      makeArquivo('17_Notas_e_Ideias/ideia.md'),
      makeArquivo('02_Consciencias/C-001.md'),
    ]);
    const cache = makeCache({
      '17_Notas_e_Ideias/ideia.md': { titulo: 'Ideia solta' },
      '02_Consciencias/C-001.md': { id: 'C-001' },
    });

    const indice = await lerVaultContrarius(vault, cache, { incluirNotasSoltas: false });

    expect(indice.notas).toHaveLength(1);
    expect(indice.notas[0].path).toBe('02_Consciencias/C-001.md');
  });

  it('não muta o frontmatter original (deep copy)', async () => {
    const original = { nucleo_geo: ['Roma'] };
    const vault = makeVault([makeArquivo('02_Consciencias/C-001.md')]);
    const cache = makeCache({ '02_Consciencias/C-001.md': original });

    const indice = await lerVaultContrarius(vault, cache);
    (indice.notas[0].frontmatter.nucleo_geo as string[]).push('Alterado');

    expect(original.nucleo_geo).toEqual(['Roma']);
  });

  it('inclui o corpo do texto quando incluirTexto é true', async () => {
    const vault = makeVault(
      [makeArquivo('05_Eventos/E-001.md')],
      { '05_Eventos/E-001.md': '---\nid_evento: E-001\n---\nTexto do evento' },
    );
    const cache = makeCache({ '05_Eventos/E-001.md': { id_evento: 'E-001' } });

    const indice = await lerVaultContrarius(vault, cache, { incluirTexto: true });

    expect(indice.notas[0].corpo).toBe('Texto do evento');
  });
});
