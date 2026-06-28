import { describe, it, expect } from 'vitest';
import type { TFile } from 'obsidian';
import { lerFrontmatter } from '../../src/contrarius/reader';
import type { ReaderDeps } from '../../src/contrarius/reader';

const UTF8_BOM = '﻿';

function makeFile(path = 'test/fake.md'): TFile {
  return { path } as unknown as TFile;
}

type DepsOverrides = {
  getFileCache?: ReaderDeps['getFileCache'];
  cachedRead?: ReaderDeps['cachedRead'];
  parseYaml?: ReaderDeps['parseYaml'];
};

function makeDeps(overrides: DepsOverrides = {}): ReaderDeps {
  return {
    getFileCache: overrides.getFileCache ?? ((_f) => null),
    cachedRead: overrides.cachedRead ?? (async (_f) => ''),
    parseYaml: overrides.parseYaml ?? ((_s) => ({})),
  };
}

// ─── Casos 1-9: caminho primário via getFileCache ────────────────────────────

describe('lerFrontmatter — caminho primário via getFileCache', () => {
  it('1. usa getFileCache como caminho primário quando existe frontmatter válido', async () => {
    const file = makeFile();
    const deps = makeDeps({
      getFileCache: (_f) => ({ frontmatter: { titulo: 'Cache' } }),
      cachedRead: async (_f) => {
        throw new Error('cachedRead não deveria ser chamado');
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(result).toEqual({ titulo: 'Cache' });
  });

  it('2. não chama cachedRead quando o cache fornece frontmatter válido', async () => {
    const file = makeFile();
    let called = false;
    const deps = makeDeps({
      getFileCache: (_f) => ({ frontmatter: { k: 'v' } }),
      cachedRead: async (_f) => {
        called = true;
        return '';
      },
    });
    await lerFrontmatter(file, deps);
    expect(called).toBe(false);
  });

  it('3. retorna uma cópia independente do frontmatter do cache', async () => {
    const file = makeFile();
    const original: Record<string, unknown> = { key: 'original' };
    const deps = makeDeps({
      getFileCache: (_f) => ({ frontmatter: original }),
    });
    const result = await lerFrontmatter(file, deps);
    expect(result).not.toBe(original);
    result!['key'] = 'modificado';
    expect(original['key']).toBe('original');
  });

  it('4. arrays aninhados do cache são copiados profundamente', async () => {
    const file = makeFile();
    const arr = ['a', 'b'];
    const original: Record<string, unknown> = { items: arr };
    const deps = makeDeps({
      getFileCache: (_f) => ({ frontmatter: original }),
    });
    const result = await lerFrontmatter(file, deps);
    expect(result!['items']).not.toBe(arr);
    (result!['items'] as string[]).push('c');
    expect(arr.length).toBe(2);
  });

  it('5. objetos aninhados do cache são copiados profundamente', async () => {
    const file = makeFile();
    const inner = { x: 1 };
    const original: Record<string, unknown> = { obj: inner };
    const deps = makeDeps({
      getFileCache: (_f) => ({ frontmatter: original }),
    });
    const result = await lerFrontmatter(file, deps);
    expect(result!['obj']).not.toBe(inner);
    (result!['obj'] as Record<string, unknown>)['x'] = 999;
    expect(inner.x).toBe(1);
  });

  it('6. não modifica o objeto original retornado pelo cache', async () => {
    const file = makeFile();
    const cacheFm: Record<string, unknown> = { key: 'original', arr: ['x'] };
    const deps = makeDeps({
      getFileCache: (_f) => ({ frontmatter: cacheFm }),
    });
    await lerFrontmatter(file, deps);
    expect(cacheFm['key']).toBe('original');
    expect(cacheFm['arr']).toEqual(['x']);
  });

  it('7. usa cachedRead quando o cache retorna null', async () => {
    const file = makeFile();
    let cachedReadCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => {
        cachedReadCalled = true;
        return '---\nkey: value\n---\n';
      },
      parseYaml: (_s) => ({ key: 'value' }),
    });
    await lerFrontmatter(file, deps);
    expect(cachedReadCalled).toBe(true);
  });

  it('8. usa cachedRead quando o cache não contém frontmatter', async () => {
    const file = makeFile();
    let cachedReadCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => ({}),
      cachedRead: async (_f) => {
        cachedReadCalled = true;
        return '---\nkey: v\n---\n';
      },
      parseYaml: (_s) => ({ key: 'v' }),
    });
    await lerFrontmatter(file, deps);
    expect(cachedReadCalled).toBe(true);
  });

  it('9. usa fallback quando frontmatter do cache não é um objeto válido', async () => {
    // Object.create(proto) satisfaz Record<string,unknown> estruturalmente,
    // mas isPlainObject retorna false pois prototype !== Object.prototype nem null.
    const proto = { extra: true };
    const notPlain = Object.create(proto) as Record<string, unknown>;
    notPlain['key'] = 'val';
    const file = makeFile();
    let cachedReadCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => ({ frontmatter: notPlain }),
      cachedRead: async (_f) => {
        cachedReadCalled = true;
        return '---\nkey: v\n---\n';
      },
      parseYaml: (_s) => ({ key: 'v' }),
    });
    await lerFrontmatter(file, deps);
    expect(cachedReadCalled).toBe(true);
  });
});

