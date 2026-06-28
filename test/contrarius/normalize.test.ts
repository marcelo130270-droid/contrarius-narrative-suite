import { describe, it, expect } from 'vitest';
import {
  stripObsidianLink,
  normStr,
  normList,
  normNum,
  normBool,
  primeiroPresente,
} from '../../src/contrarius/normalize';

describe('stripObsidianLink', () => {
  it('strips [[C-002]] to C-002', () => {
    expect(stripObsidianLink('[[C-002]]')).toBe('C-002');
  });

  it('strips [[C-002|Nome exibido]] to C-002 (target, not label)', () => {
    expect(stripObsidianLink('[[C-002|Nome exibido]]')).toBe('C-002');
  });

  it('strips ![[Imagem.png]] to Imagem.png', () => {
    expect(stripObsidianLink('![[Imagem.png]]')).toBe('Imagem.png');
  });

  it('returns plain text trimmed', () => {
    expect(stripObsidianLink('  texto comum  ')).toBe('texto comum');
  });

  it('does not strip text that contains a link but is not entirely a link', () => {
    const input = 'ver [[Link]] aqui';
    expect(stripObsidianLink(input)).toBe(input);
  });

  it('trims surrounding whitespace from Obsidian links', () => {
    expect(stripObsidianLink('  [[Arquivo]]  ')).toBe('Arquivo');
  });

  it('never throws on empty string', () => {
    expect(() => stripObsidianLink('')).not.toThrow();
    expect(stripObsidianLink('')).toBe('');
  });
});

