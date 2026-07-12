import { describe, it, expect, vi } from 'vitest';
import {
  classificarColecaoContrariusPorCaminho,
  removerFrontmatterMarkdown,
  criarFontePayloadContrariusScrivenerDoVault,
} from '../../src/contrarius/scrivener-contrarius-vault-payload-source';
import type {
  ArquivoMarkdownContrariusPayloadLike,
  VaultContrariusPayloadLike,
  MetadataCacheContrariusPayloadLike,
  CacheArquivoContrariusPayloadLike,
} from '../../src/contrarius/scrivener-contrarius-vault-payload-source';

function makeArquivo(path: string, basename?: string): ArquivoMarkdownContrariusPayloadLike {
  return { path, basename: basename ?? path.split('/').pop()!.replace('.md', '') };
}

function makeVault(
  arquivos: ArquivoMarkdownContrariusPayloadLike[],
  conteudos?: Record<string, string>,
): VaultContrariusPayloadLike {
  return {
    getMarkdownFiles: () => arquivos,
    cachedRead: conteudos
      ? async (arquivo) => conteudos[arquivo.path] ?? ''
      : undefined,
  };
}

function makeCache(
  frontmatters: Record<string, Record<string, unknown>>,
): MetadataCacheContrariusPayloadLike {
  return {
    getFileCache: (arquivo): CacheArquivoContrariusPayloadLike | null => {
      const fm = frontmatters[arquivo.path];
      return fm ? { frontmatter: fm } : null;
    },
  };
}

describe('classificarColecaoContrariusPorCaminho', () => {
  const casos: Array<[string, string]> = [
    ['02_Consciencias/PersonagemA.md', 'consciencias'],
    ['Narrativa/02_Consciencias/PersonagemA.md', 'consciencias'],
    ['03_Retrovidas/Retrovida1.md', 'retrovidas'],
    ['04_Relacoes/Relacao1.md', 'relacoes'],
    ['05_Eventos/Evento1.md', 'eventos'],
    ['06_Lugares/Lugar1.md', 'lugares'],
    ['07_Objetos/Objeto1.md', 'objetos'],
    ['08_Grupos/Grupo1.md', 'grupos'],
  ];

  for (const [caminho, esperado] of casos) {
    it(`classifica ${caminho} como ${esperado}`, () => {
      expect(classificarColecaoContrariusPorCaminho(caminho)).toBe(esperado);
    });
  }

  it('retorna null para arquivo fora das pastas conhecidas', () => {
    expect(classificarColecaoContrariusPorCaminho('01_Notas/nota.md')).toBeNull();
    expect(classificarColecaoContrariusPorCaminho('Misc/arquivo.md')).toBeNull();
    expect(classificarColecaoContrariusPorCaminho('arquivo.md')).toBeNull();
  });
});

describe('removerFrontmatterMarkdown', () => {
  it('remove frontmatter do texto', () => {
    const texto = '---\ntitulo: Olá\n---\nConteúdo aqui';
    expect(removerFrontmatterMarkdown(texto)).toBe('Conteúdo aqui');
  });

  it('retorna texto sem alteração se não começa com ---', () => {
    expect(removerFrontmatterMarkdown('Conteúdo sem frontmatter')).toBe('Conteúdo sem frontmatter');
  });

  it('retorna texto sem alteração se não há fechamento de frontmatter', () => {
    const incompleto = '---\ntitulo: Teste\nSem fechamento';
    expect(removerFrontmatterMarkdown(incompleto)).toBe(incompleto);
  });

  it('lida com frontmatter vazio', () => {
    expect(removerFrontmatterMarkdown('---\n---\nConteúdo')).toBe('Conteúdo');
  });

  it('remove espaços e quebras de linha iniciais do conteúdo', () => {
    expect(removerFrontmatterMarkdown('---\nk: v\n---\n\nParágrafo')).toBe('Parágrafo');
  });
});