// ─── Casos 10-18 e 35: extração do bloco frontmatter ─────────────────────────

describe('lerFrontmatter — extração do bloco frontmatter', () => {
  it('10. reconhece frontmatter com finais de linha LF', async () => {
    const file = makeFile();
    let parseYamlCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => '---\ntitulo: LF\n---\n',
      parseYaml: (_s) => {
        parseYamlCalled = true;
        return { titulo: 'LF' };
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(parseYamlCalled).toBe(true);
    expect(result).toEqual({ titulo: 'LF' });
  });

  it('11. reconhece frontmatter com finais de linha CRLF', async () => {
    const file = makeFile();
    let parseYamlCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => '---\r\ntitulo: CRLF\r\n---\r\n',
      parseYaml: (_s) => {
        parseYamlCalled = true;
        return { titulo: 'CRLF' };
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(parseYamlCalled).toBe(true);
    expect(result).toEqual({ titulo: 'CRLF' });
  });

  it('12. aceita BOM UTF-8 antes do delimitador inicial', async () => {
    const file = makeFile();
    let parseYamlCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => `${UTF8_BOM}---\nchave: bom\n---\n`,
      parseYaml: (_s) => {
        parseYamlCalled = true;
        return { chave: 'bom' };
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(parseYamlCalled).toBe(true);
    expect(result).toEqual({ chave: 'bom' });
  });

  it('13. extrai somente o primeiro bloco inicial de frontmatter', async () => {
    const file = makeFile();
    let yamlArg = '';
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) =>
        '---\nprimeiro: bloco\n---\n# Corpo\n---\nsegundo: bloco\n---\n',
      parseYaml: (s) => {
        yamlArg = s;
        return { primeiro: 'bloco' };
      },
    });
    await lerFrontmatter(file, deps);
    expect(yamlArg).toBe('primeiro: bloco');
    expect(yamlArg).not.toContain('segundo');
  });

  it('14. não interpreta delimitadores --- encontrados posteriormente no corpo Markdown', async () => {
    const file = makeFile();
    let yamlArg = '';
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) =>
        '---\ntag: ok\n---\n\nTexto normal.\n\n---\n\nMais texto após HR.\n',
      parseYaml: (s) => {
        yamlArg = s;
        return { tag: 'ok' };
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(result).toEqual({ tag: 'ok' });
    expect(yamlArg).not.toContain('Mais texto');
    expect(yamlArg).not.toContain('HR');
  });

  it('15. retorna null quando o documento não começa com frontmatter', async () => {
    const file = makeFile();
    let parseYamlCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => '# Título\n\nTexto sem frontmatter.',
      parseYaml: (_s) => {
        parseYamlCalled = true;
        return {};
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(result).toBeNull();
    expect(parseYamlCalled).toBe(false);
  });

  it('16. retorna null quando o bloco de frontmatter está vazio', async () => {
    const file = makeFile();
    let parseYamlCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => '---\n---\n',
      parseYaml: (_s) => {
        parseYamlCalled = true;
        return {};
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(result).toBeNull();
    expect(parseYamlCalled).toBe(false);
  });

  it('17. retorna null quando falta o delimitador final', async () => {
    const file = makeFile();
    let parseYamlCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => '---\nkey: value\n',
      parseYaml: (_s) => {
        parseYamlCalled = true;
        return {};
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(result).toBeNull();
    expect(parseYamlCalled).toBe(false);
  });

  it('18. passa somente o conteúdo interno do bloco para parseYaml', async () => {
    const file = makeFile();
    let receivedYaml = '';
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => '---\nchave: valor\noutro: campo\n---\n# Corpo\n',
      parseYaml: (s) => {
        receivedYaml = s;
        return { chave: 'valor', outro: 'campo' };
      },
    });
    await lerFrontmatter(file, deps);
    expect(receivedYaml).toBe('chave: valor\noutro: campo');
    expect(receivedYaml).not.toContain('---');
    expect(receivedYaml).not.toContain('Corpo');
  });

  it('35. não chama parseYaml quando não há bloco inicial válido', async () => {
    const file = makeFile();
    let parseYamlCalled = false;
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => 'sem frontmatter — corpo com --- no meio ---',
      parseYaml: (_s) => {
        parseYamlCalled = true;
        return {};
      },
    });
    await lerFrontmatter(file, deps);
    expect(parseYamlCalled).toBe(false);
  });
});

