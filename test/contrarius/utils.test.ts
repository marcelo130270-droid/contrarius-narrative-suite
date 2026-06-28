import { describe, it, expect } from 'vitest';
import { extractBasename, deepCopyYaml } from '../../src/contrarius/utils';

describe('extractBasename', () => {
  it('1. caminho com /', () => {
    expect(extractBasename('pasta/subpasta/arquivo.md')).toBe('arquivo');
  });

  it('2. caminho com \\', () => {
    expect(extractBasename('pasta\\subpasta\\arquivo.md')).toBe('arquivo');
  });

  it('3. extensão .md é removida', () => {
    expect(extractBasename('pasta/nome.md')).toBe('nome');
  });

  it('4. extensão .MD é removida (case-insensitive)', () => {
    expect(extractBasename('pasta/nome.MD')).toBe('nome');
  });

  it('5. caminho sem extensão .md retorna o nome como está', () => {
    expect(extractBasename('pasta/arquivo.txt')).toBe('arquivo.txt');
  });

  it('6. nome contendo vários pontos remove apenas a extensão final .md', () => {
    expect(extractBasename('pasta/meu.arquivo.com.md')).toBe('meu.arquivo.com');
  });

  it('7. string vazia resulta em string vazia', () => {
    expect(extractBasename('')).toBe('');
  });

  it('8. somente nome do arquivo sem separador de caminho', () => {
    expect(extractBasename('somente-nome.md')).toBe('somente-nome');
  });
});

describe('deepCopyYaml', () => {
  it('1. string é preservada', () => {
    expect(deepCopyYaml('texto')).toBe('texto');
  });

  it('2. número é preservado', () => {
    expect(deepCopyYaml(42)).toBe(42);
  });

  it('3. booleano é preservado', () => {
    expect(deepCopyYaml(true)).toBe(true);
  });

  it('4. null é preservado', () => {
    expect(deepCopyYaml(null)).toBeNull();
  });

  it('5. undefined é preservado', () => {
    expect(deepCopyYaml(undefined)).toBeUndefined();
  });

  it('6. array simples é copiado com os mesmos valores', () => {
    const original = ['a', 'b', 'c'];
    expect(deepCopyYaml(original)).toEqual(['a', 'b', 'c']);
  });

  it('7. array aninhado é copiado com os mesmos valores', () => {
    const original = [['x', 'y'], ['z']];
    expect(deepCopyYaml(original)).toEqual([['x', 'y'], ['z']]);
  });

  it('8. objeto simples é copiado com os mesmos valores', () => {
    const original = { a: 1, b: 'dois' };
    expect(deepCopyYaml(original)).toEqual({ a: 1, b: 'dois' });
  });

  it('9. objeto aninhado é copiado com os mesmos valores', () => {
    const original = { externo: { interno: 42 } };
    expect(deepCopyYaml(original)).toEqual({ externo: { interno: 42 } });
  });

  it('10. combinação de arrays e objetos é copiada corretamente', () => {
    const original = { lista: ['a', 'b'], obj: { k: 1 } };
    expect(deepCopyYaml(original)).toEqual({ lista: ['a', 'b'], obj: { k: 1 } });
  });

  it('11. cópia não compartilha array raiz com a origem', () => {
    const original = ['x', 'y'];
    const copia = deepCopyYaml(original);
    expect(copia).not.toBe(original);
  });

  it('12. cópia não compartilha objeto raiz com a origem', () => {
    const original = { a: 1 };
    const copia = deepCopyYaml(original);
    expect(copia).not.toBe(original);
  });

  it('13. cópia não compartilha arrays aninhados com a origem', () => {
    const inner = ['x'];
    const original = { lista: inner };
    const copia = deepCopyYaml(original) as Record<string, unknown>;
    expect(copia['lista']).not.toBe(inner);
  });

  it('14. cópia não compartilha objetos aninhados com a origem', () => {
    const inner = { valor: 1 };
    const original = { obj: inner };
    const copia = deepCopyYaml(original) as Record<string, unknown>;
    expect(copia['obj']).not.toBe(inner);
  });

  it('15. alteração da cópia não modifica a origem', () => {
    const original = { lista: ['a', 'b'], obj: { k: 1 } };
    const copia = deepCopyYaml(original) as Record<string, unknown>;
    (copia['lista'] as string[]).push('c');
    (copia['obj'] as Record<string, unknown>)['k'] = 999;
    expect((original.lista as string[]).length).toBe(2);
    expect(original.obj.k).toBe(1);
  });

  it('16. alteração da origem não modifica a cópia', () => {
    const original = { lista: ['a', 'b'], obj: { k: 1 } };
    const copia = deepCopyYaml(original) as Record<string, unknown>;
    original.lista.push('c');
    original.obj.k = 999;
    expect((copia['lista'] as string[]).length).toBe(2);
    expect((copia['obj'] as Record<string, unknown>)['k']).toBe(1);
  });
});