describe('criarFontePayloadContrariusScrivenerDoVault', () => {
  it('classifica arquivos nas pastas principais corretamente', async () => {
    const arquivos = [
      makeArquivo('02_Consciencias/Personagem.md', 'Personagem'),
      makeArquivo('05_Eventos/Batalha.md', 'Batalha'),
      makeArquivo('06_Lugares/Cidade.md', 'Cidade'),
    ];
    const vault = makeVault(arquivos);
    const cache = makeCache({});

    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache);

    expect(Array.isArray(fonte.consciencias)).toBe(true);
    expect(fonte.consciencias).toHaveLength(1);
    expect(Array.isArray(fonte.eventos)).toBe(true);
    expect(fonte.eventos).toHaveLength(1);
    expect(Array.isArray(fonte.lugares)).toBe(true);
    expect(fonte.lugares).toHaveLength(1);
  });

  it('ignora arquivos fora das pastas quando incluirNotasSoltas é falso (padrão)', async () => {
    const arquivos = [
      makeArquivo('02_Consciencias/Personagem.md', 'Personagem'),
      makeArquivo('Misc/nota-solta.md', 'nota-solta'),
      makeArquivo('arquivo-raiz.md', 'arquivo-raiz'),
    ];
    const vault = makeVault(arquivos);
    const cache = makeCache({});

    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache, { incluirNotasSoltas: false });

    expect(fonte.consciencias).toHaveLength(1);
    expect(fonte.notas).toBeUndefined();
  });

  it('inclui notas soltas quando incluirNotasSoltas é verdadeiro', async () => {
    const arquivos = [
      makeArquivo('02_Consciencias/Personagem.md', 'Personagem'),
      makeArquivo('Misc/nota-solta.md', 'nota-solta'),
    ];
    const vault = makeVault(arquivos);
    const cache = makeCache({});

    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache, { incluirNotasSoltas: true });

    expect(fonte.notas).toHaveLength(1);
    const nota = fonte.notas![0] as Record<string, unknown>;
    expect(nota['caminhoFonte']).toBe('Misc/nota-solta.md');
  });

  it('copia frontmatter, file, path, basename, caminhoFonte e titulo', async () => {
    const arquivos = [makeArquivo('02_Consciencias/Personagem.md', 'Personagem')];
    const vault = makeVault(arquivos);
    const cache = makeCache({
      '02_Consciencias/Personagem.md': { titulo: 'Título do Personagem', idade: 30 },
    });

    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache);

    const item = fonte.consciencias![0] as Record<string, unknown>;
    expect(item['titulo']).toBe('Título do Personagem');
    expect(item['idade']).toBe(30);
    expect(item['path']).toBe('02_Consciencias/Personagem.md');
    expect(item['basename']).toBe('Personagem');
    expect(item['caminhoFonte']).toBe('02_Consciencias/Personagem.md');
    const file = item['file'] as Record<string, unknown>;
    expect(file['path']).toBe('02_Consciencias/Personagem.md');
    expect(file['basename']).toBe('Personagem');
  });

  it('usa basename como titulo quando frontmatter não tem titulo/nome/nome_atual', async () => {
    const arquivos = [makeArquivo('02_Consciencias/ArquivoSemTitulo.md', 'ArquivoSemTitulo')];
    const vault = makeVault(arquivos);
    const cache = makeCache({ '02_Consciencias/ArquivoSemTitulo.md': { idade: 25 } });

    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache);
    const item = fonte.consciencias![0] as Record<string, unknown>;
    expect(item['titulo']).toBe('ArquivoSemTitulo');
  });

  it('usa nome do frontmatter como titulo quando titulo ausente', async () => {
    const arquivos = [makeArquivo('03_Retrovidas/Retro.md', 'Retro')];
    const vault = makeVault(arquivos);
    const cache = makeCache({ '03_Retrovidas/Retro.md': { nome: 'Nome do Arquivo' } });

    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache);
    const item = fonte.retrovidas![0] as Record<string, unknown>;
    expect(item['titulo']).toBe('Nome do Arquivo');
  });

  it('inclui texto sem frontmatter quando incluirTexto é true', async () => {
    const arquivos = [makeArquivo('02_Consciencias/Personagem.md', 'Personagem')];
    const conteudos = { '02_Consciencias/Personagem.md': '---\ntitulo: Título\n---\nTexto do personagem' };
    const vault = makeVault(arquivos, conteudos);
    const cache = makeCache({ '02_Consciencias/Personagem.md': { titulo: 'Título' } });

    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache, { incluirTexto: true });
    const item = fonte.consciencias![0] as Record<string, unknown>;
    expect(item['texto']).toBe('Texto do personagem');
  });

  it('não tenta ler texto quando incluirTexto é false', async () => {
    const arquivos = [makeArquivo('02_Consciencias/Personagem.md', 'Personagem')];
    const cachedReadSpy = vi.fn().mockResolvedValue('---\ntitulo: T\n---\nConteúdo');
    const vault: VaultContrariusPayloadLike = {
      getMarkdownFiles: () => arquivos,
      cachedRead: cachedReadSpy,
    };
    const cache = makeCache({});

    await criarFontePayloadContrariusScrivenerDoVault(vault, cache, { incluirTexto: false });

    expect(cachedReadSpy).not.toHaveBeenCalled();
  });

  it('funciona mesmo se cachedRead não existir', async () => {
    const arquivos = [makeArquivo('05_Eventos/Evento.md', 'Evento')];
    const vault: VaultContrariusPayloadLike = { getMarkdownFiles: () => arquivos };
    const cache = makeCache({ '05_Eventos/Evento.md': { titulo: 'Grande Evento' } });

    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache, { incluirTexto: true });
    const item = fonte.eventos![0] as Record<string, unknown>;
    expect(item['titulo']).toBe('Grande Evento');
    expect(item['texto']).toBeUndefined();
  });

  it('não inclui texto quando cachedRead ausente mesmo com incluirTexto=true', async () => {
    const arquivos = [makeArquivo('06_Lugares/Lugar.md', 'Lugar')];
    const vault: VaultContrariusPayloadLike = { getMarkdownFiles: () => arquivos };
    const cache = makeCache({});

    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache, { incluirTexto: true });
    const item = fonte.lugares![0] as Record<string, unknown>;
    expect(item['texto']).toBeUndefined();
  });

  it('retorna coleções vazias (sem propriedade) quando não há arquivos para classificar', async () => {
    const vault = makeVault([]);
    const cache = makeCache({});
    const fonte = await criarFontePayloadContrariusScrivenerDoVault(vault, cache);
    expect(fonte.consciencias).toBeUndefined();
    expect(fonte.eventos).toBeUndefined();
    expect(fonte.notas).toBeUndefined();
  });
});