// ─── Casos 19-29: validação do resultado de parseYaml ────────────────────────

describe('lerFrontmatter — validação do resultado de parseYaml', () => {
  const VALID_CONTENT = '---\nplaceholder: true\n---\n';

  function parsesAs(value: unknown): ReaderDeps {
    return makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => VALID_CONTENT,
      parseYaml: (_s) => value,
    });
  }

  it('19. aceita objeto literal retornado por parseYaml', async () => {
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs({ chave: 'valor' }));
    expect(result).toEqual({ chave: 'valor' });
  });

  it('20. aceita objeto criado com Object.create(null)', async () => {
    const file = makeFile();
    const fm = Object.create(null) as Record<string, unknown>;
    fm['chave'] = 'null-proto';
    const result = await lerFrontmatter(file, parsesAs(fm));
    expect(result).toEqual({ chave: 'null-proto' });
  });

  it('21. rejeita array na raiz do YAML', async () => {
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs(['item1', 'item2']));
    expect(result).toBeNull();
  });

  it('22. rejeita string na raiz do YAML', async () => {
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs('texto simples'));
    expect(result).toBeNull();
  });

  it('23. rejeita número na raiz do YAML', async () => {
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs(42));
    expect(result).toBeNull();
  });

  it('24. rejeita booleano na raiz do YAML', async () => {
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs(true));
    expect(result).toBeNull();
  });

  it('25. rejeita null na raiz do YAML', async () => {
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs(null));
    expect(result).toBeNull();
  });

  it('26. rejeita Date', async () => {
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs(new Date('2024-01-01')));
    expect(result).toBeNull();
  });

  it('27. rejeita Map', async () => {
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs(new Map([['key', 'val']])));
    expect(result).toBeNull();
  });

  it('28. rejeita Set', async () => {
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs(new Set(['item'])));
    expect(result).toBeNull();
  });

  it('29. rejeita instância de classe', async () => {
    class MinhaEntidade {
      nome = 'teste';
    }
    const file = makeFile();
    const result = await lerFrontmatter(file, parsesAs(new MinhaEntidade()));
    expect(result).toBeNull();
  });
});

// ─── Casos 30-31: tratamento de erros ────────────────────────────────────────

describe('lerFrontmatter — tratamento de erros', () => {
  it('30. captura erro lançado por parseYaml e retorna null', async () => {
    const file = makeFile();
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => '---\nchave: valor\n---\n',
      parseYaml: (_s) => {
        throw new Error('YAML inválido');
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(result).toBeNull();
  });

  it('31. captura erro lançado por cachedRead e retorna null', async () => {
    const file = makeFile();
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => {
        throw new Error('arquivo não encontrado');
      },
    });
    const result = await lerFrontmatter(file, deps);
    expect(result).toBeNull();
  });
});

// ─── Casos 32-34: cópia profunda do resultado de parseYaml ───────────────────

describe('lerFrontmatter — cópia profunda do resultado de parseYaml', () => {
  const VALID_CONTENT = '---\nplaceholder: true\n---\n';

  it('32. preserva propriedades desconhecidas', async () => {
    const file = makeFile();
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => VALID_CONTENT,
      parseYaml: (_s) => ({
        titulo: 'T',
        autor: 'A',
        campo_extra: 'X',
        outra: 99,
      }),
    });
    const result = await lerFrontmatter(file, deps);
    expect(result).toEqual({ titulo: 'T', autor: 'A', campo_extra: 'X', outra: 99 });
  });

  it('33. não compartilha referências mutáveis com o resultado de parseYaml', async () => {
    const file = makeFile();
    const innerArray = ['a', 'b'];
    const innerObj = { x: 1 };
    const parsed = { items: innerArray, obj: innerObj };
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => VALID_CONTENT,
      parseYaml: (_s) => parsed,
    });
    const result = await lerFrontmatter(file, deps);
    expect(result!['items']).not.toBe(innerArray);
    expect(result!['obj']).not.toBe(innerObj);
    (result!['items'] as string[]).push('c');
    expect(innerArray.length).toBe(2);
  });

  it('34. não modifica o objeto retornado por parseYaml', async () => {
    const file = makeFile();
    const parsed: Record<string, unknown> = { key: 'original', items: ['a'] };
    const deps = makeDeps({
      getFileCache: (_f) => null,
      cachedRead: async (_f) => VALID_CONTENT,
      parseYaml: (_s) => parsed,
    });
    await lerFrontmatter(file, deps);
    expect(parsed['key']).toBe('original');
    expect(parsed['items']).toEqual(['a']);
  });
});