describe('normStr', () => {
  it('trims and returns a plain string', () => {
    expect(normStr('  hello  ')).toBe('hello');
  });

  it('strips Obsidian link from string', () => {
    expect(normStr('[[C-002]]')).toBe('C-002');
  });

  it('converts finite number to string', () => {
    expect(normStr(42)).toBe('42');
    expect(normStr(0)).toBe('0');
    expect(normStr(-7)).toBe('-7');
  });

  it('converts boolean true to "true"', () => {
    expect(normStr(true)).toBe('true');
  });

  it('converts boolean false to "false"', () => {
    expect(normStr(false)).toBe('false');
  });

  it('returns empty string for null', () => {
    expect(normStr(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normStr(undefined)).toBe('');
  });

  it('returns empty string for whitespace-only string', () => {
    expect(normStr('   ')).toBe('');
  });

  it('returns empty string for non-finite number', () => {
    expect(normStr(NaN)).toBe('');
    expect(normStr(Infinity)).toBe('');
    expect(normStr(-Infinity)).toBe('');
  });

  it('skips first empty array item and returns second non-empty item', () => {
    expect(normStr(['', 'segundo'])).toBe('segundo');
  });

  it('returns empty string for array with all empty items', () => {
    expect(normStr(['', '   '])).toBe('');
  });

  it('returns empty string for plain object', () => {
    expect(normStr({ key: 'value' })).toBe('');
  });

  it('returns empty string for empty object', () => {
    expect(normStr({})).toBe('');
  });

  it('never throws', () => {
    expect(() => normStr(Symbol('x'))).not.toThrow();
  });
});

describe('normList', () => {
  it('wraps a single string value in an array', () => {
    expect(normList('único')).toEqual(['único']);
  });

  it('strips Obsidian links in a list', () => {
    expect(normList(['[[X]]', '[[Y]]'])).toEqual(['X', 'Y']);
  });

  it('discards empty items from a list', () => {
    expect(normList(['a', '', '  ', 'b'])).toEqual(['a', 'b']);
  });

  it('removes duplicates while preserving original order', () => {
    expect(normList(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('preserves original order of unique items', () => {
    expect(normList(['z', 'a', 'm'])).toEqual(['z', 'a', 'm']);
  });

  it('does not split string on comma (names and titles may contain commas)', () => {
    expect(normList('Nome, Sobrenome')).toEqual(['Nome, Sobrenome']);
  });

  it('returns empty array for null', () => {
    expect(normList(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(normList(undefined)).toEqual([]);
  });

  it('normalizes a list of Obsidian links by stripping brackets', () => {
    expect(normList(['[[Pietro Mancini]]', '[[Elisabetta Ferrini]]'])).toEqual([
      'Pietro Mancini',
      'Elisabetta Ferrini',
    ]);
  });

  it('returns empty array for a list with only empty/whitespace items', () => {
    expect(normList(['', '   '])).toEqual([]);
  });

  it('wraps a single number in an array', () => {
    expect(normList(99)).toEqual(['99']);
  });
});

describe('normNum', () => {
  it('preserves a finite integer', () => {
    expect(normNum(7)).toBe(7);
  });

  it('preserves a finite decimal', () => {
    expect(normNum(3.14)).toBe(3.14);
  });

  it('preserves a negative number', () => {
    expect(normNum(-42)).toBe(-42);
  });

  it('converts a numeric string (integer)', () => {
    expect(normNum('42')).toBe(42);
  });

  it('converts a numeric string (decimal)', () => {
    expect(normNum('3.14')).toBe(3.14);
  });

  it('converts a numeric string (negative)', () => {
    expect(normNum('-10')).toBe(-10);
  });

  it('converts a numeric string with surrounding whitespace', () => {
    expect(normNum('  1849  ')).toBe(1849);
  });

  it('returns null for empty string', () => {
    expect(normNum('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normNum('   ')).toBeNull();
  });

  it('returns null for non-numeric text', () => {
    expect(normNum('abc')).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(normNum(NaN)).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(normNum(Infinity)).toBeNull();
    expect(normNum(-Infinity)).toBeNull();
  });

  it('returns null for boolean', () => {
    expect(normNum(true)).toBeNull();
    expect(normNum(false)).toBeNull();
  });

  it('returns null for array', () => {
    expect(normNum([1, 2, 3])).toBeNull();
  });

  it('returns null for null', () => {
    expect(normNum(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normNum(undefined)).toBeNull();
  });

  it('never throws', () => {
    expect(() => normNum({ x: 1 })).not.toThrow();
  });
});

describe('normBool', () => {
  it('preserves boolean true', () => {
    expect(normBool(true)).toBe(true);
  });

  it('preserves boolean false', () => {
    expect(normBool(false)).toBe(false);
  });

  it('returns false for number 0', () => {
    expect(normBool(0)).toBe(false);
  });

  it('returns true for non-zero finite number', () => {
    expect(normBool(1)).toBe(true);
    expect(normBool(-5)).toBe(true);
    expect(normBool(0.1)).toBe(true);
  });

  it('returns false for non-finite number (NaN)', () => {
    expect(normBool(NaN)).toBe(false);
  });

  it('returns false for non-finite number (Infinity)', () => {
    expect(normBool(Infinity)).toBe(false);
    expect(normBool(-Infinity)).toBe(false);
  });

  it('returns true for string "true"', () => {
    expect(normBool('true')).toBe(true);
  });

  it('returns true for string "yes"', () => {
    expect(normBool('yes')).toBe(true);
  });

  it('returns true for string "sim"', () => {
    expect(normBool('sim')).toBe(true);
  });

  it('returns true for string "1"', () => {
    expect(normBool('1')).toBe(true);
  });

  it('returns true for string "on"', () => {
    expect(normBool('on')).toBe(true);
  });

  it('returns false for string "false"', () => {
    expect(normBool('false')).toBe(false);
  });

  it('returns false for string "no"', () => {
    expect(normBool('no')).toBe(false);
  });

  it('returns false for string "não"', () => {
    expect(normBool('não')).toBe(false);
  });

  it('returns false for string "nao"', () => {
    expect(normBool('nao')).toBe(false);
  });

  it('returns false for string "0"', () => {
    expect(normBool('0')).toBe(false);
  });

  it('returns false for string "off"', () => {
    expect(normBool('off')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(normBool('')).toBe(false);
  });

  it('is case-insensitive for true values', () => {
    expect(normBool('TRUE')).toBe(true);
    expect(normBool('True')).toBe(true);
    expect(normBool('YES')).toBe(true);
    expect(normBool('SIM')).toBe(true);
    expect(normBool('ON')).toBe(true);
  });

  it('is case-insensitive for false values', () => {
    expect(normBool('FALSE')).toBe(false);
    expect(normBool('NO')).toBe(false);
    expect(normBool('OFF')).toBe(false);
  });

  it('returns false for unrecognized string', () => {
    expect(normBool('talvez')).toBe(false);
    expect(normBool('maybe')).toBe(false);
  });

  it('returns false for null', () => {
    expect(normBool(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(normBool(undefined)).toBe(false);
  });

  it('returns false for array', () => {
    expect(normBool([true, false])).toBe(false);
  });

  it('returns false for object', () => {
    expect(normBool({ value: true })).toBe(false);
  });

  it('never throws', () => {
    expect(() => normBool(Symbol('s'))).not.toThrow();
  });
});

describe('primeiroPresente', () => {
  it('returns the value of the first present key', () => {
    expect(primeiroPresente({ a: 'valor', b: 'outro' }, ['a', 'b'])).toBe('valor');
  });

  it('skips the first key when empty and returns the second', () => {
    expect(primeiroPresente({ a: '', b: 'presente' }, ['a', 'b'])).toBe('presente');
  });

  it('accepts false as a valid value', () => {
    expect(primeiroPresente({ a: false }, ['a'])).toBe(false);
  });

  it('accepts 0 as a valid value', () => {
    expect(primeiroPresente({ a: 0 }, ['a'])).toBe(0);
  });

  it('ignores an empty array', () => {
    expect(primeiroPresente({ a: [], b: 'preenchido' }, ['a', 'b'])).toBe('preenchido');
  });

  it('accepts a non-empty array as a valid value', () => {
    const arr = ['x', 'y'];
    expect(primeiroPresente({ a: arr }, ['a'])).toBe(arr);
  });

  it('returns undefined when no key is found', () => {
    expect(primeiroPresente({}, ['a', 'b'])).toBeUndefined();
  });

  it('returns undefined when all keys have absent values', () => {
    expect(primeiroPresente({ a: '', b: null, c: undefined, d: [] }, ['a', 'b', 'c', 'd'])).toBeUndefined();
  });

  it('ignores a whitespace-only string', () => {
    expect(primeiroPresente({ a: '   ', b: 'ok' }, ['a', 'b'])).toBe('ok');
  });

  it('ignores null value', () => {
    expect(primeiroPresente({ a: null, b: 'ok' }, ['a', 'b'])).toBe('ok');
  });

  it('ignores undefined value', () => {
    expect(primeiroPresente({ a: undefined, b: 'ok' }, ['a', 'b'])).toBe('ok');
  });

  it('accepts a plain object as a valid value', () => {
    const obj = { nested: true };
    expect(primeiroPresente({ a: obj }, ['a'])).toBe(obj);
  });

  it('ignores properties inherited from the prototype', () => {
    const parent = { herdada: 'valor-herdado' };
    const child = Object.create(parent) as Record<string, unknown>;
    expect(primeiroPresente(child, ['herdada'])).toBeUndefined();
  });

  it('does not modify the input object', () => {
    const fm: Readonly<Record<string, unknown>> = { a: 'x', b: '' };
    const snapshot = JSON.stringify(fm);
    primeiroPresente(fm, ['a', 'b', 'c']);
    expect(JSON.stringify(fm)).toBe(snapshot);
  });
});
